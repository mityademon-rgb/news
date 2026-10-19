"""Real provider check using synthetic teaching task, without importing server."""
import json
import os
import subprocess
import sys
import urllib.request

sys.path.insert(0, '/opt/timecode-bot/timecode-bot')
import neuro_advisor


def request(path, payload, timeout=55):
    data = json.dumps(payload, ensure_ascii=False).encode()
    req = urllib.request.Request('https://api.moonshot.ai/v1' + path, data=data,
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + os.environ['MOONSHOT_API_KEY']})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.load(response)


model = os.getenv('KIMI_MODEL', 'kimi-k2.6')
ns = {'AI_KEY': bool(os.getenv('MOONSHOT_API_KEY')), 'AI_MODEL': model, 'kimi_request': request,
      'kimi_params': lambda: {'thinking': {'type': 'disabled'}} if model == 'kimi-k2.6' else {'reasoning_effort': 'low'} if model == 'kimi-k3' else {}}
task = 'Мне нужно игровое занятие по интервью для 12 подростков 12+, на 60 минут, без техники. Как сделать его с нейросетью?'
answer = neuro_advisor.advise({'message': task}, -900001, ns)
assert 2 <= len(answer['steps']) <= 5
assert any(s['prompt'] for s in answer['steps'])
assert all(s['action'] and s['check'] for s in answer['steps'])
print('LIVE_KIMI_WORKFLOW_OK', json.dumps(answer, ensure_ascii=False))
followup = neuro_advisor.advise({'message': 'Теперь сократите это занятие до 30 минут. Дайте промпт для правки.',
    'history': [{'role': 'user', 'content': task}, {'role': 'assistant', 'content': json.dumps(answer, ensure_ascii=False)}]}, -900002, ns)
assert followup['reply'] and any(s['prompt'] for s in followup['steps'])
print('LIVE_KIMI_FOLLOWUP_OK', json.dumps(followup, ensure_ascii=False))
for path in ('/neuro.js', '/neuro.css'):
    with urllib.request.urlopen('http://127.0.0.1:8097' + path, timeout=10) as response:
        assert response.status == 200
req = urllib.request.Request('http://127.0.0.1:8097/api/neuro', data=b'{"message":"test"}', headers={'Content-Type':'application/json'})
try:
    urllib.request.urlopen(req, timeout=10)
    raise AssertionError('Unauthenticated request was allowed')
except urllib.error.HTTPError as exc:
    assert exc.code == 401
print('LIVE_STATIC_AND_AUTH_GATE_OK_NO_MESSAGES_SENT')
