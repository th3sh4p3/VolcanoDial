# Prüfbericht – Volcano Dial

## Aktueller Stand 0.2.17 – 19.10.2026

Die dritte Stufe von Aroma-Kurve 3 wurde nach einer vom Nutzer beobachteten Überfüllung von ungefähr vier Sekunden bei 56 Sekunden gemeinsamer Einstellung auf 52 Sekunden kalibriert. Die ersten beiden Stufen bleiben bei 56 Sekunden. Eine neue C++-Prüfung scheiterte vor der Korrektur an 11,2 statt der erwarteten 10,4 Sekunden für den ersten Lüftungsabschnitt von AK3 Finish und bestand danach. Die vollständige Host-Suite bestand mit 106/106 Fällen. Der ESP32-S3-Build benötigt 1.841.147 Byte Programm und 69.976 Byte statisches RAM; das App-Image ist 1.841.296 Byte groß (SHA-256 `4EF582B15F9AA715E2D357717E2F6ED0EC82C276813C9AE0D0784736D0D731D7`).

Das Image wurde über COM3 als App-Update auf den Dial v1.1 geschrieben; das Flash-Tool bestätigte den Hash. Vor dem Update war der Ablauf beendet (Status „abgebrochen“), HEAT/AIR AUS und kein Abkühlauftrag offen. Nach dem Neustart meldete der Dial 0.2.17 im Leerlauf mit HEAT/AIR AUS; Bibliothek und Einstellungen waren unverändert. Ein echter erneuter Ballonlauf zur Bestätigung des Füllstands steht noch aus. [Maschinenlesbare aktuelle Prüfung](verification-0.2.17.json). Die folgenden Abschnitte dokumentieren frühere Versionen.

## Historischer Stand 0.2.7

Stand 12.10.2026: 95/95 automatisierte Tests bestanden. Ein gezielter Test stellte nach, dass eine vorübergehend ungültige Bluetooth-Statusabfrage in der AUS-Zwischenpause den Workflow 0.2.6 abbrach; er scheiterte vor der Korrektur und besteht danach. Die neue Firmware hält die Zwischenpause, verlangt vor „Weiter“ eine frische Bestätigung für HEAT/AIR AUS und unterscheidet einen fehlenden zweiten Statuswert von einem echten Gerätefehler. Echte Fehler und ungültiger Status während eines aktiven Ablaufs führen weiterhin zum sicheren Abbruch.

Version 0.2.7 wurde per USB auf dem Dial v1.1 installiert; das Flash-Tool bestätigte den Schreibhash. Nach Neustart meldete das Gerät 0.2.7 im Leerlauf mit HEAT/AIR AUS; Bibliothek und Einstellungen stimmten mit der Sicherung vor dem Update überein und kein Ablauf startete automatisch. Programmgröße des finalen Images: 1824387 Byte; statisches RAM: 69768 Byte, kein PSRAM. Ein vollständiger Daily-Heizlauf mit dem seltenen Funkfehler wurde noch nicht wiederholt. Die Herkunft und Größe des installierten Images stehen in `verification.json`.

## Historische Prüfung 0.2.6

Stand 11.10.2026: lokal geprüft und per USB installiert. Schreibhash und laufende Version 0.2.6 bestätigt; Bibliothek und Einstellungen unverändert, HEAT/AIR AUS, Zusatztaster erkannt, kein automatischer Programmstart. 94/94 automatisierte Tests und native Speicher-/UI-Prüfungen bestanden; 1823955 Byte Programm, 69768 Byte statisches RAM, kein PSRAM. Die unabhängige Gegenprüfung fand zwei wichtige Randfälle, beide durch drei zunächst scheiternde Regressionen abgesichert und korrigiert. Ein realer Heizlauf zur Stufenwiederholung wurde nicht ausgelöst. [Bedienung und Prüfung](WORKFLOW_STAGE_RETRY.md); damaliger Installationsstand und Hash sind in `verification.json` unter `previousInstalledBuild` erhalten.

### Öffentlicher Distributionsbuild von 0.2.6

