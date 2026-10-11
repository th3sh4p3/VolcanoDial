"""Build a compact, antialiased German subset of Bitstream Vera for Flash."""
from pathlib import Path
import argparse
from PIL import Image,ImageDraw,ImageFont
p=argparse.ArgumentParser();p.add_argument('--font-dir',required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[1];src=Path(a.font_dir)
out=['#pragma once','#include <cstdint>','namespace vd {','struct Glyph {uint32_t code;uint32_t offset;uint8_t w,h;int8_t x,y;uint8_t advance;};','struct Font {const Glyph* glyphs;const uint8_t* pixels;uint16_t count;uint8_t height;};']
chars=''.join(chr(n) for n in range(32,127))+'°ÄÖÜßäöü…‹—·'
for size in (12,14,18,22,40):
 font=ImageFont.truetype(str(src/('VeraBd.ttf' if size>=18 else 'Vera.ttf')),size)
 data=[];glyph=[]
 for ch in sorted(chars,key=ord):
  x,y,r,b=font.getbbox(ch);w,h=r-x,b-y;im=Image.new('L',(max(1,w),max(1,h)));ImageDraw.Draw(im).text((-x,-y),ch,font=font,fill=255)
  pixels=[round(v/17) for v in im.getdata()] if w*h else []
  glyph.append((ord(ch),len(data),w,h,x,y,round(font.getlength(ch))))
  data.extend((pixels[i]<<4)|(pixels[i+1] if i+1<len(pixels) else 0) for i in range(0,len(pixels),2))
 out+=['inline const uint8_t pixels%d[]={%s};'%(size,','.join(map(str,data))), 'inline const Glyph glyphs%d[]={%s};'%(size,','.join('{'+','.join(map(str,g))+'}' for g in glyph)), 'inline const Font font%d{glyphs%d,pixels%d,%d,%d};'%(size,size,size,len(glyph),size)]
out+=['}'];(root/'firmware/VolcanoDial/ui_fonts.hpp').write_text('\n'.join(out),encoding='utf-8')
license=src/'bitstream-vera-license.txt';(root/'docs/Bitstream-Vera-LICENSE.txt').write_text(license.read_text(),encoding='utf-8')
print('Font subset generated in Flash; license included.')
