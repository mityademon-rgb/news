"""Scoped, hash-guarded install with addressable backups. No messages or game writes."""
import ast
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile
import preflight

ROOT=Path('/opt/timecode-bot/timecode-bot')
PACKAGE=Path(__file__).parent
NAMES=('chef_voice.py','playful_checkins.py','creative_digest.py','monthly_games.py','ai_provider.py','mentor.py')


def main():
    os.umask(0o077)
    expected=json.loads((PACKAGE/'baseline.json').read_text())
    for name, value in expected.items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==value, 'source changed: '+name
    assert not (ROOT/'mentor.py').exists(), 'mentor already exists; inspect before updating'
    # Uses only synthetic data and authenticated AI calls. No server import, DB or messenger API.
    preflight.run()
    # Re-check after the potentially long provider probes.
    for name, value in expected.items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==value, 'source changed during preflight: '+name
    old=(ROOT/'server.py').read_text()
    anchor='monthly_games.install(globals())'
    assert old.count(anchor)==1 and 'mentor.install(globals())' not in old
    updated=old.replace(anchor,anchor+'\nimport mentor\nmentor.install(globals())')
    def fn(source,name):
        return ast.dump(next(n for n in ast.parse(source).body if isinstance(n,ast.FunctionDef) and n.name==name))
    for name in ('scheduler','checkin_open','run_slot','callback','bot_message'):
        assert fn(old,name)==fn(updated,name), 'unexpected server change: '+name
    backup=Path(tempfile.mkdtemp(prefix='mentor-backup-',dir='/opt/timecode-bot'))
    backup.chmod(0o700)
    for name in (*expected,'PROJECT_AI_HANDBOOK.md'):
        shutil.copy2(ROOT/name,backup/name)
    # Consistent online snapshot, never restore wholesale over new child activity.
    with sqlite3.connect('file:'+os.environ.get('DATABASE','/var/lib/timecode-bot/timecode.db')+'?mode=ro',uri=True) as c:
        with sqlite3.connect(backup/'before.sqlite') as target:c.backup(target)
    (backup/'before.sqlite').chmod(0o600)
    subprocess.run(['systemctl','stop','timecode-bot.service'],check=True)
    try:
        for name in NAMES:shutil.copy2(PACKAGE/name,ROOT/name)
        (ROOT/'CHEF_MEMORY.md').write_text((PACKAGE/'MENTOR_VOICE.md').read_text())
        (ROOT/'server.py').write_text(updated)
        subprocess.run(['python3','-m','py_compile',*[str(ROOT/n) for n in ('server.py',*NAMES)]],check=True)
        subprocess.run(['systemctl','start','timecode-bot.service'],check=True)
        subprocess.run(['curl','-fsS','--retry','5','--retry-delay','2','--retry-connrefused','--max-time','10',
                        'http://127.0.0.1:8097/health','-o','/dev/null'],check=True)
    except Exception:
        subprocess.run(['systemctl','stop','timecode-bot.service'],check=False)
        for name in expected:shutil.copy2(backup/name,ROOT/name)
        (ROOT/'mentor.py').unlink(missing_ok=True)
        subprocess.run(['systemctl','start','timecode-bot.service'],check=False)
        raise RuntimeError('mentor install failed; previous source restored') from None
    (Path('/opt/timecode-bot/mentor-latest-backup-path')).write_text(str(backup)+'\n')
    p=ROOT/'PROJECT_AI_HANDBOOK.md'
    p.write_text(p.read_text()+'\n### 2026-10-29 — Кими: живой наставник\n'
        'По поручению владельца установлен mentor.py после monthly_games, прежний scheduler и команды сохранены. '
        'CHEF_MEMORY.md заменён согласованным единым голосом без архивных панчей и обязательной сцены. '
        'Контекст диалогов: прежний bot_dialogue, 48 часов, максимум 12 строк на участника; '
        'личная история не попадает в публичные ответы. Групповой ответ только на прямое обращение/ответ боту, '
        'cooldown группы 12 секунд, участника 20. Вопросы и инструкции участников остаются user data. '
        'Переклички и фотоохоты генерируются и кэшируются в прежнем daily_content, утро тоже использует outbox. '
        'Проверенная погода Open-Meteo: Москва как ориентир, не прогноз всей области. '
        'Неподтверждённые памятные даты и школьные каникулы не добавляются. '
        'Лайфхаки: поиск восстановлен отдельным Moonshot search route с исходными credentials; '
        'если поиск недоступен, AI предлагает безопасный сравнительный эксперимент без исторических утверждений. '
        'Тексты и редактор теперь используют единый kimi_request; фото остаются на прежнем vision. '
        'AI-сбой не возвращает старый банк фраз, переклички остаются доступны с нейтральным уведомлением. '
        'Банк игр/ответы/баллы/кнопки и окна не менялись, AI пишет только подводки без ответа. '
        'Слоты: 07:30 будни/09:00 выходные, 10:00, 15:00, 16:00 мини-игры через день, '
        '17:00 truth, 18:00, 20:30. Никаких тестовых отправок детям. '
        '14 offline tests и synthetic API preflight до установки; художественное качество боевых ответов ещё требует наблюдения. '
        'Runtime source и patch baseline: news/boom-kadr-deploy scripts/mentor-20261029. '
        'Backup: /opt/timecode-bot/mentor-latest-backup-path. Откат: вернуть только перечисленные кодовые файлы '
        'и CHEF_MEMORY.md, убрать новый mentor hook/module, restart только бота; всю БД не восстанавливать.\n')
    print('MENTOR_INSTALLED_NO_TEST_MESSAGES',flush=True)
    for name in ('server.py','CHEF_MEMORY.md',*NAMES):
        print('LIVE_HASH',name,hashlib.sha256((ROOT/name).read_bytes()).hexdigest(),flush=True)


if __name__=='__main__':main()
