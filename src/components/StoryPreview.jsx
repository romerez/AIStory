import { useEffect, useMemo, useRef, useState } from 'react';
import { getStoryProgress } from '../api/backendClient';

function StoryPreview({
  book,
  loading,
  processState,
  onStop,
  onGenerateBookImages,
  onRegeneratePageImage,
  onRegenerateCharacterSheet,
  onRegenerateLocationSheet,
  onUpdateImageSeed,
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
  const [elapsed, setElapsed] = useState(0);
  const [liveProgress, setLiveProgress] = useState(null);
  const a4TextRef = useRef(null);
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

  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return undefined;
    }

    const start = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!loading) {
      setLiveProgress(null);
      return undefined;
    }

    let cancelled = false;
    const poll = async () => {
      const progress = await getStoryProgress();
      if (!cancelled) {
        setLiveProgress(progress);
      }
    };

    poll();
    const id = window.setInterval(poll, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [loading]);

  // Shrink the A4 page text so it always fits the fixed-size page, no matter how
  // long the page is. Re-runs per page, on resize, and once web fonts are ready.
  useEffect(() => {
    const fit = () => fitTextToBox(a4TextRef.current, 11, 28);
    const raf = window.requestAnimationFrame(fit);
    window.addEventListener('resize', fit);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit).catch(() => {});
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
    };
  }, [selectedPage?.pageNumber, selectedPage?.text, book?.id, isStoryDraft, isRtlBook]);

  if (loading && !book) {
    return (
      <section className="panel empty-preview">
        <div className="loader" />
        <h2>{processState?.message || 'Working on your story...'}</h2>
        <p>{processState?.detail || 'The app is preparing the next step.'}</p>
        <div className="image-progress empty-preview-progress">
          <div className="progress-indeterminate" />
          <small className="live-status">
            {liveProgress?.active && <span className={`status-dot ${liveStatusDotClass(liveProgress)}`} />}
            {liveStatusText(liveProgress, elapsed)}
          </small>
        </div>
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
    // The browser uses document.title as the default "Save as PDF" filename, so
    // swap in the book title while the print dialog is open, then restore it.
    const previousTitle = document.title;
    document.title = buildPrintTitle(book);

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    window.addEventListener('afterprint', restoreTitle);
    window.print();
    window.setTimeout(restoreTitle, 1500);
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
            {book.createdAt && (
              <span title="When this book was generated">Generated {formatDateTime(book.createdAt)}</span>
            )}
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
            {processState?.totalImages > 0 ? (
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
            ) : (
              <div className="image-progress">
                <div className="progress-indeterminate" />
                <small className="live-status">
                  {liveProgress?.active && <span className={`status-dot ${liveStatusDotClass(liveProgress)}`} />}
                  {liveStatusText(liveProgress, elapsed)}
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
            <div className="seed-control" title="Seed for local image generation. Applies on the next image build / retry.">
              <label htmlFor="image-seed">Seed</label>
              <input
                id="image-seed"
                type="number"
                value={book.imageSeed || 0}
                onChange={(event) => onUpdateImageSeed?.(event.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="icon-text-button"
                onClick={() => onUpdateImageSeed?.(0)}
                disabled={loading}
              >
                Reroll
              </button>
            </div>
          </div>
          </div>

          <div className="a4-stage">
            <article className={isRtlBook ? 'a4-page rtl-book-page' : 'a4-page'}>
              <div className="a4-image">
                <img src={selectedPage.imageUrl} alt={`Final book page ${selectedPage.pageNumber}`} />
              </div>
              <div className="a4-copy" dir={isRtlBook ? 'rtl' : 'ltr'}>
                <span className="a4-page-number">{selectedPage.pageNumber}</span>
                <p ref={a4TextRef}>{selectedPage.text}</p>
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
        {book.characterSheetUrl && (
          <div className="character-sheet-block">
            <div className="character-sheet-preview">
              <img src={book.characterSheetUrl} alt="Cast and style reference sheet" />
            </div>
            <div className="character-sheet-meta">
              <strong>Character sheet</strong>
              <span>Drawn once and reused as the identity anchor for every page, so characters stay consistent.</span>
              {!isStoryDraft && (
                <button
                  type="button"
                  className="icon-text-button"
                  onClick={onRegenerateCharacterSheet}
                  disabled={loading}
                >
                  {processState?.stage === 'character-sheet' ? 'Drawing sheet...' : 'Regenerate character sheet'}
                </button>
              )}
            </div>
          </div>
        )}
        {book.locationSheetUrl && (
          <div className="character-sheet-block">
            <div className="character-sheet-preview">
              <img src={book.locationSheetUrl} alt="Background and location reference sheet" />
            </div>
            <div className="character-sheet-meta">
              <strong>Background sheet</strong>
              <span>Drawn once and reused as the setting anchor for every page, so the background stays consistent.</span>
              {!isStoryDraft && (
                <button
                  type="button"
                  className="icon-text-button"
                  onClick={onRegenerateLocationSheet}
                  disabled={loading}
                >
                  {processState?.stage === 'location-sheet' ? 'Drawing sheet...' : 'Regenerate background sheet'}
                </button>
              )}
            </div>
          </div>
        )}
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
              <span>{page.pageNumber}</span>
              <p style={{ fontSize: printFontSize(page.text) }}>{page.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildPrintTitle(book) {
  const base = String(book?.storyTitle || book?.id || 'storybook')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return base || 'storybook';
}

function isRtlLanguage(language) {
  return /hebrew|עברית|arabic|urdu|persian|farsi/i.test(String(language || ''));
}

function hasHebrewText(value) {
  return /[\u0590-\u05ff]/.test(String(value || ''));
}

function isProgressRecent(live) {
  return typeof live?.lastChunkSecondsAgo === 'number' && live.lastChunkSecondsAgo < 20;
}

function liveStatusText(live, elapsed) {
  if (live && live.active) {
    const words = live.words || 0;
    const recent = isProgressRecent(live);

    // Story text is streaming.
    if (words > 0) {
      return recent
        ? `Writing the story - ${words} words`
        : `Writing paused - ${words} words, no new text for ${live.lastChunkSecondsAgo}s`;
    }

    // Thinking model: reasoning tokens arrive before the story text. Show this as
    // live activity so a long "thinking" phase doesn't look frozen.
    if (live.phase === 'thinking') {
      const reasoningWords = live.thinkingChars ? Math.round(live.thinkingChars / 5) : 0;
      return recent
        ? `Thinking through the story...${reasoningWords ? ` (~${reasoningWords} words of reasoning)` : ''}`
        : `Thinking paused for ${live.lastChunkSecondsAgo}s - the model may be stuck`;
    }

    if (live.serverAlive === false) {
      return 'Model server is not responding - it may have crashed or run out of memory.';
    }

    if (live.serverAlive === true) {
      return 'Model is working - thinking before the first words (this can take a while).';
    }

    return 'Model is loaded, warming up...';
  }

  return elapsed ? `Working - ${formatDuration(elapsed)} elapsed` : 'Working...';
}

function liveStatusDotClass(live) {
  if (!live || !live.active) {
    return 'status-dot-pending';
  }

  // Any token (story content or reasoning) arriving recently = alive.
  if (isProgressRecent(live)) {
    return 'status-dot-online';
  }

  if (live.serverAlive === false) {
    return 'status-dot-offline';
  }

  return 'status-dot-pending';
}

function fitTextToBox(el, minPx, maxPx) {
  if (!el || !el.clientHeight) {
    return;
  }

  let lo = minPx;
  let hi = maxPx;
  let best = minPx;

  // Binary-search the largest font size whose content still fits the box height.
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    el.style.fontSize = `${mid}px`;
    if (el.scrollHeight <= el.clientHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  el.style.fontSize = `${best}px`;
}

function printFontSize(text) {
  const length = String(text || '').length;

  if (length <= 250) {
    return '18pt';
  }

  if (length >= 950) {
    return '11pt';
  }

  const size = 18 - ((length - 250) / (950 - 250)) * (18 - 11);
  return `${size.toFixed(1)}pt`;
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
