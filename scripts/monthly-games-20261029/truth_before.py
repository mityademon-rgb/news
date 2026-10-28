"""A daily, source-checked cinema riddle; only name and score are public."""
import datetime as dt
import hashlib
import json
import urllib.parse
import re

SITES=('starwars.com','oscars.org','soundworkscollection.com','lucasfilm.com')
BANK=(
 {'question':'Правда ли, что акулу из «Челюстей» назвали в честь адвоката режиссёра?','answer':True,'explanation':'Да. Механическую акулу Спилберг назвал Брюс — в честь своего адвоката Брюса Реймера. Даже у акулы на съёмках оказался юридический представитель.','source':'https://www.oscars.org/museum/only-surviving-jaws-shark-acquired-academy-museum'},
 {'question':'Правда ли, что голос Чубакки собрали из записей настоящих животных?','answer':True,'explanation':'Да. Звукорежиссёр Бен Бёртт смешивал записи медведей, барсуков и львов. Для космического разговора пригодился вполне земной зверинец.','source':'https://www.starwars.com/news/8-behind-the-scenes-facts-you-might-not-know-about-chewbacca'},
 {'question':'Правда ли, что голос Чубакки — это только рычание актёра в костюме, без звуков животных?','answer':False,'explanation':'Нет. Голос собрал Бен Бёртт из записей животных, в том числе медведей, барсуков и львов. Костюм — актёру, рычание — целому зверинцу.','source':'https://www.starwars.com/news/8-behind-the-scenes-facts-you-might-not-know-about-chewbacca'})

