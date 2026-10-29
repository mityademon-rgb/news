"""Verify the lightweight local decoder; no heavy recognition model or child data."""
import json
import os
from pathlib import Path
import subprocess


def main():
    root=Path('/opt/timecode-speech');root.mkdir(exist_ok=True);root.chmod(0o755)
    interpreter=root/'venv/bin/python'
    if not interpreter.exists():subprocess.run(['python3','-m','venv','--without-pip',str(root/'venv')],check=True)
    subprocess.run(['pip3','--python',str(interpreter),'install','--disable-pip-version-check','imageio-ffmpeg==0.6.0'],check=True,timeout=120)
    ffmpeg=subprocess.check_output([str(interpreter),'-c','import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],text=True).strip()
    assert Path(ffmpeg).is_file()
    (root/'ffmpeg-path').write_text(ffmpeg+'\n')
    for p in root.rglob('*'):
        if p.is_symlink():continue
        p.chmod(0o755 if p.is_dir() or p.stat().st_mode&0o111 else 0o644)
    sample=Path(__file__).with_name('synthetic-speech.wav')
    p=subprocess.run([str(interpreter),str(Path(__file__).with_name('audio_worker.py'))],
        input=json.dumps(dict(path=str(sample),ffmpeg=ffmpeg)),capture_output=True,text=True,timeout=30)
    result=json.loads(p.stdout)
    print('SYNTHETIC_AUDIO_PROBE',json.dumps(result),flush=True)
    assert p.returncode==0 and result.get('active_seconds',0)>5,'decoder probe failed'
    (root/'READY').write_text('signal_only: volume, clipping, pauses; no transcription or phonetic assessment.\n')
    (root/'READY').chmod(0o644)
    (root/'MODE').write_text('signal_only\n');(root/'MODE').chmod(0o644)
    sample.unlink()
    print('LOCAL_AUDIO_SIGNAL_READY_NO_CHILD_DATA',flush=True)


if __name__=='__main__':main()
