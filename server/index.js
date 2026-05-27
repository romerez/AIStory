import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateImagesForBook,
  generateBookFromStoryModel,
  regeneratePageTextFromModel,
  regeneratePageImageFromModel,
} from '../src/api/storyModelClient.js';
import { mergeModelSettings } from '../src/data/providerConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.API_PORT || process.env.PORT || 8787);
const serveStatic = process.env.SERVE_STATIC !== 'false';
const maxBodyBytes = Number(process.env.AISTORY_MAX_BODY_BYTES || 15 * 1024 * 1024);

const server = createServer(async (request, response) => {
  setCorsHeaders(response);
  const requestAbortController = new AbortController();

  response.on('close', () => {
    if (!response.writableEnded) {
      requestAbortController.abort();
    }
  });

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (url.pathname === '/api/health' && request.method === 'GET') {
      sendJson(response, 200, {
        ok: true,
        providers: getProviderKeyStatus(),
      });
      return;
    }

    if (url.pathname === '/api/generate-story' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const storyRequest = normalizeGenerateRequest(body.request || body);
      const modelSettings = resolveServerModelSettings(body.modelSettings);
      const book = await generateBookFromStoryModel(storyRequest, modelSettings, {
        skipImages: Boolean(body.skipImages),
        signal: requestAbortController.signal,
      });

      sendJson(response, 200, { book });
      return;
    }

    if (url.pathname === '/api/generate-book-images' && request.method === 'POST') {
      const body = await readJsonBody(request);

      if (!body.book || typeof body.book !== 'object') {
        throw createHttpError(400, 'A generated story draft is required.');
      }

      const modelSettings = resolveServerModelSettings(body.modelSettings);
      const book = await generateImagesForBook(body.book, modelSettings, {
        signal: requestAbortController.signal,
      });

      sendJson(response, 200, { book });
      return;
    }

    if (url.pathname === '/api/generate-image' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const pageNumber = Number(body.pageNumber);

      if (!body.book || typeof body.book !== 'object') {
        throw createHttpError(400, 'A generated book is required.');
      }

      if (!Number.isFinite(pageNumber)) {
        throw createHttpError(400, 'A page number is required.');
      }

      const modelSettings = resolveServerModelSettings(body.modelSettings);
      const book = await regeneratePageImageFromModel(body.book, pageNumber, modelSettings, {
        signal: requestAbortController.signal,
      });

      sendJson(response, 200, { book });
      return;
    }

    if (url.pathname === '/api/regenerate-page-text' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const pageNumber = Number(body.pageNumber);

      if (!body.book || typeof body.book !== 'object') {
        throw createHttpError(400, 'A generated book is required.');
      }

      if (!Number.isFinite(pageNumber)) {
        throw createHttpError(400, 'A page number is required.');
      }

      const modelSettings = resolveServerModelSettings(body.modelSettings);
      const book = await regeneratePageTextFromModel(
        body.book,
        pageNumber,
        modelSettings,
        cleanText(body.instruction, 500),
        { signal: requestAbortController.signal },
      );

      sendJson(response, 200, { book });
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'API route not found.' });
      return;
    }

    if (serveStatic) {
      await serveDistFile(url.pathname, response);
      return;
    }

    sendJson(response, 404, { error: 'Not found.' });
  } catch (error) {
    if (isAbortError(error)) {
      sendJson(response, 499, { error: 'Request stopped.' });
      return;
    }

    const status = Number(error.statusCode || 500);
    const message = error.expose || status < 500
      ? error.message
      : 'The AIStory API failed while generating the book.';

    if (status >= 500) {
      console.error(error);
    }

    sendJson(response, status, { error: message });
  }
});

server.listen(port, () => {
  console.log(`AIStory API server listening on http://127.0.0.1:${port}`);
});

function normalizeGenerateRequest(request = {}) {
  const prompt = cleanText(request.prompt, 3000);

  if (!prompt) {
    throw createHttpError(400, 'A story idea is required.');
  }

  const pageCount = clamp(Number(request.pageCount || 6), 2, 12);
  const characters = Array.isArray(request.characters)
    ? request.characters.slice(0, 5).map((character, index) => ({
      name: cleanText(character.name, 80),
      role: cleanText(character.role, 80) || (index === 0 ? 'main character' : 'supporting character'),
      description: cleanText(character.description, 500),
      referenceImageUrl: cleanImageReference(character.referenceImageUrl),
      referenceImageFile: null,
    }))
    : [];

  return {
    prompt,
    storyModelId: cleanText(request.storyModelId, 140),
    imageModelId: cleanText(request.imageModelId, 140),
    language: cleanText(request.language, 60) || 'English',
    childAge: cleanText(request.childAge, 40) || '4-6',
    theme: cleanText(request.theme, 140) || 'bedtime',
    themePreset: cleanText(request.themePreset, 80),
    customTheme: cleanText(request.customTheme, 140),
    artStyle: cleanText(request.artStyle, 180),
    pageCount,
    characters,
    referenceImageUrl: cleanImageReference(request.referenceImageUrl),
    referenceImageFile: null,
  };
}

