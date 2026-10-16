"""Иконка «Мои деньги»: буква «м» из двух арок, правая ножка заканчивается жёлтой монетой.
Рисуется в 4x и уменьшается — края гладкие. Ресурсы кладутся в resources/android/res."""
from PIL import Image, ImageDraw, ImageFilter
import os
OUT=os.path.join(os.path.dirname(__file__),'..','resources','android','res')
K=4; S=1024*K
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def background():
    """Диагональный градиент индиго + мягкий свет в верхнем левом углу."""
    n=256; g=Image.new('RGB',(n,n)); px=g.load()
    c1,c2,c3=(70,98,214),(38,60,160),(20,30,92)
    for y in range(n):
        for x in range(n):
            t=(x*0.4+y*0.6)/n
            px[x,y]=lerp(c1,c2,t/0.55) if t<0.55 else lerp(c2,c3,(t-0.55)/0.45)
    g=g.resize((1024,1024),Image.BICUBIC).convert('RGBA')
    glow=Image.new('RGBA',(1024,1024),(0,0,0,0)); d=ImageDraw.Draw(glow)
    d.ellipse([-380,-420,620,580],fill=(255,255,255,26))
    return Image.alpha_composite(g,glow.filter(ImageFilter.GaussianBlur(150)))
def glyph(mono=False):
    im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    w=118*K; r=w//2; white=(255,255,255,255)
    xs=[322*K,512*K,702*K]            # три ножки буквы «м»
    base=700*K; top=384*K             # низ ножек / центр дуг
    rad=(xs[1]-xs[0])//2              # радиус арки
    def cap(x,y): d.ellipse([x-r,y-r,x+r,y+r],fill=white)
    # левая ножка и дуги
    d.line([(xs[0],top),(xs[0],base)],fill=white,width=w); cap(xs[0],base)
    for i in range(2):
        cx=(xs[i]+xs[i+1])//2; cy=top
        ro=rad+r; d.arc([cx-ro,cy-ro,cx+ro,cy+ro],180,360,fill=white,width=w)
    d.line([(xs[1],top),(xs[1],base)],fill=white,width=w); cap(xs[1],base)
    # правая ножка короче — под ней монета
    d.line([(xs[2],top),(xs[2],base-150*K)],fill=white,width=w); cap(xs[2],base-150*K)
    mr=92*K; cx,cy=xs[2],base+40*K
    if mono:
        d.ellipse([cx-mr,cy-mr,cx+mr,cy+mr],fill=white)
    else:
        d.ellipse([cx-mr,cy-mr,cx+mr,cy+mr],fill=(255,200,40,255))
        d.ellipse([cx-mr+26*K,cy-mr+26*K,cx+mr-26*K,cy+mr-26*K],outline=(255,236,160,255),width=9*K)
    # центрируем по видимой области
    bb=im.getbbox(); ox=(S-(bb[0]+bb[2]))//2; oy=(S-(bb[1]+bb[3]))//2
    out=Image.new('RGBA',(S,S),(0,0,0,0)); out.alpha_composite(im,(ox,oy))
    return out.resize((1024,1024),Image.LANCZOS)
def mask(round_=False,radius=0.235):
    m=Image.new('L',(2048,2048),0); d=ImageDraw.Draw(m)
    if round_: d.ellipse([0,0,2047,2047],fill=255)
    else: d.rounded_rectangle([0,0,2047,2047],radius=int(2048*radius),fill=255)
    return m.resize((1024,1024),Image.LANCZOS)
bg=background(); fg=glyph(); mono=glyph(True)
def legacy(round_):
    im=bg.copy(); im.alpha_composite(fg); im.putalpha(mask(round_)); return im
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
open(os.path.join(vals,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#263CA0</color>\n</resources>\n')
L.resize((512,512),Image.LANCZOS).save(os.path.join(os.path.dirname(__file__),'..','www','icon.png'))
L.save('/tmp/claude-0/icon_big.png')
# превью: как выглядит на экране телефона (круг, скруглённый квадрат)
pv=Image.new('RGB',(900,320),(238,241,245))
pv.paste(L.resize((256,256),Image.LANCZOS),(30,30),L.resize((256,256),Image.LANCZOS))
pv.paste(R.resize((256,256),Image.LANCZOS),(330,30),R.resize((256,256),Image.LANCZOS))
sm=L.resize((96,96),Image.LANCZOS); pv.paste(sm,(650,30),sm)
sm=L.resize((56,56),Image.LANCZOS); pv.paste(sm,(650,160),sm)
pv.save('/tmp/claude-0/icon_preview.png')
