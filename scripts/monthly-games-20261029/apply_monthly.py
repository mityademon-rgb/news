from pathlib import Path
import hashlib
EXPECTED={'server.py': '1b0925fa48c0e7b4efb47f2d07526a37fbe943c072b7ef5b2299c88b1b8b8ea7', 'truth_game.py': '51c768b201ee1b14292371ddaa40864e2d4833ac208530f31795ada535d0f798'}
def normhash(p):return hashlib.sha256((p.read_text().rstrip()+'\n').encode()).hexdigest()
def truth_patch(text):
    anchor="        if row:return json.loads(row['body'])\n"
    assert text.count(anchor)==1,'unexpected truth daily implementation'
    return text.replace(anchor,anchor+"        from monthly_games import bank_item\n        curated=bank_item(s['today']())\n        if curated:\n            with s['conn']() as c:\n                c.execute('insert or ignore into truth_daily values(?,?)',(s['today'](),json.dumps(curated,ensure_ascii=False)))\n                return json.loads(c.execute('select body from truth_daily where day=?',(s['today'](),)).fetchone()[0])\n")
if __name__=='__main__':
    for name,h in EXPECTED.items():assert normhash(Path(name))==h,'live file changed: '+name
    t=Path('truth_game.py');v=truth_patch(t.read_text());compile(v,'truth_game.py','exec')
    p=Path('server.py');s=p.read_text();anchor='import kinokod\nkinokod.install(globals())'
    assert s.count(anchor)==1 and 'monthly_games.install' not in s
    s=s.replace(anchor,anchor+'\nimport monthly_games\nmonthly_games.install(globals())');compile(s,'server.py','exec')
    t.write_text(v);p.write_text(s)
