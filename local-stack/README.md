# AIStory Local Stack

Self-hosted, zero-API-cost backend for AIStory. Three services run on this PC:

| Service | Port | Purpose |
| --- | --- | --- |
| ComfyUI | 8188 | Image generation (SDXL / FLUX). Graph-based API. |
| Ollama | 11434 | Local LLM serving an OpenAI-compatible API. Hebrew + English text. |
| AIStory image proxy | 8989 | Bridges AIStory's `custom-image` provider contract to ComfyUI. |

The AIStory app itself runs as normal on `5173` (frontend) + `8787` (backend). It never knows the services above are local — they look identical to a hosted provider.

## Architecture

```
AIStory frontend (5173)
        │
        ▼
AIStory backend (8787)
        ├──► http://127.0.0.1:8989/v1/images/generations   (image proxy → ComfyUI)
        └──► http://127.0.0.1:11434/v1/chat/completions    (Ollama, OpenAI-compatible)
```

## One-time setup

1. **Install Python 3.11** (ComfyUI doesn't support 3.13). See `scripts/setup-comfyui.ps1`.
2. **Clone + install ComfyUI** into `E:\AI\ComfyUI`. The setup script does this.
3. **Download model weights** into `E:\AI\ComfyUI\models\`. See "Model downloads" below.
4. **Install image proxy deps**: `cd local-stack\image-proxy && npm install`.
5. **Pull an Ollama model**: see "Hebrew model" below.

## Day-to-day launch

Run `local-stack\start-all.ps1`. It launches ComfyUI, the image proxy, and verifies Ollama is up. AIStory itself starts as usual (`npm run dev` from the repo root).

## Model downloads

ComfyUI looks for files in specific subfolders of `E:\AI\ComfyUI\models\`. See `MODELS.md` for direct download commands (PowerShell `Invoke-WebRequest` for each file).

## Hebrew model

Ollama supports pulling GGUFs straight from HuggingFace:

```powershell
# DictaLM 2.0 instruct — purpose-built for Hebrew
ollama pull hf.co/dicta-il/dictalm2.0-instruct-GGUF:Q5_K_M

# Or a strong general model if DictaLM is too narrow
ollama pull qwen2.5:14b-instruct-q5_K_M
```

After pulling, configure AIStory's Settings → Story model with:
- Type: `openai-compatible`
- Endpoint: `http://127.0.0.1:11434/v1/chat/completions`
- Model name: `hf.co/dicta-il/dictalm2.0-instruct-GGUF:Q5_K_M` (whatever you pulled)
- API key: leave empty (Ollama ignores it)

## Image endpoint

In AIStory Settings → Image model, edit the Multiplay slot (or add a new custom model):
- Type: `custom-image`
- Endpoint: `http://127.0.0.1:8989/v1/images/generations`
- Model name: `sdxl-storybook` or `flux-storybook`
- API key: leave empty
