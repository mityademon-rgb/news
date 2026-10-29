"""Add three training slots as wrappers; preserve every original scheduler line."""
import ast
import hashlib
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import tempfile

ROOT=Path('/opt/timecode-bot/timecode-bot')
PACKAGE=Path(__file__).parent
FILES=('speech_workout.py','training_review.py','audio_worker.py','camera_training.json')
EXPECTED='255ea7d47085cce3228c0824980dde15c6fa7b70a72e45b75df63b572daa5ee2'


def main():
    os.umask(0o077)
    assert hashlib.sha256((ROOT/'server.py').read_bytes()).hexdigest()==EXPECTED,'server changed since audit'
    assert Path('/opt/timecode-speech/READY').exists(),'audio not verified'
    for name in FILES:assert not (ROOT/name).exists(),'training module already exists'
    # Read current operational passport before intervention; preserve all existing sections.
    handbook=(ROOT/'PROJECT_AI_HANDBOOK.md').read_text()
    assert 'DeepSeek' in handbook and 'mentor' in handbook,'unexpected bot passport'
    source=(ROOT/'server.py').read_text();anchor='mentor.install(globals())'
    assert source.count(anchor)==1
    updated=source.replace(anchor,anchor+'\nimport speech_workout\nspeech_workout.install(globals())\nimport training_review\ntraining_review.install(globals())')
    fn=lambda code:ast.dump(next(n for n in ast.parse(code).body if isinstance(n,ast.FunctionDef) and n.name=='scheduler'))
    assert fn(source)==fn(updated),'scheduler must remain unchanged'
    backup=Path(tempfile.mkdtemp(prefix='training-backup-',dir='/opt/timecode-bot'));backup.chmod(0o700)
    for name in ('server.py','PROJECT_AI_HANDBOOK.md'):shutil.copy2(ROOT/name,backup/name)
    with sqlite3.connect('file:'+os.environ['DATABASE']+'?mode=ro',uri=True) as c:
        with sqlite3.connect(backup/'before.sqlite') as target:c.backup(target)
    (backup/'before.sqlite').chmod(0o600)
    subprocess.run(['systemctl','stop','timecode-bot.service'],check=True)
    try:
        for name in FILES:
            shutil.copy2(PACKAGE/name,ROOT/name);(ROOT/name).chmod(0o644)
        (ROOT/'server.py').write_text(updated)
        subprocess.run(['python3','-m','py_compile',*[str(ROOT/n) for n in FILES if n.endswith('.py')],str(ROOT/'server.py')],check=True)
        subprocess.run(['systemctl','start','timecode-bot.service'],check=True)
        subprocess.run(['curl','-fsS','--retry','5','--retry-delay','2','--retry-connrefused','--max-time','10','http://127.0.0.1:8097/health','-o','/dev/null'],check=True)
    except Exception:
        subprocess.run(['systemctl','stop','timecode-bot.service'],check=False)
        shutil.copy2(backup/'server.py',ROOT/'server.py')
        for name in FILES:(ROOT/name).unlink(missing_ok=True)
        subprocess.run(['systemctl','start','timecode-bot.service'],check=False)
        raise
    Path('/opt/timecode-bot/training-latest-backup-path').write_text(str(backup)+'\n')
    (ROOT/'PROJECT_AI_HANDBOOK.md').write_text(handbook+'\n### 29.10.2026 — Речь и операторские тренировки\n'
        'По поручению владельца: 07:45 Зарядка для рта и 19:00 Вечерняя читка, максимум 3 упражнения, '
        '14 разных дневных наборов, затем повтор; тексты чтения AI обновляет. 14:00 Тренировка оператора — '
        '15 заданий, по одному в день, затем повтор. Новые wrappers после mentor, исходный scheduler неизменён. '
        'Выпуски — прежние daily_content/outbox с дневной дедупликацией, окна catch-up 07:45–08:00, '
        '14:00–14:20, 19:00–19:20; остальные игры и часы сохранены. Никаких обязательных отчётов/записей/баллов/серий. '
        'Кнопки добровольного review: вечерняя голосовая 30–60 секунд и фотография операторского задания. '
        'training_review_requests — отдельное согласие на 1 час и максимум 3 попытки, не users.stage; '
        'записи только во временных файлах, удаляются после обработки; исходное аудио никому не пересылается. '
        'Локальный /opt/timecode-speech: изолированный venv + bundled ffmpeg, '
        'без новых API-ключей. Голос signal_only: реальные байты, уровень/перегруз/паузы; без распознавания слов и без фонетического диагноза '
        'и не оценка правильности Р/Л/свистящих. Ошибки распознавания не приписывать ребёнку. '
        'Фото: существующий authenticated vision + задание; по фото не оценивать движение видео. '
        'Отзывы только лично через existing outbox, без копии в таблоид/общую фотоохоту. '
        'Состояние без оценки, retention expired requests 48ч, один review worker, CPU/time/memory caps. '
        'Source: news/boom-kadr-deploy scripts/speech-20261029. Backup pointer training-latest-backup-path; '
        'откатить server.py и новые модули, не восстанавливать всю БД. Дополнительный runtime можно удалить '
        'после удаления training hook; env и другие проекты не менялись. Тестовых сообщений детям нет.\n')
    for name in ('server.py',*FILES):print('TRAINING_LIVE_HASH',name,hashlib.sha256((ROOT/name).read_bytes()).hexdigest(),flush=True)
    print('TRAINING_INSTALLED_NO_TEST_SENDS',flush=True)


if __name__=='__main__':main()
