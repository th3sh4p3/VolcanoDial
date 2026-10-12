from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'VolcanoDial_Hardware_Aufbauanleitung.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial', boldItalic='Arial-Bold')
INK = HexColor('#172635')
BLUE = HexColor('#17647B')
LIGHT = HexColor('#EDF3F5')
GRAY = HexColor('#D9D9D9')
styles = {
 'title': ParagraphStyle('title', fontName='Arial-Bold', fontSize=23, leading=28, textColor=black, spaceAfter=13),
 'h1': ParagraphStyle('h1', fontName='Arial-Bold', fontSize=17, leading=21, textColor=black, spaceAfter=12),
 'h2': ParagraphStyle('h2', fontName='Arial-Bold', fontSize=12, leading=16, textColor=black, spaceBefore=13, spaceAfter=6, keepWithNext=True),
 'body': ParagraphStyle('body', fontName='Arial', fontSize=10.5, leading=15, textColor=INK, spaceAfter=8),
 'small': ParagraphStyle('small', fontName='Arial', fontSize=8.7, leading=12, textColor=INK, spaceAfter=6),
 'cell': ParagraphStyle('cell', fontName='Arial', fontSize=9.4, leading=13, textColor=INK),
 'head': ParagraphStyle('head', fontName='Arial-Bold', fontSize=9.4, leading=13, textColor=white),
}
story = []
def p(text, style='body'):
 story.append(Paragraph(text, styles[style]))
def h(text): p(text,'h2')
def step(n,title,text):
 p(f'<b>{n}. {title}</b><br/>{text}')
def checklist(items):
 for item in items:
  story.append(Table([[Paragraph('&#9633;',styles['body']),Paragraph(item,styles['body'])]],colWidths=[17,492],style=TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),3)])))
def table(headers, rows, widths):
 data = [[Paragraph(x,styles['head']) for x in headers]] + [[Paragraph(str(x),styles['cell']) for x in row] for row in rows]
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
 cmds=[('BACKGROUND',(0,0),(-1,0),BLUE),('GRID',(0,0),(-1,-1),.5,GRAY),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]
 for i in range(1,len(data)):
  if i%2==0: cmds.append(('BACKGROUND',(0,i),(-1,i),LIGHT))
 t.setStyle(TableStyle(cmds));story.append(t);story.append(Spacer(1,9))
def page(title): story.append(PageBreak());p(title,'h1')

class Connection(Flowable):
 def __init__(self): Flowable.__init__(self);self.width=509;self.height=163
 def draw(self):
  c=self.canv
  def box(x,y,w,h,title,subtitle):
   c.setStrokeColor(BLUE);c.setFillColor(LIGHT);c.roundRect(x,y,w,h,5,stroke=1,fill=1)
   c.setFillColor(INK);c.setFont('Arial-Bold',11);c.drawCentredString(x+w/2,y+h-20,title)
   c.setFont('Arial',9);c.drawCentredString(x+w/2,y+13,subtitle)
  box(0,100,129,54,'USB Netzteil','5 V / 1 A')
  box(204,100,150,54,'M5Stack Dial','USB-C und PORT.B')
  box(204,0,150,54,'Chain Key','Eingang IN / J1')
  c.setStrokeColor(INK);c.setLineWidth(1.3);c.line(129,127,204,127)
  c.setFont('Arial',8.5);c.drawCentredString(166,138,'USB-A auf USB-C')
  c.line(279,100,279,54);c.drawString(288,74,'Grove-Kabel 20 cm')
  c.setDash(4,3);c.line(354,127,403,127);c.setDash()
  box(403,100,106,54,'Volcano','Bluetooth LE')
  c.setFont('Arial',8);c.drawCentredString(432,83,'Bluetooth mit Dial 0.2.7')

