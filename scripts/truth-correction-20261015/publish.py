import json, os, sqlite3
from pathlib import Path
DAY='2026-10-15';REV='r1';KEY='truth-correction-20261015-r1'
item={'question':'Правда ли, что в голосе Чубакки из «Звёздных войн» есть записи рычания львов?','answer':True,'explanation':'Бен Бёртт собрал голос Чубакки из записей медведей, барсуков и львов. Из отдельных звуков он складывал разные эмоции персонажа. Один вуки — целый зверинец на озвучке.','source':'https://www.starwars.com/news/8-behind-the-scenes-facts-you-might-not-know-about-chewbacca','revision':REV}
body=('🎬 КИМИ ИСПРАВЛЯЕТСЯ\n\nВопрос про бесплатные копии фильмов для «Оскара» снимаю: я выдал неоднозначную формулировку за точный факт. Право делать копии для голосования и плата за размещение на Academy Screening Room — разные вещи. Моё «это правда» было некорректным.\n\nРезультаты этого вопроса аннулированы. Ошибка моя, а не ваша. Спасибо тем, кто перепроверил: фактчек сегодня победил бота.\n\n🎬 НОВЫЙ ВОПРОС\n\n'+item['question']+'\n\nПравда или вымысел? Можно ответить заново, даже если уже играл сегодня.')
if __name__=='__main__':
    import server
    assert server.today()==DAY,'wrong Moscow day'
    with server.conn() as c:
        assert json.loads(c.execute('select body from truth_daily where day=?',(DAY,)).fetchone()[0]).get('revision')==REV
        targets=[r['id'] for r in c.execute('select id from users where enabled=1')]
        if server.GROUP:targets.append(server.GROUP)
        keyboard=[[{'text':'Правда','callback_data':'tg:'+DAY+REV+':1'},{'text':'Вымысел','callback_data':'tg:'+DAY+REV+':0'}]]
        for uid in set(targets):
            c.execute('insert or ignore into notification_outbox(day,message_key,chat,body,keyboard) values(?,?,?,?,?)',(DAY,KEY,json.dumps(uid),server.esc(body),json.dumps(keyboard,ensure_ascii=False)))
    for attempt in range(3):
        server.retry_notifications(KEY)
        with server.conn() as c:
            pending=c.execute('select count(*) from notification_outbox where message_key=? and delivered=0',(KEY,)).fetchone()[0]
        if not pending:break
    with server.conn() as c:
        totals={}
        for row in c.execute('select chat,delivered from notification_outbox where message_key=?',(KEY,)):
            uid=json.loads(row['chat']);platform='max' if c.execute("select 1 from messenger_identities where platform='max' and user_id=?",(uid,)).fetchone() else 'telegram'
            pair=(platform,row['delivered']);totals[pair]=totals.get(pair,0)+1
        print('CORRECTION_DELIVERY',[(p,d,n) for (p,d),n in totals.items()])
        assert not pending,'pending deliveries remain; owner must be informed'
        assert all(any(p==platform and d==1 for p,d in totals) for platform in ('max','telegram'))
    print('CORRECTION_AND_NEW_QUESTION_CONFIRMED')
