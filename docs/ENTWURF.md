> Historischer Entwurf vom 08.10.2026. Aktuelle Bedienung und Abkühl-/Tasterlogik: BEDIENUNGSANLEITUNG.md, WORKFLOW_STAGE_RETRY.md und COOLING_RECOVERY_FIX.md.

# Volcano Dial – vereinbarter Entwurf

Stand: 8. Oktober 2026. Grundlage: `volcano-standalone`, Version 1.4.1. Das Originalprojekt wird nicht verändert.

Eigenständige USB-versorgte Fernbedienung auf M5Stack Dial v1.1 mit ESP32-S3, ohne PC zur Ausführung. Volcano Hybrid über BLE, Hue-Steckdose über die lokale Hue Bridge und WLAN. Chain Key am schwarzen Grove-Port: RX GPIO 1 (weiß), TX GPIO 2 (gelb), 115200 Baud. Halten aktiviert die Lüftung, Loslassen fordert sofort AUS an. Während Preset, Workflow, Zwischenpause und Fan-Timer ist dieser Taster gesperrt (vom Benutzer gewählt). Keine drahtlose Verbindung des Chain Key selbst.

Die Bibliothek bleibt mit dem JSON-Format Version 2 der PC-App kompatibel. Einfache und erweiterte Presets mit typisierten Variablen und Formeln sowie lineare verkettete Workflows werden übernommen. Zwischen Workflow-Presets wartet das Gerät auf Bestätigung. Der Dial übernimmt Auswahl, Start, Fortsetzen, Stop, Temperatur/Zeit/Schritte, manuelle Ausgänge, Lüftungstimer und Status. Komplexe Bearbeitung, Import/Export und Einrichtung erfolgen in einer vollständig lokal ausgelieferten Browser-Oberfläche.

Hue-Einschalten wird vor einer BLE-Verbindung bestätigt. Nach erfolgreichem Ablauf: beide Ausgänge bestätigt AUS, zwei frische Temperaturen unter der einstellbaren Abschalttemperatur (Standard 50 °C), dann Steckdose AUS. Fehler oder Abbruch aktivieren keine automatische Netzabschaltung. Verbindungsverlust stoppt den Ablauf ohne automatisches Fortsetzen; ungeklärte Ausgangszustände werden sichtbar gemeldet. BLE kann ein unmittelbares physisches Ausschalten bei Funkverlust nicht garantieren.

Einrichten: fertiges Image über Windows-USB-Helfer, geschütztes Einrichtungs-WLAN, Heimnetz wählen, Bridge per Tastendruck koppeln, Steckdose und Volcano auswählen, Bibliothek importieren. Browser darf anschließend geschlossen werden. Keine Cloud-Abhängigkeit für Editor oder Abläufe. Hue-Zertifikate werden geprüft; Uhrzeit kommt aus NTP oder aus dem Einrichtungsbrowser. Nach vollständigem Stromverlust kann ohne erreichbare Zeitquelle erneut eine Uhrzeitsynchronisierung nötig sein.

Zusätzliche Hardwarefunktionen: Touch-Menüs, Statusfarben am Chain Key, Buzzer, Displayhelligkeit, optionale RFID-Zuordnung zur Auswahl (kein automatischer Start), RTC-Anzeige. Keine Akku- oder zusätzlichen Platinenanforderungen. Animationen/GIPHY und direkter Hue-Bluetooth-Modus werden nicht übernommen.

Technik: C++-Ablaufkern mit ArduinoJson, Arduino-ESP32 3.3.12, M5Dial, M5Unified, M5GFX, M5Chain, NimBLE-Arduino. Arbeitsschritte und Bibliotheksversionen werden im Paket festgehalten. Tests vergleichen den Compiler mit der PC-App; ein Host-Test prüft den echten C++-Kern. Hardware-Abnahme separat, da die Geräte noch nicht vorhanden sind.
