@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0tools\WLAN-Einrichten.ps1" %*