Die Produktionsquellen von 0.2.6 waren damals gegenüber der installierten Version unverändert. Für die Veröffentlichung wurden im Compiler lokale Benutzerpfade in __FILE__ und Debug-Metadaten durch /build-user ersetzt. Dieser neu kompilierte 0.2.6-Binärbuild wurde nicht nochmals geflasht. Die frühere Originalinstallation steht in `verification.json` unter `previousInstalledBuild`. Öffentliche JSON-Berichte enthalten keine Live-Statusdaten oder lokalen Arbeitslog-Verweise.

## Historische Prüfung 0.2.5

Stand 11.10.2026. 0.2.5 lokal implementiert, kompiliert und anschließend auf ausdrücklichen Auftrag per USB installiert. Während der vorher ausdrücklich geschützten laufenden Nutzung erfolgte kein Geräteeingriff. 81/81 lokale Testfälle und native Speicherprüfungen bestanden. Endgültige Programm-/Dateigröße und Hash: `verification.json`; kein PSRAM, App-Grenze eingehalten. Geräteprüfung für diesen neuen Startpfad steht noch aus. [Start nach Hue AUS](POWER_RESTART_FIX.md).

Das App-Update schrieb 1.822.880 Byte; der Schreibhash wurde bestätigt. Nach Neustart meldet der Dial 0.2.5 und unveränderte Bibliothek/Einstellungen. Der gespeicherte Abkühlauftrag wurde wiederhergestellt und abgeschlossen: Hue-Steckdose AUS, Bluetooth getrennt, HEAT/AIR AUS, Leerlauf ohne Fehler oder automatischen Programmstart. Ein neuer Start-/Heiztest wurde nicht ausgelöst. Die anfängliche Nachstartprüfung sah während dieser AUS-Wiederherstellung `busy`; die Prüfung wurde auf deren Abschluss erweitert.

Die folgenden Geräteprüfungen dokumentieren ausschließlich ältere Versionen. `verification.json` beschreibt den aktuellen Stand; `verification-0.2.4.json` bewahrt die vollständige frühere Evidenz.

## Historische Geräteprüfung auf 0.2.4

Stand 10.10.2026. Installiert: 0.2.4; Geräteprüfung am 09.10.2026, aktueller Status und Tests erneut am 10.10.2026 geprüft. 62/62 automatisierte Tests sowie native Persistenztests bestanden. USB-App-Update mit bestätigtem Schreibhash. 1822187 Byte Programm, 1822336 Byte App-Datei, 69728 Byte statisches RAM, kein PSRAM; 3-MiB-App-Grenze eingehalten.

## Erhaltener Hue-Abschaltauftrag

Das vorherige LED-Update verlor nach dem vorgeschalteten Stop die nur im RAM gespeicherte Abkühlüberwachung. Außerdem löschte die bisherige Temperaturprüfung den Auftrag schon vor der Hue-Bestätigung. Seit 0.2.4 bleibt ein NVS-Auftrag an Volcano, Bridge und Steckdose gebunden; Stop, Fehler, Auswahl und Neustart erhalten ihn. Erst bestätigtes Hue AUS löscht ihn. Fehlgeschlagene AUS-Versuche werden mit Pause wiederholt, mit erneut geprüften frischen BLE-Daten und bestätigten inaktiven Ausgängen. Details: [Abkühl-Korrektur](COOLING_RECOVERY_FIX.md).

Die unabhängige Gegenprüfung fand zwei Integrationsfehler: Ein erster fehlgeschlagener BLE-Verbindungsversuch konnte die Wiederverbindung verlieren; die Ersteinrichtung konnte bereits vor der ersten Suche eine Volcano-ID verlangen. Beide wurden an tatsächlichen Start-/Suchpfaden reproduziert und korrigiert. Keine wichtigen offenen Reviewbefunde.

## Tatsächliche Geräteprüfung

Die noch eingeschaltete Steckdose wurde nach dem Update übernommen und AUS bestätigt. Ein kurzer Schlauchlauf bei 60 °C und vorübergehend 30 °C Abschaltschwelle speicherte den Auftrag. Stop bestätigte HEAT/AIR AUS; Geräteinfo und Auswahlwechsel behielten die Überwachung. Nach einem echten USB-Reset des Dial war die Temperatur 56 °C, der Auftrag erhalten, HEAT/AIR AUS, null Sollwertschreibvorgänge und kein automatisch gestartetes Programm.

