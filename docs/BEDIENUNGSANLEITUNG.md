# Volcano Dial - Einrichtung und Bedienung

Quellstand 0.2.13 | 14.10.2026 | M5Stack Dial v1.1 / Volcano Hybrid

Vor dem Installieren: [Einkaufsliste](../hardware/EINKAUFSLISTE.md) und [Hardware zusammenbauen](../hardware/AUFBAU.md).

## 1. Was auf dem Gerät läuft

Der ESP32-S3 im Dial enthält Ablaufsteuerung, Bluetooth-Verbindung, Hue-Steuerung, Displaybedienung und Webserver. USB liefert Strom. Nach dem Einrichten braucht ein Workflow keinen laufenden PC und keinen geöffneten Browser. WLAN wird für Hue benötigt; Bluetooth verbindet den Volcano. Der Dial unterstützt 2,4-GHz-WLAN.

Ohne Chain-Key funktionieren Auswahl, Start, Weiter, Stop, Temperaturänderung, Schlauchbetrieb und Timer direkt am Dial. Der optionale Taster ergänzt Start/Weiter und die Haltefunktion mit eigener Status-LED. WLAN und Bluetooth stecken im Dial.

Nach Abziehen und erneutem Anschließen der USB-Stromversorgung startet der Dial mit gespeicherter Auswahl und gespeicherten Einstellungen. WLAN verbindet sich wieder. Ein bewusster Start schaltet die konfigurierte Hue-Steckdose ein, verbindet den Volcano per Bluetooth und beginnt den gewählten Ablauf. Bibliothek, Kopplungen, Temperaturen und Ruhezeiten bleiben gespeichert.

Ein bereits gespeicherter Hue-Abschaltauftrag wird nach Neustart wieder überwacht. Der Dial bestätigt dabei Heizung und Lüftung AUS und wartet auf die Abkühlschwelle. Presets und Workflows werden dadurch nicht automatisch gestartet oder fortgesetzt.

## 2. Firmware installieren

ZIP vollständig entpacken. Dial mit einem USB-Datenkabel anschließen. Andere Programme mit Zugriff auf den COM-Port schließen. Im Geräte-Manager den Anschluss „Serielles USB-Gerät (COM…)“ ermitteln.

Für die erste Installation im entpackten Ordner ausführen:

`Installieren.cmd -Modus Neu -Port COM3`

„NEU“ im Installer bestätigen. COM3 durch den tatsächlichen Port ersetzen. Das Flash-Tool prüft die geschriebenen Daten und startet den Dial neu. Beim späteren Aktualisieren derselben Partitionierung verwenden:

`Installieren.cmd -Modus Update -Port COM3`

Updates erhalten Bibliothek und Einstellungen. Ein neues Partitionslayout, fremde Firmware oder ein Zurücksetzen erfordern eine gesonderte Neuinstallation. Niemals während eines laufenden Workflows flashen. Bei fehlendem Anschluss zunächst Datenkabel und USB-Port prüfen. Falls nötig die Boot-Taste am StampS3 beim USB-Anstecken gedrückt halten und anschließend loslassen.

## 3. Erstes WLAN und Anmeldung

Auf dem Dial stehen Name und Passwort seines Einrichtungs-WLANs sowie die Geräte-PIN. Smartphone oder PC mit diesem WLAN verbinden. Eine Meldung „kein Internet“ ist dabei normal. Im normalen Browser http://192.168.4.1 öffnen. Die sechsstellige PIN eingeben.

Unter „Einrichten → Heim-WLAN“ den Namen und das Passwort deines 2,4-GHz-WLANs speichern. Danach wieder mit dem Heimnetz verbinden. Die neue IP-Adresse steht auf dem Dial. Diese Adresse oder http://volcano-dial.local im Browser öffnen. Falls der Name nicht aufgelöst wird, die IP verwenden. Nach erfolgreicher Heimnetzverbindung wird das Einrichtungs-WLAN nach etwa zwei Minuten abgeschaltet. Es lässt sich im Dial-Menü erneut einschalten; bei längerem WLAN-Ausfall erscheint es automatisch wieder.

