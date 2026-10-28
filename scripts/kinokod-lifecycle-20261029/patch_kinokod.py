from pathlib import Path
import hashlib
EXPECTED='6dc244fca21ae40429607ddcd6ce4d2554b28b918b94125420dac0bcba970076'

def patch(text):
    if 'def campaign_open():' in text:return text
    changes=[
      ("    def now():return s['now']()\n", "    def now():return s['now']()\n    def campaign_open():\n        return dt.datetime.fromisoformat(RELEASES[0][0]) <= now() < dt.datetime.fromisoformat('2026-10-24T00:00:00+03:00')\n    def automatic_window():\n        return campaign_open() and 8 <= now().hour < 21\n"),
      ("    def retry_visuals():\n", "    def retry_visuals():\n        if not automatic_window():return\n"),
      ("    def existing_continuations():\n", "    def existing_continuations():\n        if not automatic_window():return\n"),
      ("                key=f'kc-bridge-{CAMPAIGN}-{slot}'\n", "                key=f'kc-bridge-{CAMPAIGN}-{slot}'\n                if db.execute('select 1 from notification_outbox where message_key=? and chat=? limit 1',(key,json.dumps(uid))).fetchone():continue\n"),
      ("        if not uid or not eligible(uid):return\n        bits=data.split(':')", "        if not uid or not eligible(uid):return\n        if not campaign_open():\n            return s['send'](uid,'Этот Кинокод завершился 23 октября. Твои ответы сохранены. Новые улики по этому делу больше не приходят.')\n        bits=data.split(':')"),
      ("        text=(msg.get('text') or '').strip()\n        if text in ('/kinokod'", "        text=(msg.get('text') or '').strip()\n        if not campaign_open():\n            if text in ('/kinokod','/кинокод','Кинокод'):\n                return s['send'](uid,'Этот Кинокод завершился 23 октября. Твои ответы сохранены. Новые улики по этому делу больше не приходят.')\n            return old_message(msg)\n        if text in ('/kinokod'"),
      ("    def tick():\n        clock=now()\n", "    def tick():\n        if not automatic_window():return\n        clock=now()\n")
    ]
    for old,new in changes:
      assert text.count(old)==1,repr(old)
      text=text.replace(old,new)
    compile(text,'kinokod.py','exec')
    return text
if __name__=='__main__':
    p=Path('kinokod.py')
    assert hashlib.sha256(p.read_bytes()).hexdigest()==EXPECTED,'Live kinokod changed; stop instead of overwriting'
    p.write_text(patch(p.read_text()))
