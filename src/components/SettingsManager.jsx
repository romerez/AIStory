import { useEffect, useMemo, useState } from 'react';
import { buildPremadeStoryPrompt } from '../api/storyModelClient';
import { createEmptyModelProfile } from '../data/providerConfig';

function SettingsManager({ modelSettings, currentDraftRequest, onSaveSettings, onClose }) {
  const [localSettings, setLocalSettings] = useState(modelSettings);
  const premadePrompt = useMemo(() => {
    if (!currentDraftRequest) {
      return 'Start filling out the story form to preview the prompt.';
    }

    return buildPremadeStoryPrompt(currentDraftRequest);
  }, [currentDraftRequest]);

  useEffect(() => {
    setLocalSettings(modelSettings);
  }, [modelSettings]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  const updateProfile = (group, id, updates) => {
    setLocalSettings((current) => ({
      ...current,
      [group]: current[group].map((profile) => (
        profile.id === id ? { ...profile, ...updates } : profile
      )),
    }));
  };

  const addProfile = (group, kind) => {
    setLocalSettings((current) => ({
      ...current,
      [group]: [...current[group], createEmptyModelProfile(kind)],
    }));
  };

  const removeProfile = (group, id) => {
    setLocalSettings((current) => {
      const nextProfiles = current[group].filter((profile) => profile.locked || profile.id !== id);
      const activeKey = group === 'storyModels' ? 'activeStoryModelId' : 'activeImageModelId';

      return {
        ...current,
        [group]: nextProfiles,
        [activeKey]: current[activeKey] === id ? nextProfiles[0]?.id || '' : current[activeKey],
      };
    });
  };

  const setActiveProfile = (activeKey, id) => {
    setLocalSettings((current) => ({
      ...current,
      [activeKey]: id,
    }));
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="panel settings-panel modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-panel-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h2 id="settings-title">Models and API keys</h2>
            <p>Local demo models work now. API models need an endpoint and key.</p>
          </div>
          <div className="settings-actions">
            <button type="button" className="secondary-button" onClick={handleSave}>
              Save settings
            </button>
            <button type="button" className="icon-text-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="settings-scroll-area">
          <div className="settings-group">
            <div className="subsection-heading">
              <div>
                <h3>Premade story prompt</h3>
                <p>This is the prompt the selected story writer receives from the current form.</p>
              </div>
            </div>
            <div className="prompt-preview settings-prompt-preview">
              <pre>{premadePrompt}</pre>
            </div>
          </div>

          <ModelGroup
            title="Story writer models"
            group="storyModels"
            kind="story"
            profiles={localSettings.storyModels}
            activeId={localSettings.activeStoryModelId}
            onAdd={addProfile}
            onRemove={removeProfile}
            onUpdate={updateProfile}
            onUseDefault={(id) => setActiveProfile('activeStoryModelId', id)}
          />

          <ModelGroup
            title="Image models"
            group="imageModels"
            kind="image"
            profiles={localSettings.imageModels}
            activeId={localSettings.activeImageModelId}
            onAdd={addProfile}
            onRemove={removeProfile}
            onUpdate={updateProfile}
            onUseDefault={(id) => setActiveProfile('activeImageModelId', id)}
          />
        </div>
      </section>
    </div>
  );
}

function ModelGroup({ title, group, kind, profiles, activeId, onAdd, onRemove, onUpdate, onUseDefault }) {
  return (
    <div className="settings-group">
      <div className="subsection-heading">
        <div>
          <h3>{title}</h3>
          <p>{kind === 'story' ? 'Used to write story pages from the premade prompt.' : 'Used to create or regenerate page images.'}</p>
        </div>
        <button type="button" className="add-character-button" onClick={() => onAdd(group, kind)}>
          +
        </button>
      </div>

      <div className="settings-grid">
        {profiles.map((profile) => {
          const isActive = profile.id === activeId;

          return (
            <article key={profile.id} className={`settings-provider-card ${isActive ? 'active-provider-card' : ''}`}>
              <div className="settings-provider-heading">
                <div className="settings-provider-title">
                  <span
                    className={`model-icon model-icon-${getProviderSlug(profile.provider)}`}
                    aria-hidden="true"
                  >
                    {profile.icon || getProviderIcon(profile.provider)}
                  </span>
                  <div>
                    <h4>{profile.label || profile.modelName || 'Untitled model'}</h4>
                    <div className="model-card-badges">
                      <span className={`key-badge ${profile.type === 'local' || profile.apiKey ? 'key-saved' : 'key-missing'}`}>
                        {profile.type === 'local' ? 'Local' : profile.apiKey ? 'API key saved' : 'No API key'}
                      </span>
                      {isActive && <span className="active-model-badge">Active</span>}
                    </div>
                  </div>
                </div>

                <div className="settings-card-actions">
                  <button
                    type="button"
                    className={`use-model-button ${isActive ? 'active' : ''}`}
                    onClick={() => onUseDefault(profile.id)}
                    aria-pressed={isActive}
                  >
                    {isActive ? 'Using now' : kind === 'story' ? 'Use for stories' : 'Use for images'}
                  </button>
                  {!profile.locked && (
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => onRemove(group, profile.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-profile-fields">
                <div>
                  <label htmlFor={`label-${profile.id}`}>Display name</label>
                  <input
                    id={`label-${profile.id}`}
                    type="text"
                    value={profile.label || ''}
                    disabled={profile.locked}
                    onChange={(event) => onUpdate(group, profile.id, { label: event.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={`provider-${profile.id}`}>Provider</label>
                  <input
                    id={`provider-${profile.id}`}
                    type="text"
                    value={profile.provider || ''}
                    disabled={profile.locked}
                    onChange={(event) => onUpdate(group, profile.id, { provider: event.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={`model-${profile.id}`}>Model name</label>
                  <input
                    id={`model-${profile.id}`}
                    type="text"
                    value={profile.modelName || ''}
                    disabled={profile.locked}
                    onChange={(event) => onUpdate(group, profile.id, { modelName: event.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor={`endpoint-${profile.id}`}>Endpoint</label>
                  <input
                    id={`endpoint-${profile.id}`}
                    type="url"
                    value={profile.endpoint || ''}
                    disabled={profile.locked}
                    onChange={(event) => onUpdate(group, profile.id, { endpoint: event.target.value })}
                    placeholder={kind === 'story' ? 'OpenAI-compatible chat completions URL' : 'Image generation endpoint'}
                  />
                </div>
                <div className="settings-full-row">
                  <label htmlFor={`key-${profile.id}`}>API key</label>
                  <input
                    id={`key-${profile.id}`}
                    type="password"
                    value={profile.apiKey || ''}
                    disabled={profile.type === 'local'}
                    onChange={(event) => onUpdate(group, profile.id, { apiKey: event.target.value })}
                    placeholder="Stored in this browser for development"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getProviderIcon(provider = '') {
  const normalized = provider.trim().toLowerCase();

  if (normalized.includes('openai')) {
    return 'AI';
  }

  if (normalized.includes('anthropic')) {
    return 'A';
  }

  if (normalized.includes('google') || normalized.includes('gemini')) {
    return 'G';
  }

  if (normalized.includes('xai') || normalized.includes('x.ai')) {
    return 'xAI';
  }

  if (normalized.includes('multiplay')) {
    return 'M';
  }

  if (normalized.includes('local')) {
    return 'L';
  }

  return '+';
}

function getProviderSlug(provider = '') {
  const normalized = provider.trim().toLowerCase();

  if (normalized.includes('openai')) {
    return 'openai';
  }

  if (normalized.includes('anthropic')) {
    return 'anthropic';
  }

  if (normalized.includes('google') || normalized.includes('gemini')) {
    return 'google';
  }

  if (normalized.includes('xai') || normalized.includes('x.ai')) {
    return 'xai';
  }

  if (normalized.includes('multiplay')) {
    return 'multiplay';
  }

  if (normalized.includes('local')) {
    return 'local';
  }

  return 'custom';
}

export default SettingsManager;