Die PIN schützt die lokale Oberfläche. HTTP läuft unverschlüsselt im lokalen Netz; Zugangsdaten und Hue-Schlüssel liegen lokal im Gerätespeicher. Den Dial nicht per Portfreigabe ins Internet stellen. Bibliotheks-Exporte enthalten keine WLAN-Passwörter und keinen Hue-Schlüssel.

## 4. Hue Bridge und Steckdose

Dial und Hue Bridge müssen sich gegenseitig im Heimnetz erreichen können. Gastnetz-Isolation verhindert das häufig. Zunächst „Uhrzeit synchronisieren“ verwenden, falls keine gültige Uhrzeit vorliegt. Für die geprüfte HTTPS-Verbindung zur Bridge ist eine gültige Gerätezeit erforderlich. Mit Internetzugang kann sich der Dial die Uhrzeit auch selbst holen.

„Bridge suchen“ wählen oder die lokale IPv4-Adresse der Bridge eingeben. Dann die physische Taste an der Hue Bridge drücken und „Bridge-Taste drücken, dann koppeln“ wählen. Anschließend „Steckdosen laden“, die Steckdose des Volcano auswählen und Hue aktivieren. Nur über die Bridge erreichbare schaltbare Steckdosen werden unterstützt; eine direkte Bluetooth-Verbindung zur Hue-Steckdose ist nicht vorgesehen.

„Nach erfolgreichem Ablauf und Abkühlen ausschalten“ ist optional. Die Schwelle ist zwischen 30 und 100 °C einstellbar; Ausgangswert 50 °C. Bei aktiver Automatik speichert der Dial den Abschaltauftrag vor seiner Hue-Einschaltung. Nach Ende oder Stop wartet er auf wiederholte frische Messungen bei oder unter der Schwelle sowie bestätigte inaktive Heizung und Lüftung. Auch Stop, Fehler, Auswahlwechsel und Neustart erhalten den Auftrag. Ein laufender Workflow einschließlich Zwischenpausen verhindert die Abschaltung. Hue-Fehler führen zu weiteren AUS-Versuchen, bis die Steckdose AUS bestätigt; dann wird der Auftrag gelöscht. Während eines gespeicherten Auftrags kann die Geräte-/Steckdosenzuordnung nicht gewechselt werden.

„Einmal ohne Hue verbinden“ erzeugt keinen neuen Hue-Abschaltauftrag. Ein früherer gespeicherter Auftrag bleibt bestehen. **Explizites „Trennen“ schaltet bei aktivem Hue-Sitzungsbezug nach bestätigtem HEAT/AIR-AUS die Steckdose sofort aus; dabei wird nicht auf die Abkühlschwelle gewartet.**

## 5. Volcano verbinden

PC-App und offizielle S&B-App vollständig vom Volcano trennen. Der Volcano kann nicht gleichzeitig über diese Geräte und den Dial gesteuert werden. Für die erste Suche Volcano und gegebenenfalls Steckdose manuell einschalten. „Volcano suchen“ wählen, das gefundene Gerät auswählen und speichern. Bei bereits vollständiger Zuordnung kann die Suche die ausgewählte Hue-Steckdose einschalten. Anschließend „Verbinden“ wählen.

Temperatur sowie HEAT/AIR-Status erscheinen erst nach tatsächlicher Bluetooth-Rückmeldung. „AUS nicht bestätigt“ bedeutet, dass der Dial den Ausgangszustand nicht sicher feststellen konnte. Das Gerät dann direkt kontrollieren. Eine Funkverbindung kann keine garantierte sofortige Abschaltung bei physischer Unterbrechung bieten.

## 6. Rundes Display, Touch und Drehknopf

