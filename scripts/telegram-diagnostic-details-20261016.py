import datetime,json,os,re,sqlite3,subprocess
from zoneinfo import ZoneInfo
z=ZoneInfo('Europe/Moscow');day=datetime.datetime.now(z).date().isoformat()
logs=subprocess.check_output(['journalctl','-u','timecode-bot.service','--since','today','--no-pager','-o','short-iso'],text=True)
for line in logs.splitlines():
 m=re.search(r'Kimi edition pending: (am|pm) ([a-zA-Z0-9_\-: ]{1,110}) attempt (\d+)',line)
 if m:print('EDITION_FAILURE',line.split(' ',1)[0],m.groups())
c=sqlite3.connect('file:'+os.environ['DATABASE']+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
for row in c.execute('select period,created from kimi_editions where day=?',(day,)):print('EDITION_PREPARED',row['period'],datetime.datetime.fromtimestamp(row['created'],z).isoformat())
for row in c.execute('select period,status,attempts,alerted from kimi_edition_jobs where day=?',(day,)):print('EDITION_JOB',tuple(row))
print('ALERT_DELIVERIES',[tuple(r) for r in c.execute("select delivered,count(*) from notification_outbox where day=? and message_key like 'kimi-edition-alert:%' group by delivered",(day,))])
for table in ['notification_outbox','notification_photo_outbox']:print('OUTBOX_COLUMNS',table,[r[1] for r in c.execute('pragma table_info('+table+')')])
# Strictly code source only, never database text, identities or settings.
from pathlib import Path
s=Path('server.py').read_text();start=s.index('def polling():');end=s.index('\ndef ',start+5)
print('POLLING_CODE',s[start:end])
print('DETAIL_COMPLETE')
