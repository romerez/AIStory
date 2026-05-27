$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$resolvedRoot = (Resolve-Path $Root).Path
$rootPattern = [regex]::Escape($resolvedRoot)
$processes = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "node.exe" `
    -and $_.CommandLine -match $rootPattern `
    -and (
      $_.CommandLine -match "server[\\/]+index\.js" `
        -or $_.CommandLine -match "node_modules[\\/]+vite[\\/]+bin[\\/]+vite\.js"
    )
}

if (-not $processes) {
  Write-Host "No AIStory dev servers are running."
  exit 0
}

foreach ($process in $processes) {
  Write-Host "Stopping AIStory process $($process.ProcessId)..."
  Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "AIStory dev servers stopped."