function resolveServerModelSettings(rawSettings) {
  const settings = mergeModelSettings(rawSettings);

  return {
    ...settings,
    storyModels: settings.storyModels.map((profile) => resolveServerProfile(profile)),
    imageModels: settings.imageModels.map((profile) => resolveServerProfile(profile)),
  };
}

function resolveServerProfile(profile) {
  const apiKey = profile.apiKey || getProviderApiKey(profile) || '';
  const endpoint = getProviderEndpoint(profile) || profile.endpoint || '';

  return {
    ...profile,
    apiKey,
    endpoint,
  };
}

function getProviderApiKey(profile = {}) {
  const provider = String(profile.provider || '').toLowerCase();

  if (provider.includes('openai')) {
    return process.env.OPENAI_API_KEY || '';
  }

  if (provider.includes('anthropic')) {
    return process.env.ANTHROPIC_API_KEY || '';
  }

  if (provider.includes('google') || provider.includes('gemini')) {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  }

  if (provider.includes('xai') || provider.includes('x.ai')) {
    return process.env.XAI_API_KEY || '';
  }

  if (provider.includes('multiplay')) {
    return process.env.MULTIPLAY_API_KEY || '';
  }

  return '';
}

function getProviderEndpoint(profile = {}) {
  const provider = String(profile.provider || '').toLowerCase();

  if (provider.includes('multiplay') && process.env.MULTIPLAY_IMAGE_ENDPOINT) {
    return process.env.MULTIPLAY_IMAGE_ENDPOINT;
  }

  return '';
}

function getProviderKeyStatus() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    xai: Boolean(process.env.XAI_API_KEY),
    multiplay: Boolean(process.env.MULTIPLAY_API_KEY),
  };
}

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanImageReference(value) {
  const reference = String(value || '').trim();

  if (!reference) {
    return null;
  }

  if (/^https?:\/\//i.test(reference) || /^data:image\//i.test(reference)) {
    return reference;
  }

  return null;
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let rawBody = '';

    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);

      if (size > maxBodyBytes) {
        reject(createHttpError(413, 'Request is too large.'));
        request.destroy();
        return;
      }

      rawBody += chunk;
    });
    request.on('error', reject);
    request.on('end', () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch {
        reject(createHttpError(400, 'Request body must be valid JSON.'));
      }
    });
  });
}

async function serveDistFile(urlPath, response) {
  const requestedPath = decodeURIComponent(urlPath.split('?')[0] || '/');
  const safePath = requestedPath === '/'
    ? 'index.html'
    : requestedPath.replace(/^\/+/, '');
  const resolvedPath = path.resolve(distDir, safePath);

  if (!resolvedPath.startsWith(distDir)) {
    sendJson(response, 403, { error: 'Forbidden.' });
    return;
  }

  try {
    const fileStat = await stat(resolvedPath);

    if (fileStat.isFile()) {
      response.writeHead(200, {
        'Content-Type': getContentType(resolvedPath),
      });
      createReadStream(resolvedPath).pipe(response);
      return;
    }
  } catch {
    // Fall through to SPA index.
  }

  try {
    const html = await readFile(path.join(distDir, 'index.html'), 'utf8');
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
  } catch {
    sendJson(response, 404, { error: 'Build output not found. Run npm run build first.' });
  }
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === '.html') return 'text/html; charset=utf-8';
  if (extension === '.js') return 'application/javascript; charset=utf-8';
  if (extension === '.css') return 'text/css; charset=utf-8';
  if (extension === '.json') return 'application/json; charset=utf-8';
  if (extension === '.svg') return 'image/svg+xml';
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';

  return 'application/octet-stream';
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', process.env.AISTORY_CORS_ORIGIN || '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(response, status, payload) {
  if (response.destroyed || response.writableEnded) {
    return;
  }

  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isAbortError(error) {
  return error?.name === 'AbortError'
    || /aborted|abort|stopped by the user/i.test(String(error?.message || ''));
}
