@echo off
title BAR StratCom Overlay Launcher
echo Launching BAR StratCom Always-On-Top Tactical Overlay (NVIDIA-Style)...
if exist "%~dp0node_modules\.bin\electron.cmd" (
    start "" "%~dp0node_modules\.bin\electron.cmd" "%~dp0electron\main.js"
) else (
    start "" npx.cmd electron "%~dp0electron\main.js"
)
