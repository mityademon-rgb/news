import datetime as dt,sqlite3,tempfile,types,sys,unittest
from pathlib import Path
from unittest.mock import Mock,patch as mockpatch
from patch_playful import patch
class Invitation(unittest.TestCase):
 def test_real_invitation_binds_date_and_uses_global_json(self):
  module=types.ModuleType('shared_media')
  with mockpatch.dict(sys.modules,{'shared_media':module}):
   ns={};exec(patch(Path('playful_before.py').read_text()),ns)
  with tempfile.TemporaryDirectory() as tmp:
   db=Path(tmp)/'db'
   def conn():
    c=sqlite3.connect(db);c.row_factory=sqlite3.Row;return c
   with conn() as c:
    c.executescript("create table daily_content(day,kind,title,body,unique(day,kind));create table users(id integer,enabled integer);insert into users values(42,1);insert into users values(-77,1);create table notification_outbox(day,message_key,chat,body,keyboard,delivered integer default 0,unique(day,message_key,chat));")
   s=dict(bot_message=Mock(),callback=Mock(),init=Mock(),class_reminders=Mock(),conn=conn,now=lambda:dt.datetime.fromisoformat('2026-10-29T18:00:00+03:00'),today=lambda:'2026-10-29',send=Mock(),esc=lambda x:x,ai_json=Mock(return_value={'text':'Сегодня посмотрим, какой получился день. Выбери состояние, которое тебе сейчас ближе.'}),retry_notifications=Mock(),GROUP='')
   ns['install'](s)
   with mockpatch('urllib.request.urlopen',side_effect=OSError('network disabled for test')):
    s['evening']();s['evening']();s['morning']()
   with conn() as c:
    self.assertEqual(c.execute('select count(*) from notification_outbox').fetchone()[0],2)
    self.assertEqual(c.execute('select count(*) from daily_content').fetchone()[0],2)
   self.assertEqual(s['send'].call_count,2)
if __name__=='__main__':unittest.main()
