"""Fourteen-day speech warmups; existing scheduler/outbox, no recording or grading."""
import datetime as dt
import json
from pathlib import Path
import re
import threading
import time

START = dt.date(2026, 10, 29)
PERIODS = {'am': ('07:45', '08:00', 'Зарядка для рта'),
           'pm': ('19:00', '19:20', 'Вечерняя читка'),
           'camera': ('14:00', '14:20', 'Тренировка оператора')}

# The mechanical rails stay explicit and safe; AI does not invent repetitions.
BREATH = (
    ('Свеча', 'Сделай обычный спокойный вдох носом. Плавно выдохни на «ф-ф-ф», без усилия и задержки дыхания. Повтори 5 раз; между повторами дыши как обычно.'),
    ('Тихое «с»', 'После спокойного вдоха выдохни на ровном негромком «с-с-с» 3 секунды. Сделай 5 повторов с обычным дыханием между ними.'),
    ('Гудок', 'На удобной высоте негромко протяни «м-м-м» 3 секунды. Повтори 5 раз. Не добирай звук из последних остатков воздуха.'),
    ('Волна', 'На спокойном выдохе негромко произнеси «ву-ву-ву». Сделай 5 подходов по 3 слога, отдыхая один обычный вдох между подходами.'),
)
LIPS = (
    ('Улыбка — трубочка', 'Слегка улыбнись, затем мягко вытяни губы вперёд. Вернись в улыбку. Это один повтор. Сделай 10 повторов, не сжимая зубы.'),
    ('Хомяк', 'Немного надуй щёки. Переведи воздух из левой щеки в правую и обратно. Это один цикл. Сделай 8 циклов; после каждых 4 расслабь губы.'),
    ('Губное «па»', 'Произнеси «па-по-пу-пы» медленно, отчётливо смыкая губы на «п». Повтори ряд 5 раз; громкость обычная.'),
    ('Кольцо гласных', 'Произнеси «а-о-у-и» в спокойном темпе, меняя положение губ. Повтори ряд 6 раз. Между рядами на секунду расслабляй лицо.'),
    ('Немой дубль', 'Без голоса ясно обозначь губами «ма-ма», затем произнеси это же негромко. Сделай 5 таких пар, не утрируя движения челюсти.'),
)
TONGUE = (
    ('Часики', 'Приоткрой рот. Коснись языком левого уголка губ, затем правого. Это один цикл. Сделай 8 циклов, сохраняя подбородок неподвижным.'),
    ('Лошадка', 'Спокойно поцокай языком 15 раз. После каждых 5 цоканий расслабь язык. Движение небольшое, челюстью не подталкивай.'),
    ('Верхняя губа', 'Проведи языком по верхней губе слева направо, затем обратно. Сделай 6 циклов без помощи нижней челюсти.'),
    ('Точные «та-да»', 'Чётко произнеси «та-да, то-до, ту-ду». Повтори весь ряд 5 раз медленно. Не ускоряйся в последнем повторе.'),
    ('Широкий язык', 'Приоткрой рот и спокойно положи широкий расслабленный язык на нижнюю губу на 3 секунды. Убери язык и расслабь губы. Повтори 5 раз.'),
    ('Кончик языка', 'Приоткрой рот. По очереди коснись кончиком языка места за верхними, затем за нижними передними зубами. Сделай 8 циклов без нажима.'),
    ('Лёгкое «ла»', 'Произнеси «ла-ло-лу-лы» отчётливо, без ускорения. Повтори ряд 5 раз. Затем скажи «лампа, лодка, луна» 2 раза.'),
)

