# Downloads model weights into the ComfyUI models folders.
# ~80GB total. Skips any file that already exists.

param(
    [string]$ComfyRoot = "E:\AI\ComfyUI",
    [switch]$SkipFlux,
    [switch]$SkipSDXL,
    [switch]$SkipIPAdapter,
    [switch]$SkipUpscale
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-FileIfMissing {
    param(
        [string]$Url,
        [string]$Destination,
        [string]$Label
    )

    $dir = Split-Path -Parent $Destination
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    if (Test-Path $Destination) {
        $size = (Get-Item $Destination).Length
        $sizeMB = [math]::Round($size / 1MB, 1)
        Write-Host "    [skip] $Label already exists ($sizeMB MB)"
        return
    }

    Write-Host "    [get ] $Label"
    Write-Host "           $Url"
    Write-Host "           --> $Destination"

    # Use BITS for resumable, robust download; fall back to Invoke-WebRequest if BITS unavailable.
    try {
        Start-BitsTransfer -Source $Url -Destination $Destination -ErrorAction Stop
    } catch {
        Write-Host "           BITS failed, falling back to Invoke-WebRequest..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $Url -OutFile $Destination
    }
}

if (-not (Test-Path $ComfyRoot)) {
    Write-Host "ComfyUI not found at $ComfyRoot. Run scripts\setup-comfyui.ps1 first." -ForegroundColor Red
    exit 1
}

# ---- SDXL ----
if (-not $SkipSDXL) {
    Write-Step "SDXL base model (~6.9GB)"
    Get-FileIfMissing `
        -Url "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors" `
        -Destination (Join-Path $ComfyRoot "models\checkpoints\sd_xl_base_1.0.safetensors") `
        -Label "sd_xl_base_1.0.safetensors"
}

# ---- FLUX schnell ----
if (-not $SkipFlux) {
    Write-Step "FLUX.1 schnell (~24GB total)"

    # UNET
    Get-FileIfMissing `
        -Url "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors" `
        -Destination (Join-Path $ComfyRoot "models\unet\flux1-schnell.safetensors") `
        -Label "flux1-schnell.safetensors (~23GB)"

    # VAE (shared with FLUX dev)
    Get-FileIfMissing `
        -Url "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors" `
        -Destination (Join-Path $ComfyRoot "models\vae\ae.safetensors") `
        -Label "ae.safetensors"

    # T5 text encoder (fp8 variant - fits in VRAM with the UNET)
    Get-FileIfMissing `
        -Url "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp8_e4m3fn.safetensors" `
        -Destination (Join-Path $ComfyRoot "models\clip\t5xxl_fp8_e4m3fn.safetensors") `
        -Label "t5xxl_fp8_e4m3fn.safetensors (~5GB)"

    # CLIP-L
    Get-FileIfMissing `
        -Url "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors" `
        -Destination (Join-Path $ComfyRoot "models\clip\clip_l.safetensors") `
        -Label "clip_l.safetensors"
}

# ---- IP-Adapter for SDXL (character consistency across pages) ----
if (-not $SkipIPAdapter) {
    Write-Step "IP-Adapter Plus for SDXL (~700MB)"

    # CLIP vision model (required by IP-Adapter)
    Get-FileIfMissing `
        -Url "https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors" `
        -Destination (Join-Path $ComfyRoot "models\clip_vision\CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors") `
        -Label "CLIP-ViT-H-14 (image encoder)"

    # IP-Adapter Plus SDXL
    Get-FileIfMissing `
        -Url "https://huggingface.co/h94/IP-Adapter/resolve/main/sdxl_models/ip-adapter-plus_sdxl_vit-h.safetensors" `
        -Destination (Join-Path $ComfyRoot "models\ipadapter\ip-adapter-plus_sdxl_vit-h.safetensors") `
        -Label "ip-adapter-plus_sdxl_vit-h"
}

# ---- Upscale model (used by the *-hires storybook workflows) ----
if (-not $SkipUpscale) {
    Write-Step "RealESRGAN x4 upscale model (~64MB)"

    Get-FileIfMissing `
        -Url "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth" `
        -Destination (Join-Path $ComfyRoot "models\upscale_models\RealESRGAN_x4plus.pth") `
        -Label "RealESRGAN_x4plus.pth"
}

Write-Step "Model downloads complete"
Write-Host ""
Write-Host "Models live under: $ComfyRoot\models"
Write-Host "Run .\local-stack\start-comfyui.ps1 to launch ComfyUI."
