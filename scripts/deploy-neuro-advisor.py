"""Addressed code-only deployment; no DB writes or messenger operations."""
from pathlib import Path
import hashlib
import py_compile
import shutil
import subprocess
import tempfile

root = Path('/opt/timecode-bot/timecode-bot')
source = Path('/tmp/timecode-neuro-source')
expected = {'server.py': 'b55170043780d6760b73109d38bef915c2591c59731010c1ecd427e8f9e32f77',
            'static/index.html': 'b574eaf72150e57487a3f0b3af031e64e16fa0e26eaa4359f5283b6100306a13'}
for rel, digest in expected.items():
    assert hashlib.sha256((root / rel).read_bytes().rstrip(b'\n')).hexdigest() == digest, 'Runtime changed: ' + rel
server = (root / 'server.py').read_text()
index = (root / 'static/index.html').read_text()
anchor = "if __name__=='__main__':"
assert server.count(anchor) == 1 and 'import neuro_advisor' not in server
assert index.count('</head>') == index.count('</body>') == 1 and 'neuro.js' not in index
files = ['server.py', 'static/index.html', 'neuro_advisor.py', 'static/neuro.js', 'static/neuro.css', 'NEURO_ADVISOR.md']
backup = Path(tempfile.mkdtemp(prefix='neuro-advisor-backup-', dir=root.parent))
backup.chmod(0o700)
existed = []
for rel in files:
    target = root / rel
    if target.exists():
        existed.append(rel)
        (backup / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, backup / rel)
(backup / 'existed.txt').write_text('\n'.join(existed))


def health():
    subprocess.run(['systemctl', 'is-active', '--quiet', 'timecode-bot.service'], check=True)
    for url in ('http://127.0.0.1:8097/health', 'https://timecode-lab.ru/tc/health'):
        subprocess.run(['curl', '-fsS', '--retry', '8', '--retry-delay', '2', '--retry-connrefused',
                        '--max-time', '12', url, '-o', '/dev/null'], check=True)


try:
    for rel in files[2:]:
        shutil.copy2(source / rel, root / rel)
    (root / 'server.py').write_text(server.replace(anchor, 'import neuro_advisor\nneuro_advisor.install(globals())\n\n' + anchor))
    (root / 'static/index.html').write_text(index.replace('</head>', '<link rel="stylesheet" href="neuro.css?v=20261020"></head>')
        .replace('</body>', '<script src="neuro.js?v=20261020"></script></body>'))
    for rel in ('server.py', 'neuro_advisor.py'):
        py_compile.compile(str(root / rel), doraise=True)
    subprocess.run(['node', '--check', str(root / 'static/neuro.js')], check=True)
    subprocess.run(['systemctl', 'restart', 'timecode-bot.service'], check=True)
    health()
except Exception:
    for rel in files:
        if rel in existed:
            shutil.copy2(backup / rel, root / rel)
        else:
            (root / rel).unlink(missing_ok=True)
    subprocess.run(['systemctl', 'restart', 'timecode-bot.service'], check=True)
    raise
(root.parent / 'neuro-advisor-latest-backup-path').write_text(str(backup) + '\n')
for rel in files[2:]:
    assert (root / rel).read_bytes() == (source / rel).read_bytes()
print('NEURO_DEPLOYED_CODE_HASHES_VERIFIED_BOTH_HEALTH_OK')