# Different combinations on every one of fourteen days, then deliberate repetition.
MORNING = tuple((i % len(BREATH), (i * 2 + i // 5) % len(LIPS),
                 (i * 3 + i // 7) % len(TONGUE)) for i in range(14))
SOUND = (
    ('С, З, Ц', 'са-со-су; за-зо-зу; ца-цо-цу', 'У Сони семь синих сумок.'),
    ('Ш, Ж, Ч, Щ', 'ша-шо-шу; жа-жо-жу; ча-чо-чу; ща-щё-щу', 'Шесть мышат шуршат в камышах.'),
    ('Р, Л', 'ра-ро-ру; ла-ло-лу', 'На дворе трава, на траве дрова.'),
    ('П, Б, Т, Д, К, Г', 'па-ба; та-да; ка-га', 'Пётр передал брату пакет.'),
    ('Смысловые паузы', '', 'Утром мы нашли ключ. Но дверь открылась только вечером.'),
    ('Интонация диктора', '', 'Сегодня у нашей команды появилась новая история.'),
    ('Повтор недели', '', 'Камера готова. Свет включён. Можно начинать.'),
)


def cycle(day):
    return (dt.date.fromisoformat(day) - START).days % 14


def exercises(day, period, reading=''):
    index = cycle(day)
    if period == 'am':
        a, b, c = MORNING[index]
        return [BREATH[a], LIPS[b], TONGUE[c]]
    weekday = dt.date.fromisoformat(day).weekday()
    title, syllables, phrase = SOUND[weekday]
    warm = LIPS[(index + 2) % len(LIPS)] if index % 2 == 0 else TONGUE[(index + 1) % len(TONGUE)]
    if weekday < 4:
        drill = ('Звук дня: ' + title,
            ('Медленно произнеси «' + syllables + '». Повтори весь ряд 4 раза.' if index < 7 else
             'Скажи «' + phrase + '» 4 раза медленно и 2 раза в среднем темпе. Чёткость важнее скорости.'))
    elif weekday == 4:
        drill = (title, 'Прочитай «' + phrase + '» 3 раза: сначала с паузой на каждой точке, затем выделяя голосом «ключ», затем «вечером».')
    elif weekday == 5:
        drill = (title, 'Скажи «' + phrase + '» 3 раза: как новость, с удивлением и таинственно. Слова сохраняй, меняй интонацию.')
    else:
        drill = (title, 'Скажи «' + phrase + '» 3 раза медленно. Затем выбери один ряд слогов из читок этой недели и повтори его 4 раза без ускорения.')
    text = reading or 'Мы нашли старую карту. На ней не было названий улиц. Зато один маршрут был отмечен красным.'
    read = ('Чтение вслух', 'Прочитай текст 2 раза. В первый раз спокойно разделяй фразы паузами; во второй выдели голосом одно главное слово.\n«' + text + '»')
    return [warm, drill, read]


def install(s):
    old_reminders = s['class_reminders']
    lock = threading.RLock()
    last_check = [0.0]

    def edition(period):
        day = s['today']()
        kind = 'speech-workout-' + period
        with s['conn']() as c:
            saved = c.execute('select body from daily_content where day=? and kind=?', (day, kind)).fetchone()
            previous = [r[0][-600:] for r in c.execute('select body from daily_content where kind=? and day<? order by day desc limit 7', (kind, day))]
        if saved:
            return saved['body']
        if period == 'camera':
            plans = json.loads(Path(__file__).with_name('camera_training.json').read_text())
            n = (dt.date.fromisoformat(day) - dt.date(2026, 10, 30)).days % len(plans)
            task = plans[n]
            body = '📷 14:00 / Тренировка оператора · ' + str(n+1) + ' из 15\n\n' + task['title'] + '\n\n' + task['task'] + '\n\nПроверь себя: ' + task['check'] + '\n\nСамостоятельная тренировка. Разбор кадра по кнопке — только если хочется.'
            with s['conn']() as c:c.execute('insert or ignore into daily_content(day,kind,title,body) values(?,?,?,?)',(day,kind,task['title'],body))
            return body
        # AI changes the presentation and evening reading, never the exercise mechanics.
        obj = {}
        if s.get('AI_KEY'):
            try:
                obj = s['ai_json']('Ты Кими. Подготовь живое короткое вступление к речевой ' +
                    ('зарядке утром' if period == 'am' else 'читке вечером') + '. До 100 знаков. '
                    'Не проси ответа, отчёта, записи или отправки чего-либо. Не оценивай навыки, не обещай наград. '
                    'Для вечера придумай НОВЫЙ связный текст из 3 коротких предложений, до 280 знаков, '
                    'без исторических фактов, чисел, названий реальных людей и сложных слов. Для утра reading пустой. '
                    'Не повторяй мысли recent. JSON {"intro":"...","reading":"..."}.',
                    json.dumps(dict(date=day, period=period, cycle_day=cycle(day)+1, recent=previous), ensure_ascii=False), 550) or {}
            except Exception as error:
                print('SPEECH AI unavailable', type(error).__name__, flush=True)
        intro = obj.get('intro', '')
        reading = obj.get('reading', '')
        banned = re.compile(r'пришл|отправ|запиш|запис[ьи]|голосов|рапорт|оцени|отч[её]т', re.I)
        if not isinstance(intro, str) or len(intro) > 120 or banned.search(intro) or '<' in intro:
            intro = ''
        if not isinstance(reading, str) or not 40 <= len(reading) <= 320 or banned.search(reading) or '<' in reading:
            reading = ''
        items = exercises(day, period, reading)
        body = '🗣 ' + PERIODS[period][2] + ' · ' + PERIODS[period][0] + '\nДень ' + str(cycle(day)+1) + ' из 14\n'
        if intro:
            body += '\n' + intro.strip() + '\n'
        body += '\n' + '\n\n'.join(str(i) + '. ' + title + '\n' + task for i, (title, task) in enumerate(items, 1))
        body += '\n\nДелай спокойно, без натуживания. Разминка самостоятельная — отвечать боту не требуется.'
        if period == 'pm':
            if Path('/opt/timecode-speech/READY').exists():body += ' Проверка чтения по кнопке — по желанию.'
            expected = items[-1][1].rsplit('«', 1)[-1].rsplit('»', 1)[0]
            with s['conn']() as c:c.execute('insert or ignore into daily_content(day,kind,title,body) values(?,?,?,?)',(day,'speech-reading-pm','Текст для чтения',expected))
        with s['conn']() as c:
            c.execute('insert or ignore into daily_content(day,kind,title,body) values(?,?,?,?)', (day, kind, PERIODS[period][2], body))
            return c.execute('select body from daily_content where day=? and kind=?', (day, kind)).fetchone()['body']

    def deliver(period):
        clock = s['now']().strftime('%H:%M')
        start, end, title = PERIODS[period]
        with s['conn']() as c:
            c.execute('update notification_outbox set delivered=-2 where delivered=0 and message_key like ? '
                'and (day<? or (day=? and ? >= ?))',
                ('speech-workout:'+period+':%', s['today'](), s['today'](), clock, end))
        if s['today']() < START.isoformat() or not start <= clock < end:
            return
        key = 'speech-workout:' + period + ':' + s['today']()
        with lock:
            with s['conn']() as c:
                if c.execute('select 1 from notification_outbox where day=? and message_key=? limit 1', (s['today'](), key)).fetchone():
                    return
            body = edition(period)
            buttons = None
            if period == 'camera':buttons = [[{'text':'📷 Проверить мой кадр','callback_data':'tr:camera:'+s['today']()}]]
            if period == 'pm' and Path('/opt/timecode-speech/READY').exists():buttons = [[{'text':'🎙 Хочу проверить чтение','callback_data':'tr:speech:'+s['today']()}]]
            with s['conn']() as c:
                targets = [r['id'] for r in c.execute('select id from users where enabled=1')]
                for uid in targets:
                    if s.get('teacher_daily_enabled') and not s['teacher_daily_enabled'](uid):
                        continue
                    c.execute('insert or ignore into notification_outbox(day,message_key,chat,body,keyboard) values(?,?,?,?,?)',
                        (s['today'](), key, json.dumps(uid), s['esc'](body), json.dumps(buttons,ensure_ascii=False)))
            s['retry_notifications'](key)

    def reminders():
        # Same scheduler and ticks. Limited catch-up never sends yesterday or midnight workouts.
        current = time.monotonic()
        if current - last_check[0] >= 10:
            last_check[0] = current
            for period in PERIODS:
                try:
                    deliver(period)
                except Exception as error:
                    print('SPEECH pending', period, type(error).__name__, flush=True)
        return old_reminders()

    s.update(class_reminders=reminders, speech_workout=edition)
