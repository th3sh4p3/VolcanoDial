# Kurzer Funktionstest

Die Datei `examples/Funktionstest-40C.json` ergänzt zwei kleine Presets und einen Workflow. Stufe 1 heizt auf 40 °C, wartet eine Sekunde, lüftet zwei Sekunden und schaltet die Heizung aus. Stufe 2 wartet eine Sekunde und lüftet zwei Sekunden. Zwischen den Stufen wartet der Dial auf eine bewusste Bestätigung.

1. Den leeren Volcano frei aufstellen und in Sichtweite behalten. PC-App und S&B-App trennen.
2. Im grafischen Editor über „More → Export library…“ die vorhandene Bibliothek sichern.
3. „More → Import library…“ wählen und die Beispieldatei auswählen. Die erste Rückfrage mit „OK“ bestätigen. Bei der zweiten Rückfrage „Replace the complete current library?“ **Cancel/Abbrechen** wählen: Dadurch werden die Testeinträge ergänzt; vorhandene Einträge bleiben erhalten.
4. Auf der Hauptseite „Funktionstest 40 C - 2 Stufen“ auswählen und starten. Die Anzeige muss Stufe 1 und ihre aktuelle Aktion zeigen.
5. In der Zwischenpause müssen Heizung und Lüftung aus sein. Im Browser „Nächstes Preset“ beziehungsweise den Dial-Knopf drücken; Stufe 2 läuft.
6. Nach dem erfolgreichen Ende müssen Heizung und Lüftung aus sein. Bei aktivierter Hue-Abschaltung wartet der Dial auf frische Temperatur-/Statuswerte unter der gespeicherten Schwelle und schaltet anschließend die Steckdose aus.

Seit 0.2.4 zusätzlich während der Abkühlung Stop, Geräteinfo und eine andere Auswahl prüfen: Der Abschaltauftrag muss erhalten bleiben. Dial neu starten, solange der Volcano oberhalb der Schwelle liegt: kein automatischer Programm-/Heizungsstart, aber Wiederaufnahme der Abkühlüberwachung. Unterhalb der Schwelle muss Hue AUS bestätigt werden. Eine vorübergehend unerreichbare Bridge darf den Auftrag nicht löschen; nach Wiederherstellung der Verbindung folgt ein neuer AUS-Versuch. Zum Test geänderte Temperaturen und Einstellungen anschließend zurücksetzen.

Ein weiterer Durchlauf kann für einen Stop-Test verwendet werden: während des Laufs „Stop“ oder den Dial-Knopf drücken. Der Ablauf muss gestoppt bleiben; er wird nach einer Wiederverbindung nicht automatisch fortgesetzt. Ein angeschlossener Chain-Key startet die Auswahl und setzt in der Zwischenpause fort. Während des Laufs kann ein neuer Druck von etwa 0,8 Sekunden Stop anfordern.

Der konkrete Stand der tatsächlich durchgeführten Tests steht in `PRUEFBERICHT.md` und `verification.json`.

## Schlauch und Ruhemodus

„Schlauch“ auswählen, für den ersten Test am Dial 40 °C einstellen und Heizen starten. Nach „Bereit“ Drehknopf oder Bildschirmtaste halten und wieder loslassen: Luft EIN/AUS, Heizung bleibt an. Dasselbe am optionalen Taster prüfen. Ein bereits beim Aufheizen gehaltener Eingang darf beim Erreichen der Temperatur keine Luft starten. Mit „Ende“ abschließen und die Hue-Abschaltung beobachten; anschließend die Schlauchtemperatur wieder auf den gewünschten Wert (Ausgangswert 210 °C) stellen.

Im Menü „Display aus“ wählen, während kein Preset/Workflow läuft: Bildschirm dunkel. Während eines Workflows einschließlich seiner Zwischenpausen muss das Display anbleiben; manuelles Ausschalten muss abgewiesen werden. Ein erster Touch bzw. Drehknopfdruck muss nur aufwecken. Die nächste Bedienung funktioniert wie üblich. Automatisches Dimmen/AUS mit den im Browser eingestellten Zeiten beobachten; Statusabfragen allein sollen die Anzeige nicht wachhalten. Zwischenpause, Fehler, Fertig und Schlauch bereit wecken. Tests mit fehlendem und angeschlossenem Zubehör durchführen.
