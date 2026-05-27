export const maxSavedCharacters = 50;

export function createEmptySavedCharacter(values = {}) {
  const now = new Date().toISOString();

  return {
    id: `saved-character-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    role: 'supporting character',
    description: '',
    referenceImageUrl: '',
    createdAt: now,
    updatedAt: now,
    ...values,
  };
}

export function normalizeSavedCharacters(value) {
  const list = Array.isArray(value) ? value : [];

  return list
    .map((character) => normalizeSavedCharacter(character))
    .filter((character) => hasReusableCharacterContent(character))
    .slice(0, maxSavedCharacters);
}

export function createSavedCharacterFromDraft(character, referenceImageUrl = '') {
  return createEmptySavedCharacter({
    name: character?.name || '',
    role: character?.role || 'supporting character',
    description: character?.description || '',
    referenceImageUrl: referenceImageUrl || character?.referenceImageUrl || '',
  });
}

export function upsertSavedCharacters(existingCharacters, incomingCharacters) {
  const merged = normalizeSavedCharacters(existingCharacters);
  const incoming = normalizeSavedCharacters(incomingCharacters);

  incoming.forEach((character) => {
    const existingIndex = merged.findIndex((item) => getCharacterKey(item) === getCharacterKey(character));

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...merged[existingIndex],
        ...character,
        id: merged[existingIndex].id,
        createdAt: merged[existingIndex].createdAt,
        updatedAt: new Date().toISOString(),
      };
      return;
    }

    merged.unshift(character);
  });

  return merged.slice(0, maxSavedCharacters);
}

function normalizeSavedCharacter(character = {}) {
  const safeCharacter = character && typeof character === 'object' ? character : {};
  const now = new Date().toISOString();

  return {
    id: safeCharacter.id || `saved-character-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(safeCharacter.name || '').trim(),
    role: String(safeCharacter.role || 'supporting character').trim(),
    description: String(safeCharacter.description || '').trim(),
    referenceImageUrl: String(safeCharacter.referenceImageUrl || '').trim(),
    createdAt: safeCharacter.createdAt || now,
    updatedAt: safeCharacter.updatedAt || now,
  };
}

function hasReusableCharacterContent(character) {
  return Boolean(character.name || character.description || character.referenceImageUrl);
}

function getCharacterKey(character) {
  return [
    character.name || 'unnamed',
    character.role || 'supporting character',
  ].join('|').toLowerCase();
}
