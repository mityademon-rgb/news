from pathlib import Path
import hashlib
EXPECTED='b7abbdab6c8c2fa2992d333cd1fa8cf82218495d9f4e3c571ef6cf000f9a15a3'
def patch(text):
    bad="(kind,s['today']))]"
    assert text.count(bad)==1,'unexpected invitation date binding'
    text=text.replace(bad,"(kind,s['today']()))]")
    nested="            import json\n            key='evening-checkin:'"
    assert text.count(nested)==1,'unexpected local json import'
    text=text.replace(nested,"            key='evening-checkin:'")
    compile(text,'playful_checkins.py','exec');return text
if __name__=='__main__':
    p=Path('playful_checkins.py')
    assert hashlib.sha256((p.read_text().rstrip()+'\n').encode()).hexdigest()==EXPECTED,'live playful changed'
    p.write_text(patch(p.read_text()))
