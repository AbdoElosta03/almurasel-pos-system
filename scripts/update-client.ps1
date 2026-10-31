# تحديث جهاز الزبون من Git Bash بسطر واحد:
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/update-client.ps1
# المهمة AlmuraselPOS-Server تُثبَّت مرة واحدة فقط. هذا السكربت يوقفها ثم يعيد تشغيلها.

$ErrorActionPreference = 'Stop'

$taskName = 'AlmuraselPOS-Server'
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'
$frontend = Join-Path $root 'frontend'
$logDir = Join-Path $root 'logs'
$updateLog = Join-Path $logDir 'update.log'
$dbPath = Join-Path $root 'pos.db'
$currentStep = 'البداية'

function Write-Update {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [string]$Color = 'White'
    )
    $line = '[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $Message
    Write-Host $line -ForegroundColor $Color
    Add-Content -Path $updateLog -Value $line -Encoding UTF8
}

function Write-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Number,
        [Parameter(Mandatory = $true)][string]$Message
    )
    $script:currentStep = "$Number $Message"
    Write-Host ''
    Write-Update "========== [$Number] $Message ==========" 'Cyan'
}

function Get-PosProcesses {
    Get-CimInstance Win32_Process | Where-Object {
        $cmd = $_.CommandLine
        if (-not $cmd) { return $false }
        $isUvicorn = $cmd -like '*app.production:app*'
        $isRunner = $cmd -like '*run-server.ps1*'
        $inProject = $cmd -like "*$root*"
        ($isUvicorn -or $isRunner) -and $inProject
    }
}

function Stop-PosProcesses {
    $procs = @(Get-PosProcesses)
    foreach ($proc in $procs) {
        Write-Update "إيقاف العملية $($proc.ProcessId) ($($proc.Name))" 'Yellow'
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Wait-PosProcessesGone {
    param([int]$TimeoutSeconds = 20)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $left = @(Get-PosProcesses)
        if ($left.Count -eq 0) { return }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    $ids = ($left | ForEach-Object { $_.ProcessId }) -join ', '
    throw "ما زالت عمليات النظام تعمل بعد الانتظار: $ids"
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )
    Write-Update "تشغيل: $Label" 'Yellow'
    # Continue حتى لا يوقف PowerShell 5.1 السكربت بسبب تحذيرات stderr من git أو npm.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & $Command 2>&1
        $code = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }
    foreach ($item in @($output)) {
        if ($null -eq $item) { continue }
        $text = if ($item -is [System.Management.Automation.ErrorRecord]) { $item.ToString() } else { "$item" }
        if ($text) {
            Write-Host $text
            Add-Content -Path $updateLog -Value $text -Encoding UTF8
        }
    }
    if ($null -ne $code -and $code -ne 0) {
        throw "$Label فشل. رمز الخروج: $code"
    }
    Write-Update "نجحت: $Label" 'Green'
}

Set-Location $root
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

