param([switch]$Remove)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot 'run-server.ps1'
$taskNames = @('AlmuraselPOS-Server')

if ($Remove) {
    foreach ($name in $taskNames) {
        if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
            Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
            Unregister-ScheduledTask -TaskName $name -Confirm:$false
            Write-Host "Removed $name"
        }
    }
    return
}

foreach ($name in $taskNames) {
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
        throw "Task $name already exists. Remove it with -Remove before reinstalling."
    }
}

if (-not (Test-Path (Join-Path $root '.venv\Scripts\python.exe'))) {
    throw 'Python virtual environment missing. Create .venv and install requirements first.'
}
if (-not (Test-Path (Join-Path $root 'frontend\node_modules\vite\bin\vite.js'))) {
    throw 'Frontend dependencies missing. Run npm install inside frontend first.'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'npm.cmd is not available in PATH. Install Node.js first.'
}

Push-Location (Join-Path $root 'frontend')
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed; no scheduled task was installed.' }
} finally {
    Pop-Location
}

$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
$powershell = Join-Path $PSHOME 'powershell.exe'

$arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $runner
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $root
Register-ScheduledTask -TaskName $taskNames[0] -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Start Almurasel POS (API and built frontend) at Windows logon' | Out-Null
Write-Host "Installed $($taskNames[0])"

Write-Host 'The server and built frontend will start automatically at the next Windows logon.'
Write-Host 'To start now: Start-ScheduledTask -TaskName AlmuraselPOS-Server'
