/**
 * AIStory local image proxy
 *
 * Speaks AIStory's `custom-image` contract on the inbound side and ComfyUI's
 * graph-based REST API on the outbound side.
 *
 * Inbound contract (from AIStory):
 *   POST /v1/images/generations
 *   { "model": "sdxl-storybook" | "flux-storybook" | ..., "prompt": "...", "input": "..." }
 *
 * Outbound contract (to ComfyUI):
 *   POST /prompt    → { prompt_id }
 *   GET  /history/{prompt_id}
 *   GET  /view?filename=...
 *
 * Response (back to AIStory):
 *   { "data": [ { "b64_json": "<png base64>" } ] }
 *
 * Workflows live in ./workflows/<model>.json. The proxy reads the template,
 * substitutes ${PROMPT}, ${NEGATIVE_PROMPT}, ${SEED}, ${WIDTH}, ${HEIGHT}
 * tokens, then submits the parsed JSON to ComfyUI.
 */

import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.IMAGE_PROXY_PORT || 8989);
const COMFY_URL = process.env.COMFY_URL || 'http://127.0.0.1:8188';
const POLL_INTERVAL_MS = 750;
const POLL_TIMEOUT_MS = 1000 * 60 * 5; // 5 minutes per page
const MAX_BODY_BYTES = 4 * 1024 * 1024; // 4MB inbound (prompt only, no images yet)

const WORKFLOWS_DIR = path.join(__dirname, 'workflows');
const DEFAULT_NEGATIVE = [
  'text, watermark, logo, signature, caption, lettering',
  'low quality, blurry, deformed, ugly, malformed hands, extra fingers',
  'scary, frightening, violent, mature, sexual',
  'photo realistic, photograph',
].join(', ');

const workflowCache = new Map();

// ---------- HTTP server ----------

const server = createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      const comfyOk = await isComfyAlive();
      const workflows = await listWorkflows();
      sendJson(res, 200, { ok: true, comfy: comfyOk, comfyUrl: COMFY_URL, workflows });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/images/generations') {
      const body = await readJsonBody(req);
      const prompt = cleanString(body.prompt || body.input);
      const modelName = cleanString(body.model) || 'sdxl-storybook';

      if (!prompt) {
        throw httpError(400, 'A non-empty `prompt` (or `input`) is required.');
      }

      const result = await generateImage({
        prompt,
        modelName,
        negativePrompt: cleanString(body.negative_prompt) || DEFAULT_NEGATIVE,
        width: numberOr(body.width, 0),
        height: numberOr(body.height, 0),
        seed: numberOr(body.seed, 0),
      });

      sendJson(res, 200, {
        created: Math.floor(Date.now() / 1000),
        data: [{ b64_json: result.b64 }],
        // surface debug info so the AIStory side could log it if it wanted
        _proxy: {
          workflow: modelName,
          promptId: result.promptId,
          elapsedMs: result.elapsedMs,
        },
      });
      return;
    }

    sendJson(res, 404, { error: { message: 'Not found.' } });
  } catch (error) {
    const status = Number(error.statusCode) || 500;
    if (status >= 500) {
      console.error('[image-proxy]', error);
    }
    sendJson(res, status, { error: { message: error.message || 'Internal error.' } });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[image-proxy] listening on http://127.0.0.1:${PORT}`);
  console.log(`[image-proxy] ComfyUI expected at ${COMFY_URL}`);
});

// ---------- Generation pipeline ----------

