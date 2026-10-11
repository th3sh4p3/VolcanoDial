# Akku und INCLINE: Erweiterung in Entwicklung

Der vollständig beschriebene Nachbau in diesem Repository ist der **USB-versorgte Dial in seinen Originalgehäusen**. Das geneigte INCLINE-Gehäuse mit Akku ist ein zusätzlicher Entwurf. Es gibt dafür noch keine vollständig geprüfte STL/STEP-Fertigungsdatei und keinen bestätigten Plug-and-play-Akkuadapter.

## Vorgesehene Erweiterung

- M5Stack Dial v1.1 und optionaler Chain Key werden weiterverwendet.
- Ein geschützter [EREMIT 803040, 3,7 V / 1.000 mAh](https://www.eremit.de/p/eremit-3-7v-1000mah-lipo-akku-803040) ist der vorgesehene Akku. Nominelle Zellmaße sind keine bestätigten Gesamtmaße inklusive Schutzplatine/Kabel.
- Laut [M5Stack](https://docs.m5stack.com/en/core/Dial_v1.1) hat der Dial bereits eine Lithium-Ladeschaltung und eine 1,25-mm-2P-Akkubuchse. Derselbe vorhandene USB-C-Anschluss soll Daten und Laden ermöglichen; keine zusätzliche Ladeplatine ist eingeplant.
- Der EREMIT-PH-2,0-Stecker passt nicht direkt in die Dial-Buchse. Der recherchierte [ADA3922-PicoBlade-Kabelkandidat](https://www.berrybase.de/adafruit-molex-picoblade-kabel-2-polig-200mm-1.25mm-pitch-reibungsverriegelung) ist mechanisch und elektrisch noch nicht am realen Dial bestätigt. Gleiches Raster allein reicht nicht.
- Geplant sind eine isolierte Akkuwanne, lösbarer Deckel, freier Drehkranz, sichtbare Taster-LED und von außen zugänglicher Original-USB-C-Anschluss.

Vor Umsetzung müssen Gesamtmaß des gelieferten Akkus, Steckerpassung und Polarität, HOLD/GPIO46 beim Akkustart, Belastbarkeit des Akkupfads mit Taster, Laden während Betrieb und Laufzeit gemessen werden. Die vorliegende Firmware wurde über USB geprüft; daraus folgt keine abgeschlossene Akku-Abnahme.

Der USB-Aufbau benötigt keinen Akku, keine Zusatzplatine und keine INCLINE-Kleinteile. Für den sofort nachbaubaren Stand bitte die [Einkaufsliste](EINKAUFSLISTE.md) verwenden. Einen Akku erst mit überprüfter Anschlussbelegung verbinden; ein selbst konfektionierter Adapter gehört nicht zur lötfreien Grundmontage.