try {
    Write-Host ''
    Write-Update 'بدء تحديث المراسل POS' 'Cyan'
    Write-Update "المجلد: $root"
    Write-Update "السجل: $updateLog"

    Write-Step '1/9' 'فحص المتطلبات قبل إيقاف النظام'
    if (-not (Test-Path $python)) {
        throw "بيئة بايثون غير موجودة: $python"
    }
    Write-Update "بايثون: $python" 'Green'

    $git = $null
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $git = (Get-Command git).Source
    } elseif (Test-Path 'C:\Program Files\Git\cmd\git.exe') {
        $git = 'C:\Program Files\Git\cmd\git.exe'
    }
    if (-not $git) {
        throw 'git غير موجود في PATH. شغّل السكربت من Git Bash.'
    }
    Write-Update "git: $git" 'Green'

    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'npm.cmd غير موجود. ثبّت Node.js ثم أعد المحاولة.'
    }
    Write-Update "npm: $((Get-Command npm.cmd).Source)" 'Green'

    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if (-not $task) {
        throw "المهمة $taskName غير مثبتة. ثبّتها مرة واحدة بـ scripts\install-autostart.ps1 ثم أعد هذا السكربت."
    }
    if ($task.State -eq 'Disabled') {
        throw "المهمة $taskName معطلة. فعّلها من جدولة المهام ثم أعد هذا السكربت."
    }
    Write-Update "المهمة $taskName حالتها الآن: $($task.State)" 'Green'

    Write-Step '2/9' 'إيقاف المهمة المجدولة'
    if ($task.State -eq 'Running') {
        Stop-ScheduledTask -TaskName $taskName
        $deadline = (Get-Date).AddSeconds(20)
        do {
            $state = (Get-ScheduledTask -TaskName $taskName).State
            if ($state -ne 'Running') { break }
            Start-Sleep -Milliseconds 500
        } while ((Get-Date) -lt $deadline)
        $state = (Get-ScheduledTask -TaskName $taskName).State
        if ($state -eq 'Running') {
            throw "المهمة $taskName ما زالت تعمل بعد الإيقاف."
        }
        Write-Update "توقفت المهمة. حالتها الآن: $state" 'Green'
    } else {
        Write-Update "المهمة ليست قيد التشغيل. لا حاجة لإيقافها." 'Green'
    }

    Write-Step '3/9' 'إيقاف عملية الخادم إن بقيت شغالة'
    Stop-PosProcesses
    Wait-PosProcessesGone
    Write-Update 'لا توجد عملية خادم شغالة.' 'Green'

    Write-Step '4/9' 'نسخ قاعدة البيانات قبل أي تغيير'
    if (Test-Path $dbPath) {
        $backupDir = Join-Path $root 'backups'
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $backupPath = Join-Path $backupDir "pre-update-$stamp.db"
        $backupCode = 'import sqlite3, sys; src = sqlite3.connect(sys.argv[1]); dst = sqlite3.connect(sys.argv[2]); src.backup(dst); dst.close(); src.close()'
        Invoke-Native "نسخ SQLite إلى $backupPath" {
            & $python -c $backupCode $dbPath $backupPath
        }
        if (-not (Test-Path $backupPath)) {
            throw "لم يُنشأ ملف النسخة: $backupPath"
        }
        Write-Update "النسخة الاحتياطية: $backupPath" 'Green'
    } else {
        Write-Update 'لا يوجد pos.db. سيتم المتابعة دون نسخة.' 'Yellow'
    }

    Write-Step '5/9' 'سحب التحديث من الريبو'
    Invoke-Native 'git status' { & $git status --short --branch }
    Invoke-Native 'git pull' { & $git pull }
    Invoke-Native 'git log' { & $git log -1 --oneline }

    Write-Step '6/9' 'تحديث مكتبات بايثون'
    Invoke-Native 'pip install' {
        & $python -m pip install -r (Join-Path $root 'requirements.txt')
    }

    Write-Step '7/9' 'ترقية قاعدة البيانات'
    Invoke-Native 'alembic upgrade head' {
        & $python -m alembic upgrade head
    }

    Write-Step '8/9' 'بناء الواجهة'
    if (-not (Test-Path (Join-Path $frontend 'package.json'))) {
        throw "مجلد الواجهة غير موجود: $frontend"
    }
    Push-Location $frontend
    try {
        Invoke-Native 'npm install' { & npm.cmd install }
        Invoke-Native 'npm run build' { & npm.cmd run build }
    } finally {
        Pop-Location
    }
    $distIndex = Join-Path $frontend 'dist\index.html'
    if (-not (Test-Path $distIndex)) {
        throw "البناء لم ينتج الملف: $distIndex"
    }
    Write-Update "ملف الواجهة جاهز: $distIndex" 'Green'

    Write-Step '9/9' 'تشغيل المهمة والتحقق من المنفذ 8000'
    Start-ScheduledTask -TaskName $taskName
    Write-Update 'أُرسل أمر التشغيل. انتظار فتح المنفذ 8000...' 'Yellow'
    $ready = $false
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline) {
        $alive = @(Get-PosProcesses)
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $client.Connect('127.0.0.1', 8000)
            $client.Close()
            if ($alive.Count -gt 0) {
                $ready = $true
                break
            }
        } catch {
            # المنفذ لم يُفتح بعد.
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        Write-Update 'الخادم لم يفتح المنفذ 8000 خلال 30 ثانية.' 'Red'
        foreach ($logName in @('server.stderr.log', 'server.stdout.log', 'server.log')) {
            $logPath = Join-Path $logDir $logName
            if (Test-Path $logPath) {
                Write-Update "آخر أسطر $logName :" 'Yellow'
                Get-Content $logPath -Tail 40 | ForEach-Object { Write-Host $_ }
            }
        }
        throw 'التحديث اكتمل لكن الخادم لم يعمل. المهمة بقيت متوقفة أو أُعيد تشغيلها ثم فشلت. راجع السطور أعلاه.'
    }

    $finalState = (Get-ScheduledTask -TaskName $taskName).State
    Write-Host ''
    Write-Update 'اكتمل التحديث والخادم يعمل.' 'Green'
    Write-Update "حالة المهمة: $finalState" 'Green'
    Write-Update 'افتح: http://127.0.0.1:8000' 'Green'
    exit 0
} catch {
    Write-Host ''
    Write-Update "فشل التحديث عند الخطوة: $currentStep" 'Red'
    Write-Update $_.Exception.Message 'Red'
    if ($_.ScriptStackTrace) {
        Write-Update $_.ScriptStackTrace 'DarkRed'
    }
    Write-Update 'أصلح سبب الرسالة أعلاه ثم شغّل السكربت مرة أخرى. لا تشغّل النظام يدويًا إذا فشل السحب أو البناء أو ترقية القاعدة.' 'Yellow'
    Write-Update "التفاصيل محفوظة في: $updateLog" 'Yellow'
    exit 1
}
