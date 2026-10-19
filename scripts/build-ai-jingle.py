#!/usr/bin/env python3
"""Original 30-second synthesized musical study, explicitly not a Suno output."""
import math,wave,struct,subprocess
from pathlib import Path
RATE=22050;DURATION=30
song=[0.0]*(RATE*DURATION)
def tone(start,seconds,freq,volume):
 for n in range(int(seconds*RATE)):
  t=n/RATE;env=min(1,t/.015)*math.exp(-t*4/max(seconds,.1));pos=int(start*RATE)+n
  if pos<len(song):song[pos]+=volume*env*(math.sin(2*math.pi*freq*t)+.15*math.sin(4*math.pi*freq*t))
# 14 bars at 120 BPM plus a closing chord; all composition generated here.
chords=[(261.63,329.63,392),(220,261.63,329.63),(174.61,220,261.63),(196,246.94,293.66)]
melody=[523.25,659.25,783.99,659.25,587.33,523.25,440,392]
for bar in range(14):
 start=bar*2;chord=chords[bar%4]
 for f in chord:tone(start,1.8,f,.055)
 for beat in range(4):
  tone(start+beat*.5,.16,90,.10)
  tone(start+beat*.5,.22,melody[(bar*4+beat)%8],.13)
for f in chords[0]:tone(28,1.9,f,.12)
peak=max(abs(x) for x in song)
path=Path('/tmp/timecode-jingle.wav')
with wave.open(str(path),'wb') as wav:
 wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(RATE);wav.writeframes(b''.join(struct.pack('<h',int(x/peak*23000)) for x in song))
out=Path(__file__).resolve().parents[1]/'assets/ai-course/original-jingle.mp3'
subprocess.run(['ffmpeg','-y','-v','error','-i',str(path),'-codec:a','libmp3lame','-b:a','96k',str(out)],check=True)
print(out)
