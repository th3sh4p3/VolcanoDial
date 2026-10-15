# Build und Architektur



## Firmware bauen



Unter Windows PowerShell: `powershell -ExecutionPolicy Bypass -File tools/Build.ps1`. Das Skript installiert Arduino CLI 1.5.1, ESP32-Core 3.3.12 und die im Skript gepinnten Bibliotheken in einen eigenen lokalen Tool-Ordner. Internet wird nur für die Installation der Entwicklungswerkzeuge benötigt. Die erzeugte Firmware benötigt keine Internetverbindung für BLE/Hue; Uhrzeit kann über den Browser gesetzt werden.



Board: `esp32:esp32:m5stack_stamp_s3:PartitionScheme=custom,PSRAM=disabled`. 8 MB Flash; jeweils 3 MB App-Slots, NVS 20 KiB und LittleFS 1984 KiB. Es gibt keinen implementierten OTA-Updater. USB-Updates schreiben app0 an 0x10000. `partitions.csv` ist die maßgebliche Aufteilung. Die automatisch erzeugte merged.bin ist für Updates mit Datenerhalt nicht vorgesehen.



`web_assets.hpp` wird mit Python 3 aus `web/` erzeugt (`python tools/embed_web.py`); alle Assets sind lokal und gzip-komprimiert im Programmflash. Nach Browseränderungen immer neu erzeugen und kompilieren. Binaries müssen nach jedem Neubuild neue SHA256-Prüfsummen erhalten; Build.ps1 erledigt das.



## Tests



`tools/Test.ps1 -ZigPath <zig.exe> -ArduinoJsonPath <ArduinoJson-Ordner> -Node <node.exe>` baut den plattformneutralen C++-Kern und startet die Node-Tests. Verwendete Host-Versionen: Zig 0.15.2, Node 24.19.0. Die Fixtures dokumentieren Pläne des tatsächlichen PC-Compilers. Sie prüfen einfache/erweiterte Presets, Workflow-Füllzeiten, Variablen und ungültige Graphen/Formeln. Hosttests decken außerdem Stop, Heiztimeout, Funkverlust, Luftbudget, veralteten Status, Cooldown und Taster-Sperre ab.



## Aufteilung

Ab 0.2.2 prüft `target-confirmation.test.mjs` den tatsächlichen Adaptercode mit kontrolliertem GATT-Transport und Uhrlauf. Es benötigt `VD_ZIG`; `Test.ps1` setzt diese Variable. Der Adapter schreibt vier Byte Little Endian, verlangt exakte Sollwert-Rückmeldung und wiederholt ausschließlich absolute Sollwerte begrenzt. `restoreTarget` ist der separate Bereinigungspfad nach bestätigtem AUS; normale `target`-Befehle bleiben durch Stop abbrechbar. Status enthält `targetWrites`, `targetRetries`, `lastTargetMs`, `maxTargetMs` neben bisherigen Sollwert-/GATT-Diagnosen.



- `core.hpp`: Bibliothekscompiler, Formelsprache, Ablauf-Engine, Cooldown und HoldGate; unabhängig von Arduino-Hardware.

- `adapters.hpp`: Volcano-NimBLE und Hue-HTTPS. GATT-Lese-/Schreibvorgänge besitzen begrenzte Wartezeiten. Fehlende Bestätigung gilt als unbekannter Ausgangszustand.
- `http_body.hpp`: begrenztes Streaming mit Chunked-/Content-Length-Prüfung, Endmarkierung, Trailern und Zeitlimit. Hue-JSON wird direkt gefiltert eingelesen.
- `document_update.hpp`: atomarer Dokumenttausch und auf Vollständigkeit geprüfte Serialisierung. Fehlgeschlagene Imports erhalten die vorherige Bibliothek.
- `VolcanoDial.ino`: Worker für seriell ausgeführte Gerätebefehle, UI/Webserver auf dem Hauptthread und eigener UART-Tastertask. JSON-Bibliothek und Einstellungen liegen lokal auf LittleFS mit temporärer Datei/Backup.

- `web/`: grafischer PC-Editor, Browser-Bibliotheksmodell und lokale Geräteeinrichtung. Die Workflow-Engine läuft auf dem Dial.



## Lokale HTTP-Schnittstelle v1



