"""Install a separate optional local speech runtime; no bot imports or messages."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request
import zipfile


def main():
    root=Path('/opt/timecode-speech');root.mkdir(exist_ok=True);root.chmod(0o755)
    interpreter=root/'venv/bin/python'
    if not interpreter.exists():subprocess.run(['python3','-m','venv','--without-pip',str(root/'venv')],check=True)
    subprocess.run(['pip3','--python',str(interpreter),'install','--disable-pip-version-check',
        'vosk==0.3.45','imageio-ffmpeg==0.6.0'],check=True,timeout=360)
    model=root/'vosk-model-small-ru-0.22'
    if not model.exists():
        package=root/'model.zip'
        with urllib.request.urlopen('https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip',timeout=45) as response:
            with package.open('wb') as out:
                count=0
                while True:
                    data=response.read(1024*1024)
                    if not data:break
                    count+=len(data)
                    if count>50_000_000:raise ValueError('unexpected-model-size')
                    out.write(data)
        assert hashlib.sha256(package.read_bytes()).hexdigest()=='961d5ff98a17f4aa6de69864d0aa71fa5bac682301d2b5d17a3f24c5c99a46d4','model checksum mismatch'
        with zipfile.ZipFile(package) as archive:
            assert all((root/name).resolve().is_relative_to(root) for name in archive.namelist())
            archive.extractall(root)
        package.unlink()
    ffmpeg=subprocess.check_output([str(interpreter),'-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],text=True).strip()
    assert Path(ffmpeg).is_file()
    (root/'ffmpeg-path').write_text(ffmpeg+'\n')
    # Code/models contain no secrets; www-data must be able to execute/read them.
    for p in root.rglob('*'):
        if p.is_symlink():continue
        p.chmod(0o755 if p.is_dir() or p.stat().st_mode&0o111 else 0o644)
    sample=Path(__file__).with_name('synthetic-speech.wav')
    expected='Сегодня наша команда готовит новый сюжет. Камера стоит у окна. Мы читаем текст спокойно и делаем короткие паузы.'
    p=subprocess.run([str(interpreter),str(Path(__file__).with_name('audio_worker.py'))],
        input=json.dumps(dict(path=str(sample),model=str(model),ffmpeg=ffmpeg,expected=expected)),
        capture_output=True,text=True,timeout=65,env=dict(os.environ,OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1'))
    if not p.stdout.strip():
        print('SYNTHETIC_AUDIO_PROCESS_EXIT',p.returncode,flush=True)
        print('SYNTHETIC_AUDIO_STDERR',p.stderr[-1800:],flush=True)
        raise RuntimeError('synthetic audio worker returned no result')
    result=json.loads(p.stdout)
    print('SYNTHETIC_AUDIO_PROBE',json.dumps({k:v for k,v in result.items() if k!='transcript'}),flush=True)
    assert p.returncode==0 and result.get('recognized_words',0)>=5,'local audio probe failed'
    (root/'READY').write_text('Synthetic Russian audio decoded and recognized; no phoneme diagnosis.\n')
    (root/'READY').chmod(0o644)
    sample.unlink()
    print('LOCAL_AUDIO_READY_NO_CHILD_DATA',flush=True)


if __name__=='__main__':main()
