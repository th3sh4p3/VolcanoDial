# Abgebrochenes Workflow-Preset erneut starten – 0.2.6

Nach einem manuellen Stop während eines Workflows startet die nächste bewusste Startbetätigung das abgebrochene Preset von dessen Anfang. Bereits abgeschlossene Presets werden übersprungen. Beispiel Daily: Stop während „02“ → erneut „02“ → Zwischenpause → anschließend „03“. Stop während „03“ wiederholt nur „03“ bei konstant 222 °C.

Am Dial steht **Preset erneut**; darüber wird das betreffende Preset genannt. Drehknopf-Klick, Touch, optionaler Zusatztaster und Browser-Start verwenden denselben Ablauf. Ist der Dial inzwischen im Ruhemodus, weckt die erste lokale Geste weiterhin ausschließlich; erst die nächste startet.

Das Preset bekommt beim Wiederholen seine vollständige Heizfolge, Wartezeit und Luftmenge. Es setzt nicht mitten in einer früheren Aktion fort. Ein Stop in der Zwischenpause merkt die nächste noch nicht gestartete Stufe. Erneutes Stoppen im bereits gestoppten Zustand erhält den gemerkten Punkt.

Eine neue Auswahl oder Änderung der Bibliothek setzt diese Möglichkeit zurück; um bewusst wieder von vorn zu beginnen, den Workflow neu auswählen. Nach vollständigem Abschluss beginnt ein neuer Start ebenfalls bei Stufe 1. Schlauchbetrieb und Timer übernehmen keinen früheren Workflow-Fortschritt. Der gemerkte Punkt bleibt nur bis zum Neustart des Dial erhalten und startet niemals automatisch. Fehler oder fehlgeschlagene AUS-Bestätigung bieten keine Stufenwiederholung an.

Vor einem Wiederholungsstart prüft die bestehende Vorbereitung Hue EIN, WLAN/Uhrzeit und Bluetooth. Eine inzwischen ausgeschaltete Steckdose wird bei Bedarf wieder eingeschaltet. Neue Verbindungen und der Ablaufkern bestätigen HEAT/AIR AUS, bevor eine Stufe startet. Ein Abbruch während dieser Vorbereitung startet kein Preset.

Prüfung: 94/94 automatisierte Testfälle und native Speicher-/UI-Prüfungen bestanden. Der tatsächliche Produktions-Startpfad wird mit echtem Daily-Compiler und Ablaufkern sowie simuliertem Hue/BLE ausgeführt. Vier neue Wiederholungsfälle scheiterten vor der Änderung erwartungsgemäß; alle 13 ergänzten Fälle bestehen danach. Stufe 2/3, bereits verbrauchte Luft vor dem Stop, Zwischenpause, zweiter Stop, anderer Workflow/Bibliotheksstand, vollständiges Ende, AUS-Fehler und erneuter Verbindungsaufbau sind abgedeckt. Die Gegenprüfung ergänzte drei zunächst scheiternde Fälle: fehlgeschlagene AUS-Bestätigung bei Wiederverbindung sowie Auswahlwechsel über Browser oder Drehknopf mit späterem RFID-Ereignis. Sie bestehen nach der Korrektur. Ein gewöhnlicher Hue-Verbindungsfehler erhält dagegen den zuvor sicher gestoppten Wiederholungspunkt. Der UI-Test prüft Anzeigeänderung, Touch-Ziel und Textbreite der neuen Beschriftung.

Build-/Installationsstatus und Hash stehen in `verification.json`. Die Bedienungs-PDF bleibt auf Dokumentstand 0.2.4; dieses Dokument ergänzt sie. Ein neuer realer Heizlauf zur Stufenwiederholung ist durch die lokalen Prüfungen nicht ersetzt.