p('Volcano Fernbedienung','title')
p('Hardware Aufbauanleitung','h1')
p('Für M5Stack Dial v1.1 und Chain Key U206 · USB-Versorgung · Stand 12.10.2026 · Firmware 0.2.7','small')
p('Mit dieser Anleitung kannst du die gelieferten Teile verbinden, die Stromversorgung prüfen und die Fernbedienung mechanisch vorbereiten. Die Elektronik bleibt in ihren vorhandenen Gehäusen. Löten und Arbeiten im Inneren des Volcano sind für diesen Aufbau nicht erforderlich.')
p('<b>Die passende Firmware liegt diesem Paket bei.</b> Installation und Einrichtung stehen in der separaten Bedienungsanleitung. Der Chain Key ist optional; alle Grundfunktionen sind auch direkt am Dial verfügbar.')
h('1 Teile und Hilfsmittel')
table(['Teil','Artikelnummer','Verwendung'],[
 ('1 × M5Stack Dial v1.1','M5-K130-V11','Steuerung, Anzeige und Drehbedienung'),
 ('1 × M5Stack Chain Key','M5-U206','Optional: Start/Weiter/Luft'),
 ('1 Pack Grove-Kabel, 20 cm','SE-110990027','Nur eines der fünf Kabel wird benötigt'),
 ('1 × USB-Netzteil, 5 V / 1 A','44947','Versorgung des gesamten Aufbaus'),
 ('1 × USB-A auf USB-C, 1 m','45563','Strom und später Daten zum PC'),
 ('1 × Montageband, 1 mm','18-15001','Befestigung nach dem Funktionstest'),
],[196,106,207])
p('Bereitlegen: Schere, saubere ebene Arbeitsfläche und ein weiches Tuch. Ein PC mit USB-A-Port wird später zum Programmieren benötigt. Bei einem PC mit ausschließlich USB-C ist zusätzlich ein geeignetes Datenkabel oder ein USB-Adapter nötig. Ein Multimeter ist optional, kein Pflichtwerkzeug. Für den Grundaufbau werden keine zusätzlichen Schrauben benötigt.','small')
h('So werden die Teile verbunden')
story.append(Connection())

page('2 Anschlüsse eindeutig zuordnen')
p('<b>Alle Steckverbindungen herstellen, während USB abgezogen ist.</b> Stecke nur die kompletten Kabelstecker ein. Keine einzelnen Adern herausziehen, umstecken oder kreuzen.')
h('Am Dial PORT.B verwenden')
p('Suche den vierpoligen Anschluss mit der Bezeichnung <b>PORT.B</b>. Maßgeblich ist die Beschriftung, nicht die Ansicht von links oder rechts. PORT.A bleibt frei. USB-C ist der Anschluss für das USB-Kabel.')
h('Am Chain Key den Eingang verwenden')
p('Der Taster besitzt einen Eingang und einen Ausgang für die Verkettung weiterer Module. Verbinde den Dial mit dem <b>Eingang IN</b>. Im Schaltplan ist dieser Anschluss <b>J1</b> und führt die Signale TXD1 und RXD1. Der Ausgang OUT / J2 bleibt frei. Die Pfeilrichtung der Chain-Verbindung verläuft vom Dial in den Taster hinein.')
p('J1 und J2 sind Schaltplanbezeichnungen und müssen außen nicht aufgedruckt sein. Wenn die Eingangsrichtung an deinem gelieferten Modul nicht eindeutig erkennbar ist, gleiche sie mit der Herstellerzeichnung [2] ab, bevor du einschaltest. Die Einsteckrichtung des Steckers allein unterscheidet IN und OUT nicht.','small')
h('Belegung des unveränderten Grove-Kabels')
table(['Ader','Dial PORT.B','Chain Key IN / J1','Aufgabe'],[
 ('Schwarz','GND','GND','Gemeinsame Masse'),
 ('Rot','5 V','VCC 5 V','Versorgung des Tasters'),
 ('Gelb','GPIO2 / TX','RXD1','Dial sendet an Taster'),
 ('Weiß','GPIO1 / RX','TXD1','Taster sendet an Dial'),
],[65,113,130,201])
p('Die Firmware muss dafür <b>UART RX = GPIO1</b> und <b>UART TX = GPIO2</b> verwenden. Diese Zuordnung ist eine Softwareeinstellung. Das Kabel bleibt gerade verbunden. Die Tabelle beschreibt die Aderfarben, keine links-rechts-Pinfolge bei einer bestimmten Blickrichtung.')
p('Der Taster wird mit 5 V versorgt; seine Datenleitungen arbeiten über den mit 3,3 V versorgten Mikrocontroller. Die rote Versorgungsader darf nicht mit einer Datenader verbunden werden. Belegung abgeleitet aus den Herstellerunterlagen [1] und [2].','small')
h('Diese Anschlüsse und Teile bleiben unbenutzt')
p('Am Dial: PORT.A, der separate 6-36-V-Eingang und der Akkuanschluss. Am Chain Key: OUT / J2. Der beim Taster enthaltene kurze Chain-Bridge-Verbinder wird für diese Kabelverbindung nicht gebraucht. Auch der beim Dial enthaltene zweipolige Anschlussstecker bleibt übrig.')
p('<b>Zum Volcano führt kein Kabel.</b> Seine Verbindung zum Dial erfolgt später per Bluetooth. Es werden weder Relais noch Eingriffe in seine Lüftungselektronik benötigt.')