Für einen kontrollierten Hue-Verbindungsfehler wurde vorübergehend eine unerreichbare lokale Bridge-Adresse gewählt und die Schwelle auf 100 °C gestellt. Der AUS-Versuch schlug fehl, Auftrag und Überwachung blieben aktiv, ein Wiederholungsversuch wurde vorgesehen. Nach Rückkehr zur ursprünglichen Bridge-Adresse bestätigte Hue AUS bei zuletzt gemessenen 54 °C. Erst danach wurde der Auftrag gelöscht und Bluetooth getrennt.

Die vollständige Bibliothek, Auswahl und ursprüngliche Bridge-Adresse wurden verglichen und wiederhergestellt; Abschaltschwelle 100 °C und Schlauchwert 210 °C bestätigt. Zum Testende waren Display und Taster-LED dunkel, kein Ablauf aktiv und kein Abschaltauftrag offen. Am 10.10.2026 meldet der erneut erreichbare Dial 0.2.4, Leerlauf ohne offenen Auftrag oder Fehler. Ein erneuter vollständiger Daily-Lauf und ein neuer physischer Kabel-Abziehtest waren nicht Bestandteil dieser Korrektur.

Während des Hue-Wiederholungsversuchs sank der minimale freie Heap einmal auf 3984 Byte; kein Allokationsfehler oder Reset wurde beobachtet, danach waren 86376 Byte frei. Die App blieb innerhalb der Flashgrenze; die 32-KiB-Bibliotheksgrenze bleibt bestehen. Bridge-Antworten bestätigen den Plug-Zustand, eine unabhängige elektrische Relaismessung fand nicht statt. Messpunkte und App-Hash: `verification.json`.

## Historische Geräteprüfung auf 0.2.3

Stand 09.10.2026. Damals installiert: 0.2.3. Die weiter unten erhaltenen Prüfungen auf früheren Versionen sind historische Evidenz. 45/45 Tests bestanden; USB-App-Update mit bestätigtem Schreibhash. 1817619 Byte Programm, 1817760 Byte App-Datei, 69664 Byte statisches RAM, kein PSRAM.

## Taster-LED und Ruhemodus

Die Chain-Key-LED erhält jetzt die relative tatsächliche Displayhelligkeit. Bisher wurde allein die Statusfarbe ausgegeben. Die Farbkanäle dimmen mit der Displaykurve bis null; nach Aufwecken wird wieder die aktuelle Statusfarbe ausgegeben. Tasterabfrage und ausschließlich aufweckende erste Geste bleiben erhalten. Laufende Workflows einschließlich Zwischenpausen verhindern die Display-Ruhe und dadurch auch das Dimmen der LED.

Fünf neue Regressionen führen den tatsächlichen Display-/LED-Code mit Produktionsklassen und kontrollierter UART-Grenze aus. Die Geräteprüfung fand zusätzlich einen vorhandenen Wettlauf: Das Einreihen von „Display aus“ konnte selbst eine Aufweckanforderung setzen. Die HTTP-, USB- und lokalen Befehlswege erzeugen für `sleepDisplay` keine eigene Aufweckanforderung mehr. Drei weitere Tests sichern das Queue-Verhalten ab. Unabhängige Gegenprüfung abgeschlossen; keine wichtigen offenen Befunde.

## Tatsächliche Zubehörprüfung auf dem endgültigen Stand

Der angeschlossene Taster bestätigte normale grüne Farbe, reduzierte Farbe während automatischem Dimmen, RGB null bei Display null, weiterlaufende Tasterproben im dunklen Zustand und normale Farbe nach Browser-Aufwecken. Manuelles AUS wirkte innerhalb eines 2,5-Sekunden-Prüffensters, vor der automatischen Ruhefrist, und blieb nach weiterer Wartezeit dunkel. Das wurde auch nach Wiederherstellung der normalen 30-/90-Sekunden-Ruhezeiten geprüft. Bibliotheksdefinitionen, Abschaltschwelle 100 °C und Schlauchwert 210 °C blieben erhalten. Endzustand: Display und LED AUS, Taster erreichbar, kein Programm gestartet.

