export const maxStoryHistoryItems = 10;

export function normalizeStoryHistory(value) {
  const list = Array.isArray(value) ? value : [];

  return list
    .map((entry) => normalizeHistoryEntry(entry))
    .filter((entry) => entry.book && entry.request)
    .slice(0, maxStoryHistoryItems);
}

export function addStoryToHistory(history, book, request) {
  const setupRequest = request || book?.savedSetupSnapshot || book?.requestSnapshot || null;
  const entry = normalizeHistoryEntry({
    id: book?.id || `history-${Date.now()}`,
    createdAt: book?.createdAt || new Date().toISOString(),
    title: book?.storyTitle || 'Untitled story',
    summary: book?.storySummary || '',
    pageCount: Array.isArray(book?.pages) ? book.pages.length : setupRequest?.pageCount || 0,
    language: book?.language || setupRequest?.language || 'English',
    theme: book?.theme || setupRequest?.theme || '',
    storyModel: book?.storyModel || '',
    imageModel: book?.imageModel || '',
    book,
    request: setupRequest,
  });
  const current = normalizeStoryHistory(history);
  const withoutDuplicate = current.filter((item) => item.id !== entry.id);

  return [entry, ...withoutDuplicate].slice(0, maxStoryHistoryItems);
}

export async function createHistoryRequestSnapshot(request) {
  const characterSnapshots = await Promise.all(
    (request.characters || []).map(async (character) => {
      const safeCharacter = character && typeof character === 'object' ? character : {};

      return {
        name: safeCharacter.name || '',
        role: safeCharacter.role || '',
        description: safeCharacter.description || '',
        referenceImageUrl: safeCharacter.referenceImageUrl
          || (safeCharacter.referenceImageFile ? await readFileAsDataUrl(safeCharacter.referenceImageFile) : null),
        referenceImageFile: null,
      };
    }),
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
  const safeEntry = entry && typeof entry === 'object' ? entry : {};
  const book = safeEntry.book && typeof safeEntry.book === 'object' ? safeEntry.book : null;
  const request = normalizeHistoryRequest(safeEntry.request);
  const createdAt = safeEntry.createdAt || book?.createdAt || new Date().toISOString();

  return {
    id: safeEntry.id || book?.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    title: String(safeEntry.title || book?.storyTitle || 'Untitled story'),
    summary: String(safeEntry.summary || book?.storySummary || ''),
    pageCount: Number(safeEntry.pageCount || book?.pages?.length || request?.pageCount || 0),
    language: String(safeEntry.language || book?.language || request?.language || 'English'),
    theme: String(safeEntry.theme || book?.theme || request?.theme || ''),
    storyModel: String(safeEntry.storyModel || book?.storyModel || ''),
    imageModel: String(safeEntry.imageModel || book?.imageModel || ''),
    book,
    request,
  };
}

export function normalizeHistoryRequest(request = {}) {
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
    themePreset: String(request.themePreset || request.theme || 'bedtime'),
    customTheme: String(request.customTheme || ''),
    artStyle: String(request.artStyle || ''),
    pageCount: Number(request.pageCount || 6),
    characters: Array.isArray(request.characters)
      ? request.characters.map((character, index) => {
        const safeCharacter = character && typeof character === 'object' ? character : {};

        return {
          name: String(safeCharacter.name || ''),
          role: String(safeCharacter.role || (index === 0 ? 'main character' : 'supporting character')),
          description: String(safeCharacter.description || ''),
          referenceImageUrl: safeCharacter.referenceImageUrl || null,
          referenceImageFile: null,
        };
      })
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
