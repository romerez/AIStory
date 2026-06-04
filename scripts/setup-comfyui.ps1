# AIStory ComfyUI installer
# Installs ComfyUI at E:\AI\ComfyUI in a Python 3.11 venv with CUDA-enabled PyTorch.
# Run from PowerShell (any cwd). Re-runnable: if ComfyUI already exists it just upgrades.

param(
    [string]$InstallRoot = "E:\AI",
    [string]$PythonVersion = "3.11"
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Warn($Message) {
    Write-Host "!!  $Message" -ForegroundColor Yellow
}

function Fail($Message) {
    Write-Host "XX  $Message" -ForegroundColor Red
    exit 1
}

# ---- Verify Python 3.11 ----
Write-Step "Checking Python $PythonVersion"

$pythonOk = $false
try {
    $version = & py "-$PythonVersion" --version 2>$null
    if ($LASTEXITCODE -eq 0 -and $version -match "Python $PythonVersion") {
        Write-Host "    Found: $version"
        $pythonOk = $true
    }
} catch {}

if (-not $pythonOk) {
    Write-Warn "Python $PythonVersion is not installed (or `py -$PythonVersion` doesn't find it)."
    Write-Host ""
    Write-Host "Install one of these ways, then re-run this script:"
    Write-Host ""
    Write-Host "  Option A (recommended): winget"
    Write-Host "    winget install Python.Python.3.11"
    Write-Host ""
    Write-Host "  Option B: download installer"
    Write-Host "    https://www.python.org/downloads/release/python-3119/"
    Write-Host "    Pick 'Windows installer (64-bit)' and CHECK 'Add python.exe to PATH'."
    Write-Host ""
    Fail "Python $PythonVersion required."
}

# ---- Verify git ----
Write-Step "Checking git"
try {
    $gitVer = & git --version
    Write-Host "    Found: $gitVer"
} catch {
    Fail "git is not on PATH. Install Git for Windows: https://git-scm.com/download/win"
}

# ---- Create install root ----
Write-Step "Preparing $InstallRoot"
if (-not (Test-Path $InstallRoot)) {
    New-Item -ItemType Directory -Path $InstallRoot | Out-Null
}

$comfyDir = Join-Path $InstallRoot "ComfyUI"

# ---- Clone or update ComfyUI ----
if (-not (Test-Path $comfyDir)) {
    Write-Step "Cloning ComfyUI into $comfyDir"
    & git clone https://github.com/comfyanonymous/ComfyUI.git $comfyDir
    if ($LASTEXITCODE -ne 0) { Fail "git clone failed." }
} else {
    Write-Step "ComfyUI already exists at $comfyDir - pulling latest"
    Push-Location $comfyDir
    try {
        & git pull --ff-only
    } finally {
        Pop-Location
    }
}

# ---- Create venv ----
$venvDir = Join-Path $comfyDir ".venv"
if (-not (Test-Path $venvDir)) {
    Write-Step "Creating Python $PythonVersion venv at $venvDir"
    & py "-$PythonVersion" -m venv $venvDir
    if ($LASTEXITCODE -ne 0) { Fail "venv creation failed." }
} else {
    Write-Host "    venv already exists; reusing"
}

$venvPython = Join-Path $venvDir "Scripts\python.exe"
$venvPip = Join-Path $venvDir "Scripts\pip.exe"

# ---- Upgrade pip ----
Write-Step "Upgrading pip"
& $venvPython -m pip install --upgrade pip wheel setuptools | Out-Null

# ---- Install PyTorch with CUDA 12.1 ----
Write-Step "Installing PyTorch (CUDA 12.1 build, compatible with your driver)"
Write-Host "    This downloads ~2.5GB. Be patient."
& $venvPip install --upgrade torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
if ($LASTEXITCODE -ne 0) { Fail "PyTorch install failed." }

# ---- Install ComfyUI dependencies ----
Write-Step "Installing ComfyUI Python dependencies"
& $venvPip install -r (Join-Path $comfyDir "requirements.txt")
if ($LASTEXITCODE -ne 0) { Fail "ComfyUI requirements install failed." }

# ---- Install ComfyUI-Manager (custom node manager) ----
$managerDir = Join-Path $comfyDir "custom_nodes\ComfyUI-Manager"
if (-not (Test-Path $managerDir)) {
    Write-Step "Installing ComfyUI-Manager"
    & git clone https://github.com/ltdrdata/ComfyUI-Manager.git $managerDir
}

# ---- Install IP-Adapter custom node (for character consistency on pages 2-6) ----
$ipAdapterDir = Join-Path $comfyDir "custom_nodes\ComfyUI_IPAdapter_plus"
if (-not (Test-Path $ipAdapterDir)) {
    Write-Step "Installing IPAdapter Plus custom node"
    & git clone https://github.com/cubiq/ComfyUI_IPAdapter_plus.git $ipAdapterDir
}

# ---- Sanity test: import torch and check CUDA ----
Write-Step "Verifying PyTorch sees the GPU"
# Single-quoted PS string so the inline Python script needs no PowerShell escaping.
& $venvPython -c 'import torch; cuda = torch.cuda.is_available(); name = torch.cuda.get_device_name(0) if cuda else "none"; print(f"    torch {torch.__version__}, CUDA available: {cuda}, device: {name}")'
if ($LASTEXITCODE -ne 0) { Fail "PyTorch sanity check failed." }

# ---- Done ----
Write-Step "ComfyUI install complete"
Write-Host ""
Write-Host "Install location: $comfyDir"
Write-Host ""
Write-Host "Next steps (run in order):"
Write-Host "  1. Download model weights:  .\scripts\download-models.ps1"
Write-Host "  2. Launch ComfyUI:          .\local-stack\start-comfyui.ps1"
Write-Host "  3. Launch the image proxy:  cd local-stack\image-proxy ; npm install ; npm start"
Write-Host ""
