@echo off
curl -s http://localhost:3000/api/overlay/toggle >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo toggle > %APPDATA%\bar-stratcom-overlay\overlay_cmd.txt 2>nul
    echo toggle > D:\BAR\Beyond-All-Reason\data\overlay_cmd.txt 2>nul
)
