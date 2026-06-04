import {
  generateImagesForBook,
  generateBookFromStoryModel,
  generateCharacterSheetFromModel,
  generateLocationSheetFromModel,
  regeneratePageTextFromModel,
  regeneratePageImageFromModel,
  updateBookPageContent,
} from './storyModelClient.js';

const API_BASE = import.meta.env.VITE_AISTORY_API_URL
  || (import.meta.env.DEV ? 'http://127.0.0.1:8787' : '');

export async function generateBook(request, modelSettings, options = {}) {
  try {
    const payload = await postJson('/api/generate-story', {
      request: await createSerializableRequest(request),
      modelSettings,
    }, options);

    return payload.book || payload;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (isLocalOnlyRequest(request, modelSettings)) {
      return generateBookFromStoryModel(request, modelSettings);
    }

    throw addBackendHint(error);
  }
}

export async function generateStoryDraft(request, modelSettings, options = {}) {
  try {
    const payload = await postJson('/api/generate-story', {
      request: await createSerializableRequest(request),
      modelSettings,
      skipImages: true,
    }, options);

    return payload.book || payload;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (isLocalStoryRequest(request, modelSettings)) {
      return generateBookFromStoryModel(request, modelSettings, { skipImages: true });
    }

    throw addBackendHint(error);
  }
}

export async function generateBookImages(book, modelSettings, options = {}) {
  try {
    const payload = await postJson('/api/generate-book-images', {
      book,
      modelSettings,
    }, options);

    return payload.book || payload;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (isLocalImageBook(book, modelSettings)) {
      return generateImagesForBook(book, modelSettings);
    }

    throw addBackendHint(error);
  }
}

export async function generateCharacterSheet(book, modelSettings, options = {}) {
  try {
    const payload = await postJson('/api/generate-character-sheet', {
      book: createBookForCharacterSheetRequest(book),
      modelSettings,
    }, options);

    return mergeCharacterSheetIntoBook(book, payload.book || payload);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (isLocalImageBook(book, modelSettings)) {
      return generateCharacterSheetFromModel(book, modelSettings);
    }

    throw addBackendHint(error);
  }
}

export async function generateLocationSheet(book, modelSettings, options = {}) {
  try {
    const payload = await postJson('/api/generate-location-sheet', {
      book: createBookForLocationSheetRequest(book),
      modelSettings,
    }, options);

    return mergeLocationSheetIntoBook(book, payload.book || payload);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (isLocalImageBook(book, modelSettings)) {
      return generateLocationSheetFromModel(book, modelSettings);
    }

    throw addBackendHint(error);
  }
}

export async function regeneratePageImage(book, pageNumber, modelSettings, options = {}) {
  try {
    const payload = await postJson('/api/generate-image', {
      book: createBookForPageImageRequest(book, pageNumber),
      pageNumber,
      modelSettings,
    }, options);

    return mergePageResultIntoBook(book, payload.book || payload, pageNumber);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (isLocalImageBook(book, modelSettings)) {
      return regeneratePageImageFromModel(book, pageNumber, modelSettings);
    }

    throw addBackendHint(error);
  }
}

export async function regeneratePageText(book, pageNumber, modelSettings, instruction = '', options = {}) {
  try {
    const payload = await postJson('/api/regenerate-page-text', {
      book: createBookForTextRequest(book),
      pageNumber,
      instruction,
      modelSettings,
    }, options);

    return mergePageResultIntoBook(book, payload.book || payload, pageNumber);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (isLocalStoryBook(book, modelSettings)) {
      return regeneratePageTextFromModel(book, pageNumber, modelSettings, instruction);
    }

    throw addBackendHint(error);
  }
}

export async function getLocalImageHealth(endpoint = '', options = {}) {
  try {
    const query = endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : '';
    const response = await fetch(`${API_BASE}/api/local-image-health${query}`, {
      signal: options.signal,
    });

    return await response.json();
  } catch {
    return { ok: false, proxy: false, error: 'AIStory API server is not reachable.' };
  }
}

