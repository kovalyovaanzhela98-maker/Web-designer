"""Рисует иконку «Мои деньги» и кладёт mipmap-ресурсы в resources/android/res.
Минимализм: глубокий синий градиент, белая наклонная карта, жёлтая монета-акцент."""
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import os, math
OUT=os.path.join(os.path.dirname(__file__),'..','resources','android','res')
S=1024
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def gradient(size):
    im=Image.new('RGB',(size,size)); px=im.load()
    c1,c2,c3=(78,108,222),(47,74,168),(28,40,112)
    for y in range(size):
        for x in range(size):
            t=(x*0.35+y*0.65)/size
            px[x,y]=lerp(c1,c2,t/0.5) if t<0.5 else lerp(c2,c3,(t-0.5)/0.5)
    return im.convert('RGBA')
def glyph(mono=False):
    """Передний план 1024x1024 (карта + монета) на прозрачном фоне, в безопасной зоне 66%."""
    W,H=560,352
    card=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(card)
    fill=(255,255,255,255)
    d.rounded_rectangle([0,0,W-1,H-1],radius=58,fill=fill)
    if mono:
        d.rectangle([0,92,W,168],fill=(0,0,0,0))
        d.rounded_rectangle([48,226,190,274],radius=14,fill=(0,0,0,0))
    else:
        d.rectangle([0,92,W,168],fill=(47,74,168,255))
        d.rounded_rectangle([48,226,190,274],radius=14,fill=(242,194,48,255))
        d.rounded_rectangle([48,296,280,318],radius=11,fill=(190,200,235,255))
    card=card.rotate(12,resample=Image.BICUBIC,expand=True)
    im=Image.new('RGBA',(S,S),(0,0,0,0))
    cx,cy=S//2-10,S//2+6
    if not mono:
        sh=Image.new('RGBA',(S,S),(0,0,0,0))
        a=card.split()[3].point(lambda v:int(v*0.35))
        sh.paste((10,18,70,255),(cx-card.width//2,cy-card.height//2+26),a)
        im=Image.alpha_composite(im,sh.filter(ImageFilter.GaussianBlur(22)))
    im.alpha_composite(card,(cx-card.width//2,cy-card.height//2))
    # монета
    r=96; mx,my=cx+card.width//2-70,cy+card.height//2-70
    coin=Image.new('RGBA',(S,S),(0,0,0,0)); cd=ImageDraw.Draw(coin)
    if mono:
        cd.ellipse([mx-r,my-r,mx+r,my+r],fill=(255,255,255,255)); cd.ellipse([mx-r+34,my-r+34,mx+r-34,my+r-34],fill=(0,0,0,0))
    else:
        cd.ellipse([mx-r-12,my-r-12,mx+r+12,my+r+12],fill=(34,53,138,255))
        cd.ellipse([mx-r,my-r,mx+r,my+r],fill=(242,194,48,255))
        cd.ellipse([mx-r+30,my-r+30,mx+r-30,my+r-30],outline=(255,226,120,255),width=10)
    im=Image.alpha_composite(im,coin)
    return im
def squircle_mask(size,round_=False,radius=0.23):
    m=Image.new('L',(size*2,size*2),0); d=ImageDraw.Draw(m)
    if round_: d.ellipse([0,0,size*2-1,size*2-1],fill=255)
    else: d.rounded_rectangle([0,0,size*2-1,size*2-1],radius=int(size*2*radius),fill=255)
    return m.resize((size,size),Image.LANCZOS)
bg=gradient(S); fg=glyph(); mono=glyph(True)
def legacy(round_):
    im=bg.copy(); im.alpha_composite(fg)
    im.putalpha(squircle_mask(S,round_)); return im
dens={'mdpi':(48,108),'hdpi':(72,162),'xhdpi':(96,216),'xxhdpi':(144,324),'xxxhdpi':(192,432)}
L,R=legacy(False),legacy(True)
for k,(l,f) in dens.items():
    d=os.path.join(OUT,'mipmap-'+k); os.makedirs(d,exist_ok=True)
    L.resize((l,l),Image.LANCZOS).save(os.path.join(d,'ic_launcher.png'))
    R.resize((l,l),Image.LANCZOS).save(os.path.join(d,'ic_launcher_round.png'))
    fg.resize((f,f),Image.LANCZOS).save(os.path.join(d,'ic_launcher_foreground.png'))
    bg.resize((f,f),Image.LANCZOS).convert('RGB').save(os.path.join(d,'ic_launcher_background.png'))
    mono.resize((f,f),Image.LANCZOS).save(os.path.join(d,'ic_launcher_monochrome.png'))
v=os.path.join(OUT,'mipmap-anydpi-v26'); os.makedirs(v,exist_ok=True)
xml='''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
'''
for n in ('ic_launcher.xml','ic_launcher_round.xml'): open(os.path.join(v,n),'w').write(xml)
vals=os.path.join(OUT,'values'); os.makedirs(vals,exist_ok=True)
open(os.path.join(vals,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2F4AA8</color>\n</resources>\n')
L.resize((512,512),Image.LANCZOS).save(os.path.join(os.path.dirname(__file__),'..','www','icon.png'))
L.save('/tmp/claude-0/icon_big.png')