Die Bestätigungen sind UART-Gerätedaten; optische Helligkeit und physische Aufwecklatenz wurden nicht unabhängig gemessen. Die erste lokale Aufweckgeste ist weiterhin nativ abgesichert. Ein neuer vollständiger Daily-Heizlauf war für diese LED-Änderung nicht Teil der Prüfung; die erfolgreiche echte Temperaturprüfung auf 0.2.2 ist unten erhalten. Details: [LED-Ruhe-Korrektur](LED_SLEEP_FIX.md). Einzelwerte und Hash in `verification.json`.

## Vorherige Geräteprüfung auf 0.2.2

Stand 09.10.2026. Damals installiert: 0.2.2. Die weiter unten erhaltenen Prüfungen auf 0.2.1 und 0.2.0 sind historische Evidenz. Bedienung und Hardwareaufbau sind unverändert; die Bedienungs-/Aufbau-PDFs mit Dokumentstand 0.2.1 gelten dafür weiterhin.

## Daily-Stufe 2: Solltemperatur nicht bestätigt

Der konkrete Fehler war „Heizen nicht bestaetigt: Solltemperatur nicht bestaetigt: 221.0 / 220.0 C“, bei bestehender Bluetooth-Verbindung und null GATT-Fehlern. Die Heizungsaktivierung wurde wegen des falsch zurückgelesenen Sollwerts gar nicht ausgeführt. Vier-Byte-Temperaturformat wie in der Desktop-App, begrenztes Warten auf exakte Rückmeldung und höchstens zwei Wiederholungen ausschließlich des absoluten Sollwerts korrigieren diesen Pfad. Stop bricht aktive Bestätigungen ab; nach bestätigtem AUS bleibt die frühere Sollwert-Wiederherstellung möglich. Details: [Fehleranalyse](TARGET_CONFIRMATION_FIX.md).

37/37 automatisierte Tests bestanden. Die unabhängige Gegenprüfung ist abgeschlossen, wichtige Zwischenbefunde sind korrigiert. Firmware: 1817115 Byte Programm, 1817264 Byte App-Datei, 69664 Byte statisches RAM. App-only-USB-Update auf COM3; Schreibhash bestätigt, Bibliothek und Einstellungen erhalten.

## Tatsächlich geprüfte Gerätefunktionen auf 0.2.2

Sieben Sollwertanforderungen 220/221/220/221/222/221/195 °C wurden exakt bestätigt; HEAT/AIR blieben AUS. Keine GATT-/Sollwertfehler, Bestätigung 200–400 ms. Daily Stop und Schlauch Stop bestätigten AUS und stellten 195 °C wieder her, ohne Fehlermeldung.

Ein vollständiger Daily-Lauf bei Originaltemperaturen wurde nach Installation durchgeführt: erste Stufe 170/183/195/208/220 °C, zweite 221 °C, dritte konstant 222 °C, jeweils 53 Sekunden Luftbudget. Beide Zwischenpausen blieben zunächst vier Sekunden ohne Eingabe stehen und wurden anschließend ausdrücklich über die lokale Browser-API fortgesetzt. Der zweite Übergang ist damit am Gerät geprüft; ein neuer physischer Tastertest ist damit nicht ersetzt. Der Ablauf erreichte das Ende, HEAT/AIR waren AUS, der vorherige Sollwert war wiederhergestellt. Nach sechs Sekunden kein selbstständiger Wiederanlauf. Definitionsdaten und gespeicherte Schwellen/Schlauchwerte blieben erhalten. Einzelwerte und der geprüfte App-Hash stehen in `verification.json`.

Der erste Diagnose-Lauf wurde vom Prüfsystem nach einem HTTP-Verbindungszeitlimit gestoppt. USB bestätigte einen sauberen Abbruch, HEAT/AIR AUS, 195 °C wiederhergestellt und keine Firmware-/BLE-Fehlermeldung. Wiederholte reine Statusabfragen überbrücken eine vorübergehende Transportunterbrechung; Start- und Weiter-Befehle werden nicht automatisch wiederholt.

