"""Read-only post-install checks; no messages, polling or retry triggers."""
import collections
import datetime as dt
import json
import os
from pathlib import Path
import sqlite3
import ssl
import subprocess
import urllib.request
from zoneinfo import ZoneInfo

print('MOSCOW_NOW',dt.datetime.now(ZoneInfo('Europe/Moscow')).isoformat())
print(subprocess.check_output(['systemctl','show','timecode-bot.service','-p','ActiveState','-p','SubState','-p','NRestarts'],text=True))
for label,url,headers in [
    ('telegram','https://api.telegram.org/bot'+os.environ['BOT_TOKEN']+'/getMe',{}),
    ('max','https://platform-api.max.ru/me',{'Authorization':os.environ['MAX_BOT_TOKEN']})]:
    try:
        context=ssl.create_default_context()
        if label=='max' and os.getenv('MAX_CA_FILE'):context.load_verify_locations(cafile=os.environ['MAX_CA_FILE'])
        with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=12,context=context) as r:
            data=json.load(r)
            print('API_CHECK',label,r.status,bool(data.get('ok') if label=='telegram' else data.get('user_id')))
    except Exception as error:
        print('API_CHECK_FAILED',label,type(error).__name__,getattr(error,'code',None))
for url in ('http://127.0.0.1:8097/health','https://timecode-lab.ru/tc/health'):
    p=subprocess.run(['curl','-fsS','--max-time','15',url,'-o','/dev/null'])
    assert p.returncode==0,'health failed'
with sqlite3.connect('file:'+os.environ['DATABASE']+'?mode=ro',uri=True) as c:
    c.row_factory=sqlite3.Row
    assert c.execute('pragma quick_check').fetchone()[0]=='ok'
    day=dt.datetime.now(ZoneInfo('Europe/Moscow')).date().isoformat()
    for table in ('notification_outbox','notification_photo_outbox'):
        counts=collections.Counter()
        for row in c.execute('select chat,delivered from '+table+' where day=?',(day,)).fetchall():
            uid=json.loads(row['chat'])
            platform='max' if c.execute("select 1 from messenger_identities where platform='max' and user_id=?",(uid,)).fetchone() else 'telegram'
            counts[(platform,row['delivered'])]+=1
        print('OUTBOX',table,[(*key,value) for key,value in counts.items()])
print('VERIFIED_NO_TEST_MESSAGES')