Alle Antworten sind JSON. Außer Login brauchen die API-Endpunkte `Authorization: Bearer <token>`. Keine CORS-Freigabe; derselbe Ursprung wird verwendet. Sessiontoken wird pro Neustart erneuert, PIN bleibt lokal gespeichert.



| Endpunkt | Inhalt |

|---|---|

| POST /api/v1/login | `{ "pin": "123456" }` liefert Sessiontoken |

| GET /api/v1/status | Geräte-/Ablaufzustand und Ergebnisse der letzten Befehle |

| GET /api/v1/library | `{revision, library}` |

| POST /api/v1/command | Befehl; HTTP 202 liefert `{id}`; Ergebnis anschließend in `status.results` |



Befehle: select/ref oder delta, run, next, stop, connect/bypassHue, disconnect, target/value, heat/on, fan/on, timer, adjust/param/delta, configure/settings, clock/epoch, bleScan, hueDiscover, huePair/address, hueDevices, library/revision/library, rfidLearn, setupAP, info. Library-Updates benötigen die aktuelle Revision. Fehler stehen in results.message. EIN-Befehle nach einem Timeout nicht automatisch wiederholen.



## USB-Konsole



115200, 8N1, eine JSON-Zeile pro Befehl, maximal 512 Bytes. `{"command":"info"}` liefert Identität, Version, Geräte-PIN, AP-Zugang, IP und freien Heap. `{"command":"status"}` liefert denselben Status wie die HTTP-API. Andere Befehle werden in dieselbe Worker-Queue eingestellt; `accepted:true` bedeutet nur angenommen, nicht erfolgreich ausgeführt. Anschließend status/notice prüfen. USB gilt als physischer Einrichtungszugang und benötigt kein HTTP-Token. Keine Bibliotheksimporte über die kleine USB-Zeilenkonsole.



## Grenzen und offene Optimierungen



Das Gerät besitzt kein PSRAM. Hue-Antworten werden bis 1 MiB direkt und gefiltert eingelesen; das ist eine Obergrenze für die übertragenen Bytes, keine Speicherreservierung. Bibliotheken sind auf 32 KiB begrenzt; die praktisch nutzbare Größe hängt von Graphen, Variablen und freiem RAM ab und muss am echten Gerät geprüft werden. Häufige Dial-Änderungen schreiben die Bibliothek derzeit unmittelbar; eine spätere Version kann Schreibvorgänge zusammenfassen. Keine automatische Softwareaktualisierung, kein Cloudzugriff, keine 1:1-Desktop-Fenster-/Themeverwaltung. Das HTTP-Frontend ist lokal unverschlüsselt. Hue prüft dagegen Zertifikatskette und Bridge-Identität.


Hue-Erstkopplung liest ausschließlich die öffentliche Bridge-ID über lokales HTTP (`/api/config`). Anschließend werden dieselbe ID, Zertifikatskette und TLS-Hostname über HTTPS geprüft. Registrierung des Zugangsschlüssels und alle Schaltbefehle erfolgen ausschließlich über geprüftes HTTPS.

Die Diagnose enthält freien und minimalen Heap, größten freien Speicherblock, freie Worker-Stackreserve, BLE-Lesezeiten und Abbruchgrund. Diese Werte helfen, Speicherengpässe und Funkprobleme getrennt zu untersuchen.

Der optionale Chain-Key verwendet einen eigenen UART-Worker mit 115200 Baud, 8N1, RX GPIO1 (weiß) und TX GPIO2 (gelb) am schwarzen PORT.B; IN/J1 liegt am Taster. `KeyLink` initialisiert einen einzelnen Key automatisch durch ENUM, Typprüfung und bestätigten Pollmodus; fehlende Geräte werden alle 500 ms erneut gesucht. Jeder Lesefehler nimmt den Haltezustand sofort zurück. Erneute Erkennung setzt Farbe und Pollmodus neu und verlangt eine bestätigte Loslassprobe vor dem ersten Halten. Die Lebenszeichen-Frist von 150 ms und die Ablauf-Sperre gelten zusätzlich. Die Logik ist ohne Arduino mit simuliertem Anstecken, Abziehen, Wiederanschluss und LED-Schreibfehlern geprüft.