Die interne Ursache der ursprünglichen nicht übernommenen Temperatur ist nicht reproduziert. Nicht übernommene Schreibanforderungen und verzögerte Rückmeldung sind kontrolliert als Regression geprüft. Eine Garantie gegen künftige physische Funk-/Gerätefehler wird nicht behauptet. Oberhalb der gespeicherten 100 °C bleibt die Hue-Steckdose bei ausgeschalteter Heizung/Lüftung zum Abkühlen eingeschaltet.

## Vorherige Geräteprüfung auf 0.2.1

Stand 08.10.2026. Der folgende Patch-Abschnitt beschreibt den damals installierten Stand. Die anschließend erhaltene 0.2.0-Prüfung ist historische Evidenz und keine erneute Messung derselben Sequenz auf 0.2.1.

## Daily-Abbruch und selbstständiger Wiederanlauf

Im ausgelesenen Fehlerzustand war Daily in Stufe 1, Aktion 10 (Temperatur erreichen), Sollwert noch 195 °C, Istwert 167 °C, HEAT/AIR AUS. Die Fehlermeldung zur gescheiterten Wiederherstellung der alten Solltemperatur hatte die ursprüngliche Fehlerursache überschrieben. Der Nutzer bestätigte anschließend einen Wiederanlauf ohne eigene Bedienung.

Der Worker besaß einen Start-/Weiter-Pfad aus BLE-Heizungs-Rückmeldungen. Solche Rückmeldungen können keine physische Benutzerabsicht beweisen; zeitliche Unterdrückung eigener Befehle reicht dafür nicht. Dieser Pfad ist entfernt. Start/Weiter erfolgen ausschließlich über bewusste Dial-, Zubehör- oder Browser-/USB-Befehle. Zugeordnete RFID-Karten wählen einen Ablauf aus. Die HEAT-Taste am Volcano startet und erweitert keinen Workflow. Nach Fehlern bleibt der Ablauf gestoppt.

Fehler bei AUS bzw. Solltemperatur-Wiederherstellung ergänzen jetzt die ursprüngliche Fehlerursache. Konkrete Bluetooth-/Solltemperatur-Details werden vor der Bereinigung übernommen. Zwei native Regressionen schlugen vor der jeweiligen Korrektur fehl und bestehen danach. Status enthält zusätzliche GATT-Fehlerzähler und letzte Sollwert-Anforderung/Bestätigung.

28/28 automatisierte Tests bestanden. Firmware 0.2.1: 1816075 Byte Programm, 1816224 Byte App-Datei, 69648 Byte statisches RAM; USB-Schreibhash bestätigt.

Ein vollständiger Daily-Lauf auf dem Diagnose-Zwischenstand und ein weiterer auf der endgültigen Firmware 0.2.1 wurden bei Originaltemperaturen durchgeführt: erste Stufe 170/183/195/208/220 °C, zweite 221 °C, dritte konstant 222 °C, jeweils 53 Sekunden Luftbudget. Beide Zwischenpausen verlangten einen ausdrücklichen Weiter-Befehl. Auf 0.2.1 wurden Zwischenpausen jeweils vier Sekunden ohne Bedienung und das Ende sechs Sekunden auf unerwarteten Start geprüft. Heizung/Lüftung waren bei Abschluss AUS, vorheriger Sollwert wiederhergestellt, Bibliothek und Einstellungen unverändert. Die Hue-Abkühlautomatik bleibt bei heißem Gerät aktiv; eine noch eingeschaltete Steckdose oberhalb 100 °C ist der vorgesehene Zustand.

Die Ursache des einzelnen ursprünglichen Abbruchs ist aus der alten Meldung nicht rückwirkend bestimmbar und wurde in diesen beiden vollständigen Läufen nicht erneut ausgelöst. Deshalb wird keine bestimmte Funkstörung als bewiesene Ursache behauptet. Der selbstständige Startpfad und der Verlust der ursprünglichen Fehlerursache sind korrigiert. Einzelwerte des endgültigen Laufs stehen in verification.json.

## Vorherige Geräteprüfung auf 0.2.0


Stand 08.10.2026. Zielgerät: M5Stack Dial v1.1 / ESP32-S3, 8 MB Flash, kein PSRAM. Basis: PC-App volcano-standalone 1.4.1. Das Originalprojekt und dessen Einstellungen bleiben unverändert.