Die große Zahl ist die gemessene Temperatur. Darunter stehen Zieltemperatur oder Presetname und der aktuelle Arbeitsschritt. „--“ bedeutet: noch keine gültige Messung. Oben stehen Bluetooth und WLAN. Der äußere Ring zeigt den Fortschritt; bei Workflows ist er in Stufen aufgeteilt. Im Leerlauf markiert das helle Segment die gewählte Startstufe. Grün bedeutet bereit, Gelb Heizen, Blau Lüftung, Rot Fehler. Die untere Zeile zeigt HEAT/AIR oder die Workflow-Stufe. „H“ steht für Heizung, „L“ für Lüftung.

| Bedienung | Wirkung |
|---|---|
| Drehen im Hauptbild, solange kein Ablauf läuft | Preset, Workflow oder Schlauch auswählen |
| Auswahl nach Daily | Aroma-Kurve 3, danach Schlauch, danach die einzelnen AK3-Presets |
| Kurz auf den Drehknopf oder die große Bildschirmtaste drücken | Starten, Stoppen oder in Zwischenpause Weiter |
| Oben auf „···“ tippen | Menü öffnen |
| Drehknopf im Leerlauf etwa 0,7 s halten | Menü öffnen/schließen |
| Drehknopf während Preset/Workflow etwa 0,7 s halten | Stop anfordern |
| Namen antippen | Vollständigen Namen, aktuellen/nächsten Presetnamen und Meldung ansehen; drehen oder tippen blättert |
| Temperatur antippen | Zieltemperatur ändern, soweit für den aktuellen Zustand verfügbar |
| Einen Abschnitt des äußeren Rings antippen | Bei ausgewähltem Workflow im Leerlauf die Startstufe auswählen; erst „Starten“ beginnt den Ablauf. Ab dort läuft der Workflow bis zum Ende. Bei Daily bedeutet Stufe 3 nur „03“. |
| „Füllzeit … s“ im Hauptbild antippen | Gemeinsame Ballonfüllzeit direkt ändern: drehen und mit „Übernehmen“ dauerhaft speichern. Bei Daily und Aroma-Kurve 3 gilt der neue Wert für alle Stufen. |
| „Ballon bereit“ antippen oder den Dial klicken (wenn Ballonbestätigung aktiviert ist) | Bestätigt erst nach dem Aufsetzen des Ballons die erste Lüftung dieser Stufe. Bis dahin bleibt die Lüftung aus. |
| Im Menü drehen oder ober-/unterhalb des gewählten Eintrags tippen | Vorherigen/nächsten verfügbaren Eintrag wählen |
| Menüeintrag anklicken oder antippen | Öffnen; Zahlenwert drehen und mit Klick/„Übernehmen“ speichern |
| Oben „Zurück“ antippen | Zum Hauptbild zurück |

Das Menü bietet Temperatur, einfache Presetwerte, Füllzeit, Schritte, Timer, manuelle Heizung/Lüftung, Bluetooth, Helligkeit, Signaltöne, Hue-Automatik/Schwelle, RFID, Einrichtungs-WLAN und Geräteinfo. Während eines Laufs stehen nur passende Aktionen bereit. Zahlenwerte ändern sich in 1er-Schritten; Helligkeit in 5er-Schritten. Geräteinfo zeigt IP-Adresse und PIN für den Browser.

Die Direktbedienung der Füllzeit erscheint auch bei einfachen Einzelpresets und weiteren Workflows mit gemeinsamer UI-Füllzeit. Workflows mit festen Zeiten aus ihren Presets behalten diese Zeiten; ihre Füllzeit ist nicht als gemeinsamer Wert einstellbar. Die PC-App unterscheidet entsprechend zwischen globaler Lüftungsdauer und individuell festgelegten Lüftungsschritten. Eine am Ring gewählte Startstufe wird nach erfolgreichem Start oder Programmwechsel zurückgesetzt; nach einem Stromausfall ist wieder Stufe 1 vorausgewählt.

