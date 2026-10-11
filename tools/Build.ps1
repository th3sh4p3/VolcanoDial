param([string]$ToolsDir=(Join-Path $PSScriptRoot '.build-tools'),[string]$Python='python')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force $ToolsDir | Out-Null
$ToolsDir=(Resolve-Path $ToolsDir).Path
$cli=Join-Path $ToolsDir 'cli/arduino-cli.exe'
if(-not (Test-Path $cli)){
 $zip=Join-Path $ToolsDir 'arduino-cli.zip'
 Invoke-WebRequest 'https://github.com/arduino/arduino-cli/releases/download/v1.5.1/arduino-cli_1.5.1_Windows_64bit.zip' -OutFile $zip
 Expand-Archive $zip (Join-Path $ToolsDir 'cli') -Force
}
$cfg=Join-Path $ToolsDir 'arduino-cli.yaml'
@"
board_manager:
  additional_urls:
    - https://espressif.github.io/arduino-esp32/package_esp32_index.json
directories:
  data: $($ToolsDir.Replace('\','/'))/data
  downloads: $($ToolsDir.Replace('\','/'))/downloads
  user: $($ToolsDir.Replace('\','/'))/user
"@ | Set-Content $cfg -Encoding UTF8
function Run-CLI([string[]]$CliArgs){& $cli @CliArgs --config-file $cfg;if($LASTEXITCODE){throw 'Arduino-CLI fehlgeschlagen'}}
Run-CLI -CliArgs @('core','update-index')
Run-CLI -CliArgs @('core','install','esp32:esp32@3.3.12')
Run-CLI -CliArgs @('lib','install','M5Dial@1.0.3','M5Unified@0.2.25','M5GFX@0.2.32','M5Chain@1.0.10','NimBLE-Arduino@2.5.1','ArduinoJson@7.4.2')
# web_assets.hpp liegt bereits bei. Nach Web-Aenderungen Python 3 verwenden.
if(Get-Command $Python -ErrorAction SilentlyContinue){& $Python (Join-Path $PSScriptRoot 'embed_web.py');if($LASTEXITCODE){throw 'Web-Einbettung fehlgeschlagen'}}
# Keep personal source paths out of __FILE__ strings and debug metadata.
$publicProfile=[Environment]::GetFolderPath('UserProfile')
$publicForward=$publicProfile.Replace('\','/')
$publicBack=$publicProfile.Replace('\','\\')
$publicFlags=(@($publicForward,$publicBack,"/$publicForward","/$publicBack") | ForEach-Object {"-ffile-prefix-map=$_=/build-user"}) -join ' '
Run-CLI -CliArgs @('compile','--clean','--fqbn','esp32:esp32:m5stack_stamp_s3:PartitionScheme=custom,PSRAM=disabled','--build-property','upload.maximum_size=3145728','--build-property',"compiler.cpp.extra_flags=$publicFlags",'--build-property',"compiler.c.extra_flags=$publicFlags",'--build-property',"compiler.S.extra_flags=$publicFlags",'--build-path',(Join-Path $ToolsDir 'build'),'--output-dir',(Join-Path $root 'bin'),(Join-Path $root 'firmware/VolcanoDial'))
Copy-Item (Join-Path $ToolsDir 'data/packages/esp32/hardware/esp32/3.3.12/tools/partitions/boot_app0.bin') (Join-Path $root 'bin/boot_app0.bin') -Force
$sums=[ordered]@{}
foreach($name in @('bin/VolcanoDial.ino.bin','bin/VolcanoDial.ino.bootloader.bin','bin/VolcanoDial.ino.partitions.bin','bin/boot_app0.bin','tools/esptool.exe')){$sums[$name]=(Get-FileHash (Join-Path $root $name) -Algorithm SHA256).Hash}
$sums | ConvertTo-Json | Set-Content (Join-Path $root 'SHA256SUMS.json') -Encoding UTF8
Write-Host 'Firmware gebaut. Installieren.cmd kann sie jetzt aufspielen.'