## Automatisierte Prüfungen

28/28 Tests bestanden. Darin: PC-/C++-Compilerparität mit 15 Fixtures, Browsercompiler, Bibliotheksimport mit Fehlerfällen, HTTP-Rahmung, Ablaufkern sowie Eingabe-/Schlauch-/UI- und Daily-Prüfungen. Ergänzt wurden frische Start-/Weiter-Gesten, Stop-Epochen, stale Auswahl, Haltebesitz/Fristen, abgelaufene Browsergesten, kurzes Loslassen während einer BLE-Bestätigung, Kreis-Trefferbereiche, unveränderte Frames, vollständige Namen, UTF-8-Zeichen, LED-Bereitschaft, Display-Dimmen/AUS/Aufwecken und Wiederherstellung nach Hue-Anfragen. Die Testanzahl zählt Node-Testfälle; mehrere native Szenarien laufen je Testfall.

Die Daily-Daten wurden mit dem PC-Compiler verglichen: drei Stufen, 53 Sekunden Luftzeit je Stufe (159 Sekunden insgesamt), dritte Stufe „03“ konstant 222 °C. Idempotentes Ergänzen und Erhalt vorhandener Einträge sind geprüft. Auf dem Dial bleiben 15 Presets und zwei Workflows; Schlauch ist zusätzlich eingebaut und startet standardmäßig bei 210 °C.

Eine unabhängige Gesamtprüfung wurde durchgeführt. Wichtige Befunde zu Zustandswechseln beim Loslassen, abgelaufenen Browser-Haltegesten, Eingabesperren, Stop/Queue-Reihenfolge, optionalen BLE-Lesevorgängen und Auswahl/Start-Reihenfolge wurden korrigiert und mit Regressionstests abgesichert.

## Anzeige und Speicheraufbau

Die runde UI nutzt einen 1920-Byte-Puffer (240×4, RGB565), feste Statusdatensätze und Teilzeichensätze im Flash. Der Zeichenpfad allokiert keinen Heap. Sichtbare Änderungen werden streifenweise übertragen; unveränderte Ansichten werden nicht regelmäßig gelöscht/gezeichnet. Alle Hauptansichten wurden mit dem tatsächlichen Renderer als native Vorschaubilder geprüft. Nach Nutzerfotos wurden Unicode-Zeichen, Randeinzug und Abstand über der Haupttaste nachgebessert. Der Nutzer bestätigt, dass das ursprüngliche Flackern verschwunden ist; die endgültige Ablesbarkeit und das physische Bediengefühl bleiben separat zu bestätigen.

Statusabfragen teilen einen unveränderlichen String anstelle vollständiger Kopien. Während Hue-TLS wird die residente Bibliotheksstruktur freigegeben und nach Zerstörung der TLS-Strukturen aus LittleFS wieder geladen. Die Revision, Datei und UI-Snapshots bleiben erhalten. Fehler beim Wiederladen sperren weitere Starts. Die automatisierten Tests bestätigen auch den fehlgeschlagenen Anfrage-/Wiederherstellungspfad.

## Echte Geräteprüfungen

Frühere Version: USB, WLAN, BLE, Zieltemperatur, HEAT/AIR, Zwei-Stufen-Workflow bei 40 °C, Stop und Hue EIN/AUS waren am echten Gerät geprüft. Der Nutzer bestätigte zweimal Halten/Loslassen am Chain-Key sowie dessen damalige Sperre in der Zwischenpause. Diese historischen Tastertests gelten nicht als Abnahme der neuen Start-/Weiter- und Aufweckregeln.

Während 0.2.0: gespeicherte WLAN-/Hue-Einstellungen und Bibliothek blieben nach USB-Updates erhalten. Die gespeicherte Abschaltschwelle bleibt 100 °C. Start unmittelbar nach einem Neustart erreichte einen 40-°C-Workflow mit Zwischenpause. Automatisches Dimmen/AUS und Browser-Aufwecken sind am Gerät bestätigt; der Nutzer bestätigt den Ruhemodus grundsätzlich. Die Workflow-Zwischenpause blieb trotz kurzer Test-Ruhezeiten vollständig hell, und manuelles Display-AUS wurde abgewiesen.

