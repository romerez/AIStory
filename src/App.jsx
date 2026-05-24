import { useEffect, useState } from 'react';
import {
  generateBookFromStoryModel,
  regeneratePageImageFromModel,
} from './api/storyModelClient';
import CharacterManager from './components/CharacterManager';
import PromptForm from './components/PromptForm';
import SettingsManager from './components/SettingsManager';
import StoryHistory from './components/StoryHistory';
import StoryPreview from './components/StoryPreview';
import UsageManager from './components/UsageManager';
import { normalizeSavedCharacters } from './data/characterLibrary';
import { mergeModelSettings } from './data/providerConfig';
import {
  addStoryToHistory,
  createHistoryRequestSnapshot,
  normalizeStoryHistory,
} from './data/storyHistory';
import {
  normalizeUsageStats,
  recordBookGeneration,
  recordImageRegeneration,
} from './data/usageTracker';

const STORAGE_KEY = 'aistory-latest-book';
const SETTINGS_KEY = 'aistory-model-settings';
const DARK_MODE_KEY = 'aistory-dark-mode';
const CHARACTER_LIBRARY_KEY = 'aistory-character-library';
const USAGE_KEY = 'aistory-model-usage';
const STORY_HISTORY_KEY = 'aistory-story-history';

function loadSavedBook() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function loadModelSettings() {
  try {
    return mergeModelSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'));
  } catch {
    return mergeModelSettings(null);
  }
}

function loadDarkMode() {
  try {
    return localStorage.getItem(DARK_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

function loadCharacterLibrary() {
  try {
    return normalizeSavedCharacters(JSON.parse(localStorage.getItem(CHARACTER_LIBRARY_KEY) || '[]'));
  } catch {
    return [];
  }
}

function loadUsageStats() {
  try {
    return normalizeUsageStats(JSON.parse(localStorage.getItem(USAGE_KEY) || '[]'));
  } catch {
    return [];
  }
}

function loadStoryHistory() {
  try {
    return normalizeStoryHistory(JSON.parse(localStorage.getItem(STORY_HISTORY_KEY) || '[]'));
  } catch {
    return [];
  }
}

function App() {
  const [book, setBook] = useState(loadSavedBook);
  const [modelSettings, setModelSettings] = useState(loadModelSettings);
  const [characterLibrary, setCharacterLibrary] = useState(loadCharacterLibrary);
  const [usageStats, setUsageStats] = useState(loadUsageStats);
  const [storyHistory, setStoryHistory] = useState(loadStoryHistory);
  const [characterToUse, setCharacterToUse] = useState(null);
  const [currentDraftRequest, setCurrentDraftRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(loadDarkMode);
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showUsage, setShowUsage] = useState(false);

  useEffect(() => {
    if (book) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(book));
      return;
    }

    sessionStorage.removeItem(STORAGE_KEY);
  }, [book]);

  useEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem(DARK_MODE_KEY, String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(modelSettings));
  }, [modelSettings]);

  useEffect(() => {
    localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(characterLibrary));
  }, [characterLibrary]);

  useEffect(() => {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usageStats));
  }, [usageStats]);

  useEffect(() => {
    localStorage.setItem(STORY_HISTORY_KEY, JSON.stringify(storyHistory));
  }, [storyHistory]);

  const handleGenerate = async (request) => {
    setLoading(true);
    setError('');

    try {
      const generatedBook = await generateBookFromStoryModel(request, modelSettings);
      const historyRequest = await createHistoryRequestSnapshot(request);

      setBook(generatedBook);
      setStoryHistory((current) => addStoryToHistory(current, generatedBook, historyRequest));
      setUsageStats((current) => recordBookGeneration(current, request, generatedBook, modelSettings));
    } catch (err) {
      setError(err.message || 'Unable to generate the story. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegeneratePageImage = async (pageNumber) => {
    if (!book) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updatedBook = await regeneratePageImageFromModel(book, pageNumber, modelSettings);

      setUsageStats((current) => recordImageRegeneration(current, book, modelSettings));
      setBook(updatedBook);
    } catch (err) {
      setError(err.message || 'Unable to regenerate the image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearStory = () => {
    if (!book) {
      return;
    }

    if (window.confirm('Are you sure you want to clear the current story?')) {
      setBook(null);
      setError('');
    }
  };

  return (
    <div className={darkMode ? 'app-shell dark' : 'app-shell'}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Stepped MVP demo</p>
          <h1>AIStory</h1>
          <p>Set the book, write the idea, then preview a child-ready mini-book.</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="icon-text-button"
            onClick={() => {
              setShowCharacters((current) => !current);
              setShowSettings(false);
              setShowHistory(false);
              setShowUsage(false);
            }}
          >
            Characters
          </button>
          <button
            type="button"
            className="icon-text-button"
            onClick={() => {
              setShowHistory((current) => !current);
              setShowCharacters(false);
              setShowSettings(false);
              setShowUsage(false);
            }}
          >
            History
          </button>
          <button
            type="button"
            className="icon-text-button"
            onClick={() => {
              setShowUsage((current) => !current);
              setShowCharacters(false);
              setShowHistory(false);
              setShowSettings(false);
            }}
          >
            Usage
          </button>
          <button
            type="button"
            className="icon-text-button"
            onClick={() => {
              setShowSettings((current) => !current);
              setShowCharacters(false);
              setShowHistory(false);
              setShowUsage(false);
            }}
          >
            Settings
          </button>
          <button
            type="button"
            className="icon-text-button"
            onClick={() => setDarkMode((current) => !current)}
          >
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>

      <main className="app-layout">
        <PromptForm
          onGenerate={handleGenerate}
          loading={loading}
          modelSettings={modelSettings}
          characterToUse={characterToUse}
          onDraftChange={setCurrentDraftRequest}
        />
        <div>
          {error && <div className="error-banner">{error}</div>}
          <StoryPreview
            book={book}
            loading={loading}
            onRegeneratePageImage={handleRegeneratePageImage}
            onClearStory={handleClearStory}
          />
        </div>
      </main>

      {showSettings && (
        <SettingsManager
          modelSettings={modelSettings}
          currentDraftRequest={currentDraftRequest}
          onSaveSettings={(settings) => {
            setModelSettings(mergeModelSettings(settings));
            setShowSettings(false);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showCharacters && (
        <CharacterManager
          savedCharacters={characterLibrary}
          currentDraftCharacters={currentDraftRequest?.characters || []}
          onSaveCharacters={(characters) => {
            setCharacterLibrary(normalizeSavedCharacters(characters));
          }}
          onUseCharacter={(character) => {
            setCharacterToUse({
              ...character,
              useToken: Date.now(),
            });
          }}
          onClose={() => setShowCharacters(false)}
        />
      )}

      {showHistory && (
        <StoryHistory
          history={storyHistory}
          onOpenStory={(historyBook) => {
            setBook(historyBook);
            setShowHistory(false);
          }}
          onRecreateStory={(request) => {
            setShowHistory(false);
            handleGenerate(request);
          }}
          onRemoveStory={(id) => {
            setStoryHistory((current) => current.filter((entry) => entry.id !== id));
          }}
          onClearHistory={() => {
            setStoryHistory([]);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showUsage && (
        <UsageManager
          usageStats={usageStats}
          modelSettings={modelSettings}
          onClearUsage={() => setUsageStats([])}
          onClose={() => setShowUsage(false)}
        />
      )}
    </div>
  );
}

export default App;
