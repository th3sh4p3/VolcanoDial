# Hardware Schritt für Schritt zusammenbauen

Getestete Grundkonfiguration: **Dial v1.1 K130-V11**, optional **Chain Key U206**, USB-Stromversorgung. Die vorhandenen Modulgehäuse bleiben geschlossen. Kein Löten und kein Eingriff in den Volcano erforderlich.

## 1. Teile vorbereiten

Bestelle die [Einkaufsliste](EINKAUFSLISTE.md). Lege Dial, USB-Datenkabel und gegebenenfalls Chain Key/Grove-Kabel auf eine ebene Arbeitsfläche. Prüfe Buchsen und Kabel auf Beschädigungen; Drehknopf und Taster müssen sich frei bewegen. USB bleibt zunächst abgezogen.

## 2. Optionalen Taster anschließen

Verbinde **den schwarzen PORT.B am Dial** mit **IN/J1 am Chain Key**. PORT.A/I²C bleibt frei; OUT/J2 am Taster bleibt frei. Maßgeblich sind Beschriftung und Herstellerzeichnung, nicht „links“ oder „rechts“ auf einem Foto. Das Kabel gerade einstecken, keine Adern vertauschen oder einzelne Kontakte umstecken.

```text
USB-PC/Netzteil ── USB-Datenkabel ── USB-C am Dial
                                      │
                            schwarzer PORT.B
                                      │
                               Grove-Kabel 4P
                                      │
                            Chain Key IN / J1

Dial ── Bluetooth LE ── Volcano Hybrid
Dial ── WLAN ── Hue Bridge ── Hue-Steckdose (optional)
```

| Ader | Dial PORT.B | Chain Key IN/J1 | Zweck |
|---|---|---|---|
| Schwarz | GND | GND | Masse |
| Rot | 5 V | VCC | Tasterversorgung |
| Gelb | GPIO2 / UART TX | RXD1 | Dial sendet |
| Weiß | GPIO1 / UART RX | TXD1 | Taster antwortet |

Die Farben beschreiben das Standard-Grove-Kabel, keine Pinfolge aus einer beliebigen Blickrichtung. Nicht an den Adern ziehen. Bei abweichendem Kabel zuerst dessen tatsächliche Belegung prüfen. Die Firmware verwendet 115200 Baud, 8N1; am Taster muss dafür nichts eingestellt werden.

## 3. Strom und Firmware

Für die Installation USB-C am Dial mit dem PC verbinden. Der Taster bekommt Strom vom Dial und benötigt kein Netzteil. **Grünes Aufleuchten allein beweist keine funktionierende Datenverbindung.** Die installierte Firmware muss „Taste erkannt“ in der Diagnose melden.

Die grüne 6–36-V-Klemme und der Akkuanschluss des Dial werden beim USB-Aufbau nicht benutzt. Keine Versorgung an Datenpins legen. Zum Volcano führt kein Kabel.

Weiter mit [Firmware installieren](../docs/BEDIENUNGSANLEITUNG.md#2-firmware-installieren). Beim ersten Installieren `Neu`, bei späterem Update mit gleicher Partitionierung `Update` verwenden. COM-Port anhand des Windows-Geräte-Managers wählen, nicht pauschal COM3 übernehmen.

## 4. Funktion prüfen, dann befestigen

1. Anzeige startet, Drehen wechselt Auswahl, Klick/Touch öffnet bzw. betätigt die passende Funktion.
2. Falls vorhanden: Chain Key loslassen und automatische Erkennung in der Browser-Diagnose prüfen.
3. Heim-WLAN, Hue und Volcano nach der [Bedienungsanleitung](../docs/BEDIENUNGSANLEITUNG.md) einrichten. Andere Apps vom Volcano trennen.
4. Einen kurzen beaufsichtigten Test mit `examples/Funktionstest-40C.json` importieren/starten; Temperatur, Start, Stop und Ausgangsstatus prüfen.
5. Workflow-Zwischenpause und „Preset erneut“ testen. Im Schlauchmodus erst heizen, danach neu drücken und halten für Luft; loslassen fordert AUS an.
6. Ruhemodus prüfen: Display und Taster-LED dimmen zusammen; die erste lokale Geste weckt ausschließlich.
7. USB trennen, wieder anschließen: Einstellungen bleiben gespeichert, ein Programm startet erst nach bewusster Bedienung.

Lass Drehkranz, Touchscreen, Tasterhub und USB-C frei. Kabel locker verlegen und keine Buchse belasten. Erst nach dem Funktionstest mit Pads befestigen. Die Fernbedienung steht separat vom heißen Volcano; keine Montage an heißen Oberflächen.

## Fehler am Taster eingrenzen

| Symptom | Prüfung |
|---|---|
| LED blinkt beim Anschließen, Taste reagiert nicht | Schwarzer PORT.B und IN/J1, nicht PORT.A oder OUT. Diagnose „Taste erkannt“ prüfen. |
| Erster Druck bewirkt nur helles Display | Das ist das gewünschte Aufwecken. Loslassen und erneut drücken. |
| Während Workflow keine manuelle Luft | Gewünscht: kurze Tasterbetätigung schaltet keine zusätzliche Luft; neu etwa 0,8 s halten fordert Stop an. |
| Schlauch erzeugt beim ersten Startdruck keine Luft | Start heizt. Erst bei „bereit“ loslassen und neu halten. |
| Nach Abziehen/Wiederanschließen keine Reaktion | Für Montage USB trennen; nach Wiedererkennung Taster zuerst vollständig loslassen. |

Bei ungeklärtem Ausgangszustand oder Funkverlust den Volcano direkt kontrollieren. Der Taster fordert AUS an; die tatsächliche Übertragung hängt von der Bluetooth-Verbindung ab.

Als Druckunterlage: [Hardware-PDF](../docs/VolcanoDial_Hardware_Aufbauanleitung.pdf). Anschlussgrundlagen: [Dial v1.1](https://docs.m5stack.com/en/core/Dial_v1.1), [Chain Key](https://docs.m5stack.com/en/chain/Chain_Key).
