"""Remove fact leakage from game intros, without changing questions or results."""
import hashlib
from pathlib import Path
import shutil
import subprocess
import tempfile

root=Path('/opt/timecode-bot/timecode-bot')
source=Path(__file__).with_name('mentor.py')
target=root/'mentor.py'
assert hashlib.sha256(target.read_bytes()).hexdigest()=='8e61fda2066b886c6e81b87fe1ac2cf072e1232816fa838fe64b288796c8dde8'
assert "dict(question=item['question'], kind=kind" not in source.read_text()
backup=Path(tempfile.mkdtemp(prefix='mentor-intro-backup-',dir='/opt/timecode-bot'))
backup.chmod(0o700)
shutil.copy2(target,backup/'mentor.py')
subprocess.run(['systemctl','stop','timecode-bot.service'],check=True)
try:
    shutil.copy2(source,target)
    subprocess.run(['python3','-m','py_compile',str(target)],check=True)
    subprocess.run(['systemctl','start','timecode-bot.service'],check=True)
    subprocess.run(['curl','-fsS','--retry','5','--retry-delay','2','--retry-connrefused','--max-time','10',
        'http://127.0.0.1:8097/health','-o','/dev/null'],check=True)
except Exception:
    shutil.copy2(backup/'mentor.py',target)
    subprocess.run(['systemctl','restart','timecode-bot.service'],check=False)
    raise
p=root/'PROJECT_AI_HANDBOOK.md'
p.write_text(p.read_text()+'\nУточнение 29.10: synthetic подводка подсказала ответ, поэтому game_intro больше не получает ни вопроса, ни ответа, только формат и календарь. Проверенный вопрос добавляет сервер отдельно. Дополнительный тест отсутствия факта в AI payload; всего 15 offline tests. Backup адресной правки: '+str(backup)+'. БД/голоса/кэш не менялись.\n')
print('INTRO_FACT_ISOLATION_INSTALLED',hashlib.sha256(target.read_bytes()).hexdigest(),flush=True)
