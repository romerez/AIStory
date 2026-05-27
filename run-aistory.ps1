$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Import-DotEnv {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()

    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $parts = $line.Split("=", 2)

    if ($parts.Count -ne 2) {
      return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")

    if ($name) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

function Test-LocalUrl {
  param([string]$Url)

  try {
    $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    return $true
  } catch {
    return $false
  }
}

function Wait-LocalUrl {
  param(
    [string]$Url,
    [int]$Attempts = 80
  )

  for ($attempt = 0; $attempt -lt $Attempts; $attempt += 1) {
    if (Test-LocalUrl $Url) {
      return $true
    }

    Start-Sleep -Milliseconds 750
  }

  return $false
}

function Start-AIStoryNodeProcess {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [string[]]$Arguments = @()
  )

  $node = (Get-Command node -ErrorAction Stop).Source
  $logDir = Join-Path $Root ".aistory-logs"

  if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
  }

  $stdoutPath = Join-Path $logDir "$Name.out.log"
  $stderrPath = Join-Path $logDir "$Name.err.log"
  $argumentList = @($ScriptPath) + $Arguments
  $process = Start-Process `
    -FilePath $node `
    -ArgumentList $argumentList `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -PassThru

  Write-Host "Started $Name (PID $($process.Id))."
  Write-Host "  Logs: $stdoutPath"
  Write-Host "        $stderrPath"
}

Import-DotEnv (Join-Path $Root ".env")

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
  Write-Host "Installing dependencies..."
  npm install
}

$ApiPort = if ($env:API_PORT) { $env:API_PORT } else { "8787" }
$WebHost = if ($env:VITE_HOST) { $env:VITE_HOST } else { "127.0.0.1" }
$WebPort = if ($env:VITE_PORT) { $env:VITE_PORT } else { "5173" }
$BackendUrl = "http://127.0.0.1:$ApiPort/api/health"
$FrontendUrl = "http://$WebHost`:$WebPort"

Write-Host ""
Write-Host "Starting AIStory..."
Write-Host "Backend:  http://127.0.0.1:$ApiPort"
Write-Host "Frontend: $FrontendUrl"
Write-Host ""

$env:API_PORT = $ApiPort
$env:SERVE_STATIC = "false"

$backendReady = Test-LocalUrl $BackendUrl
$frontendReady = Test-LocalUrl $FrontendUrl

if (-not $backendReady) {
  Start-AIStoryNodeProcess -Name "api" -ScriptPath (Join-Path $Root "server\index.js")
} else {
  Write-Host "Backend is already running."
}

if (-not $frontendReady) {
  Start-AIStoryNodeProcess `
    -Name "web" `
    -ScriptPath (Join-Path $Root "node_modules\vite\bin\vite.js") `
    -Arguments @("--host", $WebHost, "--port", $WebPort, "--strictPort")
} else {
  Write-Host "Frontend is already running."
}

Write-Host ""
Write-Host "Waiting for AIStory to be ready..."

$backendReady = Wait-LocalUrl $BackendUrl
$frontendReady = Wait-LocalUrl $FrontendUrl

if (-not $backendReady -or -not $frontendReady) {
  Write-Host ""
  Write-Host "AIStory did not start correctly."
  Write-Host "Backend ready:  $backendReady"
  Write-Host "Frontend ready: $frontendReady"
  Write-Host "Check logs in:  $(Join-Path $Root ".aistory-logs")"
  exit 1
}

Write-Host "AIStory is ready. Opening browser..."
Start-Process $FrontendUrl
Start-Sleep -Seconds 3
exit 0
