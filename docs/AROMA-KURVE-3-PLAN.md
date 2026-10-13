# Aroma-Kurve 3 – Design für einen neuen Drei-Ballon-Workflow

Stand: 13. Oktober 2026. Dieses Dokument plant einen **neuen** Workflow und drei **neue** Presets für trockene Blüten im VOLCANO HYBRID. Es ändert oder ersetzt weder Daily noch andere gespeicherte Programme. Es ist ein forschungsgeleiteter Versuchsplan, keine nachgewiesene individuelle Optimaltemperatur und keine Dosierungsempfehlung.

## Ziel und Grenzen

Aus einer Füllung sollen genau drei Ballons entstehen: der erste legt den Schwerpunkt auf Geschmack, der zweite auf das Gleichgewicht zwischen Geschmack und Dichte, der dritte auf möglichst viel verbleibende Extraktion. Innerhalb jedes Ballons soll eine kleine, steigende Temperaturkurve erprobt werden. Die gemeinsame Ballonfüllzeit bleibt am Dial direkt einstellbar. Nach jedem Ballon wartet der Workflow auf den Nutzer. Ringsegment 2 oder 3 soll weiterhin einen Start bei einem späteren Ballon erlauben.

Die konkreten Kurven sind **Hypothesen**: Es gibt keine kontrollierte Studie, die genau diese neun Sollwerte und ihre Aufteilung an einem HYBRID als bestes Drei-Ballon-Erlebnis belegt. Die verwendeten Studien untersuchten teils einen VOLCANO MEDIC oder ältere VOLCANO-Modelle. Die Anzeige des HYBRID misst während des Verdampfens nicht direkt die Temperatur in der Füllkammer. Deshalb sind 5-°C-Stufen praktische Stellschritte für Versuche, keine scharfen chemischen Grenzwerte. [S&B-Temperaturangaben](https://support.storz-bickel.com/hc/de/articles/36238897285393-Temperatureinstellungen).

## Quellenbasis

1. In einem Volcano-Versuch gingen bei 180 °C viele Monoterpene bereits innerhalb der ersten 20–40 Sekunden aus dem Pflanzenmaterial verloren, während THC bei höheren Temperaturen deutlich schneller freigesetzt wurde. Gemessen wurde Pflanzenmaterial vor und nach dem Verdampfen, **nicht** die sensorische Qualität dieser konkreten Ballonfolge. [Eyal et al., 2023, Abb. 3 und Tab. 6](https://journals.sagepub.com/doi/pdf/10.1089/can.2021.0173).
2. Ein Volcano-Vergleich fand bei 230 °C eine höhere Cannabinoidabgabe als bei 200 °C. Er verglich Einzelbedingungen und testete keine aufeinanderfolgenden Temperaturkurven aus derselben Füllung. [Pomahacova et al., 2009](https://pubmed.ncbi.nlm.nih.gov/19852551/).
3. In einem herstellerfinanzierten Versuch mit 100 mg standardisierter Blüten war 210 °C ein Kompromiss aus Abgabe und Verträglichkeit. Wiederholte Ballons aus derselben Füllung hatten unterschiedliche Zusammensetzungen; höhere Temperaturen wurden als schärfer beschrieben. Das lässt sich nicht direkt auf andere Sorten und Füllmengen übertragen. [Hazekamp, 2010](https://www.vapormed.com/media/pdf/Optimal_temperature_for_single-dose_administration_of_100mg.pdf).
4. S&B empfiehlt, die Solltemperatur abzuwarten, das Pflanzenmaterial einige Sekunden vorzuwärmen, erst dann den Ballon aufzusetzen und seine Dichte zu beobachten. Der Ballon soll nicht überfüllt werden. [S&B-Bedienungsanleitung, Kapitel 7.6](https://www.storz-bickel.com/en/amfile/file/download/file/40/product/574/).

## Neue Programme

**Workflowname auf dem Dial: `Aroma-Kurve 3`**. Die drei neuen, voneinander unterscheidbaren Presetnamen sind `AK3 Aroma`, `AK3 Balance` und `AK3 Finish`. Beim Anlegen erhalten alle vier Objekte neue, eindeutige IDs. Daily, Schlauch, Funktionstest und ihre IDs bleiben bestehen. Das neue Programm wird nicht automatisch als aktive Auswahl gesetzt.

| Ballon / Preset | Teilkurve bei einer Füllzeit von 53 s | Relative Lüftungszeit | Beabsichtigte Wirkung |
| --- | --- | --- | --- |
| 1 / AK3 Aroma | 175 → 180 → 185 °C | 25 % / 50 % / 25 % (ca. 13 / 27 / 13 s) | Frühe flüchtige Aromen betonen; zum Ende etwas mehr Dichte. |
| 2 / AK3 Balance | 195 → 200 → 205 °C | 25 % / 50 % / 25 % (ca. 13 / 27 / 13 s) | Mittlere Extraktion über einen engen Temperaturbereich. |
| 3 / AK3 Finish | 220 → 225 → 230 °C | 20 % / 30 % / 50 % (ca. 11 / 16 / 26 s) | Den Rest stufenweise bis zur höchsten Geräteeinstellung extrahieren. |

Die Prozentwerte sind **technische Startannahmen**, nicht aus den Quellen abgelesene Idealanteile. 53 Sekunden entsprechen der bisherigen gemeinsamen Dial-Füllzeit und müssen zur verwendeten Ballongröße passen. Alle Teilzeiten skalieren proportional, wenn die gemeinsame Füllzeit am Dial geändert wird; die Summe bleibt genau eine Ballonfüllzeit pro Preset. Die Grenze 230 °C darf nicht überschritten werden. Wenn der letzte Ballon zu scharf ist, ist 220–225 °C ein möglicher Komfortbereich; das reduziert den Anspruch auf maximale Restextraktion.

## Bedienfolge

1. Workflow wählen. Der Dial zeigt `1/3 Aroma` und die geplante Kurve, die gemeinsame Füllzeit sowie WLAN-, Bluetooth- und Hue-Status. Start per Dial oder optionalem Zusatztaster. Bei ausgeschalteter Hue-Steckdose zuerst deren Einschalten und die Bluetooth-Verbindung bestätigen, bevor Heizbefehle erfolgen.
2. Zu Beginn jedes Ballons auf den ersten Sollwert heizen. Nach ungefähr fünf Sekunden Vorwärmung `Ballon aufsetzen` anzeigen und auf eine Bestätigung am Dial oder am Zusatztaster warten. Erst danach darf die Pumpe starten. Nach 120 Sekunden ohne Bestätigung Heizung und Lüftung ausschalten und verständlich abbrechen. Während des Wartens bleibt der Bildschirm wach; die optionale Taster-LED zeigt den Wartezustand.
3. Danach die Teilkurve automatisch ausführen: vor jedem Luftabschnitt den neuen Sollwert erreichen und bestätigen, dann die zugehörige Teilzeit pumpen. Mit der heutigen Ablaufsteuerung stoppt die Pumpe zwischen den Teilabschnitten; das ist bei der Erprobung ausdrücklich zu beobachten. Keine unbeaufsichtigte oder zeitbasierte automatische Weiterschaltung zum nächsten Ballon.
4. Nach einem Ballon Heizung und Lüftung ausschalten. Die Anzeige fordert zum Wechseln des Ballons und zum Start des nächsten Presets auf. Ein Tastendruck startet dann den nächsten Ballon. Bei Abbruch wird derselbe Ballon erneut angeboten, nicht automatisch Ballon 1. Bedienung ohne Zusatztaster muss vollständig möglich bleiben.
5. Der äußere Ring zeigt **drei Ballons**, nicht neun kleine Temperaturteile. Die aktive Teiltemperatur steht im Zentrum. Bei einem Touch auf Ringsegment 2 oder 3 vor dem Start wird beim entsprechenden Ballon begonnen.

## Umsetzung in der bestehenden Software

- Die Presets als neue **Advanced-Presets** anlegen: je drei `reachTemperature`- und drei `air`-Aktionen. Die Dauer der Luftaktionen entspricht zunächst den oben genannten Prozenten. Der lineare Workflow referenziert ausschließlich diese drei neuen Preset-IDs, `fillTimeSource: "ui"`, `fillTime: 53`. Der vorhandene Compiler skaliert die Luftaktionen jedes Presets auf die gemeinsame Workflow-Füllzeit und bewahrt ihre relativen Anteile.
- Für `Ballon aufsetzen` einen bestätigungspflichtigen Zustand der Ablaufsteuerung planen, der bei allen drei neuen Presets **nur vor dem ersten Luftabschnitt** auftritt. Beim Warten darf kein automatischer Lüfterstart erfolgen. Timer, Abbruch, Bluetooth-Verbindungsverlust, Abschaltlogik und Taster-LED brauchen eigene Tests. Die neuen Presets dürfen nicht versehentlich die bestehenden Advanced-Presets verändern.
- Vor einer Installation die aktuelle Dial-Bibliothek erneut sichern und prüfen. Die Sicherung vom 12. Oktober enthielt 15 Presets und 2 Workflows; mit drei neuen Presets und einem Workflow läge sie unter den derzeitigen Grenzen von 32 Presets und 16 Workflows. Diese Zählung ist ein früherer Stand, keine Zusicherung für den späteren Installationszeitpunkt.
- Die Bibliothek nur **ergänzen**: eindeutige IDs vergeben, alle bestehenden Objekte und Reihenfolgen erhalten, aktive Auswahl unverändert lassen, Gesamtbibliothek validieren. Danach Compiler- und Ablauf-Tests, Neustarttest sowie einen Test ohne Blüten durchführen. Aufspielen und realer Funktionstest erfolgen erst nach fertiggestellter Software und erneuter Prüfung des Gerätezustands.

## Vergleich und Nachjustierung

Eine zusätzliche Temperaturrampe ist nur dann eine Verbesserung, wenn sie im Gebrauch gegenüber drei konstanten Ballon-Sollwerten tatsächlich gewinnt. Als Vergleich dienen 180 / 200 / 230 °C mit je einer durchgehenden Füllung. Für einen fairen Vergleich dieselbe Blütensorte und Charge, Füllmenge, Zerkleinerung, Ballongröße und Füllzeit verwenden und mehrere passende Durchläufe vergleichen. Je Anpassung nur **eine** Temperaturkurve ändern. Geschmack und Reizung pro Ballon getrennt protokollieren; auch die zusätzlichen Wartezeiten beim Aufheizen zwischen Teilkurven bewerten. Sichtbare Dampfdichte allein beweist keine vollständige Extraktion. Ohne Laboranalyse bleibt das Urteil über „maximale Extraktion“ eingeschränkt. Falls die drei Teilkurven keinen klaren Nutzen bringen oder die neun Pumpenabschnitte stören, drei konstante Sollwerte je Ballon als einfacheren Modus vorziehen.

## Abnahmebedingungen

- Daily und sämtliche vorhandenen Presets/Workflows behalten ihre IDs, Parameter und Reihenfolge und bleiben weiterhin startbar; die neue Folge hat einen eigenen Namen und eigene IDs.
- Pro vollständigem Durchlauf entstehen genau drei Ballons mit zusammen je einer eingestellten Füllzeit, mit explizitem Halt zwischen den Ballons.
- Kein Lüfterstart vor bestätigtem Ballon; jede Fehlersituation beendet die Ausgänge sicher. Der Schlafmodus bleibt während des Ablaufs aus.
- Nach Stromtrennung starten keine Heizung und keine Lüftung von selbst; Bibliothek und Auswahl bleiben erhalten.
- Die Nutzeroberfläche zeigt Ballonnummer, Teiltemperatur, Restfüllzeit und nächsten Handlungsschritt auch auf dem runden Display eindeutig an.
