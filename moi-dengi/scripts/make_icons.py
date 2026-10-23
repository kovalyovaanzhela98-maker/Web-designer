"""Иконка «Фин»: готовая картинка Фина (resources/source/app-icon.png).
Раскладывает ресурсы Android в resources/android/res: обычная, круглая, адаптивная (передний план + фон)
и монохромная версия для тематических иконок Android 13+. Запуск: npm run icons"""
from PIL import Image, ImageDraw, ImageChops, ImageFilter
import os
HERE=os.path.dirname(__file__)
OUT=os.path.join(HERE,'..','resources','android','res')
SRC=Image.open(os.path.join(HERE,'..','resources','source','app-icon.png')).convert('RGB')
S=1024
BG=(0,0,0)                          # цвет фона самой картинки (чёрный)
img=SRC.resize((S,S),Image.LANCZOS)
def mask(round_=False,radius=0.235):
    m=Image.new('L',(2048,2048),0); d=ImageDraw.Draw(m)
    if round_: d.ellipse([0,0,2047,2047],fill=255)
    else: d.rounded_rectangle([0,0,2047,2047],radius=int(2048*radius),fill=255)
    return m.resize((S,S),Image.LANCZOS)
def legacy(round_):
    im=img.convert('RGBA'); im.putalpha(mask(round_)); return im
def scaled(share):
    """Картинка по центру на холсте цвета фона; share — доля холста (адаптивная маска обрезает края)."""
    c=Image.new('RGB',(S,S),BG); k=int(S*share); f=img.resize((k,k),Image.LANCZOS); c.paste(f,((S-k)//2,(S-k)//2)); return c
fg=scaled(0.74).convert('RGBA')                       # передний план адаптивной иконки
bg=Image.new('RGB',(S,S),BG)                          # фон адаптивной иконки
def mono():
    f=scaled(0.74); px=f.load(); out=Image.new('RGBA',(S,S),(255,255,255,0)); po=out.load()
    for y in range(S):
        for x in range(S):
            r,g,b=px[x,y]; d=abs(r-BG[0])+abs(g-BG[1])+abs(b-BG[2])
            a=max(0,min(255,(d-40)*3)); po[x,y]=(255,255,255,a)
    return out
MO=mono()
dens={'mdpi':(48,108),'hdpi':(72,162),'xhdpi':(96,216),'xxhdpi':(144,324),'xxxhdpi':(192,432)}
L,R=legacy(False),legacy(True)
for k,(l,f) in dens.items():
    d=os.path.join(OUT,'mipmap-'+k); os.makedirs(d,exist_ok=True)
    L.resize((l,l),Image.LANCZOS).save(os.path.join(d,'ic_launcher.png'))
    R.resize((l,l),Image.LANCZOS).save(os.path.join(d,'ic_launcher_round.png'))
    fg.resize((f,f),Image.LANCZOS).save(os.path.join(d,'ic_launcher_foreground.png'))
    bg.resize((f,f),Image.LANCZOS).save(os.path.join(d,'ic_launcher_background.png'))
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
open(os.path.join(vals,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#000000</color>\n</resources>\n')
L.resize((512,512),Image.LANCZOS).save(os.path.join(HERE,'..','www','icon.png'),optimize=True)
# превью: как увидит человек (квадрат, круг, мелкие размеры, адаптивная в круге)
pv=Image.new('RGB',(1000,340),(238,241,245))
ad=fg.copy(); ad=ad.crop((int(S*0.1667),int(S*0.1667),int(S*0.8333),int(S*0.8333))).resize((256,256),Image.LANCZOS)
adm=Image.new('L',(256,256),0); ImageDraw.Draw(adm).ellipse([0,0,255,255],fill=255); ad.putalpha(adm)
for im,pos,sz in ((L,(30,40),256),(R,(320,40),256),(ad,(610,40),256)):
    a=im.resize((sz,sz),Image.LANCZOS); pv.paste(a,pos,a)
for sz,x in ((96,890),(56,890)):
    a=L.resize((sz,sz),Image.LANCZOS); pv.paste(a,(x,40 if sz==96 else 170),a)
pv.save('/tmp/claude-0/icon_preview.png')
