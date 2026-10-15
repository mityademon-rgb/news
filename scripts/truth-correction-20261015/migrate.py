import json, os, sqlite3
from pathlib import Path
from publish import DAY,REV,item
p=Path(os.environ['DATABASE']);c=sqlite3.connect(p)
row=c.execute('select body from truth_daily where day=?',(DAY,)).fetchone()
assert row,'no current question'
old=json.loads(row[0])
assert old.get('revision')==REV or 'академ' in old.get('question','').lower(),'unexpected question; do not replace'
if old.get('revision')!=REV:
    c.execute('begin immediate')
    c.execute('update truth_daily set body=? where day=?',(json.dumps(item,ensure_ascii=False),DAY))
    count=c.execute('delete from truth_results where day=?',(DAY,)).rowcount
    c.execute("update notification_photo_outbox set delivered=-1 where day=? and period='truth' and delivered=0",(DAY,))
    c.execute("update notification_outbox set delivered=-1 where day=? and delivered=0 and (message_key like 'truth-result:%' or keyboard like ?)",(DAY,'%tg:'+DAY+':%'))
    c.commit();print('ANNULLED_RESULTS',count)
else:print('REVISION_ALREADY_INSTALLED')
assert c.execute('pragma quick_check').fetchone()[0]=='ok';c.close()
