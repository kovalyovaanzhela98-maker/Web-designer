"""Рисует иконку (белая карта на синем #2F4AA8) и кладёт mipmap-ресурсы в resources/android/res."""
from PIL import Image, ImageDraw
import os
BLUE=(47,74,168,255); WHITE=(255,255,255,255)
OUT=os.path.join(os.path.dirname(__file__),'..','resources','android','res')
S=1024
def card(draw,scale,cx,cy):
    w,h=int(560*scale),int(380*scale); x0,y0=cx-w//2,cy-h//2
    draw.rounded_rectangle([x0,y0,x0+w,y0+h],radius=int(54*scale),fill=WHITE)
    draw.rectangle([x0,y0+int(88*scale),x0+w,y0+int(168*scale)],fill=BLUE)
    draw.rounded_rectangle([x0+int(48*scale),y0+int(240*scale),x0+int(188*scale),y0+int(292*scale)],radius=int(14*scale),fill=BLUE)
    draw.rounded_rectangle([x0+int(48*scale),y0+int(310*scale),x0+int(300*scale),y0+int(334*scale)],radius=int(12*scale),fill=(160,172,214,255))
def fg():
    im=Image.new('RGBA',(S,S),(0,0,0,0)); card(ImageDraw.Draw(im),0.95,S//2,S//2); return im
def full(round_=False):
    im=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(im)
    if round_: d.ellipse([0,0,S-1,S-1],fill=BLUE)
    else: d.rounded_rectangle([0,0,S-1,S-1],radius=int(S*0.22),fill=BLUE)
    card(d,1.05,S//2,S//2); return im
legacy={'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}
fgs={'mdpi':108,'hdpi':162,'xhdpi':216,'xxhdpi':324,'xxxhdpi':432}
for k in legacy:
    d=os.path.join(OUT,'mipmap-'+k); os.makedirs(d,exist_ok=True)
    full().resize((legacy[k],)*2,Image.LANCZOS).save(os.path.join(d,'ic_launcher.png'))
    full(True).resize((legacy[k],)*2,Image.LANCZOS).save(os.path.join(d,'ic_launcher_round.png'))
    fg().resize((fgs[k],)*2,Image.LANCZOS).save(os.path.join(d,'ic_launcher_foreground.png'))
v=os.path.join(OUT,'values'); os.makedirs(v,exist_ok=True)
open(os.path.join(v,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2F4AA8</color>\n</resources>\n')
full().resize((512,512),Image.LANCZOS).save(os.path.join(os.path.dirname(__file__),'..','www','icon.png'))
