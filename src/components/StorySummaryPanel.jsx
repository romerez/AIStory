function StorySummaryPanel({ book, currentDraftRequest, modelSettings, processState }) {
  const setup = book?.savedSetupSnapshot || book?.requestSnapshot || currentDraftRequest || {};
  const pages = book?.pages || [];
  const characters = getCharacters(book, setup);
  const storyModel = book?.storyModel || getModelLabel(
    modelSettings?.storyModels,
    setup.storyModelId || modelSettings?.activeStoryModelId,
  );
  const imageModel = book?.imageModel || getModelLabel(
    modelSettings?.imageModels,
    setup.imageModelId || modelSettings?.activeImageModelId,
  );
  const completeImages = pages.filter((page) => page.imageStatus === 'complete').length;
  const pageCount = pages.length || Number(setup.pageCount || 0);
  const summary = book?.storySummary || setup.prompt || '';
  const title = book?.storyTitle || 'Story snapshot';
  const status = getStatusLabel(book, processState, completeImages, pageCount);

  return (
    <aside className="panel story-summary-panel" aria-label="Story summary">
      <div className="story-summary-header">
        <div>
          <p className="eyebrow">Side summary</p>
          <h2>{title}</h2>
        </div>
        <span className="status-pill">{status}</span>
      </div>

      {summary && <p className="story-summary-copy">{summary}</p>}

      <SummarySection title="Story settings">
        <SummaryRow label="Language" value={book?.language || setup.language || 'English'} />
        <SummaryRow label="Age" value={book?.targetAge || setup.childAge || '4-6'} />
        <SummaryRow label="Theme" value={formatTheme(setup, book)} />
        <SummaryRow label="Art style" value={book?.artStyle || setup.artStyle || 'Default'} />
        <SummaryRow label="Pages" value={pageCount ? `${pageCount}` : 'Not set'} />
        <SummaryRow
          label="Reference"
          value={setup.referenceImageUrl ? 'Included' : 'None'}
        />
      </SummarySection>

      <SummarySection title="Models">
        <SummaryRow label="Story" value={storyModel || 'Not selected'} />
        <SummaryRow label="Images" value={imageModel || 'Not selected'} />
      </SummarySection>

      <SummarySection title="Characters">
        {characters.length > 0 ? (
          <ul className="summary-character-list">
            {characters.map((character, index) => (
              <li key={`${character.name || 'character'}-${index}`}>
                <strong>{character.name || `Character ${index + 1}`}</strong>
                <span>{character.role || (index === 0 ? 'main character' : 'supporting character')}</span>
                {character.description && <p>{character.description}</p>}
                {(character.hasReferenceImage || character.referenceImageUrl) && <em>Reference included</em>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="summary-empty">No characters added yet.</p>
        )}
      </SummarySection>

      {book && (
        <SummarySection title="Generated state">
          <SummaryRow label="Stage" value={book.workflowStage || 'Story draft'} />
          <SummaryRow label="Images" value={`${completeImages} of ${pageCount || 0}`} />
          <SummaryRow label="Source" value={book.source === 'local-demo' ? 'Local demo' : 'API'} />
        </SummarySection>
      )}
    </aside>
  );
}

function SummarySection({ title, children }) {
  return (
    <section className="summary-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function getCharacters(book, setup) {
  const bookCharacters = book?.visualBible?.characters || [];

  if (bookCharacters.length > 0) {
    return bookCharacters;
  }

  return (setup?.characters || []).filter((character) => (
    character?.name || character?.role || character?.description || character?.referenceImageUrl
  ));
}

function getModelLabel(models = [], id) {
  const model = models.find((item) => item.id === id) || models[0];

  return model?.label || model?.modelName || '';
}

function formatTheme(setup, book) {
  if (setup?.customTheme) {
    return `${setup.customTheme} (custom)`;
  }

  return book?.theme || setup?.theme || 'bedtime';
}

function getStatusLabel(book, processState, completeImages, pageCount) {
  if (processState?.stage && processState.stage !== 'idle') {
    return processState.stage === 'stopping' ? 'Stopping' : 'Working';
  }

  if (!book) {
    return 'Setup';
  }

  if (book.workflowStage === 'complete') {
    return 'Complete';
  }

  if (book.workflowStage === 'image-building') {
    return `${completeImages}/${pageCount || 0} images`;
  }

  return 'Draft';
}

export default StorySummaryPanel;
