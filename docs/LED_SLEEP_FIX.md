# Zubehör-LED und Display-Ruhe – Update 0.2.3

Stand 09.10.2026. Ursache: Der Zubehör-Thread berechnete die Statusfarbe unabhängig von der Displayhelligkeit. Deshalb blieb die Chain-Key-LED im Ruhemodus eingeschaltet.

Die LED verwendet jetzt die gleiche relative Dimmkurve wie die tatsächliche Displaybeleuchtung. Bei normaler Helligkeit bleiben die bisherigen Statusfarben erhalten; während des Dimmens werden die drei Farbkanäle proportional reduziert. Bei Display AUS werden alle Kanäle null. Das gilt für automatische Ruhe und manuelles „Display aus“. Beim Aufwecken erscheint die aktuelle Statusfarbe, auch wenn sich der Gerätestatus zwischenzeitlich geändert hat.

Tasterabfrage, Wiedererkennung und die erste ausschließlich aufweckende Geste bleiben aktiv. Kein zusätzliches Starten, Heizen oder Lüften durch die LED-Steuerung. Wenn ein Workflow einschließlich Zwischenpause die Display-Ruhe verhindert, bleibt auch die LED normal hell. Veränderte LED-Pulsfarben wecken das Display nicht und verursachen im ausgeschalteten Zustand keine dauernden LED-Schreibvorgänge. Fehlgeschlagene Farbübertragungen bleiben erneut versuchbar.

45/45 Tests bestanden. Fünf neue Fälle führten vor der Korrektur zu falschen tatsächlich ausgegebenen RGB-Werten und bestehen danach: automatisches Dimmen/AUS, manuelles AUS, Aufwecken mit aktueller Farbe, weiterlaufende Tasterabfrage bei dunkler LED und normale Farbe bei geänderter Normalhelligkeit bzw. aktivem Ablauf. Sie führen die tatsächlichen Display-/LED-Fragmente mit Produktionsklassen und einer kontrollierten UART-Grenze aus. Eine unabhängige Gegenprüfung fand keine wichtigen offenen Probleme.

Die Geräteprüfung deckte zusätzlich einen bestehenden Wettlauf bei manuellem AUS auf: Der eingereihte `sleepDisplay`-Befehl setzte selbst eine Aufweckanforderung. Je nach Ausführungsreihenfolge wurde das Display im nächsten Frame wieder hell. Dieser Befehl erzeugt jetzt keine eigene Aufweckanforderung mehr; HTTP-, USB- und lokale Befehlswege sind korrigiert. Drei zusätzliche Queue-Prüfungen sichern AUS, Aufwecken und normale Befehle ab. Der AUS-Test schlug vor der Korrektur fehl.

Firmware: 1817619 Byte Programm, 1817760 Byte App-Datei, 69664 Byte statisches RAM, kein PSRAM. Das USB-Update schreibt nur die App. Bibliothek und Geräteeinstellungen bleiben erhalten. Ergebnisse der tatsächlichen Zubehörprüfung stehen im [Prüfbericht](PRUEFBERICHT.md) und in `verification.json`.

Statusdiagnose: `keyLedBrightness` ist die relative Helligkeit von 0–255; `keyLedColor` die zuletzt vom Zubehör bestätigte RGB-Farbe. Nach Abziehen kann diese Bestätigung historisch sein; `keyAlive` zeigt die aktuelle Erreichbarkeit.
