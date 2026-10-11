# Daily – Korrektur 0.2.1

Der Dial startet und erweitert Workflows ausschließlich durch eine bewusste Bedienung am Dial, optionalen Taster oder Browser/USB. Eine zugeordnete RFID-Karte wählt einen Ablauf aus. Heizungs-Rückmeldungen vom Volcano gelten nicht als Tastendruck. So kann ein verzögertes Heizsignal den Ablauf nach einem Fehler nicht erneut starten.

Daily wurde zweimal vollständig mit Originaltemperaturen getestet, davon einmal auf der endgültigen Firmware. Heizung und Lüftung waren am Ende aus. Die Bibliothek bleibt unverändert. Die Hue-Steckdose bleibt bei heißem Volcano zunächst eingeschaltet und wird gemäß gespeicherter Abschaltschwelle ausgeschaltet.

Der ursprüngliche einzelne Abbruch trat in den beiden Prüfungen nicht erneut auf. Die alte Meldung hatte seine Ursache überschrieben. Jetzt bleibt die ursprüngliche Ursache einschließlich konkreter Bluetooth-Details erhalten, auch wenn das anschließende Wiederherstellen eines Werts ebenfalls scheitert.

Bei einem erneuten Fehler bitte die Geräteinfo/Browsermeldung stehen lassen und den Fehlerstatus auslesen lassen; keinen Neustart durchführen, bevor die Diagnose gesichert wurde.
