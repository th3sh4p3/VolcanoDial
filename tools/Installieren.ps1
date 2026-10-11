param([string]$Port,[ValidateSet('','Neu','Update')][string]$Modus='')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$tool=Join-Path $PSScriptRoot 'esptool.exe'
if(-not $Modus){Write-Host '1: Erstinstallation (Neu)   2: vorhandenen Volcano Dial aktualisieren';$choice=Read-Host '1 oder 2';if($choice -eq '1'){$Modus='Neu'}elseif($choice -eq '2'){$Modus='Update'}else{throw 'Keine gueltige Auswahl'}}
if(-not $Port){[System.IO.Ports.SerialPort]::GetPortNames() | Write-Host;$Port=Read-Host 'Dial COM-Port (z.B. COM3)'}
if($Port -notmatch '^COM[0-9]+$'){throw 'Ungueltiger COM-Port'}
$manifest=Get-Content (Join-Path $root 'SHA256SUMS.json') -Raw | ConvertFrom-Json
foreach($entry in $manifest.PSObject.Properties){if((Get-FileHash (Join-Path $root $entry.Name) -Algorithm SHA256).Hash -ne $entry.Value){throw "Pruefsumme falsch: $($entry.Name)"}}
if($Modus -eq 'Neu'){
 Write-Host 'Erstinstallation ersetzt die vorhandene Firmware. Bibliothek/Einstellungen vorher sichern.'
 if((Read-Host 'NEU eingeben zum Installieren') -cne 'NEU'){return}
 $flashArgs=@('0x0',(Join-Path $root 'bin\VolcanoDial.ino.bootloader.bin'),'0x8000',(Join-Path $root 'bin\VolcanoDial.ino.partitions.bin'),'0xe000',(Join-Path $root 'bin\boot_app0.bin'),'0x10000',(Join-Path $root 'bin\VolcanoDial.ino.bin'))
}else{$flashArgs=@('0x10000',(Join-Path $root 'bin\VolcanoDial.ino.bin'))}
& $tool --chip esp32s3 --port $Port --baud 460800 write-flash --flash-size 8MB @flashArgs
if($LASTEXITCODE -ne 0){throw 'Flashen fehlgeschlagen. USB-Datenkabel/Port pruefen und erneut versuchen.'}
Write-Host 'Firmware geschrieben und vom Flash-Tool geprueft. Der Dial startet neu.'