export async function getStoryProgress(options = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/story-progress`, {
      signal: options.signal,
    });

    return await response.json();
  } catch {
    return { active: false, reachable: false };
  }
}

export { updateBookPageContent };

async function postJson(path, body, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  }

  return payload;
}

function isAbortError(error) {
  return error?.name === 'AbortError'
    || /aborted|abort/i.test(String(error?.message || ''));
}

async function createSerializableRequest(request) {
  const characters = await Promise.all(
    (request.characters || []).map(async (character) => ({
      ...character,
      referenceImageUrl: character.referenceImageUrl
        || (character.referenceImageFile ? await readFileAsDataUrl(character.referenceImageFile) : null),
      referenceImageFile: null,
    })),
  );

  return {
    ...request,
    characters,
    referenceImageUrl: request.referenceImageUrl
      || (request.referenceImageFile ? await readFileAsDataUrl(request.referenceImageFile) : null),
    referenceImageFile: null,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

function isLocalOnlyRequest(request, modelSettings) {
  const storyModel = findProfile(
    modelSettings.storyModels,
    request.storyModelId,
  ) || findProfile(
    modelSettings.storyModels,
    modelSettings.activeStoryModelId,
  ) || modelSettings.storyModels[0];
  const imageModel = findProfile(
    modelSettings.imageModels,
    request.imageModelId,
  ) || findProfile(
    modelSettings.imageModels,
    modelSettings.activeImageModelId,
  ) || modelSettings.imageModels[0];

  return (!storyModel || storyModel.type === 'local') && (!imageModel || imageModel.type === 'local');
}

function isLocalStoryRequest(request, modelSettings) {
  const storyModel = findProfile(
    modelSettings.storyModels,
    request.storyModelId,
  ) || findProfile(
    modelSettings.storyModels,
    modelSettings.activeStoryModelId,
  ) || modelSettings.storyModels[0];

  return !storyModel || storyModel.type === 'local';
}

function isLocalStoryBook(book, modelSettings) {
  const storyModel = (modelSettings.storyModels || []).find((profile) => (
    (profile.label || profile.modelName) === book?.storyModel
  )) || findProfile(modelSettings.storyModels, modelSettings.activeStoryModelId);

  return !storyModel || storyModel.type === 'local';
}

function isLocalImageBook(book, modelSettings) {
  const imageModel = findProfile(modelSettings.imageModels, modelSettings.activeImageModelId)
    || (modelSettings.imageModels || []).find((profile) => (
      (profile.label || profile.modelName) === book?.imageModel
    ));

  return !imageModel || imageModel.type === 'local';
}

function findProfile(profiles = [], id) {
  return profiles.find((profile) => profile.id === id);
}

function createBookForPageImageRequest(book, pageNumber) {
  // Generated image data URLs can be several MB each. Keep them client-side and
  // merge the returned page back in, otherwise page 2+ can exceed API body limits.
  return {
    ...book,
    pages: (book?.pages || []).map((page) => ({
      ...page,
      imageUrl: page.pageNumber === pageNumber ? '' : stripGeneratedImageUrl(page.imageUrl),
    })),
  };
}

function createBookForTextRequest(book) {
  return {
    ...book,
    pages: (book?.pages || []).map((page) => ({
      ...page,
      imageUrl: stripGeneratedImageUrl(page.imageUrl),
    })),
  };
}

function createBookForCharacterSheetRequest(book) {
  // The sheet only needs the visual bible, art style, and supplied references.
  // Drop heavy generated page image data URLs so the request stays small.
  return {
    ...book,
    characterSheetUrl: '',
    pages: (book?.pages || []).map((page) => ({
      ...page,
      imageUrl: stripGeneratedImageUrl(page.imageUrl),
    })),
  };
}

function mergeCharacterSheetIntoBook(originalBook, responseBook) {
  if (!responseBook || typeof responseBook !== 'object') {
    return originalBook;
  }

  return {
    ...originalBook,
    imageModel: responseBook.imageModel || originalBook.imageModel,
    characterSheetUrl: responseBook.characterSheetUrl || originalBook.characterSheetUrl || '',
    characterSheetCreatedAt: responseBook.characterSheetCreatedAt
      || originalBook.characterSheetCreatedAt
      || '',
  };
}

function createBookForLocationSheetRequest(book) {
  return {
    ...book,
    locationSheetUrl: '',
    pages: (book?.pages || []).map((page) => ({
      ...page,
      imageUrl: stripGeneratedImageUrl(page.imageUrl),
    })),
  };
}

function mergeLocationSheetIntoBook(originalBook, responseBook) {
  if (!responseBook || typeof responseBook !== 'object') {
    return originalBook;
  }

  return {
    ...originalBook,
    imageModel: responseBook.imageModel || originalBook.imageModel,
    locationSheetUrl: responseBook.locationSheetUrl || originalBook.locationSheetUrl || '',
    locationSheetCreatedAt: responseBook.locationSheetCreatedAt
      || originalBook.locationSheetCreatedAt
      || '',
  };
}

function stripGeneratedImageUrl(imageUrl) {
  const value = String(imageUrl || '');

  if (!value || value.startsWith('data:image/')) {
    return '';
  }

  return value;
}

function mergePageResultIntoBook(originalBook, responseBook, pageNumber) {
  if (!responseBook || !Array.isArray(responseBook.pages)) {
    return originalBook;
  }

  const updatedPage = responseBook.pages.find((page) => page.pageNumber === pageNumber);

  if (!updatedPage) {
    return {
      ...originalBook,
      ...responseBook,
      pages: originalBook.pages,
    };
  }

  return {
    ...originalBook,
    ...responseBook,
    pages: (originalBook.pages || []).map((page) => (
      page.pageNumber === pageNumber ? updatedPage : page
    )),
  };
}

function addBackendHint(error) {
  const message = error?.message || 'Request failed.';

  if (message.includes('Failed to fetch')) {
    return new Error('The AIStory API server is not reachable. Run npm run dev so the backend and app start together.');
  }

  return error;
}