page('3 Schritt für Schritt zusammenbauen')
step(1,'Lieferung kontrollieren','Prüfe die Artikelnummern gegen Seite 1. Insbesondere muss der zusätzliche Taster der <b>Chain Key U206</b> sein. Die frühere Planung mit Unit Key U144 hat eine andere Ansteuerung und ist nicht diese Anleitung.')
step(2,'Module ansehen','Kontrolliere Gehäuse, Buchsen und Kabel auf sichtbare Schäden. Der Drehregler muss sich ohne Verklemmen drehen lassen. Die zusätzliche Taste muss nach dem Loslassen wieder hochkommen. Gehäuse geschlossen lassen.')
step(3,'Anordnung ausprobieren','Lege den Dial mit Display nach oben auf die Arbeitsfläche. Lege den Taster daneben auf die Seite deiner bevorzugten Hand. Prüfe, ob du die Taste halten und gleichzeitig das Display sehen kannst. Klebeband noch nicht anbringen.')
step(4,'Ein Grove-Kabel auswählen','Nimm <b>ein</b> Kabel aus dem 5er-Pack. Prüfe, dass beide Stecker vierpolig und unbeschädigt sind. Bei abweichenden Aderfarben oder einer anderen Bauform zuerst die Belegung überprüfen; die Stecker nicht mit Gewalt passend machen.')
step(5,'Taster anschließen','Stecke ein Ende in <b>PORT.B am Dial</b> und das andere in <b>IN am Chain Key</b>. Nut und Rastung der Stecker beachten. Zum Einstecken am Kunststoff halten. Zum späteren Abziehen ebenfalls am Stecker greifen und eine vorhandene Rastung lösen.')
step(6,'Kabel verlegen','Lege eine lockere Schlaufe zwischen den Modulen. Das Kabel darf weder unter den Füßen gequetscht noch über die drehende Außenkante oder den Taster geführt werden. An den Buchsen etwas Spiel lassen.')
step(7,'USB anschließen','Stecke USB-C in den Dial und USB-A in das <b>noch nicht eingesteckte</b> Netzteil. Der Chain Key erhält seine Versorgung über das Grove-Kabel und braucht kein eigenes Netzteil.')
h('Prüfung vor dem ersten Einschalten')
checklist([
 'Am Netzteil ist 5 V Gleichspannung als Ausgang angegeben.',
 'Grove-Kabel verbindet ausschließlich Dial PORT.B mit Chain Key IN.',
 'Alle Stecker sitzen gerade; keine Kontakte oder Adern sind beschädigt.',
 'OUT, PORT.A, Akkuanschluss und 6-36-V-Eingang bleiben frei.',
 'Drehregler und Taste bewegen sich frei; Kabel liegen ohne Zug.',
])
p('Sind diese Punkte erfüllt, ist die Steckmontage abgeschlossen. Erst jetzt folgt der Netzanschluss auf Seite 4.','small')