async function generateImage({ prompt, modelName, negativePrompt, width, height, seed }) {
  const t0 = Date.now();
  const workflow = await loadWorkflowTemplate(modelName);

  const filledWorkflow = JSON.parse(
    JSON.stringify(workflow.template)
      .replaceAll('${PROMPT}', escapeJsonString(prompt))
      .replaceAll('${NEGATIVE_PROMPT}', escapeJsonString(negativePrompt))
      .replaceAll('${SEED}', String(seed || Math.floor(Math.random() * 2 ** 31)))
      .replaceAll('${WIDTH}', String(width || workflow.defaultWidth || 1216))
      .replaceAll('${HEIGHT}', String(height || workflow.defaultHeight || 832)),
  );

  const submission = await postComfy('/prompt', { prompt: filledWorkflow });
  const promptId = submission?.prompt_id;

  if (!promptId) {
    throw httpError(502, `ComfyUI did not return a prompt_id (got: ${JSON.stringify(submission).slice(0, 300)})`);
  }

  const history = await pollHistory(promptId);
  const outputs = history?.outputs || {};
  const imageInfo = findFirstImage(outputs);

  if (!imageInfo) {
    throw httpError(502, `ComfyUI completed prompt ${promptId} but produced no image output.`);
  }

  const buffer = await fetchComfyImage(imageInfo);
  const b64 = buffer.toString('base64');

  return { b64, promptId, elapsedMs: Date.now() - t0 };
}

async function loadWorkflowTemplate(modelName) {
  if (workflowCache.has(modelName)) {
    return workflowCache.get(modelName);
  }

  const filePath = path.join(WORKFLOWS_DIR, `${modelName}.json`);

  if (!existsSync(filePath)) {
    const available = await listWorkflows();
    throw httpError(
      400,
      `Unknown workflow "${modelName}". Available: ${available.join(', ') || '(none)'}. Drop a JSON file in ${WORKFLOWS_DIR}.`,
    );
  }

  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  // Allow either a bare ComfyUI graph or a wrapper { template, defaultWidth, defaultHeight }
  const entry = parsed?.template
    ? { template: parsed.template, defaultWidth: parsed.defaultWidth, defaultHeight: parsed.defaultHeight }
    : { template: parsed };

  workflowCache.set(modelName, entry);
  return entry;
}

async function listWorkflows() {
  try {
    const files = await readdir(WORKFLOWS_DIR);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}

// ---------- ComfyUI client helpers ----------

async function postComfy(pathname, body) {
  const response = await fetch(`${COMFY_URL}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw httpError(
      502,
      `ComfyUI ${pathname} returned ${response.status}: ${text.slice(0, 500)}`,
    );
  }

  return response.json();
}

async function pollHistory(promptId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await fetch(`${COMFY_URL}/history/${promptId}`);

    if (response.ok) {
      const data = await response.json();
      const entry = data?.[promptId];
      if (entry && entry.outputs && Object.keys(entry.outputs).length > 0) {
        return entry;
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw httpError(504, `Timed out waiting for ComfyUI prompt ${promptId} (${POLL_TIMEOUT_MS}ms).`);
}

function findFirstImage(outputs) {
  for (const nodeId of Object.keys(outputs)) {
    const images = outputs[nodeId]?.images;
    if (Array.isArray(images) && images.length > 0) {
      return images[0];
    }
  }
  return null;
}

async function fetchComfyImage({ filename, subfolder = '', type = 'output' }) {
  const params = new URLSearchParams({ filename, subfolder, type });
  const response = await fetch(`${COMFY_URL}/view?${params}`);

  if (!response.ok) {
    throw httpError(502, `ComfyUI /view returned ${response.status} for ${filename}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function isComfyAlive() {
  try {
    const response = await fetch(`${COMFY_URL}/system_stats`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

// ---------- Plumbing ----------

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(httpError(413, 'Request body too large.'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('error', reject);
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(httpError(400, 'Request body must be valid JSON.'));
      }
    });
  });
}

function sendJson(res, status, payload) {
  if (res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function cleanString(value) {
  return String(value || '').trim();
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function escapeJsonString(value) {
  // We're substituting INSIDE a JSON-stringified template, so we need to
  // produce a sequence that's valid JSON-string content. JSON.stringify
  // gives us the surrounding quotes too — strip them.
  const encoded = JSON.stringify(String(value));
  return encoded.slice(1, -1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