Die Mitte des Touchscreens länger halten, um das [radiale Schnellmenü](QUICK-ROSE.md) zu öffnen. Die globale Ballonfüllzeit und die globale Ballonbestätigung können auch in einer Workflow-Zwischenpause geändert werden. Sie werden sofort gespeichert, gelten ab der nächsten Stufe und bleiben nach dem Ausschalten erhalten. Beim aktiven Heizen/Lüften ist das Schnellmenü nicht verfügbar.

Nach USB-Start wird WLAN zunächst verbunden. Ein sofortiger Start wartet bei aktivem Hue bis zu 30 Sekunden auf WLAN und eine gültige Uhrzeit; das Display meldet den Verbindungsaufbau. Die Verbindung lässt sich mit Stop abbrechen. Fehlt danach weiterhin eine Voraussetzung, wird der Fehler angezeigt. Dann WLAN/Uhrzeit prüfen und erneut bewusst starten.

Die Anzeige wird nur bei sichtbaren Änderungen in kleinen vollständig gezeichneten Streifen aktualisiert. Es gibt kein regelmäßiges Löschen des gesamten Displays.

### Schlauch: manuell heizen und Luft halten

„Schlauch“ auswählen und „Heizen starten“ drücken. Ausgangswert ist 210 °C; Temperatur antippen oder während des Schlauchbetriebs drehen öffnet die Temperatureinstellung. Sobald „Bereit · für Luft halten“ erscheint, den Drehknopf oder die blaue Bildschirmtaste gedrückt halten. Die Luft läuft während des Haltens; Loslassen fordert AUS an. Erst nach Erreichen der Temperatur neu drücken, ein zuvor gehaltener Eingang startet keine Luft.

„Ende“ beendet den Schlauchbetrieb, schaltet Heizung/Luft aus und stellt die ursprüngliche Zieltemperatur wieder her. Bei aktivierter Hue-Abkühlautomatik wird danach bis zur Abschaltschwelle überwacht. Ein Stop beendet ebenfalls HEAT/AIR und erhält einen bereits gespeicherten Hue-Abschaltauftrag. Beim Öffnen eines Menüs oder einer Werteinstellung wird manuelle Luft beendet; anschließend erneut halten.

### Display-Ruhemodus

Nach 30 Sekunden ohne Bedienung oder sichtbare Änderung beginnt das Display sanft zu dimmen; nach insgesamt 90 Sekunden geht die Hintergrundbeleuchtung aus. Die Firmware bleibt aktiv: Workflows, Bluetooth, WLAN, Hue und der Zusatztaster funktionieren weiter. Es ist kein Standby des ganzen Geräts.

Drehen, Druck auf den Drehknopf, Touch, Zusatztaster, RFID oder ein Browserbefehl wecken das Display. Sobald der Ruhemodus begonnen hat (auch beim Dimmen), dient die erste lokale Betätigung ausschließlich zum Aufwecken. Sie startet nichts und schaltet keine Luft ein. Das gilt ebenso für den Zusatztaster und RFID. Loslassen und erneut drücken; beim Rad zuerst kurz aufhören zu drehen, dann erneut drehen. Während eines Haltens bleibt das Display an. Zwischenpause, Schlauch bereit, Abschluss und Fehler wecken es ebenfalls.

Während eines gestarteten Presets, Timers oder Workflows bleibt das Display vollständig an. Das gilt auch für jede Workflow-Zwischenpause bis zum Abschluss oder bewussten Stop. Manuelles „Display aus“ ist dann ebenfalls gesperrt. Im Schlauchbetrieb kann der Ruhemodus verwendet werden; Heizung und Bluetooth bleiben dabei aktiv.

