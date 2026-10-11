"""Render the current German Markdown manual; requires reportlab and pypdf."""
from pathlib import Path
import re, html, json
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text(encoding='utf8'))['version']
pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialB','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='ArialB',italic='Arial',boldItalic='ArialB')
body=ParagraphStyle('body',fontName='Arial',fontSize=10,leading=14,spaceAfter=9,allowWidows=0,allowOrphans=0)
styles={1:ParagraphStyle('title',parent=body,fontName='ArialB',fontSize=21,leading=26,spaceAfter=18),2:ParagraphStyle('heading',parent=body,fontName='ArialB',fontSize=13,leading=18,spaceBefore=14,spaceAfter=8,keepWithNext=True)}
styles[3]=ParagraphStyle('subheading',parent=body,fontName='ArialB',fontSize=11,leading=15,spaceBefore=11,spaceAfter=7,keepWithNext=True)
cell=ParagraphStyle('cell',parent=body,fontSize=9,leading=12,spaceAfter=0)
def inline(text):
 text=html.escape(text)
 text=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
 text=re.sub(r'`(.+?)`',r'<font name="Courier">\1</font>',text)
 text=re.sub(r'\[([^]]+)\]\(([^)]+)\)',r'\1',text)
 return text
lines=(root/'docs/BEDIENUNGSANLEITUNG.md').read_text(encoding='utf8').splitlines()
story=[];i=0
while i<len(lines):
 line=lines[i].strip();i+=1
 if not line:continue
 if line.startswith('|'):
  rows=[]
  while True:
   cells=[x.strip() for x in line.strip('|').split('|')]
   if not all(re.fullmatch(r'[-: ]+',x) for x in cells):rows.append([Paragraph(inline(x),cell) for x in cells])
   if i>=len(lines) or not lines[i].strip().startswith('|'):break
   line=lines[i].strip();i+=1
  count=len(rows[0]);widths=([174,333] if count==2 else [507/count]*count)
  table=Table(rows,colWidths=widths,repeatRows=1,hAlign='LEFT')
  table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E8EEF0')),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),0.35,colors.HexColor('#CED7DB')),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
  story.extend([table,Spacer(1,9)]);continue
 match=re.match(r'^(#{1,3}) (.*)',line)
 if match:story.append(Paragraph(inline(match[2]),styles[len(match[1])]))
 else:story.append(Paragraph(inline(line),body))
def footer(canvas,doc):
 canvas.saveState();canvas.setFont('Arial',8);canvas.setFillColor(colors.HexColor('#58676D'));canvas.drawString(44,25,f'Volcano Dial {version} · Bedienungsanleitung');canvas.drawRightString(A4[0]-44,25,str(doc.page));canvas.restoreState()
target=root/'docs/VolcanoDial_Bedienungsanleitung.pdf'
SimpleDocTemplate(str(target),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=40,bottomMargin=42,title='Volcano Dial – Bedienungsanleitung').build(story,onFirstPage=footer,onLaterPages=footer)
reader=PdfReader(target);text='\n'.join(p.extract_text() for p in reader.pages)
assert 'GPIO2/TX' in text and 'GPIO1/RX' in text
print(f'Bedienungsanleitung: {len(reader.pages)} Seiten, korrigierte UART-Zuordnung enthalten.')
