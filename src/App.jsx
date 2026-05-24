import { useEffect, useState } from 'react';
import PromptForm from './components/PromptForm';
import SettingsManager from './components/SettingsManager';
import StoryPreview from './components/StoryPreview';

const initialStory = {
  title: '',
  pages: [],
};

function App() {
  const [story, setStory] = useState(initialStory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showSettingsManager, setShowSettingsManager] = useState(false);
  const [apiKeys, setApiKeys] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('aistory-api-keys') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('aistory-api-keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  const handleSaveApiKey = (provider, apiKey) => {
    setApiKeys((current) => ({ ...current, [provider]: apiKey }));
  };

  const handleGenerate = async (request) => {
    setLoading(true);
    setError('');

    try {
      // Placeholder for later backend integration
      const generated = {
        title: `Sample story using ${request.providerName}`,
        pages: Array.from({ length: request.pageCount }, (_, index) => ({
          pageNumber: index + 1,
          text: `Page ${index + 1}: This story page was generated using ${request.modelName} on ${request.providerName}.`,
          imageUrl: `https://via.placeholder.com/640x480?text=Page+${index + 1}`,
        })),
      };
      setStory(generated);
    } catch (err) {
      setError('Unable to generate the story. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={darkMode ? 'app-shell dark' : 'app-shell'}>
      <header className="app-header">
        <div className="header-row">
          <div>
            <h1>AIStory</h1>
            <p>Create bedtime stories with matching illustrations.</p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowSettingsManager((current) => !current)}
            >
              {showSettingsManager ? 'Hide settings' : 'Settings manager'}
            </button>
            <button
              type="button"
              className="mode-toggle"
              onClick={() => setDarkMode((current) => !current)}
            >
              {darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            </button>
          </div>
        </div>
      </header>

      <main>
        {showSettingsManager && (
          <SettingsManager
            apiKeys={apiKeys}
            onSaveApiKey={handleSaveApiKey}
            onClose={() => setShowSettingsManager(false)}
          />
        )}
        <PromptForm
          onGenerate={handleGenerate}
          loading={loading}
          apiKeys={apiKeys}
          onSaveApiKey={handleSaveApiKey}
        />
        {error && <div className="error-banner">{error}</div>}
        <StoryPreview story={story} />
      </main>
    </div>
  );
}

export default App;