Im Menü „Display aus“ schaltet die Anzeige sonst sofort ab. Im Browser unter „Gerät & Diagnose“ lassen sich Automatik, Dimmzeit (5–600 s) und Ausschaltzeit (mindestens 10 s später, höchstens 3600 s) speichern. Dort gibt es außerdem „Display jetzt aus“ und „Display aufwecken“. Die gewählte normale Helligkeit bleibt erhalten. Temperatur-, Restzeit-, Fortschritts- oder Statusänderungen setzen die Ruhezeit zurück. Solange sich die Ansicht verändert, bleibt sie wach. Reine Hintergrundabfragen und Diagnosezähler zählen nicht. Der Ruhemodus verändert keine Heiz-, Lüftungs- oder Steckdoseneinstellung.

## 7. Presets und Workflows

Der grafische Editor wird unter „Presets & Workflows“ geöffnet. Seine Bezeichnungen wurden aus der PC-App übernommen und sind teilweise englisch. „New preset“ erzeugt ein einfaches oder erweitertes Preset, „New workflow“ eine Abfolge vorhandener Presets. Mit „Save“ speichern. „More → Validate now“ prüft die Definition. Nur lineare, vollständig verbundene Graphen ohne Verzweigung oder Schleifen sind zulässig.

Einfache Presets: Start-/Endtemperatur 40-230 °C, Füllzeit 5-300 Sekunden, 1-20 Schritte. Erweiterte Presets unterstützen Zieltemperatur erreichen, warten, Luft fördern, Heizung ausschalten und eine bestätigte Ballonfreigabe mit Zeitlimit. Globale und lokale Variablen, Einheiten und Rechenausdrücke werden wie in der PC-App ausgewertet. Allgemeiner JavaScript-Code wird nicht ausgeführt.

Workflow-Stufen verwenden vorhandene Presets. Nach jeder Stufe gehen Heizung und Lüftung AUS; der nächste Abschnitt wartet auf einen bewussten Weiter-Befehl am Dial, optionalen Zusatztaster oder im Browser. Ab Firmware 0.2.13 meldet der eingebaute Buzzer den bestätigten Abschluss jeder Stufe mit zwei kurzen Tönen. Das gilt auch für die letzte Stufe; ein Abbruch oder Fehler löst diese Abschlussfolge nicht aus. Ist „Signaltöne“ ausgeschaltet, bleibt der Buzzer stumm. Der Dial besitzt keinen Vibrationsmotor. Bei der Füllzeitquelle „ui“ lässt sich die gemeinsame Füllzeit am Dial einstellen; sie gilt je Preset-Stufe und verteilt deren Luftaktionen proportional. Bei „presets“ bleiben die jeweiligen Preset-Füllzeiten erhalten. Heizungs-Rückmeldungen und die HEAT-Taste direkt am Volcano starten oder erweitern keinen Workflow. Nach einem Fehler startet der Ablauf erst nach einer erneuten bewussten Bedienung.

Mit dem optionalen Akku lässt sich der Dial im Menü über **Ausschalten** und einen zweiten bestätigenden Klick abschalten. Während eines Programms, bei aktiver Heizung/Lüftung oder solange ein Hue-Abschaltauftrag läuft, ist dieser Punkt gesperrt. Ohne USB trennt der Dial die Akkuversorgung; ein Radklick startet ihn erneut. Bei USB-Versorgung bleibt er an und zeigt einen Hinweis. **Display aus** ist der bisherige Ruhemodus mit weiterlaufender Steuerung und Funk. Der vollständige Akkuanschluss erfordert einen geprüften 2,0-auf-1,25-mm-Adapter; siehe [Akku-Anbau](../hardware/AKKU_UND_GEHAEUSE.md).

Wird während der Zwischenpause ein einzelner Bluetooth-Statuswert verpasst, bleibt der Workflow an dieser Stelle stehen. Vor „Weiter“ prüft der Dial den Status erneut und bestätigt Heizung und Lüftung AUS. Gelingt das gerade nicht, erscheint „Volcano-Status prüfen; erneut drücken“; nach stabiler Verbindung denselben Weiter-Befehl erneut auslösen. Ein echter Gerätefehler oder eine unterbrochene Verbindung wird weiterhin als Fehler behandelt.

