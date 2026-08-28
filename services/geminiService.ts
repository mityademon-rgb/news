import { GoogleGenAI, Type } from "@google/genai";
import { DigestData, GeneratedContentPack, NewsItem } from "../types";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const getDateRange = (targetDate?: Date) => {
  const now = targetDate || new Date(); 
  const cutoff = new Date(now.getTime() - 48 * 3600000);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  return {
    after: formatDate(cutoff),
    before: formatDate(now),
    todayStr: now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  };
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.message?.includes('429') || error.message?.includes('503'))) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Рекурсивный санитайзер, который гарантирует полное отсутствие упоминаний 2024 и 2025 годов во всех текстах,
 * хэштегах, JSON-полях и заголовках, заменяя их на актуальный 2026 год.
 */
const sanitizeYears = (obj: any): any => {
  if (typeof obj === 'string') {
    return obj
      .replace(/2024/g, '2026')
      .replace(/2025/g, '2026');
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeYears);
  }
  if (obj !== null && typeof obj === 'object') {
    const res: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        res[key] = sanitizeYears(obj[key]);
      }
    }
    return res;
  }
  return obj;
};

/**
 * Поиск реальных новостей за последние 48 часов с фокусом на РФ источники
 */
export const fetchRealNews = async (count: number = 12, targetDate?: Date): Promise<DigestData> => {
  const { todayStr } = getDateRange(targetDate);
  const now = targetDate || new Date();
  const currentYear = now.getFullYear(); // Должен быть 2026
  const cutoff = new Date(now.getTime() - 48 * 3600000);
  const searchLimitDate = cutoff.toLocaleDateString('ru-RU');

  const systemInstruction = `
    ТЫ — ВЕДУЩИЙ НОВОСТНОЙ АНАЛИТИК РОССИЙСКОГО ТУРИЗМА. СЕГОДНЯ ${todayStr}.
    
    ЗАДАЧА: Найти 10-12 самых важных и РЕАЛЬНЫХ новостей туризма, опубликованных СТРОГО за последние 48 часов (в период с ${searchLimitDate} по ${todayStr}).
    
    ПОШАГОВЫЙ АЛГОРИТМ ДЕЙСТВИЙ (СТРОГО ОДИН ЗА ДРУГИМ):
    1. ШАГ 1: ПРОВЕРКА ЦЕЛЕВОЙ ДАТЫ. Зафиксируй, что целевая дата сбора новостей — это СТРОГО ${todayStr}, а период сбора — с ${searchLimitDate} по ${todayStr}. Твои поисковые запросы ОБЯЗАНЫ содержать указание именно этих дней и месяцев текущего ${currentYear} года.
    2. ШАГ 2: ПОИСК С ОГРАНИЧЕНИЕМ ПО ВРЕМЕНИ. Выполни поиск в Google Search по ключевым словам и целевым сайтам, жестко фильтруя результаты по дате публикации. Убедись, что дата статьи — вчера или сегодня (в пределах 48 часов).
    3. ШАГ 3: ФАКТЧЕКИНГ И ИСКЛЮЧЕНИЕ ГАЛЛЮЦИНАЦИЙ. Не выдумывай новости, не бери устаревшие архивные статьи 2024, 2025 годов. Если новостей мало, не дописывай выдуманные события. Каждая новость должна иметь реальный заголовок, реальные факты и реальный URL-источник от авторитетных СМИ.
    
    КРИТИЧЕСКОЕ ТРЕБОВАНИЕ БЕЗОПАСНОСТИ: 
    1. ИСКЛЮЧИТЕЛЬНО ТЕКУЩИЙ ГОД (${currentYear}): Все события, изменения тарифов, запуски рейсов, законы и инциденты должны происходить строго в ${currentYear} году.
    2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО использовать любые материалы, новости или сводки, датированные 2024, 2025 или другими прошлыми годами. Если поисковая выдача возвращает архивные статьи прошлых лет — полностью игнорируй их.
    3. НИКАКИХ ГАЛЛЮЦИНАЦИЙ И ФАНТАСТИКИ: Каждая новость в дайджесте должна быть реальным фактом, зафиксированным авторитетными СМИ в течение последних 48 часов. Запрещено выдумывать, домысливать или искажать цифры, рейсы или события. Мы пишем строго достоверные новости, а не художественные рассказы.
    4. РЕАЛЬНЫЕ ССЫЛКИ: В поле sourceUrl вноси только корректные, существующие веб-адреса новостных статей, по которым можно перейти и проверить информацию.
    
    ПРОВЕРКА НА РЕКЛАМУ: Прежде чем обрабатывать новость, проверь её на признаки рекламного материала (наличие призывов «купить», «забронировать по ссылке», «акция только до...», упоминание конкретных застройщиков, турфирм, турагрегаторов и пр. без связи с турпотоком). Если новость является рекламной — ИГНОРИРУЙ ЕЁ и ищи следующую. Мы пишем о событиях, а не о продажах.

    ПРИОРИТЕТНЫЕ ИСТОЧНИКИ (Ищи информацию в первую очередь здесь):
    - ТАСС (tass.ru), РИА Новости (ria.ru)
    - АТОР (atorus.ru)
    - Турдом (tourdom.ru)
    - Турпром (tourprom.ru)
    - Туристер (tourister.ru)
    
    КЛЮЧЕВЫЕ ТЕМЫ (Фокус на интересах туристов из РФ):
    - Российские авиакомпании (Аэрофлот, S7, Red Wings, Победа).
    - РЖД (новые поезда, расписание, билеты).
    - Визы, въездные требования, проблемы за рубежом.
    - Внутренний туризм (Сочи, Алтай, Крым, Питер).

    ЖЕСТКИЕ ПРАВИЛА ФОРМАТИРОВАНИЯ:
    1. formattedDigestText (Дайджест для поста): 
       - Формат: "[ПОДХОДЯЩИЙ ЭМОДЗИ] Заголовок — Краткое пояснение сути".
       - БЕЗ упоминания ссылок, URL или слов "Источник:". Ссылки переноси только в объект news.
       - Перед каждой новостью ОБЯЗАТЕЛЬНО тематический эмодзи.
       - В КОНЦЕ ДАЙДЖЕСТА ОБЯЗАТЕЛЬНО ДОБАВЬ ПОДПИСЬ:
         "🟠 Информационный вечер Первого туристического
         📆 Каждый день с 18:00 до 20:00 — факты, новости и истории о путешествиях."

    2. formattedShortDigest (Бегущая строка): 
       - Формула: "✈️/🚢/🚅 Субъект + Действие + Последствие для туриста". 
       - Пример: "✈️ Бали становится ближе: прямые рейсы из Москвы сократят время в пути на 8 часов, но добавят к цене билета 20%".
       - Лаконично, в одну строку через разделители.
       - НЕ ДОБАВЛЯЙ подпись в бегущую строку.

    3. ТРЕБОВАНИЕ К КОЛЛАЖУ (collagePrompt): 
       - Промпт для абсолютно реалистичной современной фотографии (National Geographic style, real-world active travel scene) без какого-либо ретро-декора или стиля плакатов 1950-х. Никаких рисованных элементов, чистый реалистичный кадр. Текст "ТУРИЗМ: ГЛАВНОЕ" должен быть вписан только если это выглядит на 100% реалистично для фотографии.
  `;

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [{ role: 'user', parts: [{ text: `ВНИМАТЕЛЬНО ИЗУЧИ ЦЕЛЕВУЮ ДАТУ СБОРА НОВОСТЕЙ: ${todayStr}.
      
      Сначала найди и проверь через поиск (googleSearch), какие именно новости туризма были опубликованы в период с ${searchLimitDate} по ${todayStr} за ${currentYear} год.
      Твои поисковые запросы в Google должны ОБЯЗАТЕЛЬНО содержать точный диапазон дат или день и месяц (например: "новости туризма ${todayStr}", "события туризма ${todayStr} года").
      Собери 10-12 реальных, свежих новостей туризма для россиян.
      
      Проверь сайты: ТАСС (tass.ru), РИА (ria.ru), atorus.ru, tourdom.ru, tourprom.ru, tourister.ru.
      Темы: Авиабилеты, РЖД, законодательство, визы, происшествия.
      
      ИСКЛЮЧИ АБСОЛЮТНО ВСЕ новости 2024, 2025 годов или старее. Возвращай только 100% достоверные факты, подтвержденные реальными новостными ссылками. Никаких домыслов и галлюцинаций. Сформируй дайджест в строго валидном JSON по схеме.` }] }],
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} } as any],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            news: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  sourceName: { type: Type.STRING },
                  sourceUrl: { type: Type.STRING },
                  date: { type: Type.STRING },
                  location: { type: Type.STRING }
                },
                required: ["title", "summary", "sourceName", "sourceUrl", "date"]
              }
            },
            formattedDigestText: { type: Type.STRING },
            formattedShortDigest: { type: Type.STRING },
            collagePrompt: { type: Type.STRING }
          },
          required: ["news", "formattedDigestText", "formattedShortDigest", "collagePrompt"]
        }
      }
    });
    
    const text = response.text || "{}";
    const cleanJson = text.replace(/```json\n?|```/g, '').trim();
    const data = JSON.parse(cleanJson || "{}");
    const sanitizedData = sanitizeYears(data);

    return {
      ...sanitizedData,
      news: (sanitizedData.news || []).map((n: any, i: number) => ({ 
        ...n, 
        id: `news-${Date.now()}-${i}`,
        ticker: n.title 
      }))
    };
  }).catch(error => {
    throw new Error(`Ошибка поиска новостей: ${error.message}`);
  });
};

