import { useEffect, useMemo, useRef, useState } from 'react';
import { buildPremadeStoryPrompt } from '../api/storyModelClient';
import {
  createEmptyModelProfile,
  getProviderKeyId,
  getProviderKeyLabel,
  providerKeyProfiles,
} from '../data/providerConfig';

function SettingsManager({ modelSettings, currentDraftRequest, onSaveSettings, onClose }) {
  const [localSettings, setLocalSettings] = useState(modelSettings);
  const [saveStatus, setSaveStatus] = useState('');
  const saveStatusTimerRef = useRef(null);
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
      window.clearTimeout(saveStatusTimerRef.current);
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
    const nextSettings = {
      ...localSettings,
      [activeKey]: id,
    };

    setLocalSettings(nextSettings);
    saveSettingsWithoutClosing(nextSettings, activeKey === 'activeStoryModelId'
      ? 'Story model saved'
      : 'Image model saved');
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
  };

  const updateProviderKey = (keyId, value) => {
    setLocalSettings((current) => ({
      ...current,
      providerKeys: {
        ...(current.providerKeys || {}),
        [keyId]: value,
      },
    }));
  };

  const saveProviderKey = (keyProfile) => {
    saveSettingsWithoutClosing(
      localSettings,
      `${keyProfile.label} key saved`,
    );
  };

  const pasteProviderKey = async (keyProfile) => {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText.trim()) {
        setSaveStatus('Clipboard is empty');
        return;
      }

      const nextSettings = {
        ...localSettings,
        providerKeys: {
          ...(localSettings.providerKeys || {}),
          [keyProfile.id]: clipboardText.trim(),
        },
      };

      setLocalSettings(nextSettings);
      saveSettingsWithoutClosing(nextSettings, `${keyProfile.label} key pasted`);
    } catch {
      setSaveStatus('Clipboard blocked. Try Ctrl+V.');
    }
  };

  const saveSettingsWithoutClosing = (settings, message) => {
    onSaveSettings(settings, { keepOpen: true });
    setSaveStatus(message);
    window.clearTimeout(saveStatusTimerRef.current);
    saveStatusTimerRef.current = window.setTimeout(() => {
      setSaveStatus('');
    }, 1800);
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
            <p>Local demo works now. API models use server env keys first, then saved browser keys for local testing.</p>
          </div>
          <div className="settings-actions">
            {saveStatus && <span className="settings-save-status">{saveStatus}</span>}
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

          <ProviderKeyGroup
            providerKeys={localSettings.providerKeys || {}}
            onUpdate={updateProviderKey}
            onSave={saveProviderKey}
            onPaste={pasteProviderKey}
          />

          <ModelGroup
            title="Story writer models"
            group="storyModels"
            kind="story"
            profiles={localSettings.storyModels}
            activeId={localSettings.activeStoryModelId}
            providerKeys={localSettings.providerKeys || {}}
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
            providerKeys={localSettings.providerKeys || {}}
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

function ProviderKeyGroup({ providerKeys, onUpdate, onSave, onPaste }) {
  return (
    <div className="settings-group">
      <div className="subsection-heading">
        <div>
          <h3>Company API keys</h3>
          <p>Save one key per provider. Story and image models from the same company share it.</p>
        </div>
      </div>

      <div className="provider-key-grid">
        {providerKeyProfiles.map((keyProfile) => {
          const hasKey = Boolean(String(providerKeys[keyProfile.id] || '').trim());

          return (
            <article key={keyProfile.id} className="provider-key-card">
              <div className="provider-key-title">
                <span
                  className={`model-icon model-icon-${keyProfile.id}`}
                  aria-hidden="true"
                >
                  {keyProfile.icon}
                </span>
                <div>
                  <h4>{keyProfile.label}</h4>
                  <span>{hasKey ? 'Key saved for this company' : `Server env: ${keyProfile.envLabel}`}</span>
                </div>
              </div>
              <div className="key-save-row">
                <input
                  type="password"
                  value={providerKeys[keyProfile.id] || ''}
                  onChange={(event) => onUpdate(keyProfile.id, event.target.value)}
                  onPaste={(event) => {
                    event.preventDefault();
                    onUpdate(keyProfile.id, event.clipboardData.getData('text').trim());
                  }}
                  placeholder={`One ${keyProfile.label} key for all ${keyProfile.label} models`}
                  aria-label={`${keyProfile.label} API key`}
                />
                <button
                  type="button"
                  className="icon-text-button paste-key-button"
                  onClick={() => onPaste(keyProfile)}
                >
                  Paste
                </button>
                <button
                  type="button"
                  className="secondary-button save-key-button"
                  onClick={() => onSave(keyProfile)}
                >
                  Save key
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ModelGroup({
  title,
  group,
  kind,
  profiles,
  activeId,
  providerKeys,
  onAdd,
  onRemove,
  onUpdate,
  onUseDefault,
}) {
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

      <div className="model-picker-row">
        <label htmlFor={`${group}-active-picker`}>
          Active {kind === 'story' ? 'story model' : 'image model'}
        </label>
        <select
          id={`${group}-active-picker`}
          value={activeId}
          onChange={(event) => onUseDefault(event.target.value)}
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.provider || 'Custom'} - {profile.label || profile.modelName || 'Untitled model'}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-grid">
        {profiles.map((profile) => {
          const isActive = profile.id === activeId;
          const keyStatus = getModelKeyStatus(profile, providerKeys);

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
                      <span className={`key-badge ${keyStatus.hasKey ? 'key-saved' : 'key-missing'}`}>
                        {keyStatus.label}
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
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function getModelKeyStatus(profile, providerKeys) {
  if (!profile || profile.type === 'local') {
    return {
      hasKey: true,
      label: 'Local',
    };
  }

  const keyId = getProviderKeyId(profile.provider);
  const keyLabel = getProviderKeyLabel(profile.provider);
  const hasKey = Boolean(String(providerKeys?.[keyId] || profile.apiKey || '').trim());

  return {
    hasKey,
    label: hasKey ? `${keyLabel} key saved` : `No ${keyLabel} key`,
  };
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
