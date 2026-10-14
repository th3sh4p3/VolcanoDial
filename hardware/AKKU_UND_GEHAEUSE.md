# Akku und INCLINE: Erweiterung in Entwicklung

Der vollständig beschriebene Nachbau in diesem Repository ist der **USB-versorgte Dial in seinen Originalgehäusen**. Das geneigte INCLINE-Gehäuse mit Akku ist ein zusätzlicher Entwurf. Es gibt dafür noch keine vollständig geprüfte STL/STEP-Fertigungsdatei und keinen bestätigten Plug-and-play-Akkuadapter.

## Vorgesehene Erweiterung

- M5Stack Dial v1.1 und optionaler Chain Key werden weiterverwendet.
- Ein geschützter [EREMIT 803040, 3,7 V / 1.000 mAh](https://www.eremit.de/p/eremit-3-7v-1000mah-lipo-akku-803040) ist der vorgesehene Akku. Nominelle Zellmaße sind keine bestätigten Gesamtmaße inklusive Schutzplatine/Kabel.
- Laut [M5Stack](https://docs.m5stack.com/en/core/Dial_v1.1) hat der Dial bereits eine Lithium-Ladeschaltung und eine 1,25-mm-2P-Akkubuchse. Derselbe vorhandene USB-C-Anschluss soll Daten und Laden ermöglichen; keine zusätzliche Ladeplatine ist eingeplant.
- Der EREMIT-PH-2,0-Stecker passt nicht direkt in die Dial-Buchse. Der recherchierte [ADA3922-PicoBlade-Kabelkandidat](https://www.berrybase.de/adafruit-molex-picoblade-kabel-2-polig-200mm-1.25mm-pitch-reibungsverriegelung) ist mechanisch und elektrisch noch nicht am realen Dial bestätigt. Gleiches Raster allein reicht nicht.
- Geplant sind eine isolierte Akkuwanne, lösbarer Deckel, freier Drehkranz, sichtbare Taster-LED und von außen zugänglicher Original-USB-C-Anschluss.

Vor Umsetzung müssen Gesamtmaß des gelieferten Akkus, Steckerpassung und Polarität, HOLD/GPIO46 beim Akkustart, Belastbarkeit des Akkupfads mit Taster, Laden während Betrieb und Laufzeit gemessen werden. Die vorliegende Firmware wurde über USB geprüft; daraus folgt keine abgeschlossene Akku-Abnahme.

Der USB-Aufbau benötigt keinen Akku, keine Zusatzplatine und keine INCLINE-Kleinteile. Für den sofort nachbaubaren Stand bitte die [Einkaufsliste](EINKAUFSLISTE.md) verwenden. Einen Akku erst mit überprüfter Anschlussbelegung verbinden; ein selbst konfektionierter Adapter gehört nicht zur lötfreien Grundmontage.

## Gelieferter EREMIT 803040: Anschluss am Dial v1.1

Die Fotos des gelieferten Akkus bestätigen den Aufdruck **3,7 V / 1.000 mAh / 803040** und den JST-PH-2,0-mm-Stecker. Der lose weiße Gegenstecker aus der Lieferung passt zur Akku-Seite, **nicht** zur 1,25-mm-Dial-Buchse. Die beigelegte allgemeine EREMIT-Anleitung behandelt überwiegend 12-V-Akkus; deren Spannungen gelten nicht für diese einzelne 3,7-V-LiPo-Zelle. Der Dial besitzt laut [M5Stack](https://docs.m5stack.com/en/core/Dial_v1.1) einen eigenen 1,25-mm-2P-Akkuanschluss mit Ladeschaltung. An die grüne 6–36-V-Klemme darf dieser Akku nicht angeschlossen werden.

Für die Verbindung braucht es ein zur **konkreten Dial-Buchse** passendes 1,25-mm-2P-Kabel, eine JST-PH-2,0-mm-Gegenbuchse zum Akku, zwei korrekt verbundene und einzeln isolierte Leitungen sowie ein Digitalmultimeter für Gleichspannung und Durchgang. Das vorhandene ADA3922-PicoBlade-Kabel ist ein Kandidat, dessen Passform am ausgebauten Dial erst ohne Kraft geprüft werden muss. Selbst ein mechanisch passender 1,25-mm-Stecker garantiert keine korrekte Polung. Das mitgelieferte PH-Gegenstück ist ein offener Leiterplattenstecker und muss für einen Kabeladapter fachgerecht kontaktiert und isoliert werden; ohne geeignete Löt-/Crimpausrüstung ist ein fertig konfektionierter, auf den realen Dial geprüfter Adapter sinnvoller.

1. **Erst Gerät freigeben:** Einen laufenden Workflow, die Lüftung und die Hue-Abkühlüberwachung vollständig beenden. Status `coolingPending=false` und HEAT/AIR AUS prüfen, danach USB und Zusatztaster-Kabel abziehen.
2. **Akkuanschluss freilegen:** Mit dem beiliegenden 1,5-mm-Inbusschlüssel die zwei Schrauben des rückseitigen Stamp-S3A-Moduls lösen und das Modul gerade von seinen Stiftleisten abheben. Die Akku-Buchse liegt darunter. Kontakte und Modul nicht verkanten; die große Akkuzelle passt nicht in den kleinen Hohlraum unter dem Modul.
3. **Passung und Polung prüfen:** Den 1,25-mm-Kandidaten ohne Strom und ohne Kraft trocken an die Buchse halten. Vor dem elektrischen Verbinden mit dem Multimeter die tatsächlichen Plus-/Minus-Kontakte des Akkus, des fertig hergestellten Adapters und der Dial-Buchse nach Beschriftung/Schaltplan beziehungsweise gegen eine verifizierte Masseverbindung bestimmen. Am freien Adapterausgang muss die positive Spannung am vorgesehenen BAT+-Kontakt und die negative am GND-Kontakt liegen. Bei fehlendem Messgerät oder uneindeutiger Buchsenbelegung hier stoppen; Kabel- und Steckerfarben reichen nicht.
4. **Adapter fertigstellen:** Die zwei Leiter nur entsprechend der gemessenen Polung verbinden, jede Löt-/Crimpstelle separat isolieren und anschließend nochmals Gleichspannung sowie fehlenden Kurzschluss zwischen den Polen prüfen. Erst dann den Akku mit dem PH-Gegenstück und den kleinen Stecker mit dem Dial verbinden. Niemals blanke Kontakte gegeneinander oder gegen das Gehäuse legen.
5. **Montieren und testen:** Das Stamp-S3A-Modul gerade wieder aufsetzen und die Schrauben ohne Druck auf Kabel oder Zelle anziehen. Akku außerhalb des kleinen Modulhohlraums in einer isolierten, zugentlasteten Wanne befestigen; die weiche Zelle darf nicht geknickt, gequetscht, durchbohrt oder direkt neben dem heißen Volcano platziert werden. Ohne USB den Radknopf einmal zum Einschalten drücken und Funktion/WLAN prüfen. Danach USB-C für Daten und Laden testen. Den Ladestrom des realen Dial/Akku-Aufbaus vor unbeaufsichtigtem Laden mit einem geeigneten Messaufbau gegen die zulässigen Akkudaten prüfen.

Der neue Menüpunkt **Ausschalten** verlangt zwei Klicks. Er ist bei aktiven Programmen, eingeschalteter Heizung/Lüftung oder ausstehender Hue-Abschaltung gesperrt. Ohne USB trennt GPIO46/HOLD die Hauptversorgung; der Radknopf („WAKE“) schaltet wieder ein. Bei angeschlossenem USB bleibt der Dial versorgt. Das ist vom bisherigen **Display aus** zu unterscheiden: Dabei bleiben Steuerung, WLAN/Bluetooth und Hue-Überwachung aktiv. M5Stack nennt für den Dial v1.1 ca. **100 mA im Betrieb** und **6 µA im Akku-Abschaltzustand**. Mit 1.000 mAh sind rechnerisch höchstens etwa zehn Betriebsstunden zu erwarten; Funkverkehr, Displayhelligkeit, Zusatztaster und Akkuverluste verkürzen das. Die tatsächliche Laufzeit muss am fertigen Aufbau gemessen werden. Der abgeschaltete Dial ist sehr sparsam, aber wegen Schutzschaltung und Standby-Elektronik nicht buchstäblich stromlos.

## Funktionsprototyp vor dem endgültigen 3D-Druck

Der Akku wird **hinter** dem Dial in einer separaten, isolierenden Halterung platziert. Der originale USB-C-Port bleibt frei zugänglich. So nutzt USB-C denselben eingebauten Pfad für Daten und Laden, während der Akku den Dial ohne Kabel versorgt. Die grüne 6–36-V-Klemme und ein zweiter USB-C-/Ladecontroller werden dafür nicht gebraucht. Zuerst lässt sich die elektrische Funktion mit einer offenen, standsicheren Kunststoff-Prototypwanne nachweisen; das fertige INCLINE-Gehäuse folgt erst nach Maß- und Passprüfung.

| Status | Teil oder Werkzeug | Zweck |
|---|---|---|
| Vorhanden | M5Stack Dial v1.1, Chain Key mit Grove-Kabel und USB-C-Datenkabel | Anzeige, Steuerung, Zusatztaste, USB-Daten und integriertes Laden |
| Vorhanden | [EREMIT 803040](https://www.eremit.de/p/eremit-3-7v-1000mah-lipo-akku-803040) | Geschützter 3,7-V-Akku mit JST-PH-2,0-mm-Stecker |
| Vorhanden, Passung offen | [ADA3922, 1,25-mm-2P-Kabel](https://www.berrybase.de/adafruit-molex-picoblade-kabel-2-polig-200mm-1.25mm-pitch-reibungsverriegelung) | Kandidat für die Dial-Seite des Adapters; zuerst trocken ohne Kraft prüfen |
| Noch erforderlich | [JST-PH-2,0-Verlängerung mit Buchsenende, VK-PH20-50](https://www.berrybase.de/verlaengerungskabel-2-pin-jst-ph-2.0mm-stecker-buchse-awg24-50cm) | Kabelseitiges Gegenstück zum Akku; nach Passprüfung kürzen |
| Noch erforderlich | [Digitalmultimeter UNI-T UT131B](https://www.berrybase.de/uni-t-ut131b-digitales-multimeter-palm-size-mit-batteriepruefung) | Gleichspannung, Polarität und Durchgang vor jedem elektrischen Zusammenstecken prüfen; Messleitungen liegen bei |
| Noch erforderlich, falls selbst konfektioniert | [Schrumpfschlauch-Set T1535561](https://www.berrybase.de/schrumpfschlauch-set-100-teilig-schwarz), Lötgerät, Lötzinn, Seitenschneider/Abisolierhilfe | Zwei Leitungen fachgerecht verbinden und **einzeln** isolieren; alternativ einen Adapter von einer Elektronikwerkstatt konfektionieren und durchmessen lassen |
| Für den Prototyp | Nichtleitende, standsichere Wanne/Box, weiche dünne Unterlage und lösbare Kabel-Zugentlastung | Akku gegen Druck, Knicken und Zug schützen; keine Metallteile an Zelle oder offenen Kontakten |
| Für das CAD, falls noch nicht vorhanden | [150-mm-Messschieber 77001](https://www.berrybase.de/digitale-schieblehre-messschieber-150mm) | Reale Außenmaße von Dial, Akku, Taste, Steckern und Kabelabgängen erfassen |

Das mitgelieferte lose PH-Gegenstück auf den Fotos hat blanke Leiterplattenpins. Das zusätzliche **Kabel mit Buchsenende** vermeidet, dieses lose Teil frei im Gehäuse zu verdrahten. Es ist trotzdem **kein fertiger Akkuadapter**: ADA3922 und PH-Kabel müssen nach bestätigter Passung und Pinbelegung korrekt verbunden werden. Ohne Multimeter den Akku nicht anschließen. Die 1,5-/9-/12-V-**Batterietestfunktion** des UT131B ist für diese LiPo-Zelle ungeeignet; die normale Gleichspannungsmessung verwenden.

**Prototyp-Abnahme:** (1) ADA3922 bei stromlosem, geöffnetem Dial mechanisch prüfen. (2) Nach Beschriftung/Schaltplan und mit dem Multimeter die beiden Dial-Kontakte zuordnen; den Akku und den fertigen Adapter separat vermessen. (3) Erst den Akkuadapter verbinden, dann USB-freien Start per Radklick prüfen. (4) USB-C anschließen und gleichzeitig laufenden Dial, Datenverbindung und Ladefunktion prüfen; Stromaufnahme/Ladestrom mit geeignetem Messaufbau erfassen. (5) Nur im Leerlauf das neue **Ausschalten** und erneute Aufwecken testen. Der bisherige Firmware-Build beweist diese physischen Tests noch nicht.

## Maße und Entscheidungen vor einer druckfähigen INCLINE-Datei

Die bisherige INCLINE Compact R02-Studie sieht **60 × 92 × 63 mm**, **15°** und einen Akku-Reservebauraum von **44 × 34 × 11 mm** vor. Das sind Ziel- und Reservewerte, keine freigegebenen Druckmaße. Für STEP/STL/3MF fehlen folgende Prüfwerte am realen Prototyp:

1. Dial-Durchmesser und -Tiefe einschließlich Befestigung, Ring-Freiraum beim Drehen/Klicken sowie genaue Lage des rückseitigen Akkusteckers und des unveränderten USB-C-Ports **mit eingestecktem Kabel**.
2. Tatsächlicher Akku-Hüllraum einschließlich Schutzplatine, Folienkanten, Kabelabgang und gesteckter PH-Verbindung; Mindestbiegeradius der Adern und Zugentlastungsweg.
3. Chain-Key-Hüllraum mit gestecktem Grove-Kabel, Tastenkappenhub, Fingerfreiraum und Lage der LEDs für ein späteres Lichtfenster.
4. Freie Lage des Stamp-S3A-Moduls, Schrauben und Antennenbereichs; Werkzeugzugang für einen Akkutausch; Wandstärke, Montagerichtung, Schrauben-/Mutternsitze und Drucktoleranzen des gewählten Dienstleisters.

Nach diesen Messungen zuerst kleine **Passproben** für Dial-Ring, USB-C-Stecker, Akkuwanne und Taste drucken lassen. Erst bei bestätigter Passung die geschlossene Schale, den Boden, die Tastenkassette und den Deckel als endgültige Dateien exportieren. Der Prototyp darf mit Originalgehäusen und externer Akkuwanne bereits vollständig funktionieren.

Für die spätere **R02-Gehäusemontage** sind bisher je zehn [M2,5×8-Schrauben](https://www.berrybase.de/schraube-kopf-zylinder-m2-5x8), [M2,5-Muttern](https://www.berrybase.de/mutter-sechskant-m2-5-h2mm-5mm) und [Kunststoffscheiben](https://www.berrybase.de/unterlegscheibe-kunstoff-rund-m2-5-d6mm-h0-5mm), vier [Gummifüße](https://www.berrybase.de/fix-fasten-selbstklebender-fuss-rund-oben-9-5mm-unten-10mm-hoehe-4-5mm-gummi-schwarz) sowie kleine Stücke [1-mm-Montageband](https://www.berrybase.de/montage-klebeband-doppelseitig-1mm-acryl-transparent-10m) vorgesehen. Diese Maße und Mengen bleiben **vorläufig**, bis Schraubsitze, Druckmaterial und Wandstärken im CAD feststehen. Die Teile sind für den elektrischen Funktionsprototyp nicht nötig; vorhandene Pads/Befestiger können genügen.
