"""Guarded, sealed provider setup. Never prints credentials or user data."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import ai_provider

ROOT = Path('/opt/timecode-bot/timecode-bot')
ENV = Path('/etc/timecode-bot.env')
PACKAGE = Path(__file__).parent
EXPECTED = {
    'server.py': '263dffd8211cf2bd8de485e7fc1fdd00ee582e1cf5f34065f7025848a81c1195',
    'creative_digest.py': 'ef8d980d46a766769e00ce34b5e82f920d443efa49919a2870feb559579ae95a',
}


def preflight(key):
    memory = (ROOT / 'CHEF_MEMORY.md').read_text()
    instructions = memory + '\nВерни JSON {"text":"ответ"}. Связная живая речь; не приписывай реальных событий. Без HTML.'
    prompts = [
        'Редакционная проба на вымышленных данных. Трое участников выбрали игровую роль «я зомби, несу свой рюкзак». Напиши утренний таблоид 350–700 знаков: общий смешной вывод вместо списка. Других фактов нет. Лайфхак в 15:00.',
        'Редакционная проба на вымышленных данных: один участник закончил монтаж, другой написал «устал, но доволен». Напиши вечерний итог 350–700 знаков без выдуманных событий, поздравительного шаблона и списка имён.',
        'Редакционная проба. Участник говорит: «Кими, ты опять написал как школьная стенгазета». Ответь одной-двумя фразами, с самоиронией, без оскорбления участника.'
    ]
    samples = []
    for prompt in prompts:
        for attempt in range(2):
            result = ai_provider.request_json('https://api.deepseek.com/chat/completions', key, {
                'model': 'deepseek-flash', 'thinking': {'type': 'disabled'},
                'response_format': {'type': 'json_object'}, 'max_tokens': 1600,
                'messages': [{'role': 'system', 'content': instructions}, {'role': 'user', 'content': prompt}]
            }, 35)
            choice = result['choices'][0]
            try:
                assert choice.get('finish_reason') != 'length'
                obj = json.loads(choice['message']['content'])
                assert isinstance(obj, dict) and isinstance(obj.get('text'), str) and len(obj['text']) > 10
                samples.append(obj['text'])
                break
            except (ValueError, AssertionError, KeyError, TypeError):
                if attempt: raise RuntimeError('DeepSeek preflight invalid JSON') from None
    return samples


def main():
    os.umask(0o077)
    for name, expected in EXPECTED.items():
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != expected:
            raise RuntimeError('concurrent source change: ' + name)
    decoded = subprocess.run(['openssl', 'pkeyutl', '-decrypt', '-inkey',
        '/opt/timecode-bot/deepseek-seal-20261029/private.pem', '-pkeyopt', 'rsa_padding_mode:oaep',
        '-pkeyopt', 'rsa_oaep_md:sha256', '-pkeyopt', 'rsa_mgf1_md:sha256',
        '-in', str(PACKAGE / 'credential.sealed')], capture_output=True, check=True).stdout.decode().strip()
    if not decoded.startswith('sk-') or '\n' in decoded:
        raise RuntimeError('sealed credential invalid')
    samples = preflight(decoded)
    print('PREFLIGHT_JSON_AND_VOICE_PASS', len(samples), flush=True)
    # These are entirely synthetic editorial probes, never participant messages.
    print('SYNTHETIC_SAMPLES', json.dumps(samples, ensure_ascii=False), flush=True)
    backup = Path(tempfile.mkdtemp(prefix='deepseek-backup-', dir='/opt/timecode-bot'))
    backup.chmod(0o700)
    for name in ('server.py', 'creative_digest.py', 'PROJECT_AI_HANDBOOK.md'):
        shutil.copy2(ROOT / name, backup / name)
    shutil.copy2(ENV, backup / 'timecode-bot.env')
    (backup / 'timecode-bot.env').chmod(0o600)
    server = (ROOT / 'server.py').read_text()
    anchor = 'chef_voice.install(globals())'
    if server.count(anchor) != 1 or 'ai_provider.install(globals())' in server:
        raise RuntimeError('provider anchor changed')
    server = server.replace(anchor, 'import ai_provider\nai_provider.install(globals())\n' + anchor)
    creative = (ROOT / 'creative_digest.py').read_text()
    anchor2 = "if s['AI_MODEL'].startswith('kimi-k2.'):payload['thinking']={'type':'disabled'}"
    if creative.count(anchor2) != 1:
        raise RuntimeError('JSON provider anchor changed')
    creative = creative.replace(anchor2,
        "if s.get('AI_TEXT_PROVIDER')=='deepseek' or s['AI_MODEL'].startswith('kimi-k2.'):payload['thinking']={'type':'disabled'}")
    lines = [line for line in ENV.read_text().splitlines() if not any(line.startswith(k + '=')
        for k in ('AI_TEXT_PROVIDER', 'DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL'))]
    updated_env = '\n'.join(lines) + '\nAI_TEXT_PROVIDER=deepseek\nDEEPSEEK_MODEL=deepseek-flash\nDEEPSEEK_API_KEY=' + decoded + '\n'
    subprocess.run(['systemctl', 'stop', 'timecode-bot.service'], check=True)
    try:
        shutil.copy2(PACKAGE / 'ai_provider.py', ROOT / 'ai_provider.py')
        (ROOT / 'server.py').write_text(server)
        (ROOT / 'creative_digest.py').write_text(creative)
        temp_env = ENV.with_name('timecode-bot.env.deepseek-tmp')
        temp_env.write_text(updated_env)
        temp_env.chmod(0o600)
        os.replace(temp_env, ENV)
        subprocess.run(['python3', '-m', 'py_compile', str(ROOT / 'server.py'),
            str(ROOT / 'creative_digest.py'), str(ROOT / 'ai_provider.py')], check=True)
        subprocess.run(['systemctl', 'start', 'timecode-bot.service'], check=True)
        subprocess.run(['curl', '-fsS', '--retry', '5', '--retry-delay', '2', '--retry-connrefused',
            '--max-time', '10', 'http://127.0.0.1:8097/health', '-o', '/dev/null'], check=True)
    except Exception:
        for name in ('server.py', 'creative_digest.py'):
            shutil.copy2(backup / name, ROOT / name)
        shutil.copy2(backup / 'timecode-bot.env', ENV)
        subprocess.run(['systemctl', 'restart', 'timecode-bot.service'], check=False)
        raise RuntimeError('provider installation failed; previous config restored') from None
    (Path('/opt/timecode-bot/deepseek-latest-backup-path')).write_text(str(backup) + '\n')
    handbook = ROOT / 'PROJECT_AI_HANDBOOK.md'
    handbook.write_text(handbook.read_text() + '\n### 2026-10-29 — DeepSeek text provider\n'
        'По прямому поручению владельца AI_TEXT_PROVIDER=deepseek, DEEPSEEK_MODEL=deepseek-flash. '
        'ai_provider.install расположен перед chef_voice: персона и память сохраняются. '
        'Текстовые kimi_request и direct creative_digest JSON идут на api.deepseek.com. '
        'Фото по-прежнему на исходный Moonshot с прежним vision model/key. '
        'Три synthetic JSON/voice пробы до изменения env прошли; детям тесты не отправлялись. '
        'Изменены только server.py hook, creative_digest thinking flag, новый ai_provider.py и env. '
        'Правда/мини-игры используют заранее проверенный банк. Очереди, результаты и БД не менялись. '
        'Backup кода/env: /opt/timecode-bot/deepseek-latest-backup-path. Для отката вернуть server.py, '
        'creative_digest.py и env из этого защищённого backup и restart; DB не откатывать. '
        'Gemini не подключён: Google отвергает регион bot host. Генерация изображений не подключена.\n')
    # The envelope has served its purpose: retain neither staging credential nor private key.
    (PACKAGE / 'credential.sealed').unlink()
    Path('/opt/timecode-bot/deepseek-seal-20261029/private.pem').unlink()
    print('DEEPSEEK_TEXT_ACTIVE_VISION_MOONSHOT_UNCHANGED', flush=True)
    print('NO_TEST_MESSAGES_SENT', flush=True)


if __name__ == '__main__':
    main()
