@echo off
setlocal
cd /d "%~dp0"
set "PROJECT_DIR=%CD%"

where wt.exe >nul 2>nul
if errorlevel 1 goto NO_WT

echo Iniciando en Windows Terminal...
wt.exe -d "%PROJECT_DIR%" --title "Couvance Backend" cmd.exe /k npm run dev:server ; split-pane -V -d "%PROJECT_DIR%" --title "Couvance Frontend" cmd.exe /k npm run dev
goto :EOF

:NO_WT
echo Windows Terminal no encontrado. Abriendo en ventanas independientes...
start "Couvance Ops - Backend" cmd.exe /k npm run dev:server
start "Couvance Ops - Frontend" cmd.exe /k npm run dev
goto :EOF
