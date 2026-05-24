export const maxStoryHistoryItems = 10;

export function normalizeStoryHistory(value) {
  const list = Array.isArray(value) ? value : [];

  return list
    .map((entry) => normalizeHistoryEntry(entry))
    .filter((entry) => entry.book && entry.request)
    .slice(0, maxStoryHistoryItems);
}

export function addStoryToHistory(history, book, request) {
  const entry = normalizeHistoryEntry({
    id: book?.id || `history-${Date.now()}`,
    createdAt: book?.createdAt || new Date().toISOString(),
    title: book?.storyTitle || 'Untitled story',
    summary: book?.storySummary || '',
    pageCount: Array.isArray(book?.pages) ? book.pages.length : request?.pageCount || 0,
    language: book?.language || request?.language || 'English',
    theme: book?.theme || request?.theme || '',
    storyModel: book?.storyModel || '',
    imageModel: book?.imageModel || '',
    book,
    request,
  });
  const current = normalizeStoryHistory(history);
  const withoutDuplicate = current.filter((item) => item.id !== entry.id);

  return [entry, ...withoutDuplicate].slice(0, maxStoryHistoryItems);
}

export async function createHistoryRequestSnapshot(request) {
  const characterSnapshots = await Promise.all(
    (request.characters || []).map(async (character) => ({
      name: character.name || '',
      role: character.role || '',
      description: character.description || '',
      referenceImageUrl: character.referenceImageUrl
        || (character.referenceImageFile ? await readFileAsDataUrl(character.referenceImageFile) : null),
      referenceImageFile: null,
    })),
  );

  return {
    ...request,
    characters: characterSnapshots,
    referenceImageUrl: request.referenceImageUrl
      || (request.referenceImageFile ? await readFileAsDataUrl(request.referenceImageFile) : null),
    referenceImageFile: null,
  };
}

function normalizeHistoryEntry(entry = {}) {
  const book = entry.book && typeof entry.book === 'object' ? entry.book : null;
  const request = normalizeHistoryRequest(entry.request);
  const createdAt = entry.createdAt || book?.createdAt || new Date().toISOString();

  return {
    id: entry.id || book?.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    title: String(entry.title || book?.storyTitle || 'Untitled story'),
    summary: String(entry.summary || book?.storySummary || ''),
    pageCount: Number(entry.pageCount || book?.pages?.length || request?.pageCount || 0),
    language: String(entry.language || book?.language || request?.language || 'English'),
    theme: String(entry.theme || book?.theme || request?.theme || ''),
    storyModel: String(entry.storyModel || book?.storyModel || ''),
    imageModel: String(entry.imageModel || book?.imageModel || ''),
    book,
    request,
  };
}

function normalizeHistoryRequest(request = {}) {
  if (!request || typeof request !== 'object') {
    return null;
  }

  return {
    prompt: String(request.prompt || ''),
    storyModelId: String(request.storyModelId || ''),
    imageModelId: String(request.imageModelId || ''),
    language: String(request.language || 'English'),
    childAge: String(request.childAge || '4-6'),
    theme: String(request.theme || 'bedtime'),
    artStyle: String(request.artStyle || ''),
    pageCount: Number(request.pageCount || 6),
    characters: Array.isArray(request.characters)
      ? request.characters.map((character, index) => ({
        name: String(character.name || ''),
        role: String(character.role || (index === 0 ? 'main character' : 'supporting character')),
        description: String(character.description || ''),
        referenceImageUrl: character.referenceImageUrl || null,
        referenceImageFile: null,
      }))
      : [],
    referenceImageUrl: request.referenceImageUrl || null,
    referenceImageFile: null,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to save the selected image to history.'));
    reader.readAsDataURL(file);
  });
}
