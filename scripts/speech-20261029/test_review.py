import contextlib
import datetime as dt
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
from unittest.mock import Mock,patch
import speech_workout as w
import training_review as r

class Reviews(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.path=Path(self.tmp.name)/'db'
  def conn():
   c=sqlite3.connect(self.path);c.row_factory=sqlite3.Row;return c
  self.conn=conn
  with conn() as c:c.executescript('''create table daily_content(day,kind,title,body,unique(day,kind));
  insert into daily_content values('2026-10-30','speech-reading-pm','Чтение','У нас появился новый сюжет. Камера уже готова. Можно начинать.');
  insert into daily_content values('2026-10-30','speech-workout-camera','Камера','Сними крупный план предмета.');
  create table notification_outbox(day,message_key,chat,body,keyboard,unique(day,message_key,chat));''')
  self.old=Mock();self.s=dict(conn=conn,callback=Mock(),bot_message=self.old,allowed=lambda uid:True,
   today=lambda:'2026-10-30',now=lambda:dt.datetime(2026,10,30,19),api=Mock(),send=Mock(),esc=lambda x:x,retry_notifications=Mock())
  self.modules=patch.dict(sys.modules,{'shared_media':Mock()});self.modules.start();self.addCleanup(self.modules.stop)
  r.install(self.s)
 def click(self,kind='camera',day='2026-10-30'):
  self.s['callback']({'id':'max','from':{'id':1},'data':'tr:'+kind+':'+day})
 def test_camera_fifteen_tasks_then_repeat(self):
  bank=json.loads(Path(w.__file__).with_name('camera_training.json').read_text())
  self.assertEqual(len(bank),15);self.assertEqual(len({x['title'] for x in bank}),15)
  for n in range(15):self.assertTrue(bank[n]['task'] and bank[n]['check'])
 def test_voice_is_not_intercepted_without_voluntary_choice(self):
  msg={'from':{'id':1},'chat':{'type':'private'},'voice':{'file_id':'fake'},'message_id':12}
  self.s['bot_message'](msg);self.old.assert_called_once_with(msg)
 def test_stale_button_does_not_open_review(self):
  self.click(day='2026-10-29')
  with self.conn() as c:self.assertEqual(c.execute('select count(*) from training_review_requests').fetchone()[0],0)
 def test_camera_choice_and_cancel_are_private_and_do_not_change_other_states(self):
  self.click()
  with self.conn() as c:self.assertEqual(c.execute('select kind,state from training_review_requests').fetchone()[:],('camera','awaiting'))
  self.click(kind='cancel')
  with self.conn() as c:self.assertEqual(c.execute('select state from training_review_requests').fetchone()[0],'cancelled')
  self.s['retry_notifications'].assert_not_called()
 def test_repeated_attachment_not_processed_twice(self):
  self.click()
  msg={'from':{'id':1},'chat':{'type':'private'},'photo':[{'file_id':'synthetic'}],'message_id':12}
  with patch.object(r.threading,'Thread') as thread:
   self.s['bot_message'](msg);self.s['bot_message'](msg)
   self.assertEqual(thread.call_count,1)
 def test_unreliable_recognition_is_not_bad_diction(self):
  text=r.audio_feedback({'recognized_words':3,'confidence':.2,'reference_overlap':.1,'clipping':0})
  self.assertIn('не оценка твоей дикции',text)
  self.assertEqual(text.count('Один совет:'),1)
  self.assertNotIn('/10',text)
 def test_feedback_uses_measured_problem_and_one_advice(self):
  text=r.audio_feedback({'recognized_words':20,'confidence':.9,'reference_overlap':.9,'clipping':.04,'words_per_speech_minute':250})
  self.assertIn('перегруз',text);self.assertEqual(text.count('Один совет:'),1)
  self.assertNotIn('звук «р»',text)

if __name__=='__main__':unittest.main()
