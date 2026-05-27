import { useEffect, useMemo, useState } from 'react';

function StoryPreview({
  book,
  loading,
  processState,
  onStop,
  onGenerateBookImages,
  onRegeneratePageImage,
  onUpdatePageContent,
  onRegeneratePageText,
  onSaveStory,
  saveStatus,
  onClearStory,
}) {
  const [activePage, setActivePage] = useState(1);
  const [copiedPage, setCopiedPage] = useState(null);
  const [approvedPages, setApprovedPages] = useState(() => new Set());
  const [editingPage, setEditingPage] = useState(null);
  const [editText, setEditText] = useState('');
  const [editImageDescription, setEditImageDescription] = useState('');
  const [rewriteInstruction, setRewriteInstruction] = useState('');
  const selectedPage = book?.pages?.find((page) => page.pageNumber === activePage) || book?.pages?.[0];
  const hasPendingImages = Boolean(book?.pages?.some((page) => page.imageStatus === 'pending'));
  const hasFailedImages = Boolean(book?.pages?.some((page) => page.imageStatus === 'failed'));
  const isStoryDraft = book?.workflowStage !== 'image-building'
    && book?.workflowStage !== 'complete'
    && (book?.workflowStage === 'story-draft' || hasPendingImages);
  const bookTextSample = [
    book?.language,
    book?.storyTitle,
    book?.storySummary,
    ...(book?.pages || []).map((page) => page.text),
  ].join(' ');
  const isRtlBook = isRtlLanguage(book?.language) || hasHebrewText(bookTextSample);
  const approvedCount = approvedPages.size;
  const pageCount = book?.pages?.length || 0;
  const readyImageCount = book?.pages?.filter((page) => page.imageStatus === 'complete').length || 0;
  const allPagesApproved = pageCount > 0 && approvedCount >= pageCount;
  const selectedPageApproved = selectedPage ? approvedPages.has(selectedPage.pageNumber) : false;
  const selectedPageIsEditing = selectedPage?.pageNumber === editingPage;
  const needsImageCompletion = !isStoryDraft && (hasPendingImages || hasFailedImages);
  const canRetryAllImages = !isStoryDraft && pageCount > 0;
  const stopping = processState?.stage === 'stopping';
  const currentPageIndex = selectedPage
    ? Math.max(0, (book?.pages || []).findIndex((page) => page.pageNumber === selectedPage.pageNumber))
    : 0;

  const jsonBlobUrl = useMemo(() => {
    if (!book) {
      return '';
    }

    return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(book, null, 2))}`;
  }, [book]);

  useEffect(() => {
    setActivePage(book?.pages?.[0]?.pageNumber || 1);
    setApprovedPages(new Set());
    setEditingPage(null);
    setRewriteInstruction('');
  }, [book?.id]);

  useEffect(() => {
    if (processState?.stage === 'images' && processState.currentPage) {
      setActivePage(processState.currentPage);
    }
  }, [processState?.stage, processState?.currentPage]);

  if (loading && !book) {
    return (
      <section className="panel empty-preview">
        <div className="loader" />
        <h2>{processState?.message || 'Working on your story...'}</h2>
        <p>{processState?.detail || 'The app is preparing the next step.'}</p>
        <button
          type="button"
          className="stop-button"
          onClick={onStop}
          disabled={stopping}
        >
          {stopping ? 'Stopping...' : 'Stop'}
        </button>
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

  if (!selectedPage) {
    return (
      <section className="panel empty-preview">
        <p className="eyebrow">Preview</p>
        <h2>No pages were generated</h2>
        <p>Clear this story and try generating it again.</p>
      </section>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const goToPreviousPage = () => {
    const pages = book.pages || [];
    const previous = pages[Math.max(0, currentPageIndex - 1)];

    if (previous) {
      setActivePage(previous.pageNumber);
    }
  };

  const goToNextPage = () => {
    const pages = book.pages || [];
    const next = pages[Math.min(pages.length - 1, currentPageIndex + 1)];

    if (next) {
      setActivePage(next.pageNumber);
    }
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

  const handleApprovePage = (pageNumber) => {
    setApprovedPages((current) => {
      const next = new Set(current);
      next.add(pageNumber);
      return next;
    });
  };

  const handleUnapprovePage = (pageNumber) => {
    setApprovedPages((current) => {
      const next = new Set(current);
      next.delete(pageNumber);
      return next;
    });
  };

  const handleApproveAll = () => {
    setApprovedPages(new Set((book.pages || []).map((page) => page.pageNumber)));
  };

  const handleStartEdit = (page) => {
    setActivePage(page.pageNumber);
    setEditingPage(page.pageNumber);
    setEditText(page.text || '');
    setEditImageDescription(page.imageDescription || '');
    setRewriteInstruction('');
  };

  const handleCancelEdit = () => {
    setEditingPage(null);
    setEditText('');
    setEditImageDescription('');
    setRewriteInstruction('');
  };

  const handleSaveEdit = () => {
    if (!editingPage) {
      return;
    }

    onUpdatePageContent?.(editingPage, {
      text: editText,
      imageDescription: editImageDescription,
    });
    handleUnapprovePage(editingPage);
    handleCancelEdit();
  };

  const handleRewritePage = async (pageNumber, instruction = rewriteInstruction) => {
    setActivePage(pageNumber);
    await onRegeneratePageText?.(pageNumber, instruction);
    handleUnapprovePage(pageNumber);
    handleCancelEdit();
  };

  const characters = book.visualBible?.characters || [];
  const palette = book.visualBible?.palette || [];
  const repeatedVisualDetails = book.visualBible?.repeatedVisualDetails || [];

  return (
    <section className="story-preview">
      <div className="panel book-overview">
        <div>
          <p className="eyebrow">{isStoryDraft ? 'Step 2: Approve story text' : 'Step 3: Pages and images'}</p>
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
          {saveStatus && <span className="settings-save-status story-save-status">{saveStatus}</span>}
          <button type="button" className="secondary-button" onClick={onSaveStory}>
            Save story
          </button>
          <button type="button" className="remove-button" onClick={onClearStory}>
            Clear story
          </button>
          <button type="button" className="secondary-button" onClick={handlePrint}>
            Save PDF / Print
          </button>
          {canRetryAllImages && (
            <button
              type="button"
              className="icon-text-button"
              onClick={() => onGenerateBookImages?.({ restartAllImages: true })}
              disabled={loading}
            >
              Retry all pictures
            </button>
          )}
          <a className="download-button" href={jsonBlobUrl} download={`${book.id}.json`}>
            Download JSON
          </a>
        </div>
      </div>

      {loading && (
        <div className="panel process-panel" role="status" aria-live="polite">
          <div className="loader loader-small" />
          <div>
            <strong>{processState?.message || 'Working...'}</strong>
            <p>{processState?.detail || 'Please keep this page open while the process runs.'}</p>
            {processState?.totalImages > 0 && (
              <div className="image-progress">
                <div className="image-progress-track">
                  <span
                    style={{
                      width: `${Math.round(((processState.completedImages || 0) / processState.totalImages) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {processState.completedImages || 0} of {processState.totalImages} images finished
                  {processState.estimatedRemainingSeconds
                    ? `, about ${formatDuration(processState.estimatedRemainingSeconds)} left`
                    : ''}
                </small>
              </div>
            )}
          </div>
          <button
            type="button"
            className="stop-button process-stop-button"
            onClick={onStop}
            disabled={stopping}
          >
            {stopping ? 'Stopping...' : 'Stop'}
          </button>
        </div>
      )}

      {needsImageCompletion && !loading && (
        <div className="panel image-build-panel">
          <div>
            <p className="eyebrow">Image queue</p>
            <h3>{readyImageCount} of {pageCount} images ready</h3>
            <p>
              If the page was refreshed or a provider failed, continue the image queue from the remaining pages.
            </p>
          </div>
          <button type="button" className="secondary-button" onClick={onGenerateBookImages}>
            Resume book images
          </button>
        </div>
      )}

      {isStoryDraft && (
        <div className="panel approval-panel">
          <div>
            <p className="eyebrow">Story approval</p>
            <h3>Approve the page text before images</h3>
            <p>Edit a page, ask AI for one more shot, then approve every page before generating pictures.</p>
          </div>
          <div className="approval-progress">
            <strong>{approvedCount} of {pageCount} pages approved</strong>
            <span>{allPagesApproved ? 'Ready for images' : 'Images stay paused until all pages are approved'}</span>
          </div>
          <div className="approval-actions">
            <button
              type="button"
              onClick={() => selectedPage && handleApprovePage(selectedPage.pageNumber)}
              disabled={!selectedPage || selectedPageApproved || loading || selectedPageIsEditing}
            >
              {selectedPageApproved ? 'Page approved' : `Approve page ${selectedPage?.pageNumber || ''}`}
            </button>
            <button
              type="button"
              className="icon-text-button"
              onClick={handleApproveAll}
              disabled={allPagesApproved || loading || selectedPageIsEditing}
            >
              Approve all
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onGenerateBookImages}
              disabled={!allPagesApproved || loading || selectedPageIsEditing}
            >
              {processState?.stage === 'images' ? 'Building images...' : 'Generate book images'}
            </button>
          </div>
          <div className="approval-list" aria-label="Page approval status">
            {book.pages.map((page) => (
              <button
                key={page.pageNumber}
                type="button"
                className={approvedPages.has(page.pageNumber) ? 'approval-row approved' : 'approval-row'}
                onClick={() => setActivePage(page.pageNumber)}
              >
                <span>Page {page.pageNumber}</span>
                <strong>{approvedPages.has(page.pageNumber) ? 'Approved' : 'Review'}</strong>
              </button>
            ))}
          </div>
        </div>
      )}

      <article className="panel reader-panel">
        <div className="reader-header">
          <div>
            <p className="eyebrow">Page review</p>
            <h3>Page {selectedPage.pageNumber} of {pageCount}</h3>
          </div>
          <div className="reader-pager">
            <button
              type="button"
              className="icon-text-button"
              onClick={goToPreviousPage}
              disabled={currentPageIndex === 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="icon-text-button"
              onClick={goToNextPage}
              disabled={currentPageIndex >= pageCount - 1}
            >
              Next
            </button>
          </div>
        </div>

        <div className="reader-grid">
          <div>
            <div className="page-stage">
              <img src={selectedPage.imageUrl} alt={`Illustration for page ${selectedPage.pageNumber}`} />
            </div>
            {selectedPage.imageStatus === 'pending' && (
              <div className="image-status-note">
                {isStoryDraft
                  ? 'Image generation is paused until the page text is approved.'
                  : 'This image is waiting in the generation queue.'}
              </div>
            )}
            {selectedPage.imageStatus === 'failed' && (
              <div className="image-status-warning">
                Image generation failed. Try the image again, or edit the image direction and regenerate.
                {selectedPage.imageError && <span>{selectedPage.imageError}</span>}
              </div>
            )}
          </div>

          <div className="page-review-column">
            {selectedPageIsEditing ? (
              <div className="page-editor">
                <label htmlFor={`page-text-${selectedPage.pageNumber}`}>Story text</label>
                <textarea
                  id={`page-text-${selectedPage.pageNumber}`}
                  value={editText}
                  dir={isRtlBook ? 'rtl' : 'ltr'}
                  onChange={(event) => setEditText(event.target.value)}
                />

                <label htmlFor={`page-image-direction-${selectedPage.pageNumber}`}>Image direction</label>
                <textarea
                  id={`page-image-direction-${selectedPage.pageNumber}`}
                  value={editImageDescription}
                  onChange={(event) => setEditImageDescription(event.target.value)}
                />

                <label htmlFor={`page-rewrite-${selectedPage.pageNumber}`}>AI retry note</label>
                <textarea
                  id={`page-rewrite-${selectedPage.pageNumber}`}
                  className="rewrite-field"
                  value={rewriteInstruction}
                  placeholder="Optional: make it softer, shorter, funnier, more bedtime, more visual..."
                  onChange={(event) => setRewriteInstruction(event.target.value)}
                />

                <div className="page-editor-actions">
                  <button type="button" onClick={handleSaveEdit} disabled={loading}>
                    Save page
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => handleRewritePage(selectedPage.pageNumber)}
                    disabled={loading}
                  >
                    AI try page again
                  </button>
                  <button type="button" className="icon-text-button" onClick={handleCancelEdit} disabled={loading}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="page-copy" dir={isRtlBook ? 'rtl' : 'ltr'}>
                <p className="eyebrow">Page {selectedPage.pageNumber}</p>
                <p className={isRtlBook ? 'page-text rtl-text' : 'page-text'}>{selectedPage.text}</p>
                {selectedPage.imageDescription && (
                  <div className="page-image-brief">
                    <strong>Image direction</strong>
                    <span>{selectedPage.imageDescription}</span>
                  </div>
                )}
              </div>
            )}

            <div className="reader-actions">
              {isStoryDraft ? (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleApprovePage(selectedPage.pageNumber)}
                  disabled={selectedPageApproved || loading || selectedPageIsEditing}
                >
                  {selectedPageApproved ? 'Approved' : 'Approve this page'}
                </button>
              ) : (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => onRegeneratePageImage?.(selectedPage.pageNumber)}
                  disabled={loading}
                >
                  {processState?.stage === 'image-regenerate' ? 'Trying again...' : 'Try image again'}
                </button>
              )}
              <button
                type="button"
                className="icon-text-button"
                onClick={() => handleStartEdit(selectedPage)}
                disabled={loading || selectedPageIsEditing}
              >
                Edit page
              </button>
              <button
                type="button"
                className="icon-text-button"
                onClick={() => handleRewritePage(selectedPage.pageNumber, '')}
                disabled={loading || selectedPageIsEditing}
              >
                AI try story again
              </button>
              <button type="button" className="icon-text-button" onClick={() => handleCopyPrompt(selectedPage)}>
                {copiedPage === selectedPage.pageNumber ? 'Copied' : 'Copy image prompt'}
              </button>
            </div>
          </div>
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
              {processState?.stage === 'images' && processState.currentPage === page.pageNumber && (
                <span className="page-tab-dot" />
              )}
            </button>
          ))}
        </div>
      </article>

      {!isStoryDraft && (
        <section className="panel final-book-panel">
          <div className="final-book-heading">
            <div>
              <p className="eyebrow">Final book</p>
              <h3>A4 landscape page preview</h3>
            </div>
          <div className="final-book-actions">
            <button type="button" className="secondary-button" onClick={handlePrint}>
              Save PDF / Print
            </button>
            <button
              type="button"
              className="icon-text-button"
              onClick={() => onGenerateBookImages?.({ restartAllImages: true })}
              disabled={loading}
            >
              Retry all pictures
            </button>
          </div>
          </div>

          <div className="a4-stage">
            <article className={isRtlBook ? 'a4-page rtl-book-page' : 'a4-page'}>
              <div className="a4-image">
                <img src={selectedPage.imageUrl} alt={`Final book page ${selectedPage.pageNumber}`} />
              </div>
              <div className="a4-copy" dir={isRtlBook ? 'rtl' : 'ltr'}>
                <span className="a4-page-number">Page {selectedPage.pageNumber}</span>
                <h4>{book.storyTitle}</h4>
                <p>{selectedPage.text}</p>
              </div>
            </article>
          </div>

          <div className="book-nav">
            <button
              type="button"
              className="icon-text-button"
              onClick={goToPreviousPage}
              disabled={currentPageIndex === 0}
            >
              Previous page
            </button>
            <div className="book-page-tabs" aria-label="Final book pages">
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
            <button
              type="button"
              className="icon-text-button"
              onClick={goToNextPage}
              disabled={currentPageIndex >= pageCount - 1}
            >
              Next page
            </button>
          </div>
        </section>
      )}

      <div className="panel bible-panel">
        <div>
          <p className="eyebrow">Visual bible</p>
          <h3>{book.visualBible?.mainCharacter || 'Main character'}</h3>
          <p>{book.visualBible?.setting || 'Story setting'}</p>
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
        {palette.length > 0 && (
          <div className="swatch-row">
            {palette.map((color) => (
              <span key={color} className="color-swatch" style={{ backgroundColor: color }} />
            ))}
          </div>
        )}
        {repeatedVisualDetails.length > 0 && (
          <ul className="detail-list">
            {repeatedVisualDetails.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="page-list">
        {book.pages.map((page) => (
          <article key={page.pageNumber} className="panel page-card">
            <img src={page.imageUrl} alt={`Small illustration for page ${page.pageNumber}`} />
            <div>
              <p className="eyebrow">Page {page.pageNumber}</p>
              {page.imageStatus === 'failed' && (
                <span className="failed-image-badge">Image failed</span>
              )}
              {page.imageStatus === 'pending' && (
                <span className={approvedPages.has(page.pageNumber) ? 'approved-page-badge' : 'pending-image-badge'}>
                  {isStoryDraft
                    ? (approvedPages.has(page.pageNumber) ? 'Text approved' : 'Awaiting approval')
                    : 'Waiting for image'}
                </span>
              )}
              <p dir={isRtlBook ? 'rtl' : 'ltr'} className={isRtlBook ? 'rtl-text' : ''}>{page.text}</p>
              {page.imageDescription && (
                <div className="page-image-brief compact">
                  <strong>Image direction</strong>
                  <span>{page.imageDescription}</span>
                </div>
              )}
              <div className="page-card-actions">
                <button type="button" className="icon-text-button" onClick={() => handleStartEdit(page)} disabled={loading}>
                  Edit
                </button>
                <button
                  type="button"
                  className="icon-text-button"
                  onClick={() => handleRewritePage(page.pageNumber, '')}
                  disabled={loading}
                >
                  AI retry
                </button>
                {!isStoryDraft && (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onRegeneratePageImage?.(page.pageNumber)}
                    disabled={loading}
                  >
                    Try image
                  </button>
                )}
              </div>
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

      <div className="print-book-pages" aria-hidden="true">
        {book.pages.map((page) => (
          <article key={`print-${page.pageNumber}`} className={isRtlBook ? 'print-spread rtl-book-page' : 'print-spread'}>
            <div className="print-image">
              <img src={page.imageUrl} alt="" />
            </div>
            <div className="print-copy" dir={isRtlBook ? 'rtl' : 'ltr'}>
              <span>Page {page.pageNumber}</span>
              <h2>{book.storyTitle}</h2>
              <p>{page.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function isRtlLanguage(language) {
  return /hebrew|עברית|arabic|urdu|persian|farsi/i.test(String(language || ''));
}

function hasHebrewText(value) {
  return /[\u0590-\u05ff]/.test(String(value || ''));
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export default StoryPreview;
