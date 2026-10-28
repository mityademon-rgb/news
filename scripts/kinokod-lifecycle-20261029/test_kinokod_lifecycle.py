import datetime as dt,json,sqlite3,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock
from patch_kinokod import patch
class Lifecycle(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.path=Path(self.tmp.name)/'db'
  def conn():
   c=sqlite3.connect(self.path);c.row_factory=sqlite3.Row;return c
  self.conn=conn
  self.now=dt.datetime.fromisoformat('2026-10-21T12:00:00+03:00')
  self.ns={'__file__':str(Path(__file__))};exec(patch(Path('kinokod_before.py').read_text()),self.ns)
  with conn() as c:
   self.ns['tables'](c)
   c.executescript("create table users(id integer,role text,enabled integer);insert into users values(42,'member',1);create table notification_outbox(day,message_key,chat,body,keyboard,delivered integer default 0,unique(day,message_key,chat));create table notification_unreachable(chat text);insert into kinokod_players values(42,0);insert into kinokod_votes values(42,0,1,null,'',0);")
   c.executemany('insert into kinokod_posts values(?,0)',[(i,) for i in range(8)])
  self.s=dict(bot_message=Mock(),callback=Mock(),class_reminders=Mock(),conn=conn,now=lambda:self.now,today=lambda:self.now.date().isoformat(),esc=lambda x:x,send=Mock(),api=Mock(),retry_notifications=Mock())
  self.old_message=self.s['bot_message'];self.ns['install'](self.s)
 def tearDown(self):self.tmp.cleanup()
 def test_once_for_campaign_not_daily(self):
  self.s['kinokod_tick']()
  self.now+=dt.timedelta(days=1);self.s['kinokod_tick']()
  with self.conn() as c:self.assertEqual(c.execute("select count(*) from notification_outbox where message_key like 'kc-bridge-%'").fetchone()[0],1)
 def test_midnight_no_automatic_sends(self):
  self.now=dt.datetime.fromisoformat('2026-10-22T00:00:01+03:00');self.s['kinokod_tick']()
  self.s['send'].assert_not_called();self.s['retry_notifications'].assert_not_called()
 def test_expired_tick_does_not_send_and_does_not_block_reminders(self):
  self.now=dt.datetime.fromisoformat('2026-10-29T00:00:01+03:00');self.s['class_reminders']()
  self.s['send'].assert_not_called();self.s['retry_notifications'].assert_not_called()
  with self.conn() as c:self.assertEqual(c.execute('select count(*) from notification_outbox').fetchone()[0],0)
 def test_old_callback_closed_no_new_answer(self):
  self.now=dt.datetime.fromisoformat('2026-10-29T10:00:00+03:00')
  self.s['callback']({'id':'max','from':{'id':42},'data':'kc:0:0'})
  self.assertIn('завершился',self.s['send'].call_args.args[1])
  with self.conn() as c:self.assertEqual(c.execute('select choice from kinokod_votes').fetchone()[0],1)
 def test_expired_game_no_longer_hijacks_regular_kimi_chat(self):
  self.now=dt.datetime.fromisoformat('2026-10-29T10:00:00+03:00')
  msg={'from':{'id':42},'chat':{'type':'private'},'text':'Кими, обсудим кино?'}
  self.s['bot_message'](msg);self.old_message.assert_called_once_with(msg)
if __name__=='__main__':unittest.main()
