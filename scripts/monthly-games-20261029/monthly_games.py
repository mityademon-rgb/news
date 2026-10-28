"""Editorially checked monthly questions; no provider request at publication time."""
import datetime as dt
import json
import time
from pathlib import Path

def content():
    return json.loads(Path(__file__).with_name('monthly_games.json').read_text())
def bank_item(day,kind='truth'):
    return next((dict(x) for x in content()[kind] if x['date']==day),None)
def install(s):
    old_invite=s['chat_game_invite'];old_photo=s['instant_photo'];old_reminders=s['class_reminders'];old_callback=s['callback']
    def within_month():
        v=content();return v['start']<=s['today']()<=v['end']
    def tables(c):
        c.execute('create table if not exists monthly_game_results(day text,user_id integer,game_id text,answer integer,score integer,created integer,primary key(day,user_id,game_id))')
    with s['conn']() as c:tables(c)
    def enqueue(key,body,buttons):
        with s['conn']() as c:
            for row in c.execute('select id,role from users where enabled=1').fetchall():
                uid=row['id']
                if s.get('teacher_daily_enabled') and not s['teacher_daily_enabled'](uid):continue
                c.execute('insert or ignore into notification_outbox(day,message_key,chat,body,keyboard) values(?,?,?,?,?)',(s['today'](),key,json.dumps(uid),s['esc'](body),json.dumps(buttons,ensure_ascii=False)))
        s['retry_notifications'](key)
    def truth_invite():
        if not within_month():return old_invite()
        if not '17:00'<=s['now']().strftime('%H:%M')<'19:00':return
        item=s['truth_daily']();token=s['today']()+str(item.get('revision',''))
        enqueue('monthly-truth:'+s['today'](),'🎬 ПРАВДА ИЛИ ВЫМЫСЕЛ\n\n'+item['question'],[[{'text':'Правда','callback_data':'tg:'+token+':1'},{'text':'Вымысел','callback_data':'tg:'+token+':0'}]])
    def quick_invite():
        if not within_month():return old_photo()
        if not '16:00'<=s['now']().strftime('%H:%M')<'17:00':return
        item=bank_item(s['today'](),'quick')
        if not item:return
        buttons=[[{'text':v,'callback_data':'mq:'+s['today']()+':'+str(i)}] for i,v in enumerate(item['options'])]
        enqueue('monthly-quick:'+s['today'](),'🎬 '+item['title'].upper()+'\n\n'+item['question'],buttons)
    def callback(q):
        data=q.get('data','')
        if not data.startswith('mq:'):return old_callback(q)
        if q.get('id')!='max':s['api']('answerCallbackQuery',{'callback_query_id':q.get('id')})
        uid=(q.get('from') or {}).get('id')
        if not uid or not s['allowed'](uid):return
        bits=data.split(':')
        if len(bits)!=3 or not bits[2].isdigit():return
        if bits[1]!=s['today']():return s['send'](uid,'Эта мини-игра завершилась. Новый вопрос — в сегодняшнем приглашении.')
        item=bank_item(bits[1],'quick');answer=int(bits[2])
        if not item or not 0<=answer<len(item['options']):return
        score=int(answer==item['answer'])
        with s['conn']() as c:
            inserted=c.execute('insert or ignore into monthly_game_results values(?,?,?,?,?,?)',(s['today'](),uid,item['id'],answer,score,int(time.time()))).rowcount
        if not inserted:return s['send'](uid,'Твой ответ уже записан. Следующая мини-игра появится по расписанию.')
        s['send'](uid,('Верно. ' if score else 'Здесь работает другой вариант. ')+s['esc'](item['explanation'])+'\n\nИсточник: '+item['source'])
    def reminders():
        if within_month():
            quick_invite();truth_invite()
        return old_reminders()
    s.update(chat_game_invite=truth_invite,truth_invite=truth_invite,instant_photo=quick_invite,callback=callback,class_reminders=reminders)
