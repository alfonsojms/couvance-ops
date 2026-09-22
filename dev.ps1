$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($ScriptDir) { Set-Location $ScriptDir }

if (Get-Command wt.exe -ErrorAction SilentlyContinue) {
    Write-Host "Iniciando Couvance Ops en Windows Terminal (Paneles divididos)..." -ForegroundColor Cyan
    wt -d "$ScriptDir" --title "Couvance Backend" cmd /k "npm run dev:server" `; split-pane -V -d "$ScriptDir" --title "Couvance Frontend" cmd /k "npm run dev"
} else {
    Write-Host "Windows Terminal no encontrado. Abriendo en ventanas convencionales..." -ForegroundColor Yellow
    Start-Process cmd -ArgumentList '/k', 'npm run dev:server'
    Start-Process cmd -ArgumentList '/k', 'npm run dev'
}