page('4 Erstes Einschalten und Fehlersuche')
step(8,'Netzteil einstecken','Stelle die Module stabil ab und stecke das USB-Netzteil in die Steckdose. Beobachte den Aufbau zunächst etwa eine Minute. Bei Geruch, auffälliger Erwärmung oder ständigen Neustarts sofort USB beziehungsweise das Netzteil abziehen.')
h('Was jetzt sichtbar sein kann')
p('Ein fabrikneuer Dial kann eine Herstellerdemo zeigen. Nach Installation von Volcano Dial 0.2.7 erscheint die gespeicherte Auswahl. Der Chain Key wird automatisch erkannt. Im Ruhemodus weckt die erste Bedienung nur das Display; erst danach erneut bedienen.')
p('<b>Nach der Firmwareinstallation:</b> WLAN, Hue und Volcano gemäß Bedienungsanleitung einrichten. Die erste Sichtprüfung bestätigt Versorgung und Startverhalten; anschließend die vorgesehenen Funktionstests durchführen.')
h('Wenn der Aufbau nicht wie erwartet startet')
table(['Beobachtung','Nächster Schritt'],[
 ('Dial bleibt dunkel','USB abziehen. USB-Kabel und Netzteil prüfen. Grove-Kabel abziehen und den Dial alleine erneut versorgen. Bleibt er dunkel, mit einem bekannten funktionierenden 5-V-USB-Anschluss prüfen; gegebenenfalls Diagnoseprogramm laden.'),
 ('Dial startet nur ohne Taster','Strom abschalten. PORT.B und IN sowie Stecker und Adern kontrollieren. Erst nach dieser Kontrolle mit einem zweiten Kabel aus dem Pack erneut testen.'),
 ('Taster hat keine Wirkung','Firmware und Ruhemodus prüfen. Danach PORT.B, IN/J1 und die Browsermeldung Taste erkannt kontrollieren. In einem Menü oder Fehlerzustand ist Start/Luft gesperrt. Einzelne Adern unverändert lassen.'),
 ('PC erkennt den Dial nicht','Direkt am PC mit Datenkabel anschließen, anderen USB-Port versuchen und USB-Erkennung prüfen. Danach bei Bedarf den offiziellen Download-Modus gemäß [1] nutzen.'),
 ('Ungewöhnliche Wärme oder Geruch','Versorgung sofort trennen. Beschädigung und Verkabelung prüfen. Nicht weiter betreiben, bis die Ursache geklärt ist.'),
],[141,368])
h('Zum Programmieren an den PC anschließen')
p('Netzteil abziehen und den USB-A-Stecker aus dem Netzteil nehmen. Diesen Stecker stattdessen direkt in einen USB-A-Port des PCs stecken. USB-C bleibt am Dial. Der PC versorgt dann den Aufbau. Keine zweite Stromquelle zusätzlich anschließen.')
p('Die Firmwaredateien und Installieren.cmd liegen bei. Installation, Aktualisierung mit Datenerhalt und WLAN-Einrichtung stehen in VolcanoDial_Bedienungsanleitung.pdf.','small')

