"""Иконка «Мои деньги»: Монька (золотая монетка с ростком и улыбкой) на индиго-градиенте.
Рисуется в 4x и уменьшается — края гладкие. Ресурсы кладутся в resources/android/res."""
from PIL import Image, ImageDraw, ImageFilter
import os, math
OUT=os.path.join(os.path.dirname(__file__),'..','resources','android','res')
K=3; S=1024*K
INK=(29,36,51,255)
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))
def background():
    n=256; g=Image.new('RGB',(n,n)); px=g.load()
    c1,c2,c3=(74,102,218),(40,62,166),(22,32,98)
    for y in range(n):
        for x in range(n):
            t=(x*0.4+y*0.6)/n
            px[x,y]=lerp(c1,c2,t/0.55) if t<0.55 else lerp(c2,c3,(t-0.55)/0.45)
    g=g.resize((1024,1024),Image.BICUBIC).convert('RGBA')
    glow=Image.new('RGBA',(1024,1024),(0,0,0,0)); d=ImageDraw.Draw(glow)
    d.ellipse([-380,-420,620,580],fill=(255,255,255,30))
    return Image.alpha_composite(g,glow.filter(ImageFilter.GaussianBlur(150)))
def radial(size,c_in,c_out,cx=.35,cy=.28):
    n=size; im=Image.new('RGBA',(n,n)); px=im.load()
    for y in range(n):
        for x in range(n):
            d=math.hypot(x/n-cx,y/n-cy)/0.85; d=min(1,d)
            px[x,y]=lerp(c_in,c_out,d)+(255,)
    return im
def mascot(mono=False):
    """Монька на холсте 1024x1024; рисуем на сетке 120 → масштаб sc."""
    sc=S/120*0.80; ox=oy=(S-120*sc)/2+8*K
    im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    X=lambda v:ox+v*sc; Y=lambda v:oy+v*sc
    def circ(cx,cy,r,fill=None,outline=None,width=1):
        d.ellipse([X(cx-r),Y(cy-r),X(cx+r),Y(cy+r)],fill=fill,outline=outline,width=int(width*sc))
    white=(255,255,255,255)
    if mono:
        circ(60,66,44,fill=white)
        # лицо как вырез
        for cx in (47,73):
            d.ellipse([X(cx-5.4),Y(64-7),X(cx+5.4),Y(64+7)],fill=(0,0,0,0))
        # рот
        d.arc([X(50),Y(66),X(70),Y(86)],20,160,fill=(0,0,0,0),width=int(3.6*sc))
        return im
    def bez(p0,p1,p2,p3,n=24):
        pts=[]
        for i in range(n+1):
            t=i/n; u=1-t
            pts.append((u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0], u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1]))
        return pts
    def leaf(c1,c2,end,color):
        pts=bez((60,14),c1,c2,end)+bez(end,(end[0]+(8 if end[0]<60 else -8),end[1]+2),(56 if end[0]<60 else 64,19),(60,14))[1:]
        d.polygon([(X(x),Y(y)) for x,y in pts],fill=color)
    d.line([X(60),Y(24),X(60),Y(12)],fill=(31,138,91,255),width=int(4.4*sc))
    leaf((50,5),(39,9),(41,18),(47,182,122,255))
    leaf((70,4),(81,8),(79,17),(31,138,91,255))
    # тело-монета
    n=int(88*sc); coin=radial(n,(255,217,90),(242,185,0))
    m=Image.new('L',(n,n),0); ImageDraw.Draw(m).ellipse([0,0,n-1,n-1],fill=255)
    im.paste(coin,(int(X(60-44)),int(Y(66-44))),m)
    ov=Image.new('RGBA',(S,S),(0,0,0,0)); od=ImageDraw.Draw(ov)
    od.ellipse([X(60-35.5),Y(66-35.5),X(60+35.5),Y(66+35.5)],outline=(201,143,0,115),width=int(3*sc))
    od.arc([X(60-38),Y(66-38),X(60+38),Y(66+38)],196,252,fill=(255,255,255,170),width=int(5*sc))
    for cx in (37,83): od.ellipse([X(cx-6.6),Y(77-4.2),X(cx+6.6),Y(77+4.2)],fill=(255,127,107,120))
    im=Image.alpha_composite(im,ov); d=ImageDraw.Draw(im)
    # глаза
    for cx in (47,73):
        d.ellipse([X(cx-5.4),Y(64-7),X(cx+5.4),Y(64+7)],fill=INK)
        d.ellipse([X(cx+1.7-1.9),Y(64-2.4-1.9),X(cx+1.7+1.9),Y(64-2.4+1.9)],fill=white)
    # улыбка
    d.arc([X(50),Y(63),X(70),Y(87)],25,155,fill=INK,width=int(3.6*sc))
    for cx in (51.2,68.8):
        d.ellipse([X(cx-1.8),Y(77.5-1.8),X(cx+1.8),Y(77.5+1.8)],fill=INK)
    # тень
    sh=Image.new('RGBA',(S,S),(0,0,0,0)); sd=ImageDraw.Draw(sh)
    sd.ellipse([X(30),Y(108),X(90),Y(118)],fill=(10,16,60,90))
    sh=sh.filter(ImageFilter.GaussianBlur(10*K))
    return Image.alpha_composite(sh,im)
def mask(round_=False,radius=0.235):
    m=Image.new('L',(2048,2048),0); d=ImageDraw.Draw(m)
    if round_: d.ellipse([0,0,2047,2047],fill=255)
    else: d.rounded_rectangle([0,0,2047,2047],radius=int(2048*radius),fill=255)
    return m.resize((1024,1024),Image.LANCZOS)
bg=background(); fg=mascot().resize((1024,1024),Image.LANCZOS); mono=mascot(True).resize((1024,1024),Image.LANCZOS)
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
open(os.path.join(vals,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#283EA6</color>\n</resources>\n')
L.resize((512,512),Image.LANCZOS).save(os.path.join(os.path.dirname(__file__),'..','www','icon.png'))
L.save('/tmp/claude-0/icon_big.png')
pv=Image.new('RGB',(900,320),(238,241,245))
a=L.resize((256,256),Image.LANCZOS); pv.paste(a,(30,30),a)
a=R.resize((256,256),Image.LANCZOS); pv.paste(a,(330,30),a)
a=L.resize((96,96),Image.LANCZOS); pv.paste(a,(650,30),a)
a=L.resize((56,56),Image.LANCZOS); pv.paste(a,(650,160),a)
pv.save('/tmp/claude-0/icon_preview.png')