Der abschließende Stand wurde per USB installiert und der Datenhash vom Flash-Werkzeug bestätigt. 1813959 Byte Programm (1814112 Byte App-Datei), 69624 Byte statisches RAM, kein PSRAM. Die abschließende Sequenz enthält zwei vollständige 40-°C-Workflows und anschließend Schlauch bei 40 °C: Heizung/BLE bleiben bei Display-AUS aktiv, Browser-Halten schaltet Luft EIN, Loslassen AUS, eine abgelaufene Geste startet keine Luft erneut. Schlauch-Ende mit Display-AUS erhält die Hue-Abkühlautomatik. Nach jedem regulären Abschluss sind HEAT/AIR AUS und die Hue-Steckdose ausgeschaltet; der Eingabekontext ist wieder startbereit.

In dieser Sequenz: 30 Hue-TLS-Anfragen, minimaler Heap 8808 Byte, freie Worker-Stackreserve 1260 Byte und Key-Stackreserve 1796 Byte. Das 8-KiB-Heapziel und 1-KiB-Worker-Stackziel sind für diese Bibliothek und Sequenz erreicht. Die Browser-Auswahlliste wird nur nach Bibliotheksänderungen geladen; regelmäßige Statusantworten enthalten sie nicht mehr. Alle Preset- und Workflow-Definitionen wurden vorher/nachher vollständig verglichen. Wiederhergestellt: Daily ausgewählt, Schlauch 210 °C, Dimmen/AUS 30/90 s, Abschaltschwelle 100 °C, HEAT/AIR AUS, getrennt.

Frühere Zwischenstände hatten unzureichende Speicherreserve. Außerdem zeigte der wiederholte Workflow-zu-Schlauch-Test eine liegengebliebene Abschaltanforderung nach bewusster Trennung. Die neue Verbindung bestätigt jetzt zuerst AUS; bewusste Trennung und unerwarteter Funkverlust werden getrennt behandelt. Die obige Abschlusssequenz prüft diese Korrektur. Einzelwerte und der geprüfte App-Hash stehen in `verification.json`. Der Nutzer hat anschließend USB tatsächlich getrennt und wieder angeschlossen. Nach diesem Stromausfall waren WLAN, Hue-Kopplung, Abschaltschwelle 100 °C, Schlauch 210 °C, Ruhezeiten 30/90 s und alle 15 Presets/zwei Workflows erhalten. Ein weiterer vollständiger Zwei-Stufen-Test bei 40 °C startete Hue und BLE, erreichte die Zwischenpause und schaltete anschließend HEAT/AIR sowie die Steckdose aus. In dieser zusätzlichen Sequenz: zehn TLS-Anfragen, minimaler Heap 9192 Byte, freie Worker-Stackreserve 1260 Byte. Danach wurde Daily wieder ausgewählt. Die neuen physischen Aufweckgesten bleiben separat zu bestätigen.

## Noch getrennt zu prüfen

- Physische Aufweckgeste für Touch, Drehen, Dial-Klick und optionalen Chain-Key; ausschließliches Aufwecken ohne Start/Luft.
- Neuer Kontexttaster: Start, Weiter und Langdruck-Stop am echten Zubehör; automatische Regeln sind nativ geprüft.
- Kabelunterbrechung während Luft EIN und Wiederanschluss; bislang simuliert geprüft.
- Konkrete RFID-Karte, Langzeitbetrieb und Reichweite. Der damalige HEAT-Start-/Weiter-Pfad ist in 0.2.1 entfernt.
- Vollständiger Daily-Heizlauf bei Originaltemperaturen; Daten/Aktionspläne geprüft, kombinierte Geräteprüfung verwendet kurze Testläufe.
- Echtes Abkühlen von oberhalb 100 °C und Bibliotheken nahe 32 KiB; kurze Tests starten unter der gespeicherten Schwelle.

Die genaue physische Lüftungs-Abschaltlatenz und maximale Zeichenzeit wurden nicht unabhängig gemessen. Die dokumentierten Speicherwerte gelten für die geprüfte Bibliothek und Testsequenz.
