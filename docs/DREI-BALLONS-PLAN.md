# Drei Ballons aus einer Füllung – Forschungs- und Umsetzungsplan

Stand: 12. Oktober 2026. Dies ist ein Vorschlag für trockene Cannabisblüten im VOLCANO HYBRID, kein gemessenes Optimum für jede Sorte und Füllmenge. Der vorhandene Workflow **Daily** bleibt erhalten. Die neue Folge erhält einen eigenen Namen, z. B. **Drei Ballons**.

## Evidenz und Entscheidung

- An einem Volcano verdampften Monoterpene bei 180 °C überwiegend schon in den ersten 20–40 Sekunden. Cannabinoide wurden bei höherer Temperatur wesentlich schneller freigesetzt. Das spricht für eine milde erste und eine heiße letzte Stufe; es beweist keine perfekte Dreierfolge. [Eyal et al., 2023](https://journals.sagepub.com/doi/pdf/10.1089/can.2021.0173), insbesondere Abb. 3 und Tab. 6.
- Ein Volcano-Vergleich zeigte bei 230 °C mehr extrahierte Cannabinoide als bei 200 °C. Der Vergleich prüfte **keine** Folge 180 → 200 → 230 °C aus derselben Füllung. [Pomahacova et al., 2009](https://pubmed.ncbi.nlm.nih.gov/19852551/).
- In einem herstellerfinanzierten Versuch mit 100 mg zweier standardisierter Blütensorten waren wiederholte Ballons aus einer Füllung deutlich unterschiedlich. 210 °C war der dort gewählte Kompromiss aus Ertrag und Verträglichkeit; hohe Temperaturen schmeckten schärfer. Die Ergebnisse sind nicht auf jede Sorte oder Füllmenge übertragbar. [Hazekamp, 2010](https://www.vapormed.com/media/pdf/Optimal_temperature_for_single-dose_administration_of_100mg.pdf).
- Der HYBRID erlaubt 40–230 °C. Seine angezeigte Temperatur ist ein Referenzwert am Wärmetauscher, keine direkte Messung der Blüten. [S&B-Temperaturangaben](https://support.storz-bickel.com/hc/de/articles/36238897285393-Temperatureinstellungen).

Die Temperaturen unten sind daher **begründete Startwerte**, kein Versprechen für Geschmack, Dosis oder vollständige Extraktion. Die Zusammensetzung und Dichte der Ballons hängen von Sorte, Feuchte, Mahlgrad, Füllmenge, Ballongröße und Füllzeit ab.

## Vorgeschlagene Folge

| Ballon | Presetname | Solltemperatur | Zweck | Lüftung |
| --- | --- | ---: | --- | --- |
| 1 | Aroma | 180 °C | flüchtige Aromastoffe und milder Einstieg | gemeinsame Ballonfüllzeit |
| 2 | Balance | 200 °C | dichterer Dampf, mittlere Extraktion | gemeinsame Ballonfüllzeit |
| 3 | Extraktion | 230 °C | möglichst hohe Extraktion innerhalb des Gerätebereichs | gemeinsame Ballonfüllzeit |

**53 Sekunden** sind der aktuelle Dial-Startwert für die gemeinsame Ballonfüllzeit, nicht ein wissenschaftlich optimaler Wert. Die Zeit wird für alle drei Presets gemeinsam am Dial geändert (`fillTimeSource: "ui"`). Wird ein Ballon zu voll oder zu dicht, Zeit verkürzen; nie gegen den Widerstand eines vollen Ballons pumpen. Der Hersteller empfiehlt, nur so viel Dampf zu füllen, wie innerhalb von zehn Minuten verbraucht wird, und die Dichte zu beobachten. [S&B-Bedienungsanleitung, Kapitel 7.6](https://www.storz-bickel.com/en/amfile/file/download/file/40/product/574/).

230 °C erfüllt den Wunsch nach maximaler letzter Extraktion **innerhalb des einstellbaren Bereichs**, kann aber deutlich kratziger sein. Wenn der dritte Ballon zu unangenehm ist, eine alternative Variante mit **220 °C** anbieten; sie ist ein Komfortkompromiss, nicht die maximale Einstellung. Der Schritt 180 → 200 → 230 °C ist nicht in einer kontrollierten sensorischen Studie validiert.

## Sind feinere Hitzestufen sinnvoll?

**Zwischen den Ballons ja, innerhalb eines einzelnen Ballons zunächst nein.** Ein konstanter Sollwert je Ballon trennt Aroma, mittlere und hohe Extraktion verständlich und hält den Versuch wiederholbar. Mehr kleine Stufen in einem Ballon mischen die Temperaturbereiche im selben Ballon. Der Dial-Compiler unterteilt dann auch die gesamte Lüftungszeit: fünf Stufen bei 53 Sekunden ergeben fünf kurze Pumpenabschnitte von jeweils 10,6 Sekunden. Für das gewünschte Drei-Ballon-Erlebnis gibt es keinen Messbeleg, dass diese Zerlegung Geschmack oder Gesamtextraktion verbessert. Die Beobachtung, dass flüchtige Terpene früh freigesetzt werden und die Cannabinoid-Abgabe mit der Temperatur stark steigt, spricht eher für getrennte Ballons. [Eyal et al., 2023](https://journals.sagepub.com/doi/pdf/10.1089/can.2021.0173).

**Daily nicht stillschweigend umstellen.** Sein erstes Preset fährt derzeit 170 → 220 °C in fünf Stufen; Preset 2 und 3 liegen bei 221 beziehungsweise 222 °C. Damit erreicht schon der erste Ballon 220 °C, und die beiden letzten Ballons unterscheiden sich als Sollwerte kaum. Das ist ein anderes Profil als „Aroma → Balance → Extraktion“. Da der HYBRID nur einen Referenzwert am Wärmetauscher anzeigt und die Temperatur in der Füllkammer beim Verdampfen nicht direkt misst, ist eine Differenz von 1 °C zwischen zwei Ballons kaum als zuverlässig getrenntes Erlebnis zu erwarten. Diese Bewertung ist eine technische Schlussfolgerung, keine direkte Messung des konkreten Dial-Geräts. [S&B-Temperaturangaben](https://support.storz-bickel.com/hc/de/articles/36238897285393-Temperatureinstellungen).

Nach ersten Versuchen lassen sich die **drei Ballon-Sollwerte** gezielt in 5-°C-Schritten anpassen, z. B. Ballon 1 etwas höher, wenn er zu dünn ist, oder Ballon 3 niedriger, wenn er zu scharf wird. Die gemeinsame Füllzeit separat kalibrieren. Erst wenn wiederholbare Vergleichsversuche einen Vorteil zeigen, eine interne Temperaturrampe in einem Preset hinzufügen.

## Abbildung in VolcanoDial

1. Drei neue Presets mit festen Zieltemperaturen und jeweils **einer** Lüftungsaktion anlegen. Das vorhandene einfache Presetformat kann den ersten Softwareprototyp abbilden: `startTemp = endTemp = 180/200/230`, `steps = 1`, `fillTime = 53`. Der Plancompiler führt damit pro Preset `reachTemperature`, 2 Sekunden Pause und `air` aus. Die Pumpe würde also automatisch anlaufen; für die endgültige Bedienung ist Schritt 4 nötig.
2. Einen neuen linearen Workflow `Drei Ballons` mit den drei Presets anlegen; `fillTimeSource = "ui"`, `fillTime = 53`. Der Workflowwert überschreibt die Lüftungszeit aller drei Presets. Er soll Daily und alle vorhandenen Einstellungen ergänzen, nichts ersetzen.
3. Nach jedem Ballon den bestehenden Stopp zwischen Workflow-Stufen nutzen. Heizung und Lüftung sind dabei aus; der nächste Ballon startet erst nach einer weiteren Bestätigung. Der Zusatztaster und die Startfläche am Dial erfüllen dieselbe Funktion. Die Segmente des äußeren Rings wählen bei Bedarf einen späteren Startballon.
4. Für die endgültige Fassung eine optionale Aktion **„Ballon bereit“** für einfache Presets in Compiler und Ablaufsteuerung ergänzen. Die drei neuen Presets bekommen dann `preheatSeconds: 5` und `requireBalloonReady: true`; bestehende Presets behalten ihren Ablauf. Nach Erreichen der Solltemperatur fünf Sekunden Vorwärmzeit abwarten, dann am Display zum Aufsetzen des Ballons auffordern. Erst eine Bestätigung am Dial oder am angeschlossenen Zusatztaster startet die Pumpe. Nach 120 Sekunden ohne Bestätigung die Heizung abschalten und den Ablauf mit verständlichem Hinweis beenden. Während der Aufforderung darf der Bildschirm nicht einschlafen; die LED des angeschlossenen Tasters kann langsam pulsieren. Ohne Zusatztaster bleibt der gesamte Ablauf per Dial bedienbar. S&B empfiehlt das Vorheizen der Blüten für etwa fünf Sekunden und das Aufsetzen des Ballons bei erreichter Zieltemperatur. [S&B-Bedienungsanleitung, Kapitel 7.6](https://www.storz-bickel.com/en/amfile/file/download/file/40/product/574/).
5. Auf der Anzeige die Stufe verständlich benennen: `1/3 Aroma · 180 °C`, `2/3 Balance · 200 °C`, `3/3 Extraktion · 230 °C`; während der Lüftung Füllzeit und Stufenfortschritt anzeigen. Der über den Dial direkt verstellbare gemeinsame Zeitwert bleibt sichtbar.
6. Vor Freigabe im Simulator prüfen: genau drei Stufen, genau eine Lüftungsaktion je Stufe, 53 Sekunden Default pro Ballon, manuell auswählbare Startstufe 2/3, kein automatisches Weiterschalten, keine Lüftung vor der Ballon-Bestätigung, Timeout bei ausbleibender Bestätigung, Heizung/Lüftung aus beim Stufenwechsel und nach Abbruch. Bibliothek auf dem Dial zuerst sichern, anschließend nur die drei Presets und den Workflow ergänzen und nach Neustart erneut prüfen.

Die Bestätigung **„Ballon bereit“** ist eine eigenständige Änderung an der Ablaufsteuerung und braucht eigene Tests. Bis sie implementiert und geprüft ist, bleibt der neue Workflow ein Softwareprototyp und wird nicht als fertig konfigurierter Drei-Ballon-Ablauf auf das Gerät übertragen.

## Grenzen und Abnahme

Es gibt keine Messung, die genau diese drei Temperaturen am HYBRID mit der individuellen Füllung des Nutzers als „bestes“ Geschmackserlebnis oder als vollständige Extraktion bestätigt. Ein schwacher dritter Ballon kann nach geringer Füllmenge normal sein; aus Ballondichte oder Farbe lässt sich der verbleibende Wirkstoff nicht zuverlässig bestimmen. Die vorgeschlagenen Werte sollen zuerst mit identischer Füllmenge, gleichem Mahlgrad, gleicher Ballongröße und gleicher Füllzeit subjektiv verglichen werden. Erst danach Temperaturen in kleinen Schritten ändern. Keine automatische vierte Füllung oder Temperatursprünge über 230 °C vorsehen.
