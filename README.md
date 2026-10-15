# VolcanoDial

Eigenständige Fernbedienung für den **Volcano Hybrid** auf **M5Stack Dial v1.1**. Presets und Workflows laufen auf dem Dial, ohne laufenden PC. Bluetooth steuert den Volcano; WLAN verbindet die lokale Hue Bridge. Aktueller Quellstand **0.2.16**. Das zuletzt veröffentlichte Installationspaket ist weiterhin **0.2.7**.

## Vom Einkauf zum laufenden Gerät

1. **[Einkaufsliste](hardware/EINKAUFSLISTE.md)**: Dial, USB-Datenkabel, Versorgung; optional Chain Key und Grove-Kabel. Teilebezeichnungen und Bezugsquellen in Deutschland.
2. **[Hardware zusammenbauen](hardware/AUFBAU.md)**: lötfreier Aufbau in den Modulgehäusen, korrekter schwarzer UART-Port und Chain Key IN/J1. [Druckbare Aufbauanleitung](docs/VolcanoDial_Hardware_Aufbauanleitung.pdf).
3. **[Installationspaket herunterladen](https://github.com/th3sh4p3/VolcanoDial/releases/tag/v0.2.7)**: `VolcanoDial_0.2.7.zip` vollständig entpacken. Es enthält Firmware, Windows-Installer, Flash-Tool, Prüfsummen und Anleitungen. GitHubs „Source code“-ZIP ist der Quellstand; das benannte ZIP ist das vorbereitete Installationspaket.
4. **[Firmware installieren und einrichten](docs/BEDIENUNGSANLEITUNG.md)**: USB-Datenkabel, tatsächlichen COM-Port wählen, `Installieren.cmd -Modus Neu -Port COM3`; bei erster Installation „NEU“ bestätigen. COM3 ist nur ein Beispiel. Danach Heim-WLAN, optional Hue und Volcano einrichten.
5. **[Kurzen Funktionstest durchführen](docs/FUNKTIONSTEST.md)**: `examples/Funktionstest-40C.json`, Start/Stop, Zwischenpause und optionale Taste prüfen. Eigene Bibliothek im lokalen Browser importieren oder dort Presets erstellen. `examples/Daily.json` enthält einen dreistufigen Beispielworkflow.

**[Vollständige Bedienungsanleitung als PDF](docs/VolcanoDial_Bedienungsanleitung.pdf)**

Die PDF-Datei enthält die neu hinzugefügte Aroma-Kurve 3 noch nicht; die [aktuelle Online-Anleitung](docs/BEDIENUNGSANLEITUNG.md) und die [Aroma-Anleitung](docs/AROMA-KURVE-3.md) ergänzen sie.

Der Windows-Installer braucht keine Arduino-Installation. Grundaufbau und Nutzung benötigen keinen Akku und keine 3D-Druckteile. Der Dial enthält bereits Mikrocontroller, WLAN/Bluetooth, Anzeige, Touch und Drehgeber.

## Funktionen

- Rundes 240×240-Farbdisplay: Temperatur, Fortschritt, Stufe, Status und passende Aktion.
- Drehknopf, Klick und Touch für Auswahl, Start, Weiter, Stop und Werte.
- Einfache/erweiterte Presets, lineare Workflows, Variablen und Formeln; lokaler Browsereditor mit JSON-Import/Export.
- Workflow-Zwischenpause wartet auf bewusste Bedienung. Nach manuellem Abbruch bietet **Preset erneut** die unterbrochene Stufe von Anfang an an; abgeschlossene Stufen werden übersprungen.
- Ab Version 0.2.13 meldet der Buzzer den bestätigten Abschluss jeder Workflow-Stufe, einschließlich der letzten, mit zwei kurzen Tönen. „Signaltöne“ kann diese Meldung stummschalten; ein Vibrationsmotor ist im Dial nicht eingebaut.
- Für den optionalen Akku gibt es **Dial AUS** im radialen Schnellmenü sowie **Ausschalten** im ausführlichen Menü, jeweils mit zweifacher Bestätigung. **Hue AUS** steht im ausführlichen Menü. Bei inaktivem Programm, ausgeschalteten Volcano-Ausgängen und erledigter Hue-Abkühlung schaltet der Dial zuerst die konfigurierte Hue-Steckdose aus und bestätigt deren AUS-Zustand; erst dann trennt er seine Akkuversorgung. Bei Hue-Fehlern bleibt er an. Ein Radklick schaltet ihn wieder ein; bei USB-Versorgung bleibt er trotz Hue AUS eingeschaltet. [Akku-Anbau und Polungsprüfung](hardware/AKKU_UND_GEHAEUSE.md).
- **Auto AUS** schaltet nach einstellbarer Leerlaufzeit über denselben sicheren Hue-AUS-Pfad ab: Standard 30 Minuten, 0 deaktiviert die Automatik. Die Einstellung ist am Dial und im Browser verfügbar und bleibt nach Neustart erhalten. Aktive Programme und Abkühlaufträge sperren die Abschaltung.
- Ein Tipp auf den äußeren Ring wählt eine Workflow-Startstufe; erst „Starten“ führt diese und die folgenden Stufen aus. Die gemeinsame Ballonfüllzeit lässt sich direkt im Hauptbild antippen und gilt für alle drei Daily- oder Aroma-Kurve-3-Stufen.
- **[Aroma-Kurve 3](docs/AROMA-KURVE-3.md)** ergänzt Daily um drei Ballons mit abgestuften Temperaturen. Die globale Bestätigung „Ballon aufsetzen“ ist optional und standardmäßig AUS; eingeschaltet funktioniert sie am Dial oder mit dem optionalen Zusatztaster.
- Die Auswahlfolge am Rad und im Browser ist **Daily → Aroma-Kurve 3 → Schlauch → AK3 Aroma → AK3 Balance → AK3 Finish**; weitere vorhandene Presets bleiben in ihrer gespeicherten Reihenfolge.
- **Schlauchmodus**, standardmäßig 210 °C: heizen, dann neu halten für Luft; Loslassen fordert AUS an.
- Optionaler **Chain Key U206** wird automatisch erkannt: Start/Weiter, langer Druck für Stop, Halten im bereiten Schlauchmodus. Ohne Taste bleiben die Grundfunktionen am Dial verfügbar.
- Hue-Steckdose vor dem Start einschalten, nach Ende/Stop und Abkühlen ausschalten; Abschaltauftrag übersteht einen Dial-Neustart.
- Display und Zubehör-LED dimmen gemeinsam. Die erste lokale Geste weckt ausschließlich; laufende Workflows einschließlich Zwischenpausen verhindern Display-Ruhe.
- Einstellungen und Bibliothek überstehen USB-Trennung. Kein automatischer Programmstart nach Neustart oder Funkverlust.

Die Remote-Abschaltung benötigt eine funktionierende Funkverbindung. Bei „AUS nicht bestätigt“ den Volcano direkt kontrollieren. Unterstützt wird Volcano Hybrid, keine Classic-/Digit-Variante. Hue benötigt eine Bridge; die Steckdose wird nicht direkt per Bluetooth angesteuert.

## Radiales Schnellmenü

Die Mitte des wachen Touchscreens etwa 0,7 Sekunden halten: Sechs sichtbare Kreissektoren bieten per Touch oder Drehknopf Füllzeit, globale Ballonbestätigung, Display-Ruhezeit, Temperatur bei einfachem Preset/Schlauch, zweifach bestätigtes Hue-AUS und das ausführliche Menü. Die Ballonbestätigung ist standardmäßig AUS. Daily und Aroma-Kurve 3 teilen eine dauerhaft gespeicherte Füllzeit. Änderungen in einer Workflow-Zwischenpause gelten ab der nächsten Stufe und bleiben auch nach einem Stromausfall erhalten. Die optionale Zwei-Finger-Geste zum ausführlichen Menü wurde am physischen Dial bestätigt. [Details](docs/QUICK-ROSE.md).

## Aktueller Prüfstand

Version 0.2.16 besteht 106/106 automatisierte Fälle einschließlich der Sicherheitsreihenfolge Hue AUS vor Akku AUS und der Auto-AUS-Frist. Der Build benötigt 1.840.911 Byte Programm und 69.976 Byte statisches RAM, ohne PSRAM. Das Entwicklungsgerät wurde noch nicht auf 0.2.16 aktualisiert; vor dem USB-Update müssen ein laufender Workflow und sein Hue-Abkühlauftrag abgeschlossen sein. Die Touchbedienung der Ausschaltaktion, die reale Auto-AUS-Frist und der Akkubetrieb sind noch nicht physisch getestet. Das oben verlinkte Release-ZIP 0.2.7 enthält die neuen Funktionen nicht; zum Nachbau des aktuellen Quellstands die [Entwickleranleitung](docs/ENTWICKLUNG.md) verwenden.

- [Prüfbericht](docs/PRUEFBERICHT.md), [maschinenlesbare Prüfung](docs/verification.json)
- [Stufe erneut starten](docs/WORKFLOW_STAGE_RETRY.md)
- [Start nach Hue-Abschaltung](docs/POWER_RESTART_FIX.md)
- [Abkühlauftrag und Wiederherstellung](docs/COOLING_RECOVERY_FIX.md)

## Entwickler

[Build, Tests und API](docs/ENTWICKLUNG.md). Arduino-ESP32 und Bibliotheken sind im Buildskript versioniert. Unter Windows:

```powershell
powershell -ExecutionPolicy Bypass -File tools/Build.ps1
```

Quellstruktur: `firmware/VolcanoDial/` für ESP32/C++ und Display, `web/` für die lokale Browseroberfläche, `tests/` für Compiler-/Ablauf-/UI-Regressionen, `tools/` für Build, USB, Installation und Dokumente, `hardware/` für Beschaffung und Aufbau. `bin/` enthält die vier geprüften Flash-Dateien, `SHA256SUMS.json` deren Prüfsummen sowie die des Flash-Tools.

## Akku und Gehäuse

**[INCLINE und Akku: Entwicklungsstand](hardware/AKKU_UND_GEHAEUSE.md)**. Noch keine geprüfte STL/STEP-Druckdatei oder freigegebener Akkuadapter. Die USB-Variante kann bereits anhand der Anleitungen aufgebaut werden.

## Herkunft und Lizenzen

Unabhängiges Projekt, keine offizielle S&B-/M5Stack-/Hue-Software. [Herkunft und Fremdkomponenten](THIRD_PARTY.md), Lizenztexte unter `licenses/` und Schriftlizenz unter `docs/`. Für das Gesamtprojekt wurde keine pauschale neue Lizenz vergeben; vorhandene Rechte und Lizenzbedingungen werden nicht ersetzt.

Keine persönlichen WLAN-/Hue-Zugangsdaten oder Geräte-Backups sind enthalten. Eigene Bibliotheks- und Diagnosedaten vor dem Teilen prüfen. Fehler mit Firmwareversion, genauen Schritten und bereinigter Diagnose über [Issues](https://github.com/th3sh4p3/VolcanoDial/issues) melden.