Tasterdiagnose im Status: `keyProbeStage` 1 = ENUM, 2 = Typprüfung, 3 = Pollmodus, 4 = Zustandsabfrage. `keyProbeStatus` entspricht M5Chain (0 = OK, 5 = Timeout). Gerätezahl/-typ, letzter Rohwert, Initialisierungsversuche, gültige Proben und freie Task-Stackreserve stehen ebenfalls im Status. Wiederholtes Stage 1 / Timeout ohne Gerätezahl bedeutet fehlende Anmeldeantwort; es beweist noch keinen Hardwaredefekt.

Die Anzeige liest nur die benötigten Statusfelder; Graphen werden ausschließlich über den Bibliotheks-Endpunkt übertragen. Der Worker hat 8 KiB Stack, Signaltöne verwenden kleine DMA-Puffer. Nach jedem Ton wird der Audiotreiber samt Task und I2S-Puffern beendet; der nächste Ton startet ihn wieder. Dadurch bleibt dieser Speicher für Hue-TLS frei. GATT-Lesen ist auf 750 ms begrenzt. Nach bestätigtem Heizen wird die Temperatur neu eingelesen; Ausführungs- und Abschaltentscheidungen prüfen zusätzlich die Frische des Zustands.

## Runde UI und Display-Ruhe (0.2.0)

`ui_model.hpp` enthält einen festen Statusdatensatz, Trefferbereiche und den Änderungsfingerabdruck. `round_ui.hpp` zeichnet ohne Heapallokation in einen 240×4-RGB565-Puffer (1920 Bytes); `ui_fonts.hpp` enthält die lizenzierten Vera-Teilzeichensätze im Flash. `interaction.hpp` kapselt Eingabegesten, Stop-Epochen, Haltefristen und Schlauchzustand. `display_idle.hpp` berechnet die weichen Helligkeitsübergänge ohne blockierende Wartezeit. Automatische Standardzeiten: Dimmen 30 s, AUS 90 s. Nur die Hintergrundbeleuchtung und unnötiges Zeichnen werden abgeschaltet; keine Prozessor-/Funkruhe.

Zusätzliche Befehle: `sleepDisplay`, `wakeDisplay`, `hoseTarget` mit `value` (40–230). `select` akzeptiert `{kind:"hose",id:"dial-hose"}`. `configure.settings` akzeptiert `sleepEnabled`, `sleepDimSeconds`, `sleepOffSeconds` und `powerIdleMinutes` (0 deaktiviert, sonst 1–240; Standard 30). Displaybefehle heben die Hue-Abkühlautomatik nicht auf. `status.displayBrightness` liefert die aktuelle Beleuchtung (0–255). Auto AUS nutzt den bestätigten Hue-AUS-Pfad vor dem Trennen der Akkuversorgung und wird bei aktiven Ausgängen, Programmen oder Abkühlaufträgen unterdrückt.

`POST /api/v1/hold` akzeptiert `{on,sequence,gesture}` für browserseitiges Luft-Halten im bereiten Schlauchmodus. Sequenznummern müssen steigen, jede neue Betätigung braucht eine neue Gestennummer. Heartbeat spätestens alle 150 ms; nach 450 ms ohne gültige Auffrischung wird AUS angefordert, die abgelaufene Geste kann nicht erneut starten. Loslassen, Fokusverlust und Seitenwechsel senden AUS. Lokale/Chain-Key-Haltefristen betragen 150 ms. Ein Halteingang übernimmt keine bereits laufende fremde Halteanforderung.

Während jeder Hue-TLS-Anfrage wird ausschließlich die im RAM gehaltene Bibliotheksstruktur freigegeben; der gültige Bibliotheksstand und seine Revision bleiben auf LittleFS. `memory_window.hpp` garantiert den Wiederherstellungspfad bei erfolgreicher und fehlgeschlagener Anfrage. TLS-Socket und Zertifikatsstrukturen sind vor dem Wiederladen zerstört. Kann das Wiederladen nicht bestätigt werden, meldet der Befehl einen Fehler und neue Starts werden gesperrt. Die UI arbeitet währenddessen aus ihrem festen Snapshot, Bibliotheks-GET streamt weiterhin die Datei. Status-GET/USB verwenden unveränderliche gemeinsam gehaltene Strings statt vollständiger Kopien. Diese Maßnahmen sind für wiederholte Hue-/BLE-Sitzungen wichtig.

