import datetime as dt,json,sqlite3,tempfile,unittest
from pathlib import Path
from unittest.mock import Mock
import monthly_games as m
class Monthly(unittest.TestCase):
 def test_thirty_days_valid_and_fifteen_distinct_minigames(self):
  c=m.content();self.assertEqual(len(c['truth']),30);self.assertEqual(len(c['quick']),15)
  self.assertEqual(len({x['question'] for x in c['truth']}),30)
  for x in c['truth']:
   self.assertIs(type(x['answer']),bool);self.assertTrue(x['source'].startswith('https://'));self.assertTrue(x['explanation'])
  for x in c['quick']:self.assertIn(x['answer'],range(len(x['options'])))
 def test_no_night_send_and_catchup_idempotent_both_transports(self):
  with tempfile.TemporaryDirectory() as tmp:
   path=Path(tmp)/'db'
   def conn():
    c=sqlite3.connect(path);c.row_factory=sqlite3.Row;return c
   with conn() as c:c.executescript('create table users(id,role,enabled);insert into users values(42,"member",1);insert into users values(-77,"member",1);create table notification_outbox(day,message_key,chat,body,keyboard,delivered integer default 0,primary key(day,message_key,chat));')
   clock=[dt.datetime.fromisoformat('2026-10-29T00:01:00+03:00')]
   s=dict(conn=conn,chat_game_invite=Mock(),instant_photo=Mock(),class_reminders=Mock(),callback=Mock(),today=lambda:'2026-10-29',now=lambda:clock[0],truth_daily=lambda:m.bank_item('2026-10-29'),esc=lambda x:x,retry_notifications=Mock(),allowed=lambda uid:True,api=Mock(),send=Mock())
   m.install(s);s['class_reminders']();s['retry_notifications'].assert_not_called()
   clock[0]=dt.datetime.fromisoformat('2026-10-29T16:05:00+03:00');s['class_reminders']();s['class_reminders']()
   clock[0]=dt.datetime.fromisoformat('2026-10-29T17:10:00+03:00');s['class_reminders']();s['class_reminders']()
   with conn() as c:self.assertEqual(c.execute('select count(*) from notification_outbox').fetchone()[0],4)
   s['callback']({'id':'max','from':{'id':42},'data':'mq:2026-10-29:0'});s['callback']({'id':'max','from':{'id':42},'data':'mq:2026-10-29:1'})
   with conn() as c:self.assertEqual(c.execute('select count(*) from monthly_game_results').fetchone()[0],1)
   s['callback']({'id':'max','from':{'id':42},'data':'mq:2026-10-28:0'})
   self.assertIn('завершилась',s['send'].call_args.args[1])
if __name__=='__main__':unittest.main()

class CuratedTruth(unittest.TestCase):
 def test_truth_callback_source_gets_cached_verified_item_without_ai(self):
  from apply_monthly import truth_patch
  ns={};exec(truth_patch(Path('truth_before.py').read_text()),ns)
  with tempfile.TemporaryDirectory() as tmp:
   def conn():
    c=sqlite3.connect(Path(tmp)/'db');c.row_factory=sqlite3.Row;return c
   s=dict(init=Mock(),callback=Mock(),conn=conn,today=lambda:'2026-10-29',AI_KEY='no-network',industry_search=Mock(side_effect=AssertionError('must not call provider')))
   ns['install'](s);s['init']();v=s['truth_daily']()
   self.assertEqual(v['id'],'tc-month-20261029-01');self.assertEqual(s['truth_daily'](),v);s['industry_search'].assert_not_called()
