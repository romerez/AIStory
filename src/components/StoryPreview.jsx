import { useMemo, useState } from 'react';

function StoryPreview({ book, loading, onRegeneratePageImage, onClearStory }) {
  const [activePage, setActivePage] = useState(1);
  const [copiedPage, setCopiedPage] = useState(null);
  const selectedPage = book?.pages?.find((page) => page.pageNumber === activePage) || book?.pages?.[0];

  const jsonBlobUrl = useMemo(() => {
    if (!book) {
      return '';
    }

    return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(book, null, 2))}`;
  }, [book]);

  if (loading && !book) {
    return (
      <section className="panel empty-preview">
        <div className="loader" />
        <h2>Making the first book...</h2>
        <p>The local demo engine is writing page text and drawing matching illustrations.</p>
      </section>
    );
  }

  if (!book) {
    return (
      <section className="panel empty-preview">
        <p className="eyebrow">Preview</p>
        <h2>Your book will appear here</h2>
        <p>Use the sample prompt or write your own idea, then generate a complete test book.</p>
      </section>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCopyPrompt = async (page) => {
    try {
      await navigator.clipboard.writeText(page.illustrationPrompt);
      setCopiedPage(page.pageNumber);
      window.setTimeout(() => setCopiedPage(null), 1200);
    } catch {
      setCopiedPage(null);
    }
  };

  const characters = book.visualBible.characters || [];

  return (
    <section className="story-preview">
      <div className="panel book-overview">
        <div>
          <p className="eyebrow">Step 3: Pages and images</p>
          <h2>{book.storyTitle}</h2>
          <p>{book.storySummary}</p>
          <div className="book-meta">
            <span>{book.source === 'local-demo' ? 'Local demo' : 'API story'}</span>
            <span>{book.language || 'English'}</span>
            <span>{book.storyModel}</span>
            <span>{book.imageModel}</span>
          </div>
        </div>
        <div className="preview-actions">
          <button type="button" className="remove-button" onClick={onClearStory}>
            Clear story
          </button>
          <button type="button" className="secondary-button" onClick={handlePrint}>
            Print
          </button>
          <a className="download-button" href={jsonBlobUrl} download={`${book.id}.json`}>
            Download JSON
          </a>
        </div>
      </div>

      <article className="panel reader-panel">
        <div className="page-stage">
          <img src={selectedPage.imageUrl} alt={`Illustration for page ${selectedPage.pageNumber}`} />
        </div>
        <div className="page-copy">
          <p className="eyebrow">Page {selectedPage.pageNumber}</p>
          <p>{selectedPage.text}</p>
        </div>
        <div className="reader-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onRegeneratePageImage?.(selectedPage.pageNumber)}
          >
            Regenerate image
          </button>
          <button type="button" className="icon-text-button" onClick={() => handleCopyPrompt(selectedPage)}>
            {copiedPage === selectedPage.pageNumber ? 'Copied' : 'Copy image prompt'}
          </button>
        </div>
        <div className="page-nav" aria-label="Story pages">
          {book.pages.map((page) => (
            <button
              key={page.pageNumber}
              type="button"
              className={page.pageNumber === selectedPage.pageNumber ? 'page-tab active' : 'page-tab'}
              onClick={() => setActivePage(page.pageNumber)}
            >
              {page.pageNumber}
            </button>
          ))}
        </div>
      </article>

      <div className="panel bible-panel">
        <div>
          <p className="eyebrow">Visual bible</p>
          <h3>{book.visualBible.mainCharacter}</h3>
          <p>{book.visualBible.setting}</p>
        </div>
        {characters.length > 0 && (
          <div className="cast-grid">
            {characters.map((character) => (
              <article key={`${character.name}-${character.role}`} className="cast-card">
                <div>
                  <strong>{character.name}</strong>
                  <span>{character.role}</span>
                </div>
                <p>{character.description}</p>
                <em>{character.hasReferenceImage ? 'Reference image included' : 'No picture reference'}</em>
              </article>
            ))}
          </div>
        )}
        <div className="swatch-row">
          {book.visualBible.palette.map((color) => (
            <span key={color} className="color-swatch" style={{ backgroundColor: color }} />
          ))}
        </div>
        <ul className="detail-list">
          {book.visualBible.repeatedVisualDetails.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </div>

      <div className="page-list">
        {book.pages.map((page) => (
          <article key={page.pageNumber} className="panel page-card">
            <img src={page.imageUrl} alt={`Small illustration for page ${page.pageNumber}`} />
            <div>
              <p className="eyebrow">Page {page.pageNumber}</p>
              <p>{page.text}</p>
              <details>
                <summary>Illustration prompt</summary>
                <p>{page.illustrationPrompt}</p>
                <button type="button" className="icon-text-button" onClick={() => handleCopyPrompt(page)}>
                  {copiedPage === page.pageNumber ? 'Copied' : 'Copy prompt'}
                </button>
              </details>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default StoryPreview;
