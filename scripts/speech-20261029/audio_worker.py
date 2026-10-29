"""Bounded local signal analysis. No transcript or phonetic judgements."""
import array
import json
import math
import resource
import subprocess
import sys


def analyze(path, model_path, ffmpeg, expected):
    # model_path/expected retained for compatibility; never infer words from a waveform.
    p=subprocess.run([ffmpeg,'-nostdin','-v','error','-threads','1',
        '-protocol_whitelist','file,pipe,crypto','-format_whitelist','ogg,wav,mp3,flac,matroska,mov,aac',
        '-i',str(path),'-t','65','-ac','1','-ar','16000','-f','s16le','pipe:1'],capture_output=True,timeout=20)
    if p.returncode or len(p.stdout)<32000:raise ValueError('audio-decode-failed')
    samples=array.array('h',p.stdout);duration=len(samples)/16000
    if not 29<=duration<=61:raise ValueError('audio-duration-outside-30-60')
    frames=[samples[i:i+320] for i in range(0,len(samples),320)]
    rms=[math.sqrt(sum(x*x for x in f)/max(len(f),1)) for f in frames]
    peak=max(rms,default=0)
    active=[x>max(100,peak*.045) for x in rms]
    spans=[i for i,x in enumerate(active) if x]
    if len(spans)*.02<2:raise ValueError('audio-no-reliable-speech')
    silent=0;gaps=[]
    for x in active[spans[0]:spans[-1]+1]:
        if not x:silent+=.02
        elif silent:
            if silent>=2:gaps.append(round(silent,1))
            silent=0
    return dict(mode='signal_only',duration=round(duration,1),active_seconds=round(len(spans)*.02,1),
        longest_internal_pause=max(gaps,default=0),long_pauses=len(gaps),quiet=peak<500,
        clipping=round(sum(abs(x)>=32700 for x in samples)/len(samples),4))


if __name__=='__main__':
    try:
        resource.setrlimit(resource.RLIMIT_AS,(320*1024*1024,320*1024*1024))
        resource.setrlimit(resource.RLIMIT_CPU,(20,20))
        obj=json.load(sys.stdin)
        print(json.dumps(analyze(obj['path'],obj.get('model',''),obj['ffmpeg'],obj.get('expected',''))))
    except Exception as error:
        print(json.dumps({'error':str(error) if isinstance(error,ValueError) else type(error).__name__}))
        sys.exit(2)