Die eigentliche Luftlaufzeit wird anhand bestätigter Lüftungszustände gezählt. Vom Volcano ausgelöste Luftimpulse werden in das Luftbudget einbezogen. Nach Abschluss werden die Ausgänge ausgeschaltet und bei bestätigtem AUS die ursprüngliche Zieltemperatur zurückgesetzt. Ein Fehler oder Funkverlust beendet den Ablauf; nach Wiederverbindung startet er nicht automatisch weiter.

Bibliotheksänderungen und manuelle HEAT/AIR-Schalter sind während eines Laufs und seiner Zwischenpausen gesperrt. Stop und Weiter bleiben verfügbar. Schließen des Browsers stoppt einen laufenden Workflow nicht.

Das beiliegende Daily-Beispiel enthält drei Stufen: „Preset 03“, „02“ mit 221 °C und „03“ mit konstant 222 °C. Die gemeinsame Füllzeit beträgt 53 Sekunden je Stufe; nach jeder Stufe wird auf Weiter gewartet. „Schlauch“ ist ein eingebauter manueller Modus und wird nicht als PC-Preset exportiert.

**Aroma-Kurve 3** liegt in der Auswahlliste direkt hinter Daily und verwendet dieselbe Start-, Ring- und Weiter-Bedienung. Die drei neuen Presets heizen in kleinen Schritten auf 175–185, 195–205 und 220–230 °C. Die Ballonbestätigung ist global und standardmäßig AUS; wenn eingeschaltet, fordert der Dial vor der ersten Lüftung zum Aufsetzen und Bestätigen auf. Nach 120 Sekunden ohne Bestätigung schaltet der Ablauf die Ausgänge aus. Die [genaue Bedienfolge und Temperaturaufteilung](AROMA-KURVE-3.md) sind separat beschrieben.

### Nach einem manuellen Workflow-Abbruch

Während eines Workflows Stop auslösen; der nächste bewusste Start zeigt **Preset erneut** und beginnt nur das unterbrochene Preset von Anfang an, mit vollständiger Laufzeit/Luftmenge. Daily „02“ abbrechen → „02“ erneut → Zwischenpause → „03“. Stop während „03“ wiederholt „03“ bei konstant 222 °C. Der Name der wiederholten Stufe wird angezeigt; Dial-Klick, Touch, optionaler Taster und Browser-Start nutzen denselben Ablauf.

Stop in einer Zwischenpause merkt die nächste noch offene Stufe. Zweites Stoppen erhält einen sicher gestoppten Wiederholungspunkt. Eine neue Auswahl oder Bibliotheksänderung setzt ihn zurück; nach vollständigem Abschluss beginnt der Workflow wieder bei Stufe 1. Der Punkt ist nur im RAM gespeichert und geht beim Dial-Neustart verloren. Fehler oder fehlgeschlagene AUS-Bestätigung bieten keine automatische Wiederholung an. Hue/Verbindungsvorbereitung bleibt erforderlich. Wenn Display-Ruhe aktiv ist, weckt die erste lokale Geste weiterhin nur auf.

## 8. PC-Bibliothek übertragen

In der PC-App die Bibliothek als JSON exportieren. Im Dial-Editor „More → Import library…“ wählen und die Datei auswählen. Im folgenden Dialog ersetzt „OK“ die Bibliothek nach einem Backup-Download; „Cancel“ führt zusammen. Danach Auswahl und Werte prüfen. „More → Export library…“ lädt die Dial-Bibliothek als JSON herunter. Diese Datei ist dein portables Backup, enthält jedoch keine Geräte-Zugangsdaten.

Für Daily liegt zusätzlich `examples/Daily.json` bei. Auf einem neu eingerichteten Dial muss sie erst importiert werden; sie ist nicht automatisch in jeder Gerätebibliothek enthalten. Für eine erneute gezielte Übertragung mit Node.js: `VD_PIN` als Umgebungsvariable setzen und `node tools/transfer_daily.mjs http://Dial-IP examples/Daily.json Sicherung.json` ausführen. Die Sicherungsdatei darf noch nicht existieren; der Helfer ergänzt ausschließlich die drei Daily-Presets und den Workflow anhand ihrer IDs. PIN anschließend aus der Umgebung entfernen. Der normale Browserimport bleibt für eigene PC-Exporte verfügbar.

