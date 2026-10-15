from pathlib import Path

def patched(text):
    if 'def ballot_token(item):' in text:return text
    changes=[
        ("    def invite():\n", "    def ballot_token(item):\n        return s['today']()+str(item.get('revision',''))\n\n    def invite():\n"),
        ("'callback_data':'tg:'+s['today']()+':1'", "'callback_data':'tg:'+ballot_token(item)+':1'"),
        ("'callback_data':'tg:'+s['today']()+':0'", "'callback_data':'tg:'+ballot_token(item)+':0'"),
        ("        if parts[1]!=s['today']():return s['send'](uid,'Эта загадка уже закончилась. Новая появится в сегодняшнем приглашении.')\n        item=daily();score=int((parts[2]=='1')==item['answer'])", "        item=daily()\n        if parts[1]!=ballot_token(item):return s['send'](uid,'Этот вопрос закрыт или заменён. Ответь на новый вопрос в последнем приглашении Кими.')\n        score=int((parts[2]=='1')==item['answer'])"),
        ("s['today'](),'truth',json.dumps(uid)", "s['today'](),'truth'+str(item.get('revision','')),json.dumps(uid)"),
        ("key='truth-result:'+s['today']()+':'+str(uid)", "key='truth-result:'+ballot_token(item)+':'+str(uid)")
    ]
    for old,new in changes:
        assert text.count(old)==1, 'unexpected truth_game source anchor'
        text=text.replace(old,new)
    compile(text,'truth_game.py','exec')
    return text

if __name__=='__main__':
    p=Path('truth_game.py');p.write_text(patched(p.read_text()))
