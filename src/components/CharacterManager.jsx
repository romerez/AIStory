import { useEffect, useMemo, useState } from 'react';
import {
  createEmptySavedCharacter,
  createSavedCharacterFromDraft,
  normalizeSavedCharacters,
  upsertSavedCharacters,
} from '../data/characterLibrary';

function CharacterManager({
  savedCharacters,
  currentDraftCharacters,
  onSaveCharacters,
  onUseCharacter,
  onClose,
}) {
  const [localCharacters, setLocalCharacters] = useState(() => normalizeSavedCharacters(savedCharacters));
  const [message, setMessage] = useState('');

  const usableCurrentCharacters = useMemo(() => (
    (currentDraftCharacters || []).filter((character) => (
      character.name || character.description || character.referenceImageUrl || character.referenceImageFile
    ))
  ), [currentDraftCharacters]);

  useEffect(() => {
    setLocalCharacters(normalizeSavedCharacters(savedCharacters));
  }, [savedCharacters]);

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

  const updateCharacter = (id, updates) => {
    setMessage('');
    setLocalCharacters((current) => current.map((character) => (
      character.id === id
        ? { ...character, ...updates, updatedAt: new Date().toISOString() }
        : character
    )));
  };

  const addCharacter = () => {
    setMessage('');
    setLocalCharacters((current) => [
      createEmptySavedCharacter(),
      ...current,
    ]);
  };

  const removeCharacter = (id) => {
    setMessage('');
    setLocalCharacters((current) => current.filter((character) => character.id !== id));
  };

  const handleReferenceUpload = async (id, file) => {
    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    updateCharacter(id, { referenceImageUrl: dataUrl });
  };

  const handleSaveCurrentCast = async () => {
    if (usableCurrentCharacters.length === 0) {
      setMessage('Add a character in the book form first.');
      return;
    }

    const charactersToSave = await Promise.all(
      usableCurrentCharacters.map(async (character) => {
        const referenceImageUrl = character.referenceImageUrl
          || (character.referenceImageFile ? await readFileAsDataUrl(character.referenceImageFile) : '');

        return createSavedCharacterFromDraft(character, referenceImageUrl);
      }),
    );

    const nextCharacters = upsertSavedCharacters(localCharacters, charactersToSave);

    setLocalCharacters(nextCharacters);
    onSaveCharacters(nextCharacters);
    setMessage(`Saved ${charactersToSave.length} from the current book.`);
  };

  const handleSave = () => {
    onSaveCharacters(normalizeSavedCharacters(localCharacters));
    setMessage('Character library saved.');
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="panel settings-panel modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="characters-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-panel-header">
          <div>
            <p className="eyebrow">Characters</p>
            <h2 id="characters-title">Reusable characters</h2>
            <p>Save people, roles, descriptions, and picture references for later books.</p>
          </div>
          <div className="settings-actions">
            <button type="button" className="secondary-button" onClick={handleSave}>
              Save library
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
                <h3>From this book</h3>
                <p>Save the characters currently in the form so you can reuse them later.</p>
              </div>
              <button
                type="button"
                className="icon-text-button"
                onClick={handleSaveCurrentCast}
                disabled={usableCurrentCharacters.length === 0}
              >
                Save current cast
              </button>
            </div>
            {message && <p className="inline-note">{message}</p>}
          </div>

          <div className="settings-group">
            <div className="subsection-heading">
              <div>
                <h3>Saved characters</h3>
                <p>Edit the library here, then use any character in the current book.</p>
              </div>
              <button
                type="button"
                className="add-character-button"
                onClick={addCharacter}
                aria-label="Add saved character"
              >
                +
              </button>
            </div>

            {localCharacters.length === 0 ? (
              <div className="empty-library">
                <h4>No saved characters yet</h4>
                <p>Save the current cast or add a character manually.</p>
              </div>
            ) : (
              <div className="character-library-grid">
                {localCharacters.map((character, index) => (
                  <article key={character.id} className="character-library-card">
                    <div className="character-library-heading">
                      <div className="character-library-title">
                        {character.referenceImageUrl ? (
                          <img
                            className="character-avatar"
                            src={character.referenceImageUrl}
                            alt={`${character.name || `Character ${index + 1}`} reference`}
                          />
                        ) : (
                          <span className="character-avatar character-avatar-placeholder">
                            {(character.name || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <h4>{character.name || `Character ${index + 1}`}</h4>
                          <span>{character.role || 'supporting character'}</span>
                        </div>
                      </div>

                      <div className="settings-card-actions">
                        <button
                          type="button"
                          className="use-model-button active"
                          onClick={() => onUseCharacter(normalizeCharacterForUse(character))}
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() => removeCharacter(character.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="settings-profile-fields">
                      <div>
                        <label htmlFor={`saved-character-name-${character.id}`}>Name</label>
                        <input
                          id={`saved-character-name-${character.id}`}
                          type="text"
                          value={character.name}
                          onChange={(event) => updateCharacter(character.id, { name: event.target.value })}
                          placeholder="Milo"
                        />
                      </div>
                      <div>
                        <label htmlFor={`saved-character-role-${character.id}`}>Role</label>
                        <input
                          id={`saved-character-role-${character.id}`}
                          type="text"
                          value={character.role}
                          onChange={(event) => updateCharacter(character.id, { role: event.target.value })}
                          placeholder="main character"
                        />
                      </div>
                      <div className="settings-full-row">
                        <label htmlFor={`saved-character-description-${character.id}`}>Description</label>
                        <input
                          id={`saved-character-description-${character.id}`}
                          type="text"
                          value={character.description}
                          onChange={(event) => updateCharacter(character.id, { description: event.target.value })}
                          placeholder="Curly hair, green hoodie, loves tiny inventions"
                        />
                      </div>
                      <div className="settings-full-row">
                        <label htmlFor={`saved-character-reference-${character.id}`}>Picture reference</label>
                        <div className="library-reference-row">
                          <input
                            id={`saved-character-reference-${character.id}`}
                            type="url"
                            value={character.referenceImageUrl}
                            onChange={(event) => updateCharacter(character.id, { referenceImageUrl: event.target.value })}
                            placeholder="Paste an image URL"
                          />
                          <label
                            className="icon-text-button file-label-button"
                            htmlFor={`saved-character-file-${character.id}`}
                          >
                            Upload
                          </label>
                          <input
                            id={`saved-character-file-${character.id}`}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(event) => {
                              handleReferenceUpload(character.id, event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function normalizeCharacterForUse(character) {
  return {
    name: character.name || '',
    role: character.role || 'supporting character',
    description: character.description || '',
    referenceImageUrl: character.referenceImageUrl || '',
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

export default CharacterManager;
