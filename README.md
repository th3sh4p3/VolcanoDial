# VolcanoDial

Eigenständige Fernbedienung für den **Volcano Hybrid** auf **M5Stack Dial v1.1**. Presets und Workflows laufen auf dem Dial, ohne laufenden PC. Bluetooth steuert den Volcano; WLAN verbindet die lokale Hue Bridge. Version **0.2.6**.

## Vom Einkauf zum laufenden Gerät

1. **[Einkaufsliste](hardware/EINKAUFSLISTE.md)**: Dial, USB-Datenkabel, Versorgung; optional Chain Key und Grove-Kabel. Teilebezeichnungen und Bezugsquellen in Deutschland.
2. **[Hardware zusammenbauen](hardware/AUFBAU.md)**: lötfreier Aufbau in den Modulgehäusen, korrekter schwarzer UART-Port und Chain Key IN/J1. [Druckbare Aufbauanleitung](docs/VolcanoDial_Hardware_Aufbauanleitung.pdf).
3. **[Installationspaket herunterladen](https://github.com/th3sh4p3/VolcanoDial/releases/tag/v0.2.6)**: `VolcanoDial_0.2.6.zip` vollständig entpacken. Es enthält Firmware, Windows-Installer, Flash-Tool, Prüfsummen und Anleitungen. GitHubs „Source code“-ZIP ist der Quellstand; das benannte ZIP ist das vorbereitete Installationspaket.
4. **[Firmware installieren und einrichten](docs/BEDIENUNGSANLEITUNG.md)**: USB-Datenkabel, tatsächlichen COM-Port wählen, `Installieren.cmd -Modus Neu -Port COM3`; bei erster Installation „NEU“ bestätigen. COM3 ist nur ein Beispiel. Danach Heim-WLAN, optional Hue und Volcano einrichten.
5. **[Kurzen Funktionstest durchführen](docs/FUNKTIONSTEST.md)**: `examples/Funktionstest-40C.json`, Start/Stop, Zwischenpause und optionale Taste prüfen. Eigene Bibliothek im lokalen Browser importieren oder dort Presets erstellen. `examples/Daily.json` enthält einen dreistufigen Beispielworkflow.

**[Vollständige Bedienungsanleitung als PDF](docs/VolcanoDial_Bedienungsanleitung.pdf)**

Der Windows-Installer braucht keine Arduino-Installation. Grundaufbau und Nutzung benötigen keinen Akku und keine 3D-Druckteile. Der Dial enthält bereits Mikrocontroller, WLAN/Bluetooth, Anzeige, Touch und Drehgeber.

## Funktionen

- Rundes 240×240-Farbdisplay: Temperatur, Fortschritt, Stufe, Status und passende Aktion.
- Drehknopf, Klick und Touch für Auswahl, Start, Weiter, Stop und Werte.
- Einfache/erweiterte Presets, lineare Workflows, Variablen und Formeln; lokaler Browsereditor mit JSON-Import/Export.
- Workflow-Zwischenpause wartet auf bewusste Bedienung. Nach manuellem Abbruch bietet **Preset erneut** die unterbrochene Stufe von Anfang an an; abgeschlossene Stufen werden übersprungen.
- **Schlauchmodus**, standardmäßig 210 °C: heizen, dann neu halten für Luft; Loslassen fordert AUS an.
- Optionaler **Chain Key U206** wird automatisch erkannt: Start/Weiter, langer Druck für Stop, Halten im bereiten Schlauchmodus. Ohne Taste bleiben die Grundfunktionen am Dial verfügbar.
- Hue-Steckdose vor dem Start einschalten, nach Ende/Stop und Abkühlen ausschalten; Abschaltauftrag übersteht einen Dial-Neustart.
- Display und Zubehör-LED dimmen gemeinsam. Die erste lokale Geste weckt ausschließlich; laufende Workflows einschließlich Zwischenpausen verhindern Display-Ruhe.
- Einstellungen und Bibliothek überstehen USB-Trennung. Kein automatischer Programmstart nach Neustart oder Funkverlust.

Die Remote-Abschaltung benötigt eine funktionierende Funkverbindung. Bei „AUS nicht bestätigt“ den Volcano direkt kontrollieren. Unterstützt wird Volcano Hybrid, keine Classic-/Digit-Variante. Hue benötigt eine Bridge; die Steckdose wird nicht direkt per Bluetooth angesteuert.

## Aktueller Prüfstand

94/94 automatisierte Fälle sowie native Speicher-/UI-Prüfungen bestanden. Firmware 0.2.6 wurde auf einem Dial v1.1 per USB mit bestätigtem Schreibhash installiert; Bibliothek und Einstellungen blieben erhalten. Der öffentliche Build hat 1.823.891 Byte Programm und 69.768 Byte statisches RAM, kein PSRAM. Er wurde aus identischen Produktionsquellen mit anonymisierten Build-Pfaden neu kompiliert; dieser öffentliche Binärbuild wurde nicht erneut auf das Gerät geflasht. **Ein tatsächlicher Heizlauf der neuen Stufenwiederholung steht noch aus.** Ältere echte Geräteprüfungen und Grenzen sind getrennt dokumentiert.

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
