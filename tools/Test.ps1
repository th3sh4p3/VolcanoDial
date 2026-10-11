param([Parameter(Mandatory=$true)][string]$ZigPath,[Parameter(Mandatory=$true)][string]$ArduinoJsonPath,[string]$Node='node')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$exe=Join-Path $env:TEMP ('VolcanoDial-test-'+[guid]::NewGuid().ToString()+'.exe')
try{
 & $ZigPath c++ -std=c++17 -target x86_64-windows-gnu -I (Join-Path $ArduinoJsonPath 'src') (Join-Path $root 'tests/core_test.cpp') -o $exe
 if($LASTEXITCODE){throw 'Host-Build fehlgeschlagen'}
 $httpExe=$exe.Replace('.exe','-http.exe')
 & $ZigPath c++ -std=c++17 -target x86_64-windows-gnu (Join-Path $root 'tests/http_body_test.cpp') -o $httpExe
 if($LASTEXITCODE){throw 'HTTP-Host-Build fehlgeschlagen'}
 $env:VD_HTTP_TEST=$httpExe
 $documentExe=$exe.Replace('.exe','-document.exe')
 & $ZigPath c++ -std=c++17 -target x86_64-windows-gnu -I (Join-Path $ArduinoJsonPath 'src') (Join-Path $root 'tests/document_test.cpp') -o $documentExe
 if($LASTEXITCODE){throw 'Bibliotheks-Host-Build fehlgeschlagen'}
 $env:VD_DOCUMENT_TEST=$documentExe
 $env:VD_CORE_TEST=$exe
 $interactionExe=$exe.Replace('.exe','-interaction.exe')
 & $ZigPath c++ -std=c++17 -target x86_64-windows-gnu -I (Join-Path $ArduinoJsonPath 'src') (Join-Path $root 'tests/interaction_test.cpp') -o $interactionExe
 if($LASTEXITCODE){throw 'Eingabe-Host-Build fehlgeschlagen'}
 $env:VD_INTERACTION_TEST=$interactionExe
 $uiExe=$exe.Replace('.exe','-ui.exe')
 & $ZigPath c++ -std=c++17 -target x86_64-windows-gnu (Join-Path $root 'tests/ui_test.cpp') -o $uiExe
 if($LASTEXITCODE){throw 'UI-Host-Build fehlgeschlagen'}
 $env:VD_UI_TEST=$uiExe
 $coolingExe=$exe.Replace('.exe','-cooling.exe')
 & $ZigPath c++ -std=c++17 -target x86_64-windows-gnu (Join-Path $root 'tests/cooling_intent_test.cpp') -o $coolingExe
 if($LASTEXITCODE){throw 'Cooling-Host-Build fehlgeschlagen'}
 & $coolingExe
 if($LASTEXITCODE){throw 'Cooling-Persistenztests fehlgeschlagen'}
 $env:VD_ZIG=$ZigPath
 $env:VD_ARDUINO_JSON=$ArduinoJsonPath
 & $Node --test (Join-Path $root 'tests/browser.test.mjs') (Join-Path $root 'tests/parity.test.mjs') (Join-Path $root 'tests/hose-hold.test.mjs') (Join-Path $root 'tests/daily.test.mjs') (Join-Path $root 'tests/target-confirmation.test.mjs') (Join-Path $root 'tests/led-sleep.test.mjs') (Join-Path $root 'tests/display-command.test.mjs') (Join-Path $root 'tests/cooling-recovery.test.mjs') (Join-Path $root 'tests/cooling-start.test.mjs') (Join-Path $root 'tests/power-restart.test.mjs')
 if($LASTEXITCODE){throw 'Tests fehlgeschlagen'}
}finally{if($coolingExe -and (Test-Path $coolingExe)){Remove-Item -LiteralPath $coolingExe};Remove-Item Env:VD_UI_TEST -ErrorAction SilentlyContinue;if($uiExe -and (Test-Path $uiExe)){Remove-Item -LiteralPath $uiExe};Remove-Item Env:VD_INTERACTION_TEST -ErrorAction SilentlyContinue;if($interactionExe -and (Test-Path $interactionExe)){Remove-Item -LiteralPath $interactionExe};Remove-Item Env:VD_DOCUMENT_TEST -ErrorAction SilentlyContinue;if($documentExe -and (Test-Path $documentExe)){Remove-Item -LiteralPath $documentExe};Remove-Item Env:VD_HTTP_TEST -ErrorAction SilentlyContinue;if($httpExe -and (Test-Path $httpExe)){Remove-Item -LiteralPath $httpExe};Remove-Item Env:VD_CORE_TEST -ErrorAction SilentlyContinue;if(Test-Path $exe){Remove-Item -LiteralPath $exe}}
