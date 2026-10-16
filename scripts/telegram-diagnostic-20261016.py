import collections,datetime,json,os,re,sqlite3,subprocess,time
from pathlib import Path
from zoneinfo import ZoneInfo
now=datetime.datetime.now(ZoneInfo('Europe/Moscow'));day=now.date().isoformat()
print('MOSCOW_NOW',now.isoformat())
print('SERVICE',subprocess.check_output(['systemctl','show','timecode-bot.service','-p','ActiveState','-p','SubState','-p','ExecMainStartTimestamp','-p','NRestarts','-p','TasksCurrent'],text=True).strip())
for url in ['http://127.0.0.1:8097/health','https://timecode-lab.ru/tc/health']:
 p=subprocess.run(['curl','-4','-sS','--max-time','10',url],capture_output=True,text=True);print('HEALTH',url,p.returncode,p.stdout[:200])
for method in ['getMe','getWebhookInfo','getMe']:
 started=time.monotonic()
 p=subprocess.run(['curl','-4','-sS','--connect-timeout','6','--max-time','12','https://api.telegram.org/bot'+os.environ['BOT_TOKEN']+'/'+method],capture_output=True,text=True)
 result={'method':method,'transport':p.returncode,'seconds':round(time.monotonic()-started,2)}
 try:
  d=json.loads(p.stdout);result.update(ok=d.get('ok'),error_code=d.get('error_code'))
  if method=='getWebhookInfo':
   v=d.get('result') or {};result.update(webhook_set=bool(v.get('url')),pending=v.get('pending_update_count'),last_error_date=v.get('last_error_date'),error_kind='timeout' if 'timeout' in str(v.get('last_error_message','')).lower() else bool(v.get('last_error_message')))
 except Exception:result['json']=False
 print('TELEGRAM_API',json.dumps(result))
logs=subprocess.check_output(['journalctl','-u','timecode-bot.service','--since','today','--no-pager','-o','short-iso'],text=True)
patterns={'tg_transport':r'Telegram:.*transport code','tg_request':r'Telegram:.*request failed','poll_error':r'Poll:','update_error':r'Update:','notification_error':r'Notification retry:','photo_error':r'Photo retry:','conflict_409':r'409|Conflict|terminated by other getUpdates','tls':r'SSL|CERTIFICATE|certificate','timeout':r'timed out|Timeout|timeout','traceback':r'Traceback','scheduler_error':r'Scheduler:|Schedule:|scheduler.*error','digest_error':r'Creative|creative|Kimi|kimi'}
for label,pattern in patterns.items():
 hits=[line for line in logs.splitlines() if re.search(pattern,line)]
 print('LOG_CATEGORY',label,'count',len(hits),'last',[x.split(' ',1)[0] for x in hits[-3:]])
# Print only exception types and fixed transport diagnostics, never user messages or raw provider bodies.
for line in logs.splitlines()[-800:]:
 m=re.search(r'(Telegram: (?:getUpdates|sendMessage|sendPhoto|getMe) (?:transport code \d+|request failed \w+)|(?:Poll:|Update:) (?:name .*? is not defined|.*Error))',line)
 if m:
  safe=m.group(0);safe=re.sub(r'https?://\S+','[url]',safe);safe=re.sub(r'\b\d{6,}\b','[id]',safe)
  if 'Update:' not in safe or 'is not defined' in safe:print('SAFE_ERROR',line.split(' ',1)[0],safe[:140])
c=sqlite3.connect('file:'+os.environ['DATABASE']+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
print('DB_CHECK',c.execute('pragma quick_check').fetchone()[0])
tables={r[0] for r in c.execute("select name from sqlite_master where type='table'")}
def platform(chat):
 uid=json.loads(chat)
 return 'max' if 'messenger_identities' in tables and c.execute("select 1 from messenger_identities where platform='max' and user_id=?",(uid,)).fetchone() else 'telegram'
for table in ['notification_outbox','notification_photo_outbox']:
 counts=collections.Counter();pending=collections.Counter()
 for r in c.execute('select * from '+table+' where day>=?',((now.date()-datetime.timedelta(days=1)).isoformat(),)):
  counts[(r['day'],platform(r['chat']),r['delivered'])]+=1
  if r['delivered']==0:pending[(r['day'],platform(r['chat']),re.sub(r'\d{6,}','[id]',r['message_key']) if table=='notification_outbox' else r['period'])]+=1
 print('OUTBOX',table,[(*k,v) for k,v in counts.items()]);print('PENDING_KEYS',table,[(*k,v) for k,v in pending.items()])
if 'sent' in tables:print('SCHEDULED_SLOTS',[tuple(r) for r in c.execute('select day,slot from sent where day>=? order by day,slot',((now.date()-datetime.timedelta(days=1)).isoformat(),))])
if 'kimi_edition_jobs' in tables:
 for r in c.execute('select day,period,status,attempts from kimi_edition_jobs where day>=?',(day,)):print('EDITION_JOB',tuple(r))
for table in ['morning_checkins','evening_checkins']:
 print('PARTICIPATION',table,c.execute('select count(*) from '+table+' where day=?',(day,)).fetchone()[0])
print('TRUTH_REVISION_PATCH', 'def ballot_token(item):' in Path('truth_game.py').read_text())
print('PROCESS_COUNTS',subprocess.check_output(['systemctl','show','timecode-bot.service','-p','MainPID'],text=True).strip())
print('DIAGNOSTIC_COMPLETE')
