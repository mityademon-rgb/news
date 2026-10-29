import datetime as dt
import json
from pathlib import Path
import re
import sqlite3
import tempfile
import unittest
from unittest.mock import Mock
import speech_workout as m

class Speech(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.path=Path(self.tmp.name)/'db'
  def conn():
   c=sqlite3.connect(self.path);c.row_factory=sqlite3.Row;return c
  self.conn=conn
  with conn() as c:c.executescript('''create table users(id integer,enabled integer);insert into users values(1,1),(-2,1),(3,1),(4,0);
  create table daily_content(day text,kind text,title text,body text,primary key(day,kind));
  create table notification_outbox(day text,message_key text,chat text,body text,keyboard text,delivered integer default 0,unique(day,message_key,chat));''')
  self.clock=dt.datetime(2026,10,30,7,45)
  self.s=dict(conn=conn,today=lambda:self.clock.date().isoformat(),now=lambda:self.clock,AI_KEY='',class_reminders=Mock(),
   teacher_daily_enabled=lambda uid:uid!=3,retry_notifications=Mock(),esc=lambda x:x)
  m.install(self.s)
 def count(self):
  with self.conn() as c:return c.execute('select count(*) from notification_outbox').fetchone()[0]
 def test_14_different_days_then_exact_exercise_repeat(self):
  for p in ('am','pm'):
   days=[m.START+dt.timedelta(days=i) for i in range(14)]
   plans=[m.exercises(d.isoformat(),p) for d in days]
   self.assertEqual(len(set(map(repr,plans))),14)
   for day,plan in zip(days,plans):
    self.assertEqual(len(plan),3)
    self.assertEqual(plan,m.exercises((day+dt.timedelta(days=14)).isoformat(),p))
 def test_three_precise_instructions_no_recordings(self):
  for i in range(28):
   for p in ('am','pm'):
    for title,task in m.exercises((m.START+dt.timedelta(days=i)).isoformat(),p):
     self.assertRegex(task,r'\d')
     self.assertNotRegex(task,r'запиш|пришл|отправ|голосов')
 def test_both_transports_optout_and_idempotent_after_restart(self):
  self.s['class_reminders']();self.s['class_reminders']()
  self.assertEqual(self.count(),2)
  m.install(self.s);self.s['class_reminders']()
  self.assertEqual(self.count(),2)
  with self.conn() as c:
   self.assertEqual({r[0] for r in c.execute('select chat from notification_outbox')},{'1','-2'})
   self.assertTrue(all(r[0]=='null' for r in c.execute('select keyboard from notification_outbox')))
 def test_evening_window_and_no_night_or_stale_catchup(self):
  for hour,minute in ((0,0),(7,44),(8,0),(18,59),(19,20),(23,59)):
   self.clock=self.clock.replace(hour=hour,minute=minute);m.install(self.s);self.s['class_reminders']()
  self.assertEqual(self.count(),0)
  self.clock=self.clock.replace(hour=19,minute=0);m.install(self.s);self.s['class_reminders']()
  self.assertEqual(self.count(),2)
 def test_ai_cannot_add_exercises_or_request_voice(self):
  self.s['AI_KEY']='placeholder'
  self.s['ai_json']=Mock(return_value={'intro':'Запиши голосовое и пришли сюда','reading':'Отправь запись своего чтения.'})
  body=self.s['speech_workout']('pm')
  self.assertEqual(len(re.findall(r'^\d\. ',body,re.M)),3)
  self.assertNotIn('Запиши',body);self.assertNotIn('Отправь',body)
  self.assertIn('Прочитай текст 2 раза',body)
 def test_ai_failure_does_not_skip_workout(self):
  self.s['AI_KEY']='placeholder';self.s['ai_json']=Mock(side_effect=TimeoutError())
  self.s['class_reminders']();self.assertEqual(self.count(),2)
 def test_text_and_review_reference_commit_atomically(self):
  with self.conn() as c:c.execute("create trigger synthetic_failure before insert on daily_content when NEW.kind='speech-workout-pm' begin select raise(ABORT,'synthetic failure'); end")
  with self.assertRaises(sqlite3.IntegrityError):self.s['speech_workout']('pm')
  with self.conn() as c:self.assertEqual(c.execute("select count(*) from daily_content where kind='speech-reading-pm'").fetchone()[0],0)
 def test_daily_cache_not_regenerated_on_restart(self):
  self.s['AI_KEY']='placeholder';self.s['ai_json']=Mock(return_value={'intro':'Разбудим дикцию.','reading':''})
  a=self.s['speech_workout']('am');b=self.s['speech_workout']('am')
  self.assertEqual(a,b);self.s['ai_json'].assert_called_once()

if __name__=='__main__':unittest.main()
