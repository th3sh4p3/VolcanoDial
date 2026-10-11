# Start nach automatischem Hue-Ausschalten – Update 0.2.5

Stand 11.10.2026. Zunächst ausschließlich lokal implementiert und geprüft. Nach dem ausdrücklichen Auftrag „Spiele auf“ wurde 0.2.5 per USB installiert; Schreibhash und laufende Version bestätigt. Bibliothek und Einstellungen sind vollständig erhalten. Während der zuvor ausdrücklich geschützten laufenden Nutzung erfolgte kein Geräteeingriff. Nach Neustart wurde ausschließlich lesend geprüft; der erhaltene Abkühlauftrag schaltete die Steckdose aus, HEAT/AIR blieben AUS und kein Programm startete automatisch.

## Fehlerbild und Nachweis

Nach langer Display-Ruhe weckte der erste Tastendruck nur auf. Der zweite wirkte wie ein Programmstart, Bluetooth blieb jedoch AUS; die Hue-Abkühlautomatik hatte den Volcano zuvor vom Strom getrennt. Der ursprüngliche Fehlermoment ist nicht mehr im Status vorhanden. Eine bestimmte Funkstörung oder elektrische Ursache ist damit nicht rückwirkend bewiesen.

Zwei passende Softwarefälle sind mit dem tatsächlichen Startcode reproduziert: Eine zwischengespeicherte Bluetooth-Verbindung übersprang die Prüfung von Hue EIN. Bei getrennter Verbindung wurde nur einmal verbunden; scheiterte dieser Versuch während des Hochfahrens, ging der angeforderte Programmstart verloren. Die spätere Hintergrund-Wiederverbindung lässt Programme bewusst gestoppt.

## Verhalten mit 0.2.5

Der erste lokale Druck, Touch oder Drehimpuls im Ruhemodus weckt weiterhin ausschließlich. Die nächste frische Startgeste prüft die konfigurierte Hue-Steckdose auf EIN und schaltet sie erforderlichenfalls ein. Eine vorhandene Bluetooth-Verbindung wird frisch geprüft. Ein veralteter oder teilweise aufgebauter Verbindungszustand wird sofort verworfen.

Bei noch nicht erreichbarem Volcano bleibt derselbe ausdrücklich angeforderte Start während höchstens drei Bluetooth-Verbindungsversuchen bestehen. Zwischen Versuchen liegt eine abbrechbare Sekunde; nach 30 Sekunden werden keine weiteren Versuche begonnen. Ein bereits begonnener Transportaufruf kann noch zu Ende laufen. Die vorherige WLAN-/Uhrzeit-Wartefrist und Hue-Anfragen sind separate Schritte; die Gesamtdauer ist deshalb nicht pauschal auf 30 Sekunden begrenzt.

Nach erfolgreicher neuer Verbindung werden HEAT/AIR AUS bestätigt und erst danach der ausgewählte Ablauf genau einmal begonnen. Die Anzeige meldet den Verbindungsaufbau. Bei einer weiterhin gesunden manuellen Verbindung bleiben deren aktive Ausgänge erhalten; die Ablaufsteuerung bestätigt beim Programmstart selbst AUS.

Stop bricht den Start ab. Fehlende Hue-Bestätigung oder fehlgeschlagene AUS-Bestätigung starten kein Programm. Wiederholt werden ausschließlich Verbindungsversuche, keine Programme und keine HEAT/AIR-EIN-Befehle. Nach endgültigem Fehler ist eine neue bewusste Startgeste erforderlich. Die gespeicherte Abkühlüberwachung und die ausschließlich auf AUS gerichtete Hintergrund-Wiederverbindung bleiben erhalten. Neustart, Fehlerbehebung und Bluetooth-Rückmeldungen starten weiterhin keinen Ablauf automatisch.

## Lokale Prüfung

Die Regression kompiliert `prepare`, `runSelected`, den manuellen HEAT/AIR-Befehlszweig und die ausdrückliche Trennung aus dem Produktionscode mit echtem Compiler, Ablaufkern und Eingabeklassen. Hue-/BLE-Transport, Speicherung und Uhr sind simuliert. Vor der Startkorrektur scheiterten sieben der ersten 15 neuen Fälle an den erwarteten Verhaltensprüfungen. Die unabhängige Gegenprüfung fand eine Nebenwirkung für manuelles AUS; vier zusätzliche Fälle reproduzierten diese vor ihrer Korrektur. Anschließend bestehen alle 19 neuen Fälle. Einschließlich der bisherigen Prüfungen: 81/81 Node-Testfälle und native Speicherprüfungen bestanden.

Manuelles HEAT/AIR AUS verwendet direkt Bluetooth und wartet nicht auf WLAN/Hue. Eine gewünschte Schalteraktion wird vor einem möglichen Verbindungsaufbau bestimmt, damit dessen Statusänderungen einen AUS-Druck nicht in EIN umkehren. Nicht bestätigtes AUS fordert die vorhandene AUS-Wiederherstellung an.

Abgedeckt sind insbesondere der tatsächliche Daily-Datensatz mit drei Stufen und konstant 222 °C in „03“, erster erfolgloser/zweiter erfolgreicher BLE-Versuch, zwischengespeicherte Verbindung bei ausgeschalteter Steckdose, Aufwecken ohne Start, Stop während Schaltung/Verbindung/Pause, dauerhafter Fehler ohne späteren automatischen Start, Schlauchstart sowie Erhalt manueller Ausgänge und Abkühlaufträge.

ESP32-S3-Build ohne PSRAM: 1.822.727 Byte Programm bei 3.145.728 Byte App-Grenze; 69.728 Byte statisches RAM. Der endgültige Build-Hash und Prüfstatus stehen in `verification.json`. Die tatsächliche lange Ruhephase mit ausgeschalteter Hue-Steckdose muss mit der jetzt installierten Firmware am Gerät geprüft werden. Die vorhandene Bedienungs-PDF beschreibt Stand 0.2.4; dieses Dokument ergänzt den korrigierten Startpfad.
