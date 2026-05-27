import { useEffect, useState } from 'react';
import { normalizeStoryHistory } from '../data/storyHistory';

function StoryHistory({ history, onOpenStory, onRecreateStory, onRemoveStory, onClearHistory, onClose }) {
  const [localHistory, setLocalHistory] = useState(() => normalizeStoryHistory(history));

  useEffect(() => {
    setLocalHistory(normalizeStoryHistory(history));
  }, [history]);

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

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="panel settings-panel modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="settings-panel-header">
          <div>
            <p className="eyebrow">History</p>
            <h2 id="history-title">Past stories</h2>
            <p>Keep the last 10 generated books. Open one, or recreate it from its saved setup.</p>
          </div>
          <div className="settings-actions">
            {localHistory.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear story history?')) {
                    onClearHistory();
                  }
                }}
              >
                Clear history
              </button>
            )}
            <button type="button" className="icon-text-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="settings-scroll-area">
          {localHistory.length === 0 ? (
            <div className="empty-library history-empty">
              <h4>No past stories yet</h4>
              <p>Generate a story and it will appear here automatically.</p>
            </div>
          ) : (
            <div className="history-list">
              {localHistory.map((entry) => (
                <article key={entry.id} className="history-card">
                  <div className="history-card-main">
                    <div>
                      <p className="eyebrow">{formatDate(entry.createdAt)}</p>
                      <h3>{entry.title}</h3>
                      <p>{entry.summary || entry.request.prompt}</p>
                      <div className="book-meta">
                        <span>{entry.pageCount} pages</span>
                        <span>{formatHistoryStatus(entry.book)}</span>
                        <span>{entry.language || 'English'}</span>
                        {entry.theme && <span>{entry.theme}</span>}
                        {entry.storyModel && <span>{entry.storyModel}</span>}
                      </div>
                      <details className="history-setup-details">
                        <summary>Saved setup</summary>
                        <dl>
                          <div>
                            <dt>Story idea</dt>
                            <dd>{entry.request.prompt || 'No story idea saved'}</dd>
                          </div>
                          <div>
                            <dt>Book details</dt>
                            <dd>
                              {entry.request.language || 'English'} · Ages {entry.request.childAge || '4-6'} · {entry.request.pageCount || entry.pageCount} pages · {entry.request.theme || 'bedtime'}
                              {entry.request.artStyle ? ` · ${entry.request.artStyle}` : ''}
                            </dd>
                          </div>
                          <div>
                            <dt>Characters</dt>
                            <dd>{formatCharacters(entry.request.characters)}</dd>
                          </div>
                        </dl>
                      </details>
                    </div>
                    <div className="history-actions">
                      <button type="button" className="use-model-button active" onClick={() => onOpenStory(entry.book)}>
                        Open
                      </button>
                      <button type="button" className="icon-text-button" onClick={() => onRecreateStory(entry.request)}>
                        Recreate
                      </button>
                      <button type="button" className="remove-button" onClick={() => onRemoveStory(entry.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return 'Saved story';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Saved story';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatHistoryStatus(book) {
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  const completeImages = pages.filter((page) => page.imageStatus === 'complete').length;

  if (book?.workflowStage === 'complete') {
    return 'Complete book';
  }

  if (book?.workflowStage === 'image-building') {
    return `${completeImages}/${pages.length || 0} images`;
  }

  return 'Story draft';
}

function formatCharacters(characters = []) {
  const names = characters
    .map((character) => character?.name)
    .filter(Boolean);

  if (names.length === 0) {
    return 'No characters saved';
  }

  return names.join(', ');
}

export default StoryHistory;