def install(s):
    old_init=s['init'];old_callback=s['callback']
    def tables(c):
        c.execute('create table if not exists truth_daily(day text primary key,body text not null)')
        c.execute('create table if not exists truth_results(day text not null,user_id integer not null,score integer not null,primary key(day,user_id))')
    def init():
        old_init()
        with s['conn']() as c:tables(c)

    def daily():
        with s['conn']() as c:
            tables(c);row=c.execute('select body from truth_daily where day=?',(s['today'](),)).fetchone()
        if row:return json.loads(row['body'])
        # No stale three-question fallback. If Kimi/source fails, skip instead of recycling Chewbacca.
        item=None
        with s['conn']() as c:
            history=[json.loads(r[0]) for r in c.execute('select body from truth_daily where day<? order by day desc limit 45',(s['today'](),))]
        stop={'правда','вымысел','ли','что','это','из','для','или','без','как','на','в','а','и','о','про','голос','только'}
        def terms(v):
            return {x for x in re.findall(r'[а-яёa-z]{4,}',str(v).lower()) if x not in stop}
        def repeated(candidate):
            terms_new=terms(candidate.get('question',''))
            for prior in history:
                old=terms(prior.get('question',''))
                if terms_new and old and len(terms_new & old)/max(1,min(len(terms_new),len(old)))>=0.45:return True
                for word in ('чубакк','челюст','трейлер','академическ'):
                    if word in str(candidate.get('question','')).lower() and word in str(prior.get('question','')).lower():return True
            return False

        if s.get('AI_KEY'):
            try:
                directions=('unexpected camera practical effect behind scenes cinema','cinema editing continuity mistake film production','movie sound foley recording unexpected fact','cinematography lighting camera invention filmmaking','movie costume props makeup production surprising fact','film animation stop motion optical effects history','film director actor casting behind the scenes fact')
                direction=directions[dt.date.fromisoformat(s['today']()).toordinal()%len(directions)]
                page=s['industry_search'](direction+' '+s['today'](),SITES)
                if page:
                    prompt='Ты TIMECODE. Из подтверждённого факта в источнике сделай одну смешную загадку школьникам о закулисье кино. Утверждение до 200 знаков, ответ — строго true или false; можно перевернуть один факт, чтобы получить вымысел. Объяснение 2–3 разговорных предложения до 450 знаков, точная шутка или без неё. Не придумывай факты и не задавай теоретический вопрос. JSON {"question":"Правда ли, что ...?","answer":true,"explanation":"..."}.'
                    prompt+=' Не повторяй темы из recent_questions и вариации этих сюжетов. Другой факт, другой фильм и другой приём.'
                    candidate=s['ai_json'](prompt,json.dumps({'source':page,'recent_questions':[x.get('question','') for x in history]},ensure_ascii=False),550) or {}
                    check=s['ai_json']('Проверь по SOURCE, что ответ на загадку однозначен, а объяснение прямо подтверждается источником. Для false источник должен прямо опровергать утверждение, а не просто молчать о нём. Нет домыслов. JSON {"ok":true}.',json.dumps({'SOURCE':page,'riddle':candidate},ensure_ascii=False),200) or {}
                    if check.get('ok') is True and not repeated(candidate) and isinstance(candidate.get('answer'),bool) and 25<=len(str(candidate.get('question','')))<=220 and 40<=len(str(candidate.get('explanation','')))<=500:
                        item={**candidate,'source':page['url']}
            except Exception as error:print('Truth riddle fallback:',type(error).__name__,flush=True)
        if item is None: raise RuntimeError('truth-original-verified-question-unavailable; no recycled fallback')
        with s['conn']() as c:
            c.execute('insert or ignore into truth_daily values(?,?)',(s['today'](),json.dumps(item,ensure_ascii=False)))
            return json.loads(c.execute('select body from truth_daily where day=?',(s['today'](),)).fetchone()['body'])

    def queue(c,text,keyboard=None,targets=None,key=None):
        key=key or hashlib.sha256(text.encode()).hexdigest()[:24]
        if targets is None:
            targets=[r['id'] for r in c.execute('select id from users where enabled=1')]
            if s.get('GROUP'):targets.append(s['GROUP'])
        for chat in set(targets):c.execute('insert or ignore into notification_outbox(day,message_key,chat,body,keyboard) values(?,?,?,?,?)',(s['today'](),key,json.dumps(chat),text,json.dumps(keyboard,ensure_ascii=False)))
        return key

    def ballot_token(item):
        return s['today']()+str(item.get('revision',''))

    def invite():
        item=daily();keyboard=[[{'text':'Правда','callback_data':'tg:'+ballot_token(item)+':1'},{'text':'Вымысел','callback_data':'tg:'+ballot_token(item)+':0'}]]
        text='🎬 ПРАВДА ИЛИ ВЫМЫСЕЛ\n\n'+item['question']+'\n\nОдна загадка, два варианта. Нажми — сразу покажу ответ и расскажу, как это было. Остальные увидят только твоё имя и результат.'
        with s['conn']() as c:key=queue(c,text,keyboard)
        s['retry_notifications'](key)

    def callback(q):
        data=q.get('data','')
        if not data.startswith('tg:'):return old_callback(q)
        if q.get('id')!='max':s['api']('answerCallbackQuery',{'callback_query_id':q.get('id')})
        uid=(q.get('from') or {}).get('id')
        if not s['allowed'](uid):return
        parts=data.split(':')
        if len(parts)!=3 or parts[2] not in ('0','1'):return
        item=daily()
        if parts[1]!=ballot_token(item):return s['send'](uid,'Этот вопрос закрыт или заменён. Ответь на новый вопрос в последнем приглашении Кими.')
        score=int((parts[2]=='1')==item['answer'])
        with s['conn']() as c:
            tables(c);inserted=c.execute('insert or ignore into truth_results values(?,?,?)',(s['today'](),uid,score)).rowcount
            if not inserted:
                result=c.execute('select score from truth_results where day=? and user_id=?',(s['today'](),uid)).fetchone()['score']
                return s['send'](uid,'Твой результат уже записан: '+str(result)+'/1. Завтра будет новая загадка.')
            name=c.execute('select name from users where id=?',(uid,)).fetchone()['name']
            name=s.get('display_name',lambda uid,name:name)(uid,name)
            caption=('Попал в точку! 1/1.' if score else 'Ловушка сработала. Сегодня 0/1 — зато теперь знаешь, как это устроено.')+'\n\n'+('Это правда. ' if item['answer'] else 'Это вымысел. ')+item['explanation']+'\n\nИсточник: '+item['source']
            card='truth-card:true' if item['answer'] else 'truth-card:false'
            c.execute('insert or ignore into notification_photo_outbox(day,period,chat,user_id,photo,caption) values(?,?,?,?,?,?)',(s['today'](),'truth'+str(item.get('revision','')),json.dumps(uid),uid,card,caption[:1000]))
            queue(c,s['esc'](name)+' поиграл со мной в «Правду или вымысел». Результат: '+str(score)+'/1. '+('Разгадал киношный фокус.' if score else 'Один киношный секрет теперь в копилке.'),key='truth-result:'+ballot_token(item)+':'+str(uid))
        s['retry_notifications']()

    s.update(init=init,callback=callback,chat_game_invite=invite,truth_daily=daily,truth_invite=invite)
