import { providers, providerModels } from '../data/providerConfig';
import { useState, useEffect } from 'react';

function SettingsManager({ apiKeys, onSaveApiKey, onClose }) {
  const [localKeys, setLocalKeys] = useState(apiKeys);

  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  const setKey = (provider, value) => {
    setLocalKeys((current) => ({ ...current, [provider]: value }));
  };

  const handleSave = (provider) => {
    onSaveApiKey(provider, localKeys[provider] || '');
  };

  return (
    <section className="card settings-panel">
      <div className="settings-panel-header">
        <div>
          <h2>Settings manager</h2>
          <p>Review every provider model and update API keys in one place.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="settings-grid">
        {providers.map((provider) => {
          const modelList = providerModels[provider.value] || [];
          const savedKey = localKeys[provider.value];

          return (
            <div key={provider.value} className="settings-provider-card">
              <div className="settings-provider-heading">
                <div>
                  <h3>{provider.label}</h3>
                  <span className={`key-badge ${savedKey ? 'key-saved' : 'key-missing'}`}>
                    {savedKey ? 'API key saved' : 'No API key'}
                  </span>
                </div>
              </div>

              <div className="settings-model-list">
                <strong>Models</strong>
                <ul>
                  {modelList.map((model) => (
                    <li key={model.value}>{model.label}</li>
                  ))}
                </ul>
              </div>

              <div className="settings-key-row">
                <label htmlFor={`key-${provider.value}`}>API key</label>
                <input
                  id={`key-${provider.value}`}
                  type="text"
                  value={localKeys[provider.value] || ''}
                  onChange={(event) => setKey(provider.value, event.target.value)}
                  placeholder={`Enter ${provider.label} API key`}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleSave(provider.value)}
                >
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default SettingsManager;
