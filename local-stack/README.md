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

ComfyUI looks for files in specific subfolders of `E:\AI\ComfyUI\models\`. Run `scripts\download-models.ps1` from the repo root to fetch everything (resumable; skips files that already exist):

- SDXL base → `models\checkpoints\`
- FLUX.1 schnell + VAE + text encoders → `models\unet\`, `models\vae\`, `models\clip\`
- IP-Adapter Plus SDXL + CLIP-ViT-H → `models\ipadapter\`, `models\clip_vision\`
- RealESRGAN x4 (only needed for the `*-hires` workflows) → `models\upscale_models\`

Skip groups with `-SkipSDXL`, `-SkipFlux`, `-SkipIPAdapter`, `-SkipUpscale`.

## Hebrew model

Ollama pulls GGUFs straight from HuggingFace. DictaLM 3.0 (Hebrew-native, "thinking") is the built-in preset:

```powershell
# DictaLM 3.0 24B Thinking — purpose-built for Hebrew
ollama pull hf.co/dicta-il/DictaLM-3.0-24B-Thinking-GGUF:Q4_K_M

# Or a strong general model if you prefer
ollama pull qwen2.5:14b-instruct-q5_K_M
```

AIStory ships a built-in story preset `DictaLM 3.0 24B (local)` pointing at this model — pick it in Settings → Story model and "Use for stories". To wire any other local model by hand:
- Type: `openai-compatible`
- Endpoint: `http://127.0.0.1:11434/v1/chat/completions`
- Model name: `hf.co/dicta-il/DictaLM-3.0-24B-Thinking-GGUF:Q4_K_M` (whatever you pulled)
- API key: leave empty (Ollama ignores it; local endpoints omit the `Authorization` header automatically)

DictaLM 3.0 is a "thinking" model — it emits reasoning that AIStory strips before parsing the story JSON.

## Image endpoint

AIStory ships built-in image presets that point at the local proxy — pick one in Settings → Image model (no manual setup, no API key):

| Preset | Workflow | Notes |
| --- | --- | --- |
| ComfyUI FLUX schnell (fast) | `flux-storybook` | Fast text-to-image. |
| ComfyUI SDXL | `sdxl-storybook` | SDXL base, negative prompt. |
| ComfyUI SDXL Consistent | `sdxl-ipadapter-storybook` | SDXL + IP-Adapter; the character + background sheets are passed as identity/setting anchors for cross-page consistency. |
| ComfyUI SDXL Consistent (Hi-Res) | `sdxl-ipadapter-storybook-hires` | Same graph, then RealESRGAN x4 + downscale (~1.5x) for sharper output. |

Workflows live in `image-proxy/workflows/<name>.json`. The proxy substitutes `${PROMPT}`, `${NEGATIVE_PROMPT}`, `${SEED}`, `${WIDTH}`, `${HEIGHT}`, and (for IP-Adapter workflows) `${REF_IMAGE_1}`/`${REF_IMAGE_2}`, uploading reference images to ComfyUI first. If an IP-Adapter workflow gets no usable references, it falls back to plain `sdxl-storybook` text-to-image so the page still renders.

To wire it by hand instead (e.g. the Multiplay slot): Type `custom-image`, Endpoint `http://127.0.0.1:8989/v1/images/generations`, Model name = a workflow name above, API key empty.

`GET http://127.0.0.1:8989/health` reports `{ ok, comfy, workflows, ipadapter }`; AIStory's Settings surfaces this via the backend's `/api/local-image-health`.