Der sichtbare Fingerabdruck setzt die Display-Ruhezeit bei Text-/Temperatur-/Zeit-/Statusänderungen zurück. Laufende Presets/Timer/Workflows und Verbindungsaufbau erzwingen normale Helligkeit. Der erste lokale Eingang während Dimmen/AUS wird verbraucht; beim Rad gilt eine Pause von 250 ms als Ende der Aufweckbewegung. Die erste Zubehörgeste bleibt bis zum Loslassen gesperrt.

Die regelmäßige Statusantwort enthält keine komplette Auswahlliste mehr. catalogVersion ändert sich nach erfolgreicher Bibliotheksänderung; der Browser lädt Namen und Reihenfolge dann über den gestreamten Bibliotheks-Endpunkt. Auswahl- und Temperaturänderungen lösen keinen erneuten Katalogtransfer aus. Das spart Statusspeicher und Netzwerkpuffer während Hue-TLS.

## Patch 0.2.1: expliziter Ablaufstart und Diagnose

Seit 0.2.4 verwaltet `cooling_intent.hpp` die NVS-Zuordnung `coolOwner` (Volcano-ID, Bridge-ID, Plug-ID). Sie wird vor verwaltetem Hue EIN gesichert und nur nach bestätigtem Hue AUS gelöscht. `coolInit` kennzeichnet die einmalige Übernahme aus älterer Firmware. Der Worker liest nach Neustart zuerst den tatsächlichen Plug-Zustand und baut gegebenenfalls eine reine AUS-/Abkühlverbindung auf. Stop/Fehler/Queue-Unterbrechung löschen die Eigentümerschaft nicht; `Cooldown::observe` meldet Schaltbereitschaft ohne selbst zu quittieren. `status.coolingPending`, `coolingRestoring` und `coolingRetries` ergänzen die Diagnose. Fehlgeschlagene AUS-Versuche pausieren 5–30 Sekunden und prüfen vor jeder erneuten Schaltung frische BLE-Daten. `cooling-recovery.test.mjs`/`cooling-start.test.mjs` führen die tatsächlichen Helper-/Start-/Suchpfade aus; `cooling_intent_test.cpp` prüft persistente Grenzen und Speicherfehler.

Seit 0.2.3 berechnet der Display-Thread aus tatsächlicher Beleuchtung und konfigurierter Normalhelligkeit eine relative LED-Helligkeit (0–255). Der UART-Thread skaliert damit die bisherigen RGB-Statusfarben; Tasterabfrage und Aufweckgesten laufen unverändert. RGB 0 wird an das Zubehör gesendet, sobald das Display dunkel ist. Erfolgreiche Farbbestätigung steht unter `keyLedColor`, relative Helligkeit unter `keyLedBrightness`. `keyLedColor` ist die letzte bestätigte Farbe und kann nach Abziehen historisch sein; immer zusammen mit `keyAlive` auswerten. `led-sleep.test.mjs` führt den tatsächlichen Display-/LED-Code mit `DisplayIdle`/`KeyLink` und kontrollierter UART-Grenze aus.

BLE-Heizungsrückmeldungen sind ausschließlich Telemetrie. Sie dürfen keinen Ablauf starten oder eine Zwischenpause fortsetzen. Späte Rückmeldungen oder Thermostatwechsel können keine physische Benutzerabsicht beweisen. Fehler bei AUS/Temperaturwiederherstellung ergänzen die ursprüngliche Fehlerursache. Status enthält GATT-Fehlerzähler und letzte Solltemperatur-Anforderung/Bestätigung für die Diagnose.


## Öffentliches Paket bauen

`python tools/package_release.py` erzeugt `dist/VolcanoDial_<Version>.zip` ohne .git, Compiler-Caches, interne Arbeitspläne oder persönliche Geräte-Backups. Die Flash-Prüfsummen werden neu geschrieben. `Build.ps1` verwendet einen frischen Build und `-ffile-prefix-map` für lokale Benutzerpfade; dadurch bleiben private Quellpfade aus dem verteilten Image. Das Mapping verändert Diagnosepfade und den Binärhash, keine Ablaufregeln. Nach jedem Build separat testen und Hardwareprüfung vom Quellen-/Hosttest unterscheiden.
