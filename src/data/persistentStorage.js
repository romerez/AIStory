import { normalizeStoryHistory } from './storyHistory';

export const PERSISTENCE_DB_NAME = 'aistory-persistence';

const PERSISTENCE_DB_VERSION = 1;
const STORE_NAME = 'kv';
const latestBookKey = 'latest-book';
const storyHistoryKey = 'story-history';

export async function loadLatestBook() {
  const storedBook = await getStoredValue(latestBookKey);

  if (storedBook && typeof storedBook === 'object') {
    return storedBook;
  }

  return loadLegacyJsonFromStorage(sessionStorage, 'aistory-latest-book', null);
}

export async function saveLatestBook(book) {
  if (!book) {
    await deleteStoredValue(latestBookKey);
    removeLegacyStorageKey(sessionStorage, 'aistory-latest-book');
    return;
  }

  await setStoredValue(latestBookKey, book);
  removeLegacyStorageKey(sessionStorage, 'aistory-latest-book');
}

export async function clearLatestBook() {
  await deleteStoredValue(latestBookKey);
  removeLegacyStorageKey(sessionStorage, 'aistory-latest-book');
}

export async function loadPersistentStoryHistory() {
  const storedHistory = await getStoredValue(storyHistoryKey);

  if (storedHistory) {
    return normalizeStoryHistory(storedHistory);
  }

  return normalizeStoryHistory(loadLegacyJsonFromStorage(localStorage, 'aistory-story-history', []));
}

export async function savePersistentStoryHistory(history) {
  await setStoredValue(storyHistoryKey, normalizeStoryHistory(history));
  removeLegacyStorageKey(localStorage, 'aistory-story-history');
}

export function deletePersistenceDatabase() {
  if (!hasIndexedDb()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(PERSISTENCE_DB_NAME);

    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

async function getStoredValue(key) {
  if (!hasIndexedDb()) {
    return null;
  }

  try {
    const db = await openDatabase();

    return await runStoreRequest(db, 'readonly', (store) => store.get(key));
  } catch (error) {
    console.warn('AIStory could not read IndexedDB storage.', error);
    return null;
  }
}

async function setStoredValue(key, value) {
  if (!hasIndexedDb()) {
    setFallbackStorageValue(key, value);
    return;
  }

  try {
    const db = await openDatabase();

    await runStoreRequest(db, 'readwrite', (store) => store.put(value, key));
  } catch (error) {
    console.warn('AIStory could not save IndexedDB storage.', error);
    throw error;
  }
}

async function deleteStoredValue(key) {
  if (!hasIndexedDb()) {
    return;
  }

  try {
    const db = await openDatabase();

    await runStoreRequest(db, 'readwrite', (store) => store.delete(key));
  } catch (error) {
    console.warn('AIStory could not clear IndexedDB storage.', error);
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PERSISTENCE_DB_NAME, PERSISTENCE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open AIStory IndexedDB storage.'));
  });
}

function runStoreRequest(db, mode, createRequest) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = createRequest(store);
    let result;

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error || new Error('AIStory storage request failed.'));
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('AIStory storage transaction failed.'));
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('AIStory storage transaction aborted.'));
    };
  });
}

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

function loadLegacyJsonFromStorage(storage, key, fallbackValue) {
  try {
    return JSON.parse(storage.getItem(key) || 'null') ?? fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function removeLegacyStorageKey(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // Storage can be unavailable in private modes; IndexedDB is the source of truth.
  }
}

function setFallbackStorageValue(key, value) {
  const storage = key === latestBookKey ? sessionStorage : localStorage;
  const fallbackKey = key === latestBookKey ? 'aistory-latest-book' : 'aistory-story-history';

  storage.setItem(fallbackKey, JSON.stringify(value));
}
