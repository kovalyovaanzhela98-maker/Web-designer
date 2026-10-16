"""Иконка «Мои деньги»: Фин (www/img/fin/hero.png) на индиго-градиенте.
Ресурсы Android кладутся в resources/android/res. Запуск: npm run icons"""
from PIL import Image, ImageDraw, ImageFilter
import os
HERE=os.path.dirname(__file__)
OUT=os.path.join(HERE,'..','resources','android','res')
FIN=Image.open(os.path.join(HERE,'..','www','img','fin','hello.png')).convert('RGBA')
S=1024
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def background():
    n=256; g=Image.new('RGB',(n,n)); px=g.load()
    c1,c2,c3=(74,102,218),(40,62,166),(22,32,98)
    for y in range(n):
        for x in range(n):
            t=(x*0.4+y*0.6)/n
            px[x,y]=lerp(c1,c2,t/0.55) if t<0.55 else lerp(c2,c3,(t-0.55)/0.45)
    g=g.resize((S,S),Image.BICUBIC).convert('RGBA')
    glow=Image.new('RGBA',(S,S),(0,0,0,0)); ImageDraw.Draw(glow).ellipse([-380,-420,620,580],fill=(255,255,255,30))
    return Image.alpha_composite(g,glow.filter(ImageFilter.GaussianBlur(150)))
def place(share):
    """Фин занимает share от стороны холста, по центру; мягкая тень под ним."""
    w,h=FIN.size; k=S*share/max(w,h); f=FIN.resize((int(w*k),int(h*k)),Image.LANCZOS)
    layer=Image.new('RGBA',(S,S),(0,0,0,0))
    x=(S-f.width)//2; y=(S-f.height)//2+int(S*0.015)
    sh=Image.new('RGBA',(S,S),(0,0,0,0)); a=f.split()[3].point(lambda v:int(v*0.4)); sh.paste((8,14,60,255),(x,y+int(S*0.02)),a)
    layer=Image.alpha_composite(layer,sh.filter(ImageFilter.GaussianBlur(S*0.012)))
    layer.alpha_composite(f,(x,y)); return layer
def mono():
    f=place(0.64); a=f.split()[3]; m=Image.new('RGBA',(S,S),(255,255,255,0)); m.putalpha(a); 
    return Image.merge('RGBA',(Image.new('L',(S,S),255),)*3+(a,))
def mask(round_=False,radius=0.235):
    m=Image.new('L',(2048,2048),0); d=ImageDraw.Draw(m)
    if round_: d.ellipse([0,0,2047,2047],fill=255)
    else: d.rounded_rectangle([0,0,2047,2047],radius=int(2048*radius),fill=255)
    return m.resize((S,S),Image.LANCZOS)
bg=background(); fg=place(0.64); fg_leg=place(0.84)   # 60% — безопасная зона адаптивной иконки
def legacy(round_):
    im=bg.copy(); im.alpha_composite(fg_leg); im.putalpha(mask(round_)); return im
dens={'mdpi':(48,108),'hdpi':(72,162),'xhdpi':(96,216),'xxhdpi':(144,324),'xxxhdpi':(192,432)}
L,R=legacy(False),legacy(True); MO=mono()
for k,(l,f) in dens.items():
    d=os.path.join(OUT,'mipmap-'+k); os.makedirs(d,exist_ok=True)
    L.resize((l,l),Image.LANCZOS).save(os.path.join(d,'ic_launcher.png'))
    R.resize((l,l),Image.LANCZOS).save(os.path.join(d,'ic_launcher_round.png'))
    fg.resize((f,f),Image.LANCZOS).save(os.path.join(d,'ic_launcher_foreground.png'))
    bg.resize((f,f),Image.LANCZOS).convert('RGB').save(os.path.join(d,'ic_launcher_background.png'))
    MO.resize((f,f),Image.LANCZOS).save(os.path.join(d,'ic_launcher_monochrome.png'))
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
open(os.path.join(vals,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#283EA6</color>\n</resources>\n')
L.resize((512,512),Image.LANCZOS).save(os.path.join(HERE,'..','www','icon.png'))
pv=Image.new('RGB',(900,320),(238,241,245))
for im,pos,sz in ((L,(30,30),256),(R,(330,30),256),(L,(650,30),96),(L,(650,160),56)):
    a=im.resize((sz,sz),Image.LANCZOS); pv.paste(a,pos,a)
pv.save('/tmp/claude-0/icon_preview.png')
