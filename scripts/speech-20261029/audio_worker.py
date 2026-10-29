"""Optional local audio decoding/ASR. Input never leaves server; no phonetic diagnosis."""
import array
import difflib
import json
import math
from pathlib import Path
import re
import resource
import subprocess
import sys


def analyze(path, model_path, ffmpeg, expected):
    print('AUDIO_STAGE import',file=sys.stderr,flush=True)
    import vosk
    vosk.SetLogLevel(-1)
    # Bound decode output to 65 seconds, mono 16 kHz PCM, without following media URLs.
    p=subprocess.run([ffmpeg,'-nostdin','-v','error','-threads','1','-protocol_whitelist','file,pipe,crypto',
        '-format_whitelist','ogg,wav,mp3,flac,matroska,mov,aac',
        '-i',str(path),'-t','65','-ac','1','-ar','16000','-f','s16le','pipe:1'],capture_output=True,timeout=20)
    if p.returncode or len(p.stdout)<32000:raise ValueError('audio-decode-failed')
    samples=array.array('h',p.stdout)
    duration=len(samples)/16000
    if not 29 <= duration <= 61:raise ValueError('audio-duration-outside-30-60')
    windows=[samples[i:i+320] for i in range(0,len(samples),320)]
    rms=[math.sqrt(sum(x*x for x in frame)/max(len(frame),1)) for frame in windows]
    peak=max(rms,default=0)
    active=[x>max(100,peak*.045) for x in rms]
    speech_seconds=sum(active)*.02
    if speech_seconds<2:raise ValueError('audio-no-reliable-speech')
    clipped=sum(abs(x)>=32700 for x in samples)/len(samples)
    print('AUDIO_STAGE model',file=sys.stderr,flush=True)
    model=vosk.Model(str(model_path));rec=vosk.KaldiRecognizer(model,16000);rec.SetWords(True)
    words=[]
    for i in range(0,len(p.stdout),8000):
        if rec.AcceptWaveform(p.stdout[i:i+8000]):words.extend(json.loads(rec.Result()).get('result',[]))
    words.extend(json.loads(rec.FinalResult()).get('result',[]))
    text=' '.join(w['word'] for w in words)
    confidence=sum(w.get('conf',0) for w in words)/len(words) if words else 0
    terms=lambda x:re.findall(r'[а-яё]+',x.casefold().replace('ё','е'))
    reference=terms(expected);heard=terms(text)
    # Estimate phrase overlap, not an articulation score. ASR can misrecognize correct speech.
    matched=sum(b.size for b in difflib.SequenceMatcher(a=reference,b=heard).get_matching_blocks())
    overlap=matched/max(len(reference),1)
    wpm=len(words)/max(speech_seconds,1)*60
    return dict(duration=round(duration,1),speech_seconds=round(speech_seconds,1),
        recognized_words=len(words),confidence=round(confidence,2),reference_overlap=round(overlap,2),
        words_per_speech_minute=round(wpm),clipping=round(clipped,4),transcript=text[:1200])


if __name__=='__main__':
    try:
        resource.setrlimit(resource.RLIMIT_AS,(420*1024*1024,420*1024*1024))
        resource.setrlimit(resource.RLIMIT_CPU,(50,50))
        obj=json.load(sys.stdin)
        result=analyze(obj['path'],obj['model'],obj['ffmpeg'],obj.get('expected',''))
        print(json.dumps(result,ensure_ascii=False))
    except Exception as error:
        # Never emit audio paths, transcripts or raw provider errors on failure.
        print(json.dumps({'error':str(error) if isinstance(error,ValueError) else type(error).__name__}))
        sys.exit(2)
