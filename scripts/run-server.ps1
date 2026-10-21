$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$log = Join-Path $logDir 'server.log'

Set-Location $root  # .env, pos.db and backups/ are relative to this folder.
$executable = Join-Path $root '.venv\Scripts\python.exe'
$serviceArgs = @('-m', 'uvicorn', 'app.production:app', '--host', '127.0.0.1', '--port', '8000')

if (-not (Test-Path $executable)) {
    throw "Missing executable: $executable"
}

while ($true) {
    Add-Content -Path $log -Value "[$(Get-Date -Format o)] Starting Almurasel POS"
    try {
        & $executable @serviceArgs >> $log 2>&1
        $exitCode = $LASTEXITCODE
        Add-Content -Path $log -Value "[$(Get-Date -Format o)] Server exited with code $exitCode; restarting in 10 seconds"
    } catch {
        Add-Content -Path $log -Value "[$(Get-Date -Format o)] Server failed: $_; restarting in 10 seconds"
    }
    Start-Sleep -Seconds 10
}
