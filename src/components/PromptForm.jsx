import { useEffect, useMemo, useRef, useState } from 'react';
import { artStyleOptions, childAgeOptions, languageOptions, themeOptions } from '../data/storyOptions';

const samplePrompt = 'Write me a story about why it is important to go to sleep early.';
const maxCharacters = 5;

function createCharacter(values = {}) {
  return {
    id: `character-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    role: '',
    description: '',
    referenceImageUrl: '',
    referenceImageFile: null,
    previewUrl: '',
    ...values,
  };
}

function PromptForm({ onGenerate, loading, modelSettings, characterToUse, onDraftChange }) {
  const [prompt, setPrompt] = useState(samplePrompt);
  const [characters, setCharacters] = useState(() => [
    createCharacter({
      id: 'character-sample-main',
      name: 'Milo',
      role: 'main character',
      description: 'A curious child who asks one more question before bed',
    }),
  ]);
  const [language, setLanguage] = useState('English');
  const [childAge, setChildAge] = useState('4-6');
  const [theme, setTheme] = useState('bedtime');
  const [artStyle, setArtStyle] = useState('');
  const [pageCount, setPageCount] = useState(6);
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [characterDragId, setCharacterDragId] = useState('');
  const fileInputRef = useRef(null);
  const previewUrlsRef = useRef(new Set());
  const storyModelId = modelSettings.activeStoryModelId || modelSettings.storyModels[0]?.id || '';
  const imageModelId = modelSettings.activeImageModelId || modelSettings.imageModels[0]?.id || '';
  const selectedStoryModel = modelSettings.storyModels.find((model) => model.id === storyModelId)
    || modelSettings.storyModels[0];

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!characterToUse) {
      return;
    }

    setCharacters((current) => {
      const nextCharacter = createCharacter({
        name: characterToUse.name || '',
        role: characterToUse.role || 'supporting character',
        description: characterToUse.description || '',
        referenceImageUrl: characterToUse.referenceImageUrl || '',
      });
      const emptyIndex = current.findIndex((character) => (
        !character.name.trim()
        && !character.role.trim()
        && !character.description.trim()
        && !character.referenceImageUrl.trim()
        && !character.referenceImageFile
      ));

      if (emptyIndex >= 0) {
        return current.map((character, index) => (
          index === emptyIndex ? nextCharacter : character
        ));
      }

      if (current.length >= maxCharacters) {
        return current;
      }

      return [...current, nextCharacter];
    });
  }, [characterToUse]);

  const requestPreview = useMemo(() => buildRequest(), [
    artStyle,
    characters,
    childAge,
    imageModelId,
    language,
    pageCount,
    prompt,
    referenceImageFile,
    referenceImageUrl,
    storyModelId,
    theme,
  ]);

  useEffect(() => {
    onDraftChange?.(requestPreview);
  }, [onDraftChange, requestPreview]);

  function buildRequest() {
    return {
      prompt: prompt.trim(),
      storyModelId,
      imageModelId,
      characters: characters.map((character, index) => ({
        name: character.name.trim(),
        role: character.role.trim() || (index === 0 ? 'main character' : 'supporting character'),
        description: character.description.trim(),
        referenceImageUrl: character.referenceImageUrl.trim() || null,
        referenceImageFile: character.referenceImageFile,
      })),
      language,
      childAge,
      theme,
      artStyle: artStyle.trim(),
      pageCount,
      referenceImageUrl: referenceImageUrl.trim() || null,
      referenceImageFile,
    };
  }

  const registerPreviewUrl = (file) => {
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.add(url);
    return url;
  };

  const revokePreviewUrl = (url) => {
    if (!url) {
      return;
    }

    URL.revokeObjectURL(url);
    previewUrlsRef.current.delete(url);
  };

  const handleFileUpload = (file) => {
    revokePreviewUrl(previewUrl);

    if (!file) {
      setReferenceImageFile(null);
      setPreviewUrl('');
      return;
    }

    setReferenceImageFile(file);
    setPreviewUrl(registerPreviewUrl(file));
    setReferenceImageUrl('');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    handleFileUpload(event.dataTransfer.files?.[0]);
  };

  const handleCharacterDrop = (event, id) => {
    event.preventDefault();
    setCharacterDragId('');
    handleCharacterFileUpload(id, event.dataTransfer.files?.[0]);
  };

  const handleCharacterDragLeave = (event, id) => {
    if (characterDragId !== id) {
      return;
    }

    const nextTarget = event.relatedTarget;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setCharacterDragId('');
    }
  };

  const handleUrlChange = (event) => {
    handleFileUpload(null);
    setReferenceImageUrl(event.target.value);
  };

  const updateCharacter = (id, updates) => {
    setCharacters((current) =>
      current.map((character) => (
        character.id === id ? { ...character, ...updates } : character
      )),
    );
  };

  const handleCharacterFileUpload = (id, file) => {
    setCharacters((current) =>
      current.map((character) => {
        if (character.id !== id) {
          return character;
        }

        revokePreviewUrl(character.previewUrl);

        if (!file) {
          return {
            ...character,
            referenceImageFile: null,
            previewUrl: '',
          };
        }

        return {
          ...character,
          referenceImageFile: file,
          referenceImageUrl: '',
          previewUrl: registerPreviewUrl(file),
        };
      }),
    );
  };

  const handleCharacterUrlChange = (id, value) => {
    setCharacters((current) =>
      current.map((character) => {
        if (character.id !== id) {
          return character;
        }

        revokePreviewUrl(character.previewUrl);

        return {
          ...character,
          referenceImageUrl: value,
          referenceImageFile: null,
          previewUrl: '',
        };
      }),
    );
  };

  const handleAddCharacter = () => {
    setCharacters((current) => {
      if (current.length >= maxCharacters) {
        return current;
      }

      return [
        ...current,
        createCharacter({
          role: 'supporting character',
        }),
      ];
    });
  };

  const handleRemoveCharacter = (id) => {
    setCharacters((current) => {
      if (current.length === 1) {
        return current;
      }

      const removed = current.find((character) => character.id === id);
      revokePreviewUrl(removed?.previewUrl);
      return current.filter((character) => character.id !== id);
    });
  };

  const resetCharacterPreviews = () => {
    characters.forEach((character) => revokePreviewUrl(character.previewUrl));
  };

  const handleUseSample = () => {
    resetCharacterPreviews();
    setPrompt(samplePrompt);
    setCharacters([
      createCharacter({
        id: 'character-sample-main',
        name: 'Milo',
        role: 'main character',
        description: 'A curious child who asks one more question before bed',
      }),
    ]);
    setChildAge('4-6');
    setLanguage('English');
    setTheme('bedtime');
    setArtStyle('');
    setPageCount(6);
    setReferenceImageUrl('');
    handleFileUpload(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onGenerate(buildRequest());
  };

  return (
    <section className="panel create-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Create</p>
          <h2>Make a story</h2>
        </div>
        <span className="status-pill">{selectedStoryModel?.type === 'local' ? 'Demo mode' : 'API mode'}</span>
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        <section className="simple-section character-section" aria-label="Characters">
          <div className="subsection-heading">
            <div>
              <h3>Set the book</h3>
              <p>Add characters, references, page count, theme, and illustration direction.</p>
            </div>
            <button
              type="button"
              className="add-character-button"
              onClick={handleAddCharacter}
              disabled={characters.length >= maxCharacters}
              aria-label="Add character"
            >
              +
            </button>
          </div>

          <div className="character-list">
            {characters.map((character, index) => (
              <article key={character.id} className="character-card">
                <div className="character-card-header">
                  <strong>{character.name || `Character ${index + 1}`}</strong>
                  {characters.length > 1 && (
                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => handleRemoveCharacter(character.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="field-row">
                  <div>
                    <label htmlFor={`character-name-${character.id}`}>Name</label>
                    <input
                      id={`character-name-${character.id}`}
                      type="text"
                      value={character.name}
                      onChange={(event) => updateCharacter(character.id, { name: event.target.value })}
                      placeholder={index === 0 ? 'Milo' : 'Luna'}
                    />
                  </div>

                  <div>
                    <label htmlFor={`character-role-${character.id}`}>Role</label>
                    <input
                      id={`character-role-${character.id}`}
                      type="text"
                      value={character.role}
                      onChange={(event) => updateCharacter(character.id, { role: event.target.value })}
                      placeholder={index === 0 ? 'main character' : 'friend'}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={`character-description-${character.id}`}>Description</label>
                  <input
                    id={`character-description-${character.id}`}
                    type="text"
                    value={character.description}
                    onChange={(event) => updateCharacter(character.id, { description: event.target.value })}
                    placeholder="Curly hair, green hoodie, loves tiny inventions"
                  />
                </div>

                <div className="character-reference-area">
                  <label htmlFor={`character-image-url-${character.id}`}>Picture reference</label>
                  <div className="character-reference-tools">
                    <label
                      className={`character-drop-area ${characterDragId === character.id ? 'drag-active' : ''}`}
                      htmlFor={`character-image-file-${character.id}`}
                      onDrop={(event) => handleCharacterDrop(event, character.id)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setCharacterDragId(character.id);
                      }}
                      onDragLeave={(event) => handleCharacterDragLeave(event, character.id)}
                    >
                      {character.previewUrl || character.referenceImageUrl ? (
                        <img
                          className="character-drop-preview"
                          src={character.previewUrl || character.referenceImageUrl}
                          alt={`${character.name || `Character ${index + 1}`} reference`}
                        />
                      ) : (
                        <span>
                          {character.referenceImageUrl ? 'Image URL added' : 'Drop picture or click to browse'}
                        </span>
                      )}
                      <small>
                        {character.referenceImageFile?.name || (character.referenceImageUrl ? 'Saved reference' : 'JPG, PNG, or WEBP')}
                      </small>
                    </label>
                    <input
                      id={`character-image-file-${character.id}`}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(event) => {
                        handleCharacterFileUpload(character.id, event.target.files?.[0]);
                        event.target.value = '';
                      }}
                    />
                    {(character.previewUrl || character.referenceImageUrl) && (
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => {
                          handleCharacterFileUpload(character.id, null);
                          handleCharacterUrlChange(character.id, '');
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    id={`character-image-url-${character.id}`}
                    type="url"
                    value={character.referenceImageUrl}
                    onChange={(event) => handleCharacterUrlChange(character.id, event.target.value)}
                    placeholder="Or paste an image URL"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="simple-section">
          <h3>Book details</h3>
          <div className="field-row">
            <div>
              <label htmlFor="language">Language</label>
              <select
                id="language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="childAge">Reading age</label>
              <select
                id="childAge"
                value={childAge}
                onChange={(event) => setChildAge(event.target.value)}
              >
                {childAgeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field-row">
            <div>
              <label htmlFor="theme">Theme</label>
              <select id="theme" value={theme} onChange={(event) => setTheme(event.target.value)}>
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="artStyle">Art style (optional)</label>
              <input
                id="artStyle"
                type="text"
                list="art-style-suggestions"
                value={artStyle}
                onChange={(event) => setArtStyle(event.target.value)}
                placeholder="Soft watercolor, claymation, pencil sketch..."
              />
              <datalist id="art-style-suggestions">
                {artStyleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          <div className="field-row">
            <div>
              <div className="range-label">
                <label htmlFor="pageCount">Pages</label>
                <strong>{pageCount}</strong>
              </div>
              <input
                id="pageCount"
                type="range"
                min="2"
                max="12"
                value={pageCount}
                onChange={(event) => setPageCount(Number(event.target.value))}
              />
            </div>
          </div>
        </section>

        <section className="simple-section reference-area">
          <h3>Overall style reference</h3>
          <div
            className={`drop-area ${dragActive ? 'drag-active' : ''}`}
            onDrop={handleDrop}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
          >
            <p>
              Drop an image, or{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => handleFileUpload(event.target.files?.[0])}
            />
          </div>
          <input
            type="url"
            value={referenceImageUrl}
            onChange={handleUrlChange}
            placeholder="Or paste an image URL"
          />
          {previewUrl && (
            <img className="upload-preview" src={previewUrl} alt="Overall style reference preview" />
          )}
        </section>

        <section className="simple-section">
          <h3>Story idea</h3>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Write me a story about..."
            required
          />
        </section>

        <div className="form-actions">
          <button type="submit" disabled={loading || !prompt.trim()}>
            {loading ? 'Generating story...' : 'Generate story'}
          </button>
          <button type="button" className="secondary-button" onClick={handleUseSample}>
            Reset sample
          </button>
        </div>
      </form>
    </section>
  );
}

export default PromptForm;