page('5 Befestigung und späteres Gehäuse')
h('Zunächst lose testen')
p('Lass die Module bis zum Elektronik- und Softwaretest zugänglich. So kannst du die Anordnung ändern, Anschlüsse kontrollieren und den Dial problemlos am PC programmieren. Für diesen Zustand brauchst du weder eine Trägerplatte noch ein gedrucktes Gehäuse.')
h('Mit dem vorhandenen Montageband befestigen')
step(1,'Platz festlegen','Wähle eine ebene, saubere, trockene Oberfläche neben dem Volcano. Platziere die Fernbedienung abseits heißer Flächen, Luftauslässe und Flüssigkeiten. Die Module sind für eine Umgebung von 0 bis 40 °C angegeben [1, 2].')
step(2,'Bedienung prüfen','Halte den Lüftungstaster probeweise länger gedrückt. Er darf nicht wegrutschen, und deine Hand darf den Drehregler nicht blockieren. USB-C, die Grove-Stecker und die Beschriftungen müssen zugänglich bleiben.')
step(3,'Band zuschneiden','Trenne die USB-Versorgung. Schneide kleine Streifen zu, die nur die festen flachen Gehäuseflächen berühren. Keine Aufkleber, Schrauben, Öffnungen oder beweglichen Teile überkleben. Das Band berührt keine Platinen und keine Kontakte.')
step(4,'Aufkleben','Reinige die vorgesehenen Oberflächen materialverträglich und lasse sie vollständig trocknen. Schutzfolie abziehen, Module in der vorher geprüften Anordnung aufsetzen und fest andrücken. Beachte die Anwendungshinweise des Montagebands. Das Band kann empfindliche Oberflächen beim Ablösen beschädigen.')
step(5,'Kabel entlasten','Führe das USB-Kabel so, dass kein Zug auf der Buchse liegt. Grove-Kabel locker verlegen. Keine scharfen Knicke, keine Klemmlast durch Modulgehäuse und keine Klebestreifen direkt auf Rastnasen oder Stecker.')
h('Vorgaben für ein gemeinsames 3D-Gehäuse')
p('Das spätere Gehäuse soll die <b>kompletten vorhandenen Modulgehäuse</b> aufnehmen. Für eine Umsetzung mit ausgebauten Platinen wäre eine andere Montageanleitung nötig. Vor der Konstruktion die gelieferten Teile und die vollständig eingesteckten Stecker messen.')
checklist([
 'Drehender Ring, Display und Taster bleiben vollständig frei.',
 'USB-C ist von außen erreichbar; Kabel und Stecker haben Platz.',
 'Für das 20-cm-Grove-Kabel bleibt innen eine lockere Führung.',
 'Die Halterung greift an festen Flächen und belastet keine Buchsen.',
 'Reset- und Programmierzugang bleiben erreichbar oder der Deckel abnehmbar.',
 'Die Taste wird durch den Deckel auch bei Druck auf das Gehäuse nicht betätigt.',
])
p('PETG ist als Ausgangsmaterial vorgesehen. Endgültige Abmessungen, Schrauben und Befestigungspunkte ergeben sich erst aus dem CAD-Entwurf. Dafür liegt noch keine fertige Druckdatei vor. Kunststoff allein macht den Aufbau nicht für heiße Montageflächen geeignet.','small')

