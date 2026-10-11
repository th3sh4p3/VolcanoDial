# Herkunft und Fremdkomponenten

Der grafische Editor, das Bibliotheksmodell, der JavaScript-Compiler, die Formelauswertung und die Themes stammen aus der vom Nutzer bereitgestellten PC-App `volcano-standalone` 1.4.1. Die Desktop-Brücke wurde für die lokale Geräteschnittstelle angepasst. Der native Ablaufkern ist ein C++-Port dieser Semantik. Die Original-App wurde nicht verändert. Die Veröffentlichung enthält diese Herkunftshinweise und die beiliegenden Fremdlizenztexte. Für das Gesamtprojekt wird keine neue pauschale Lizenz erteilt; die jeweiligen Rechte an übernommenen Komponenten bleiben bestehen.

Build-Abhängigkeiten (gepinnt): Arduino-ESP32 3.3.12, M5Dial 1.0.3, M5Unified 0.2.25, M5GFX 0.2.32, M5Chain 1.0.10, NimBLE-Arduino 2.5.1, ArduinoJson 7.4.2. Die Firmware enthält Teile dieser Bibliotheken; Lizenztexte liegen unter `licenses/`. Die Hue-CA-Zertifikate sind öffentliche Vertrauensanker aus der PC-App.

Das mitgelieferte esptool 5.3.1 stammt aus dem offiziellen Espressif-Arduino-Paket. Es steht unter GPLv2 oder später; Lizenztext unter `licenses/esptool-LICENSE.txt`, exakte Quellversion: https://github.com/espressif/esptool/tree/v5.3.1 . Das Flash-Tool wird separat aufgerufen.

Offizielle technische Quellen:

- https://docs.m5stack.com/en/core/Dial_v1.1
- https://docs.m5stack.com/en/chain/Chain_Key
- https://github.com/m5stack/M5Dial
- https://github.com/m5stack/M5Chain
- https://github.com/h2zero/NimBLE-Arduino
- https://github.com/espressif/arduino-esp32/tree/3.3.12
- https://arduinojson.org/
- https://developers.meethue.com/develop/get-started-2/
- https://developers.meethue.com/develop/application-design-guidance/using-https/

Der runde Bildschirm verwendet Teilzeichensätze von Bitstream Vera/Vera Bold, erzeugt aus den ReportLab-Schriftdateien. Lizenz: `docs/Bitstream-Vera-LICENSE.txt`. Die Schriftpixel liegen als 4-Bit-Abdeckungswerte im Programmflash; es werden keine Bilddateien oder Netzressourcen zum Zeichnen benötigt.