Aroma-Kurve 3 kann ebenso additiv übertragen werden: `VD_PIN` setzen und `node tools/transfer_aroma.mjs http://Dial-IP Sicherung-Aroma.json` ausführen. Die Sicherungsdatei muss neu sein. Der Helfer ergänzt nur die drei AK3-Presets und den Workflow, setzt die bisherige Auswahl nicht um und platziert ihn direkt hinter Daily. Die Firmware muss dafür mindestens Version 0.2.9 unterstützen.

Grenzen: 32 KiB Bibliothek, 32 Presets, 16 Workflows, 32 Variablen pro Liste, 128 Graphknoten je Graph, 32 Workflow-Stufen und 512 kompilierte Aktionen. Zu große Bibliotheken vor dem Import aufteilen. Bei konkurrierenden Änderungen meldet der Editor eine zwischenzeitlich geänderte Bibliothek: neu laden, statt fremde Änderungen zu überschreiben.

## 9. Optionales Zubehör: Chain-Key mit Status-LED

USB-Strom vor dem Anschließen entfernen. Chain-Key **IN/J1** mit einem geraden vierpoligen Grove-Kabel an den **schwarzen UART-Port** des Dial anschließen. Schwarz = GND, Rot = 5 V, Gelb = GPIO2/TX am Dial zum RX des Tasters, Weiß = GPIO1/RX am Dial vom TX des Tasters. Der weiße I²C-Port ist dafür nicht vorgesehen. Keine zusätzliche Platine erforderlich.

Der Chain-Key ist optional: Ohne ihn sind Presets, Workflows, Timer und die Bedienung am Dial/Browser vollständig verfügbar. Ein einzelner Chain-Key am schwarzen Anschluss wird automatisch erkannt und eingerichtet; kein Schalter in den Einstellungen und keine eigene Firmware-Installation am Taster sind erforderlich. Die Erkennung wird bei fehlendem Taster ungefähr alle 0,5 Sekunden erneut versucht. Die Browser-Diagnose zeigt „Taste erkannt“, sobald gültige Antworten eingehen. Grünes Aufleuchten allein bestätigt nur die Stromversorgung, nicht die Erkennung.

Beim Anschluss oder Wiederanschluss den Taster zuerst loslassen. Ein bereits gedrückt angeschlossener Taster startet keine Lüftung. Bei Kabelverlust wird unmittelbar eine AUS-Anforderung ausgelöst; nach Wiederanschluss erneut loslassen und drücken. Unterstützt wird ein einzelner Chain-Key direkt am Dial; weitere verkettete Module gehören nicht zu dieser Zubehörkonfiguration.

| Zustand | Zusatztaster |
|---|---|
| Preset oder Workflow ausgewählt, kein Lauf | Einmal drücken startet die Auswahl samt Hue/Bluetooth-Verbindung |
| Workflow manuell gestoppt, Wiederholung verfügbar | Einmal drücken startet das angezeigte Preset erneut |
| Workflow wartet zwischen zwei Stufen | Einmal drücken startet das nächste Preset |
| „Ballon aufsetzen“ wird angezeigt | Nach Aufsetzen neu drücken; erst dann beginnt die Lüftung |
| Preset/Workflow läuft | Neuer Druck etwa 0,8 s gehalten fordert Stop an; kurze Betätigung startet keine zusätzliche Luft |
| Schlauch ausgewählt, noch nicht gestartet | Einmal drücken startet das Heizen |
| Schlauch heizt | Warten; keine zusätzliche Luft |
| Schlauch bereit | Neu drücken und halten: Luft EIN; Loslassen: AUS-Anforderung |
| Menü/Werteinstellung oder Fehler | Keine Start-/Luftaktion |

