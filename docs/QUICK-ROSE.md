# Schnellmenü und Balloneinstellungen

**Stand:** Firmware 0.2.14 ist auf dem Entwicklungs-Dial installiert. Der Nutzer hat die Zwei-Finger-Geste zum ausführlichen Einstellungsmenü am Gerät bestätigt; die übrigen Kreismenü-Touchflächen sind noch nicht einzeln geprüft.

## Schnelle Bedienung am Dial

Im Leerlauf oder in der Pause zwischen zwei Workflow-Stufen die **Mitte des wachen Touchscreens etwa 0,7 Sekunden halten**. Das Schnellmenü mit sechs sichtbaren Kreissektoren erscheint. Ein Sektor reagiert in seiner gesamten gezeichneten Fläche; antippen oder mit dem Drehknopf wählen und klicken. Die Mitte ist „Zurück“. Während einer aktiven Heiz- oder Lüftungsstufe ist das Schnellmenü gesperrt. Wenn das Display schläft, weckt die erste Berührung es nur auf; danach erneut halten.

| Feld | Wirkung |
| --- | --- |
| Füllzeit | Gemeinsame Ballonfüllzeit von 5 bis 300 Sekunden für Workflows mit UI-Füllzeit, insbesondere Daily und Aroma-Kurve 3. Sie ist unabhängig vom gerade ausgewählten Programm zugänglich. |
| Ballon | Globale Bestätigung vor der ersten Lüftung jeder geeigneten Stufe ein-/ausschalten; standardmäßig AUS. |
| Display | Sekunden bis Display AUS ändern; die Dimmzeit bleibt separat im Browser einstellbar. |
| Temperatur | Endtemperatur eines einfachen Einzelpresets oder Zieltemperatur im Schlauchmodus ändern. |
| Dial AUS | Nur bei inaktivem Programm, ausgeschalteten Ausgängen und abgeschlossener Hue-Abkühlung verfügbar. Ein zweiter Klick bzw. Tipp bestätigt das Abschalten; bei USB-Stromversorgung bleibt der Dial an. |
| Mehr | Ausführliches Einstellungsmenü öffnen. Dort steht **Hue AUS** als eigener Eintrag mit zweifacher Bestätigung bereit, sobald eine sichere manuelle Abschaltung möglich ist. |

Die **Füllzeit und Ballonbestätigung lassen sich auch während der Pause zwischen zwei Stufen ändern**. Das Dial speichert beide Werte sofort dauerhaft. Die bereits durchlaufene Stufe bleibt unverändert; die nächste und alle späteren Stufen verwenden die neuen Werte. Sie gelten ebenso für den nächsten Start und nach Trennen der USB-Stromversorgung. Außerhalb eines Workflows behalten einzelne Presets ihre eigene Füllzeit.

Im ausführlichen Menü stehen „Ruhezeit“ und „Ballon bestätigen“ ebenfalls bereit. Der lokale Browser erhält einen eigenen Abschnitt „Ballon & Workflows“, der in einer Zwischenpause gespeichert werden kann.

Ein längerer Kontakt mit zwei ausreichend voneinander entfernten Fingern öffnet als optionaler Zugang das ausführliche Menü. Der Nutzer hat bestätigt, dass diese Geste am physischen Dial funktioniert. Die Ein-Finger-Bedienung bleibt der Standardweg.

Die sechs Richtungen bleiben immer an derselben Position, und die Mitte schließt ohne Aktion. Das folgt der Untersuchung von [Kurtenbach und Buxton zu Pie Menus](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/08/marking-menus-93.pdf): gerade Sektoranzahlen und Positionen wie auf einem Zifferblatt waren leichter zu merken als fünf ungleich aufgeteilte Optionen. Die Sektoren nutzen die Fläche des 240-Pixel-Displays als große Touchziele; [Googles Touch-Guideline](https://support.google.com/accessibility/android/answer/7101858?hl=en-GB) empfiehlt ungefähr 9 mm physische Zielgröße und sichtbare Trennung. Diese Richtwerte sind eine Gestaltungshilfe, keine bestätigte Messung der Berührungsgenauigkeit am konkreten Dial.
