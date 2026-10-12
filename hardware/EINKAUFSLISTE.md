# Einkaufsliste für den nachbaubaren USB-Dial

Stand: 12.10.2026, Firmware 0.2.7. Die Artikelnummern identifizieren den getesteten Aufbau. Preise und Lieferbestand können sich ändern; Produktlinks sind Bezugsquellen, keine Zusage für Verfügbarkeit. Bereits vorhandene passende Kabel und Netzteile können wiederverwendet werden.

## Pflichtteile für die Fernbedienung

| Menge | Teil und Bezugsquelle | Worauf achten? |
|---|---|---|
| 1 | [M5Stack Dial v1.1, BerryBase M5-K130-V11](https://www.berrybase.de/m5stack-dial-intelligenter-drehknopf-esp32-s3-1-28-zoll-touchscreen-rfid-rtc-6-36v) | Vollständiger Dial K130-V11 mit Stamp-S3A, Display, Touch und Drehgeber. Keine separate ESP32-Platine oder Anzeige erforderlich. |
| 1 | [USB-A/USB-C Sync-/Datenkabel 1 m, BerryBase 45563](https://www.berrybase.de/usb-c-2.0-sync-ladekabel-a-stecker-c-stecker-weiss/laenge-1-0m) | Passend für einen USB-A-PC-Port. Bei ausschließlich USB-C am PC stattdessen ein C/C-Datenkabel wählen. Muss Daten übertragen, reine Ladekabel reichen zum Installieren nicht. |
| 1 | [USB-Netzteil 5 V / 1 A, BerryBase 44947](https://www.berrybase.de/usb-netzteil-ladeadapter-1a-1x-usb-flache-bauform-schwarz) | Für eigenständigen Betrieb ohne PC, USB-A-Ausgang passend zum obigen Kabel. Ein vorhandenes geeignetes USB-Netzteil genügt; bei Versorgung vom PC nicht zusätzlich nötig. |

Die Logik, WLAN, Bluetooth, Bildschirm und Drehbedienung sind bereits im Dial enthalten. Es wird keine zusätzliche Controllerplatine benötigt. Der Aufbau funktioniert ohne Löten und ohne 3D-Druck.

## Optionaler Zusatztaster mit RGB-LED

| Menge | Teil und Bezugsquelle | Worauf achten? |
|---|---|---|
| 1 | [M5Stack Chain Key, BerryBase M5-U206](https://www.berrybase.de/m5stack-chain-key-button-blauschalter-hot-swap-2x-rgb-led-stm32g031-uart-5v-28-24ma) | Genau Chain Key U206; ein anderer M5Stack-Taster wird nicht durch diese Firmware eingerichtet. |
| 1 Kabel | [Grove 4-polig, 20 cm, BerryBase SE-110990027](https://www.berrybase.de/seeed-grove-universal-4-pin-kabel-fixierend-20cm-5er-pack) | Pack enthält fünf Kabel; nur eines wird benötigt. Gerade verdrahtetes HY2.0/Grove-Kabel, beide Enden vierpolig. Bei Nichtverfügbarkeit siehe Alternative unten. |

Alternative bei BerryBase: [Grove 4P ohne Verriegelungsnase, 20 cm, SE-110990031](https://www.berrybase.de/seeed-grove-universal-4-pin-kabel-nicht-fixierend-20cm-5er-pack). Vor Bestellung Länge, vierpolige HY2.0-Stecker und gerade Belegung prüfen; kein JST-SH/Qwiic-Kabel und keine lose Dupont-Verdrahtung verwenden. Ein mitgelieferter kurzer Chain-Bridge-Verbinder ersetzt das Kabel zwischen Dial und Taster nicht.

Optional: lösbares Montageband oder kleine rutschfeste Pads. Schrauben, Akku, Akkuadapter, Ladeplatine und Gehäuse sind für diese USB-Version nicht erforderlich.

## Voraussetzungen außerhalb der Fernbedienung

- **Volcano Hybrid** mit Bluetooth. Classic/Digit werden von dieser BLE-Firmware nicht unterstützt.
- Für Hue: eine lokale **Hue Bridge** und eine darüber eingebundene schaltbare Steckdose, deren zulässige Last zum Volcano passt. Eine reine Bluetooth-Steckdose ohne Bridge wird nicht direkt angesteuert.
- Für Hue und Browser-Einrichtung: ein erreichbares 2,4-GHz-WLAN. Der Ablauf läuft anschließend auf dem Dial; der PC muss nicht eingeschaltet bleiben.
- Für den beiliegenden Installer: Windows-PC und freier USB-Datenanschluss. Für Browser-Einrichtung reicht danach Smartphone, Tablet oder PC im selben Netz.

Die Hue-Komponenten müssen nur beschafft werden, wenn Einschalten vor einem Start und Abschalten nach Abkühlen gewünscht sind. Ohne Hue wird der Volcano selbst eingeschaltet und der Dial per Bluetooth verbunden.

## Bestellung und nächster Schritt

Dial, Taster und Grove-Kabel lassen sich über BerryBase suchen/bestellen; Kabel und Netzteil aus vorhandener Ausstattung sparen weitere Händler. Bei fehlendem Grove-Kabel kann man zunächst ohne Zusatztaster aufbauen und später ergänzen. Kein Konto-Warenkorb oder persönlicher Bestelllink ist für den Nachbau erforderlich.

Danach: [Hardware zusammenbauen](AUFBAU.md) → [Firmware installieren und einrichten](../docs/BEDIENUNGSANLEITUNG.md). Akku und INCLINE sind separat im [Entwicklungsstand](AKKU_UND_GEHAEUSE.md) beschrieben.

Anschlussgrundlage: [M5Stack Dial v1.1](https://docs.m5stack.com/en/core/Dial_v1.1), [Chain Key U206](https://docs.m5stack.com/en/chain/Chain_Key). Händlerlinks geprüft am 11.10.2026; keine feste Preis- oder Lieferzusage.
