
import React, { useState, useEffect } from 'react';
import { fetchRealNews, generateArticleLongread, generateSingleImage } from './services/geminiService';
import { AppState, DigestData, GeneratedContentPack, PublishingConfig, NewsItem } from './types';
import { ResultViewer } from './components/ResultViewer';
import { DigestPostViewer } from './components/DigestPostViewer';
import { SettingsModal } from './components/SettingsModal';
import { AddNewsModal } from './components/AddNewsModal';
import { BillingModal } from './components/BillingModal';
import { MAX_SELECTION } from './constants';
import { addTextAndDateToImage } from './utils/imageOverlay';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [generatedResults, setGeneratedResults] = useState<GeneratedContentPack[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [isCollageGenerating, setIsCollageGenerating] = useState(false);
  const [collageError, setCollageError] = useState<string>('');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddNewsOpen, setIsAddNewsOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  
  const [paidGenerationsLeft, setPaidGenerationsLeft] = useState<number>(() => {
    const saved = localStorage.getItem('tourgenius_paid_generations');
    return saved !== null ? parseInt(saved, 10) : 5;
  });
  
  const [pubConfig, setPubConfig] = useState<PublishingConfig>({
    smmBoxToken: 'sbx.1NDk4MTk2.T2lsdjYzZl9XU0p2aWRSbmFKOHhUYzN4MEdVd2o4bVZ3NUpNOGF0TEZTMFlnM0YtSW5KQ3YxbUV2bmRkT204Zg==.4tfvuvX3nWgpY6r3zRo9G2c1PtQj6-LgsxuR0jpb67Q=', 
    targetGroupName: 'Первый туристический',
    useProxy: true, // Включено по умолчанию для обхода CORS
    proxyProvider: 'auto', // По умолчанию авто-подбор
    wordPress: { url: '', username: '', applicationPassword: '' }
  });

  useEffect(() => {
    localStorage.setItem('tourgenius_paid_generations', paidGenerationsLeft.toString());
  }, [paidGenerationsLeft]);

  useEffect(() => {
    const saved = localStorage.getItem('tourgenius_settings');
    if (saved) { 
      try { 
        setPubConfig(prev => ({...prev, ...JSON.parse(saved)})); 
      } catch(e) {} 
    }

    try {
      const savedState = localStorage.getItem('tourgenius_app_data');
      if (savedState) {
        const { digest: sDigest, results: sResults, state: sState } = JSON.parse(savedState);
        if (sDigest) setDigest(sDigest);
        if (sResults) setGeneratedResults(sResults);
        // Avoid setting SEARCHING or GENERATING states from storage to prevent getting stuck
        if (sState && sState !== AppState.SEARCHING && sState !== AppState.GENERATING_CONTENT) {
          setAppState(sState);
        }
      }
    } catch(e) {
      console.error("Failed to load app state", e);
      localStorage.removeItem('tourgenius_app_data');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('tourgenius_app_data', JSON.stringify({
        digest,
        results: generatedResults,
        state: appState
      }));
    } catch (e) {
      console.warn("Storage limit reached, data not saved", e);
      // If quota exceeded, we might want to at least save the state
      try {
        localStorage.setItem('tourgenius_app_data', JSON.stringify({ state: appState }));
      } catch (e2) {}
    }
  }, [digest, generatedResults, appState]);

  const handleFetchNews = async (targetDateStr?: string) => {
    if (paidGenerationsLeft <= 0) {
      setIsBillingOpen(true);
      return;
    }
    
    setAppState(AppState.SEARCHING);
    setErrorStatus(null);
    setSelectedNewsIds([]);
    
    const parsedDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const formattedDateStr = parsedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    setStatusMessage(`Ищем свежие новости за 48 часов к дате: ${formattedDateStr}...`);
    
    try {
      const data = await fetchRealNews(12, parsedDate);
      setPaidGenerationsLeft(prev => Math.max(0, prev - 1));
      setDigest(data);
      setAppState(AppState.SELECTING);
      
      if (data.collagePrompt) {
        setIsCollageGenerating(true);
        setCollageError('');
        generateSingleImage(data.collagePrompt)
          .then(async (imageUrl) => {
            const day = String(parsedDate.getDate()).padStart(2, '0');
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const year = parsedDate.getFullYear();
            const collageDateStr = `${day}.${month}.${year}`;
            
            const imageWithText = await addTextAndDateToImage(imageUrl, "НОВОСТИ ТУРИЗМА", collageDateStr);
            setDigest(prev => prev ? ({ ...prev, collageImage: imageWithText }) : null);
            setIsCollageGenerating(false);
          })
          .catch((e: any) => {
            console.error("Collage generation failed", e);
            setCollageError(e.message || "Ошибка генерации обложки");
            setIsCollageGenerating(false);
          });
      }
    } catch (e: any) { 
        setAppState(AppState.IDLE);
        let msg = e.message;
        
        if (msg.includes("429") || msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("exhausted") || msg.toLowerCase().includes("billing")) {
            setPaidGenerationsLeft(0);
            setIsBillingOpen(true);
        }
        
        // Уточняем ошибку для пользователей из РФ
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
            msg = "Ошибка сети (Failed to fetch). Если вы в РФ, обязательно включите VPN (Google AI недоступен напрямую).";
        } else if (msg.includes("429")) {
            msg = "Превышена квота API Google (429). Подождите 1-2 минуты.";
        } else if (msg.includes("403")) {
            msg = "Ошибка доступа (403). Проверьте API Key или включите VPN.";
        }
        setErrorStatus(msg);
    }
  };

  const handleToggleSelection = (id: string) => {
    setSelectedNewsIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length < MAX_SELECTION) return [...prev, id];
      return prev;
    });
  };

  const handleGenerate = async () => {
    if (selectedNewsIds.length === 0) return;
    
    if (paidGenerationsLeft <= 0) {
      setIsBillingOpen(true);
      return;
    }
    
    setAppState(AppState.GENERATING_CONTENT);
    setGeneratedResults([]);
    setErrorStatus(null);
    
    const itemsToGenerate = digest?.news.filter(n => selectedNewsIds.includes(n.id)) || [];
    
    for (let i = 0; i < itemsToGenerate.length; i++) {
      if (paidGenerationsLeft <= 0) {
        setIsBillingOpen(true);
        setAppState(AppState.COMPLETED);
        break;
      }
      
      const currentNews = itemsToGenerate[i];
      try {
        setStatusMessage(`[${i+1}/${itemsToGenerate.length}] Пишем ироничный лонгрид: ${currentNews.title}...`);
        const pack = await generateArticleLongread(currentNews);
        setPaidGenerationsLeft(prev => Math.max(0, prev - 1));
        
        setStatusMessage(`[${i+1}/${itemsToGenerate.length}] Генерируем 3 фото-иллюстрации...`);
        const imgs: string[] = [];
        let lastImgError = "";
        for (const prompt of (pack.imagePrompts || []).slice(0, 3)) {
          try {
            const img = await generateSingleImage(prompt);
            imgs.push(img);
          } catch (e: any) {
            console.error("Image generation failed", e);
            lastImgError = e.message || "Ошибка генерации картинки";
          }
        }
        
        setGeneratedResults(prev => [...prev, { 
          ...pack, 
          newsId: currentNews.id, 
          generatedImages: imgs,
          error: lastImgError || undefined
        }]);
      } catch (e: any) { 
        console.error(e);
        const msg = e.message.includes("429") ? "Ошибка: Превышена квота (429)" : "Ошибка генерации";
        setGeneratedResults(prev => [...prev, { 
          newsId: currentNews.id, 
          siteArticle: { headline: "Ошибка генерации", sections: [{heading: "Упс", body: msg}], hashtags: "" },
          socials: { tg: msg, vk_ok: msg },
          imagePrompts: [],
          metaDescription: msg,
          generatedImages: [] 
        }]);
      }
    }
    setAppState(AppState.COMPLETED);
  };

  const handleAddManualNews = (news: { title: string; summary: string; location: string; sourceUrl: string }) => {
    const newItem: NewsItem = {
        id: `manual-${Date.now()}`,
        title: news.title,
        summary: news.summary,
        location: news.location,
        ticker: news.title,
        date: new Date().toLocaleDateString('ru-RU'),
        sourceUrl: news.sourceUrl || '',
        sourceName: 'Ручной ввод'
    };

    if (!digest) {
        setDigest({
            news: [newItem],
            formattedDigestText: `📌 ${newItem.title} — ${newItem.summary}`,
            formattedShortDigest: `📌 ${newItem.title}`,
            collagePrompt: `Photography: ${newItem.title}`
        });
        setAppState(AppState.SELECTING);
    } else {
        setDigest({ ...digest, news: [newItem, ...digest.news] });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={pubConfig} onSave={setPubConfig} />
      <AddNewsModal isOpen={isAddNewsOpen} onClose={() => setIsAddNewsOpen(false)} onAdd={handleAddManualNews} />

      <nav className="bg-white h-20 flex items-center px-8 border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-brand-dark font-black tracking-tighter text-3xl italic leading-none">TOUR<span className="text-brand-orange">GENIUS</span></h1>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Контент-платформа Телеканала</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
           <button 
              onClick={() => setIsBillingOpen(true)} 
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${paidGenerationsLeft <= 0 ? 'bg-red-50 text-red-500 border-red-200 animate-pulse' : 'bg-orange-50 text-brand-orange border-orange-100 hover:bg-brand-orange hover:text-white'}`}
              id="balance-topup-btn"
           >
              💳 Баланс: {paidGenerationsLeft} ИИ
           </button>
           {(appState === AppState.SELECTING || appState === AppState.IDLE) && (
               <button onClick={() => setIsAddNewsOpen(true)} className="bg-brand-orange text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg hover:scale-105 transition-all">➕ Своя тема</button>
           )}
           <button onClick={() => setIsSettingsOpen(true)} className="w-12 h-12 bg-white flex items-center justify-center rounded-xl border border-slate-100 transition-all text-lg hover:shadow-md hover:border-brand-orange/20">⚙️</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {errorStatus && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl mb-6 text-sm font-bold text-center animate-fade-in shadow-sm">
            ⚠️ {errorStatus}
          </div>
        )}

        {appState === AppState.IDLE && (
          <div className="bg-white rounded-[4rem] p-16 md:p-24 shadow-2xl border border-slate-50 text-center mt-12 animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-black text-brand-dark mb-8 uppercase italic leading-tight">Первый <br/><span className="text-brand-orange">Туристический</span></h2>
            <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-medium italic">Автоматизированная редакция: поиск актуальных событий за 48 часов и создание едкой аналитики.</p>
            
            <div className="max-w-xs mx-auto mb-10 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">📅 Дата сбора новостей:</label>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-black text-brand-dark focus:ring-2 focus:ring-brand-orange outline-none text-center cursor-pointer"
              />
            </div>

            <button onClick={() => handleFetchNews(selectedDate)} className="bg-brand-dark text-white px-16 md:px-20 py-6 md:py-7 rounded-3xl font-black uppercase tracking-widest hover:bg-brand-orange transition-all shadow-2xl transform hover:scale-105 active:scale-95">Искать свежие новости</button>
          </div>
        )}

        {appState === AppState.SEARCHING && (
          <div className="flex flex-col items-center py-48">
             <div className="w-20 h-20 border-8 border-brand-orange border-t-transparent rounded-full animate-spin mb-10"></div>
             <h3 className="text-3xl font-black text-brand-dark uppercase italic animate-pulse text-center max-w-3xl leading-relaxed">{statusMessage}</h3>
             <p className="mt-4 text-slate-400 font-bold uppercase text-xs tracking-widest">Процесс может занять до 30 секунд</p>
          </div>
        )}

        {(appState === AppState.SELECTING || appState === AppState.GENERATING_CONTENT || appState === AppState.COMPLETED) && digest && (
          <div className="space-y-12 animate-fade-in">
            {appState === AppState.SELECTING && (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-2xl sticky top-24 z-40">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-3xl font-black text-brand-dark uppercase italic">Выбор тем на сегодня</h2>
                      <button 
                        onClick={() => setAppState(AppState.IDLE)} 
                        className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-100 px-3 py-1.5 rounded-lg transition-all"
                      >
                        ⬅️ Сменить дату
                      </button>
                    </div>
                    <p className="text-[11px] font-black text-brand-orange uppercase mt-2">Выбрано: {selectedNewsIds.length} из {MAX_SELECTION}</p>
                </div>
                <button 
                  onClick={handleGenerate} 
                  disabled={selectedNewsIds.length === 0} 
                  className={`px-14 py-5 rounded-2xl font-black uppercase text-sm shadow-2xl transition-all ${selectedNewsIds.length > 0 ? 'bg-brand-orange text-white hover:scale-105 active:scale-95' : 'bg-slate-50 text-slate-300 cursor-not-allowed border'}`}
                >
                  Создать лонгриды ({selectedNewsIds.length})
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-4 h-fit">
                  <DigestPostViewer 
                    digest={digest} 
                    pubConfig={pubConfig} 
                    isGeneratingImage={isCollageGenerating} 
                    imageError={collageError}
                  />
                </div>
                <div className="lg:col-span-8 space-y-10 pb-20">
                   {appState === AppState.SELECTING ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {digest.news.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => handleToggleSelection(n.id)}
                            className={`group p-8 rounded-[2.5rem] border-4 transition-all bg-white flex flex-col cursor-pointer relative ${selectedNewsIds.includes(n.id) ? 'border-brand-orange shadow-2xl scale-[1.02]' : 'border-slate-50 shadow-lg'}`}
                          >
                             <div className="flex justify-between items-center mb-4">
                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${selectedNewsIds.includes(n.id) ? 'bg-brand-orange text-white border-brand-orange' : 'bg-slate-50 text-slate-500'}`}>{n.sourceName}</span>
                                <span className="text-[10px] font-black uppercase text-brand-orange">📅 {n.date}</span>
                             </div>
                             <h4 className={`font-black text-xl mb-3 leading-tight ${selectedNewsIds.includes(n.id) ? 'text-brand-orange' : 'text-brand-dark'}`}>{n.title}</h4>
                             <p className="text-slate-500 text-sm leading-relaxed line-clamp-4 mb-6">{n.summary}</p>
                             <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                                {n.sourceUrl && <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-black text-slate-400 uppercase hover:text-brand-orange transition-colors">🔗 Источник</a>}
                                {selectedNewsIds.includes(n.id) && <span className="text-brand-orange font-black text-xs uppercase animate-pulse">В плане ✅</span>}
                             </div>
                          </div>
                        ))}
                      </div>
                   ) : (
                      <div className="space-y-12">
                        {appState === AppState.GENERATING_CONTENT && (
                           <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border-2 border-brand-orange border-dashed text-center animate-pulse">
                              <p className="font-black uppercase text-brand-dark text-lg mb-2">{statusMessage}</p>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                 <div className="bg-brand-orange h-full animate-progress-indefinite"></div>
                              </div>
                           </div>
                        )}
                        {generatedResults.length > 0 ? (
                          generatedResults.map(res => (
                            <ResultViewer 
                              key={res.newsId} 
                              pack={res} 
                              pubConfig={pubConfig} 
                              paidGenerationsLeft={paidGenerationsLeft}
                              setPaidGenerationsLeft={setPaidGenerationsLeft}
                              onOpenBilling={() => setIsBillingOpen(true)}
                            />
                          ))
                        ) : appState === AppState.COMPLETED && (
                          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-slate-400 font-bold uppercase">Ничего не было сгенерировано. Проверьте логи.</p>
                          </div>
                        )}
                      </div>
                   )}
                </div>
            </div>
          </div>
        )}
      </main>
      
      <BillingModal 
        isOpen={isBillingOpen} 
        onClose={() => setIsBillingOpen(false)} 
        onRefill={(amount) => {
          setPaidGenerationsLeft(prev => prev + amount);
          setIsBillingOpen(false);
        }} 
        generationsLeft={paidGenerationsLeft} 
      />

      <style>{`
        @keyframes progress-indefinite {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(100%); width: 60%; }
          100% { transform: translateX(300%); width: 30%; }
        }
        .animate-progress-indefinite {
          animation: progress-indefinite 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default App;