page('6 Abschlussprüfung und nächste Inbetriebnahme')
h('Hardware Montage abhaken')
checklist([
 'Artikelnummern stimmen mit dieser Anleitung überein.',
 'PORT.B und Chain Key IN sind mit einem unveränderten Grove-Kabel verbunden.',
 'USB versorgt den Dial; der Taster wird über den Dial versorgt.',
 'Kabel und Gehäuse sind unbeschädigt und ohne Zug montiert.',
 'Ring und Taste bewegen sich frei, die Taste kehrt zuverlässig zurück.',
 'USB-C und Diagnosezugang sind weiterhin erreichbar.',
])
p('<b>Damit ist die Hardware vorbereitet.</b> Dieser Zustand bestätigt noch keine erfolgreiche Kommunikation zwischen den Modulen oder mit dem Volcano. Die folgenden Punkte werden nach dem Aufspielen der passenden Software geprüft.')
h('Funktionstest mit Volcano Dial 0.2.7')
p('Zuerst Display, Drehgeber und den gedrückten/losgelassenen Zustand des Chain Key ohne Volcano-Befehle prüfen. Danach die Bluetooth-Verbindung aufbauen und Rückmeldungen anzeigen. Erst anschließend Temperatursteuerung und einen kurzen Workflow unter Beobachtung testen.')
checklist([
 'Drehen und Drücken erzeugen die vorgesehenen Menüs und Werte.',
 'Die Anzeige unterscheidet Solltemperatur, Isttemperatur und Verbindungsstatus.',
 'Preset und Workflow lassen sich auswählen; Schritt und Restzeit werden angezeigt.',
 'Tastendruck startet Auswahl oder nächste Workflow-Stufe. Im bereiten Schlauchmodus: neu halten für Luft; Loslassen fordert AUS an.',
 'Wiederholtes Drücken und Loslassen führt zu keiner klemmenden Lüftungsfunktion.',
 'Der Startzustand und das Verhalten bei Kommunikationsfehlern sind geprüft.',
])
p('Die reale Abschaltzeit enthält die Tasterabfrage und die Bluetooth-Übertragung. Eine physikalisch verzögerungsfreie Abschaltung ist damit nicht zugesichert. Bei Funkabbruch kann die Fernbedienung keinen Abschaltbefehl übertragen. Für die ersten Tests muss die Lüftung am Volcano selbst abschaltbar und das Gerät erreichbar bleiben.','small')
h('Technische Zuordnung der Firmware')
p('Chain Key am Dial: UART mit <b>115200 Baud, 8N1, RX GPIO1, TX GPIO2</b>. Der Tasterzustand wird beispielsweise über die M5Chain-Funktion <b>getKeyButtonStatus</b> abgefragt [3]. Die Auswertung für Halten und Loslassen muss unabhängig von einer Einzel-, Doppel- oder Langklick-Erkennung erfolgen. Diese Angaben dienen der Firmwareentwicklung; zum Zusammenstecken musst du sie nicht einstellen.','small')
h('Herstellerunterlagen und Anschlussgrundlage')
for label,url in [
 ('[1] M5Stack Dial v1.1 - Anschlüsse und USB-Versorgung','https://docs.m5stack.com/en/core/Dial_v1.1'),
 ('[2] M5Stack Chain Key - IN/OUT und Schaltplan J1/J2','https://docs.m5stack.com/en/chain/Chain_Key'),
 ('[3] M5Stack Chain Key - UART und Abfrage des Tastenzustands','https://docs.m5stack.com/en/arduino/projects/chain/chain_key'),
 ('[4] Bestelltes Grove-Kabel bei BerryBase','https://www.berrybase.de/seeed-grove-universal-4-pin-kabel-fixierend-20cm-5er-pack'),
]:
 p(f'<link href="{url}" color="#17647B">{label}</link>','small')
p('Belegung anhand Herstellerunterlagen. Die gelieferten Module wurden erkannt und erste Halten/Loslassen-Tests bestätigt. Den aktuellen, nach Softwareversion getrennten Prüfstand nennt PRUEFBERICHT.md. Anschlussrecherche: 06.10.2026; Anleitung aktualisiert 11.10.2026.','small')

def footer(c,doc):
 c.saveState();c.setFont('Arial',8);c.setFillColor(INK)
 c.drawString(43,29,'Volcano Fernbedienung | Dial v1.1 + Chain Key U206')
 c.drawRightString(A4[0]-43,29,f'Seite {doc.page}')
 c.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=43,leftMargin=43,topMargin=39,bottomMargin=47,title='Volcano Fernbedienung Hardware Aufbauanleitung',author='')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
r=PdfReader(OUT)
assert len(r.pages)==6, f'Unexpected page count: {len(r.pages)}'
alltext='\n'.join(x.extract_text() for x in r.pages)
for token in ['M5-K130-V11','M5-U206','SE-110990027','GPIO2','GPIO1','115200','67'][:6]: assert token in alltext, token
for i,pg in enumerate(r.pages,1): print(f'Page {i}: {len(pg.extract_text())} characters')
print(OUT)