Der Startdruck wird bei Zustandswechseln nicht als Stop oder Halteanforderung weiterverwendet: zuerst loslassen, dann erneut drücken. Ein durchgehend gehaltener Taster überspringt keine Workflow-Stufen. Ohne Zubehör stehen dieselben Aktionen am Dial bereit.

RGB-LED: Grün bereit, weiß pulsierend beim Verbinden, Gelb beim Heizen/laufenden Ablauf, grün pulsierend in der Zwischenpause, türkis pulsierend bei „Ballon aufsetzen“, Blau bei laufender Luft, rot blinkend bei Fehler. Im bereiten Schlauchbetrieb leuchtet sie Grün. Die LED dimmt zusammen mit dem Bildschirm bis AUS und zeigt nach dem Aufwecken wieder die aktuelle Statusfarbe. Der Taster bleibt auch im dunklen Zustand ansprechbar; der erste Druck weckt ausschließlich. Die Funkübertragung braucht Zeit; eine AUS-Anforderung kann bei Funkverlust nicht garantiert übertragen werden.

## 10. Timer, RFID und Diagnose

Der Lüftungstimer heizt zunächst auf die eingestellte Temperatur und fördert danach für die eingestellte Zeit Luft. Anschließend gehen HEAT/AIR AUS. Ein neuer langer Druck auf den Zusatztaster kann den Timer stoppen; er schaltet währenddessen keine zusätzliche Luft ein.

RFID: Karte am Dial lesen, gewünschtes Preset/Workflow auswählen, „RFID zuordnen“ im Menü oder Browser betätigen. Späteres Vorhalten wählt den Eintrag aus, startet aber keinen Ablauf. Die Zuordnung gilt nur für unterstützte Karten und muss mit der konkreten Karte erprobt werden.

„Diagnose herunterladen“ speichert den aktuellen Status. PINs, WLAN-Passwörter und Hue-Schlüssel werden nicht mit exportiert. Über USB kann `powershell -File tools/USB.ps1 -Port COM3` Geräteinformationen abrufen. Die USB-Ausgabe „info“ enthält die lokale Geräte-PIN und das AP-Passwort: nicht öffentlich teilen.

## 11. Fehlerhilfe

| Symptom | Maßnahme |
|---|---|
| Volcano nicht gefunden | Strom/Steckdose prüfen; PC- und S&B-App trennen; erneut suchen |
| Hue-TLS fehlgeschlagen | Bridge-IP und Gerätezeit prüfen; keine Zertifikatsprüfung umgehen |
| Hue-Kopplung abgelehnt | Physische Bridge-Taste drücken; erneut koppeln |
| Browser nicht erreichbar | Gleicher Netzbereich, IP vom Display verwenden; Gastnetz-Isolation prüfen |
| Firmware startet nicht | USB-Datenkabel, 5-V-Versorgung und COM-Port prüfen; Installer erneut ausführen |
| Temperatur/Status veraltet | Bluetooth-Abstand verringern; Ablauf erneut bewusst starten |
| AUS nicht bestätigt | Volcano direkt kontrollieren; Ablauf bleibt gestoppt |
| Speicherfehler | Nicht starten; Bibliothek sichern und Installation untersuchen |

## 12. Vor dem regulären Einsatz prüfen

Zuerst Einrichtung, Auswahl und Bibliotheksimport prüfen. Anschließend mit beaufsichtigtem Gerät kurze Preset-/Workflow-Läufe, Zwischenpause, Stop und BLE-Verbindungsverlust testen. Hue erst separat prüfen, dann zusammen mit einem erfolgreichen Lauf und dem Abkühlen. Nach Montage des Chain-Key zusätzlich Halten, Loslassen, Abziehen des Kabels und Sperre während eines Workflows testen. Ein USB-Starttest ersetzt diese Prüfungen nicht.
