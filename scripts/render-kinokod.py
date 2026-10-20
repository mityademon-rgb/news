#!/usr/bin/env python3
"""Render original, family-safe cinematic stills for the TIMECODE KinoKod chat quest."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, random, os
random.seed(27012)
W,H=1024,576
ROOT=os.path.join(os.path.dirname(__file__),'..','..','kinokod-images')
os.makedirs(ROOT,exist_ok=True)
F='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def font(size,bold=False):
    return ImageFont.truetype(FB if bold else F,size)
titles=[
 ('-1','КИНОКОД','ДЕЛО О ПРОПАВШЕЙ КАМЕРЕ', 'ПРИГЛАШЕНИЕ К РАССЛЕДОВАНИЮ'),
 ('0','ПРОПАЖА','КАДР, КОТОРЫЙ ИСЧЕЗ', '20 ОКТЯБРЯ • УЛИКА 01'),
 ('1','17:24','ОСТАНОВИВШЕЕСЯ ВРЕМЯ','20 ОКТЯБРЯ • УЛИКА 02'),
 ('2','ТРОЕ','У КАЖДОГО СВОЁ АЛИБИ', '21 ОКТЯБРЯ • УЛИКА 03'),
 ('3','ДОПРОС','ЧЬЯ ПРАВДА НЕ СХОДИТСЯ?', '21 ОКТЯБРЯ • УЛИКА 04'),
 ('4','КАДР 24','СВЕТ · ЛИЦО · ПРАВДА','22 ОКТЯБРЯ • УЛИКА 05'),
 ('5','УЛИКА','ТВОЙ КАДР МЕНЯЕТ ИСТОРИЮ','22 ОКТЯБРЯ • УЛИКА 06'),
 ('6','ФИНАЛ','ПОСЛЕДНЯЯ ВЕРСИЯ','23 ОКТЯБРЯ • РАЗВЯЗКА'),
]
def card(index,title,sub,kicker):
    im=Image.new('RGB',(W,H));px=im.load()
    for y in range(H):
        for x in range(W):
            g=(y/H*.65+x/W*.28)
            grain=random.randint(-7,7)
            glow=max(0,1-math.hypot((x-710)/670,(y-225)/520))
            px[x,y]=(int(7+grain*.3+glow*22),int(12+grain*.4+glow*12),int(24+grain*.5+glow*12))
    d=ImageDraw.Draw(im,'RGBA')
    # Film perforations: 16:9 composition with analogue strip frame
    d.rectangle((20,18,W-20,H-18),outline=(235,145,62,100),width=2)
    for x in range(54,W,72):
        d.rounded_rectangle((x,26,x+25,41),4,fill=(218,137,65,92))
        d.rounded_rectangle((x,H-42,x+25,H-27),4,fill=(218,137,65,92))
    for k in range(5):
        d.ellipse((570-k*48,-140-k*48,1160+k*48,450+k*48),outline=(255,148,50,34),width=2)
    # Cinematic practical prop on the right half
    ox,oy=743,273
    if index in ('-1','0'):
        d.rounded_rectangle((690,235,892,374),24,fill=(39,53,69,255),outline=(255,174,92,255),width=5)
        d.rounded_rectangle((733,180,845,239),10,fill=(42,50,68,255))
        d.polygon([(887,263),(966,220),(966,373),(887,338)],fill=(50,59,77,255))
        for cx in (730,822):
            d.ellipse((cx-46,135,cx+46,227),fill=(36,48,64,255),outline=(255,165,81,200),width=5)
            d.ellipse((cx-17,164,cx+17,198),fill=(9,17,32,255))
        d.ellipse((730,260,824,354),fill=(9,16,35,255),outline=(234,176,112,255),width=9)
        d.ellipse((750,280,804,334),fill=(32,77,96,255))
        d.line((785,375,785,442),fill=(219,164,101,255),width=6)
        d.line((785,442,700,490),fill=(219,164,101,255),width=5)
        d.line((785,442,870,490),fill=(219,164,101,255),width=5)
    elif index=='1':
        for cx,cy,r in [(760,265,141),(911,370,58)]:
            d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=(31,45,65,250),outline=(252,171,88,255),width=9)
            for n in range(12):
                a=(n/12*math.tau)-math.pi/2
                d.line((cx+math.cos(a)*(r-15),cy+math.sin(a)*(r-15),cx+math.cos(a)*(r-35),cy+math.sin(a)*(r-35)),fill=(255,190,120,255),width=4)
            d.line((cx,cy,cx+r*.55,cy-r*.27),fill=(255,181,97,255),width=7)
            d.line((cx,cy,cx-r*.25,cy-r*.68),fill=(255,181,97,255),width=6)
    elif index in ('2','3'):
        for n,x in enumerate((650,765,880)):
            y=218+((n%2)*12)
            d.ellipse((x-42,y-85,x+42,y-3),fill=(55+n*9,63+n*7,78+n*6,255),outline=(232,158,94,235),width=3)
            d.rounded_rectangle((x-58,y,x+58,y+153),18,fill=(36+n*9,53+n*5,68,255),outline=(242,161,80,220),width=3)
            d.line((x-20,y+23,x+20,y+23),fill=(255,182,111,130),width=3)
    elif index in ('4','6'):
        d.ellipse((620,145,880,405),fill=(31,44,57,255),outline=(240,171,96,255),width=10)
        for cx,cy in ((700,222),(795,222),(700,323),(795,323)):
            d.ellipse((cx-29,cy-29,cx+29,cy+29),fill=(6,17,32,255))
        d.ellipse((738,269,768,299),fill=(5,12,29,255))
        d.polygon(((820,364),(951,405),(907,457)),fill=(255,179,86,180))
    else:
        d.rounded_rectangle((655,175,891,420),22,fill=(28,44,61,255),outline=(236,163,80,255),width=5)
        d.line((685,373,836,222),fill=(253,182,93,255),width=10)
        d.ellipse((805,180,904,279),outline=(255,184,99,255),width=9)
    # typography panel
    d.rounded_rectangle((59,86,276,133),8,fill=(220,109,55,65),outline=(255,183,106,155),width=1)
    d.text((73,95),'TIMECODE  /  КИМИ',font=font(22,True),fill=(255,197,134,255))
    fs=78 if len(title)<10 else 65
    d.text((58,167),title,font=font(fs,True),fill=(253,243,231,255))
    d.text((60,279),sub,font=font(25,True),fill=(255,174,94,255))
    d.line((61,352,510,352),fill=(255,160,86,100),width=2)
    d.text((61,384),kicker,font=font(23),fill=(190,203,216,255))
    d.text((61,486),'СМОТРИ  ·  СЛУШАЙ  ·  РАССЛЕДУЙ',font=font(18,True),fill=(176,186,202,255))
    out=os.path.join(ROOT,'kinokod-'+index+'.png')
    im.save(out,optimize=True)
    print(out,os.path.getsize(out))
for info in titles:card(*info)
