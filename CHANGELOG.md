# Versionsstand

## 0.2.8 - vorbereitet, noch nicht am Dial installiert

- Workflow-Stufe im Leerlauf direkt über den äußeren Touch-Ring auswählen. Der Ring markiert die Auswahl; erst ein weiterer bewusster Start beginnt dort und führt alle folgenden Stufen aus. Bei Daily beginnt Stufe 3 direkt mit „03“ bei konstant 222 °C.
- Gemeinsame Ballonfüllzeit von Daily und anderen dafür konfigurierten Workflows sowie Füllzeit einfacher Presets direkt auf der Startansicht antippbar. Daily verwendet den Wert in allen drei Presets; feste Presetzeiten anderer Workflows bleiben getrennt.
- Touch-Ziele und Menüknopf so angeordnet, dass auch bei bis zu 32 Workflow-Stufen die ersten Ringabschnitte erreichbar bleiben. Auswahl wird nach erfolgreichem Start oder Programmwechsel verworfen; Aufwecken bleibt eine reine Aufweckaktion.
- 98/98 automatisierte Fälle und native UI-Prüfungen bestanden. Der Build liegt vor; Installation und Geräteprüfung stehen aus.

## 0.2.7 - 12.10.2026

- Ein einzelner fehlgeschlagener Bluetooth-Statusabruf während der bestätigten AUS-Zwischenpause beendet Daily nicht mehr mit „Volcano-Status ungültig oder Gerätefehler“.
- Die nächste Stufe beginnt nur nach einer frischen Bestätigung, dass Heizung und Lüftung aus sind. Bei fehlender Bestätigung bleibt die Zwischenpause erhalten; ein echter Gerätefehler oder ein Fehler während aktiver Ausgänge stoppt weiterhin sicher.
- Ein fehlender zweiter Statuswert wird als ungültige Messung behandelt und nicht mehr selbst als Gerätefehler markiert. 95/95 automatisierte Fälle inklusive Regressionen für Zwischenpause, Wiederherstellung und echte Fehler bestanden.

## 0.2.6 - 11.10.2026

- Bewusster Start nach manuellem Workflow-Stop wiederholt nur die unterbrochene Stufe, mit voller Laufzeit und Luftmenge.
- „Preset erneut“ samt Stufenname am Dial und im Browser. Zwischenpause merkt die nächste noch offene Stufe.
- Auswahlwechsel, Bibliotheksänderung und fehlgeschlagene AUS-Bestätigung verhindern Wiederverwendung eines alten Wiederholungspunkts.
- 94/94 automatisierte Fälle bestanden; USB-Installation auf Dial v1.1 mit bestätigtem Schreibhash, unveränderten Einstellungen/Bibliothek und ohne automatischen Neustart eines Programms.
- Öffentliches Repository mit Einkaufsliste, lötfreiem Hardware-Aufbau und aktualisierter Bedienungsanleitung/PDF. Produktionsquellen entsprechen der installierten Version. Der öffentliche Binärbuild wurde mit anonymisierten Build-Pfaden neu kompiliert und nicht erneut geflasht; Dokumentation und ein synthetischer Vorschau-IP-Wert wurden für die Veröffentlichung angepasst.

## Frühere Korrekturen

- **0.2.5:** Expliziter Start prüft Hue EIN auch bei zwischengespeichertem BLE-Zustand; begrenzte Verbindungsvorbereitung; manuelle AUS-Befehle bleiben unabhängig von Hue.
- **0.2.4:** Hue-Abschaltauftrag bleibt nach Stop, Fehler und Neustart erhalten und wird erst nach bestätigtem AUS gelöscht.
- **0.2.3:** Zubehör-LED dimmt mit dem Display; erste Aufweckgeste startet nichts.
- **0.2.2:** Solltemperatur exakt bestätigen; begrenzte Wiederholung ausschließlich des Sollwertbefehls.

Einzelheiten und tatsächliche Geräteprüfungen: [Prüfbericht](docs/PRUEFBERICHT.md). Akku/INCLINE sind eine noch ungeprüfte Erweiterung.