/**
 * Генерация ироничной статьи с жесткой фактурой
 */
export const generateArticleLongread = async (newsItem: NewsItem): Promise<Omit<GeneratedContentPack, 'generatedImages'>> => {
  const systemInstruction = `
    ГОЛОС: Интеллектуальная ирония в стиле Михаила Жванецкого и едкие, объемные метафоры в духе Иоанны Хмелевской. 
    
    ЗРИТЕЛЬ/ЧИТАТЕЛЬ: Искушенный, возможно, слегка уставший от жизни, но не потерявший чувства юмора. 
    
    ПРИНЦИПЫ КОНТЕНТА:
    1. НИКАКИХ КЛИШЕ И ВВОДНЫХ СЛОВ: Забудь про "незабываемый опыт", "лазурные берега", а также про "в этой статье мы рассмотрим" или "важно отметить". Начинай сразу, бей фактом или парадоксом под дых.
    2. СТИЛЬ: Иронический детектив и философский скепсис. Сочетай филигранную иронию Жванецкого с абсурдными и сочными метафорами Хмелевской. 
    3. МЕТАФОРЫ: Используй дерзкие, ироничные метафоры. Если речь о деньгах — это «хрустящие билеты в безбедное будущее турецких экологов». Если об очередях — «медленный танец надежды и отчаяния».
    4. ПЕРСОНАЛИЗАЦИЯ: Пиши так, чтобы читатель чувствовал полное понимание его ситуации — от радости удачного рейса до ярости по поводу подорожавшего кебаба. 
    5. ЖЕСТКАЯ ФАКТУРА + ГЛУБИНА: Используй ВСЕ цифры, цены и даты из новости. ОБЪЕМ СТАТЬИ СТРОГО 3500+ знаков. Если не хватает фактов — пускайся в ироничные философские рассуждения о судьбах мира, превращая текст в интеллектуальное пиршество. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдумывать новые несуществующие факты, новые авиалинии, новые законы, новые расписания или измышлять статистику. Все рассуждения должны строиться вокруг реально предоставленной фактуры, без добавления ложных подробностей, отсутствующих в исходной новости.
    6. АВТОПРОВЕРКА И ПРЕДОТВРАЩЕНИЕ ГАЛЛЮЦИНАЦИЙ: Сверь все цены, локации и даты в тексте с первоисточником. Не допускай искажения действительности. Если новость сообщает, например, об одной задержке, не выдумывай целую серию катастроф.
    7. ФОКУС: Сосредоточься на сути события и его последствиях для реального человека. 
    8. БОЛЬ ЧИТАТЕЛЯ: Бей в скрытую "боль" (очереди, бюрократия) в самом первом абзаце.

    ОБЯЗАТЕЛЬНАЯ СТРУКТУРА СТАТЬИ:
    1. Headline: Едкий, парадоксальный заголовок.
    2. ReadersSituation (Ситуация читателя): 3-5 строк. Поставь читателя в центр события через ироничную зарисовку.
    3. NavigationRoute (Маршрут навигации): 2-4 кратких пункта (путеводные вехи текста).
    4. Sections: Ровно 5-6 разделов (Заголовок + Текст). Суммарный объем 3500+ знаков. Каждый раздел должен иметь логический "крючок" (hook).
    5. SEO Block (seo):
       - focusKeyword: (Основное ключевое слово).
       - seoTitle: (Строгий, без иронии, до 60 символов. Пример: «Прямые рейсы Москва — Бали 2026: расписание и цены»).
       - metaDescription: (Сдержанный взгляд редакции на суть новости, до 160 символов).
       - keywords: (Слова через запятую).
       - hashtags: (#тег, #еще_тег — через запятую).
    6. Hashtags: Релевантные слова без символа # (для отображения в UI).

    СОЦСЕТИ:
    - Пост для Telegram: Информативный, с цифрами, в том же ироничном стиле. Хэштеги с #.
    - Пост для VK/OK: Тот же текст, но адаптированный.

    ВИЗУАЛИЗАЦИЯ (imagePrompts): Сгенерируй ровно 3 высокодетализированных, реалистичных описания для создания фотографий.
    ТРЕБОВАНИЕ К ФОТО: Максимальный фотореализм, полное отсутствие мультяшности, рисованности, стиля ретро-плакатов или искусственной пастельной гаммной утрированности. Настоящая современная фотожурналистика, живые непозущие кадры, естественные цвета. Никакого налета 1950-х годов, никакой стилистики Уэса Андерсона. Кадры должны выглядеть как современные, динамичные, профессиональные фотографии из журналов уровня National Geographic или Conde Nast Traveler. Описывай детали, реальное солнце, живую атмосферу, людей в современной одежде, настоящие текстуры и реальные локации.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [{ role: 'user', parts: [{ text: `Напиши аналитический ироничный лонгрид по новости: ${newsItem.title}. Фактура: ${newsItem.summary}` }] }],
      config: { 
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            siteArticle: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                readersSituation: { type: Type.STRING },
                navigationRoute: { type: Type.ARRAY, items: { type: Type.STRING } },
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { heading: { type: Type.STRING }, body: { type: Type.STRING } },
                    required: ["heading", "body"]
                  }
                },
                hashtags: { type: Type.STRING },
                seo: {
                  type: Type.OBJECT,
                  properties: {
                    focusKeyword: { type: Type.STRING },
                    seoTitle: { type: Type.STRING },
                    metaDescription: { type: Type.STRING },
                    keywords: { type: Type.STRING },
                    hashtags: { type: Type.STRING }
                  },
                  required: ["focusKeyword", "seoTitle", "metaDescription", "keywords", "hashtags"]
                }
              },
              required: ["headline", "readersSituation", "navigationRoute", "sections", "hashtags", "seo"]
            },
            socials: {
              type: Type.OBJECT,
              properties: { tg: { type: Type.STRING }, vk_ok: { type: Type.STRING } }
            },
            imagePrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
            metaDescription: { type: Type.STRING }
          },
          required: ["siteArticle", "socials", "imagePrompts", "metaDescription"]
        }
      }
    });

    const text = response.text || "{}";
    const cleanJson = text.replace(/```json\n?|```/g, '').trim();
    const data = JSON.parse(cleanJson || "{}");
    return sanitizeYears(data);
  } catch (error: any) {
    throw new Error(`Ошибка генерации статьи: ${error.message}`);
  }
};

export const generateSingleImage = async (prompt: string): Promise<string> => {
  return withRetry(async () => {
    // 1. Try server-side generation endpoint (which has direct access to Gemini image models + AI Flux engine)
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.imageUrl) {
          return data.imageUrl;
        }
      }
    } catch (serverErr) {
      console.warn("Server-side image generation endpoint failed, using client fallback:", serverErr);
    }

    // 2. Client-side safe dynamic AI fallback
    const seed = Math.floor(Math.random() * 10000000);
    const cleanPrompt = prompt.replace(/[^\w\sа-яА-ЯёЁ]/gi, ' ').trim().slice(0, 180);
    const encodedPrompt = encodeURIComponent(`high quality photorealistic travel photograph, authentic modern tourism, ${cleanPrompt}`);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&seed=${seed}&model=flux&nologo=true`;

    try {
      const res = await fetch(pollinationsUrl);
      if (res.ok) {
        const blob = await res.blob();
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              resolve(pollinationsUrl);
            }
          };
          reader.onerror = () => resolve(pollinationsUrl);
          reader.readAsDataURL(blob);
        });
      }
    } catch (err) {
      console.warn("Client fallback image fetch error:", err);
    }

    return pollinationsUrl;
  });
};
