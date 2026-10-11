# Solltemperatur-Bestätigung – Update 0.2.2

Stand 09.10.2026. Anlass: Daily brach beim Start der zweiten Stufe mit „Heizen nicht bestaetigt: Solltemperatur nicht bestaetigt: 221.0 / 220.0 C“ ab. Der ausgelesene Zustand zeigte eine bestehende Bluetooth-Verbindung, keinen GATT-Fehler und ausgeschaltete Heizung/Lüftung. Die Solltemperatur war nicht bestätigt; das Einschalten der Heizung wurde deshalb gar nicht ausgeführt.

## Korrektur

Die Solltemperatur wird jetzt wie in der Desktop-App als vier Byte Little Endian in Zehntelgrad geschrieben. Eine erfolgreiche Bluetooth-Schreibantwort allein bestätigt noch nicht, dass der Volcano den Wert übernommen hat. Der Dial liest deshalb den exakten Sollwert über ein Zwei-Sekunden-Zeitfenster zurück. Bleibt die Rückmeldung aus oder falsch, wiederholt er denselben absoluten Temperaturbefehl höchstens zweimal, insgesamt also drei Schreibversuche. Einzelne laufende GATT-Vorgänge können das Zeitfenster geringfügig verlängern. Es gibt keine automatische Wiederholung eines Heizungs- oder Lüftungs-EIN-Befehls und keinen automatischen Ablaufstart.

Stop und Schlauch-Ende brechen eine laufende Temperaturbestätigung ab. Eine getrennte Bereinigungsfunktion stellt nach bestätigtem Ausschalten beider Ausgänge den früheren Sollwert wieder her, auch während die Stop-Anforderung noch gesetzt ist. Ohne ausgeschaltete Ausgänge wird diese Wiederherstellung abgewiesen. Funkverlust beendet die Bestätigung.

Eine weiterhin falsche Rückmeldung führt unverändert zu einem sicheren Abbruch mit genauer Fehlermeldung. Ein Fehler bei der Solltemperatur wird nun als solcher gemeldet; „Heizen nicht bestaetigt“ wird für das tatsächliche Einschalten der Heizung verwendet. Bibliothek, Daily-Temperaturen, Luftzeiten, Bedienregeln und Einstellungen bleiben erhalten.

## Prüfung

37 automatisierte Tests bestanden. Neun neue Fälle führen den tatsächlichen Temperaturcode mit kontrolliertem Bluetooth-Transport und Uhrlauf aus: korrektes Vier-Byte-Format, bestätigte aber nicht übernommene erste Schreibanforderung, dauerhaft falsche Rückmeldung, Funkverlust, Stop während des Lesens, echte verzögerte Rückmeldung nach mindestens 1800 ms, Wiederherstellung bei gesetztem Stop, Sperre bei aktiven Ausgängen und Schlauch-Ende. Zusätzliche Ablaufkern-/Schlauchprüfungen sichern die Wiederherstellung bei Stop ab. Die Gegenprüfung fand zwei Probleme in einem Zwischenstand; beide sind vor Installation korrigiert und geprüft.

Firmware: 1817115 Byte Programm, 1817264 Byte App-Datei, 69664 Byte statisches RAM; kein PSRAM. USB-Schreibhash bestätigt. Sieben echte Sollwertanforderungen und Stop in Daily/Schlauch bestanden. Daily lief vollständig bei Originaltemperaturen einschließlich Stufe 2 mit 221 °C und Stufe 3 mit konstanten 222 °C durch. Übergänge wurden über die lokale Browser-API ausgelöst. Heizung/Lüftung waren bei Abschluss AUS, vorheriger Sollwert und Bibliothek/Einstellungen erhalten, kein selbstständiger Wiederanlauf. Einzelwerte stehen im [Prüfbericht](PRUEFBERICHT.md) und in `verification.json`.

Die konkrete interne Ursache des einmalig nicht übernommenen Sollwerts ist nicht reproduziert. Der ausgelesene Sollwertkonflikt ist belegt; das bisherige Zwei-Byte-Format und das kurze Bestätigungsfenster waren zusätzliche Schwachstellen. Diese Korrektur behandelt nicht übernommene bzw. verzögerte Sollwerte, ohne eine dauerhafte Garantie gegen physische Geräte- oder Funkfehler zu behaupten.
