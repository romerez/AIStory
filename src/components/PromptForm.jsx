import { useEffect, useRef, useState } from 'react';
import { providers, providerModels } from '../data/providerConfig';

function PromptForm({ onGenerate, loading, apiKeys, onSaveApiKey }) {
  const [prompt, setPrompt] = useState('');
  const [theme, setTheme] = useState('');
  const [artStyle, setArtStyle] = useState('');
  const [provider, setProvider] = useState(providers[0].value);
  const [customProvider, setCustomProvider] = useState('');
  const [model, setModel] = useState(providerModels[providers[0].value][0].value);
  const [pageCount, setPageCount] = useState(6);
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiSettings, setShowApiSettings] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const providerName = provider === 'Other' ? customProvider || 'Other' : provider;
    setApiKeyInput(apiKeys[providerName] || '');
  }, [provider, customProvider, apiKeys]);

  useEffect(() => {
    if (provider !== 'Other') {
      setModel(providerModels[provider]?.[0]?.value || '');
    }
    setShowApiSettings(false);
  }, [provider, customProvider]);

  const providerName = provider === 'Other' ? customProvider || 'Other' : provider;

  const resetSelectedImage = () => {
    setReferenceImageFile(null);
    setPreviewUrl('');
  };

  const handleFileUpload = (file) => {
    if (!file) {
      resetSelectedImage();
      return;
    }

    setReferenceImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setReferenceImageUrl('');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    handleFileUpload(file);
  };

  const handleUrlChange = (event) => {
    resetSelectedImage();
    setReferenceImageUrl(event.target.value);
  };

  const [planResponse, setPlanResponse] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState('');

  const handleSaveApiKey = () => {
    onSaveApiKey(providerName, apiKeyInput.trim());
  };

  const handleGeneratePlan = async (event) => {
    event.preventDefault();
    setPlanLoading(true);
    setPlanError('');

    try {
      const title = prompt.trim().slice(0, 60) || 'A gentle bedtime story';
      const summary = `A children's story about ${prompt.trim()}. It will be playful, supportive, and easy to read for young listeners.`;
      const plan = `1. Introduce the main character and the problem.\n2. Show why the habit matters.\n3. Offer a comforting solution.\n4. End with a reassuring bedtime message.`;
      setPlanResponse({ title, summary, plan });
    } catch (error) {
      setPlanError('Failed to create the story plan. Please try again.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleOpenOutcomeWindow = () => {
    const preview = window.open('', '_blank');
    if (!preview) {
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Story outcome preview</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; background: #f7f7fb; color: #111; }
            h1 { margin-top: 0; }
            pre { background: #fff; padding: 16px; border-radius: 18px; border: 1px solid #ddd; white-space: pre-wrap; }
            .section { margin-bottom: 24px; }
            button { background: #6950ff; color: #fff; border: none; padding: 12px 18px; border-radius: 14px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="section">
            <h1>Story Plan</h1>
            <p><strong>${planResponse.title}</strong></p>
            <p>${planResponse.summary}</p>
          </div>
          <div class="section">
            <h2>Plan ahead</h2>
            <pre>${planResponse.plan}</pre>
          </div>
        </body>
      </html>
    `;

    preview.document.write(html);
    preview.document.close();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onGenerate({
      prompt,
      theme: theme || 'free writing',
      artStyle: artStyle || 'free writing',
      providerName,
      modelName: model || 'default',
      pageCount,
      referenceImageUrl: referenceImageUrl || null,
      referenceImageFile,
    });
  };

  return (
    <>
      <section className="card">
        <h2>Step 1: Generate the story prompt</h2>
        <p className="step-intro">Pick a model, enter your prompt, and preview the story plan before moving to the full story creation.</p>
        <form onSubmit={handleGeneratePlan} className="grid">
          <div className="grid grid-2">
            <div>
              <label htmlFor="provider">Provider / company</label>
              <select
                id="provider"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                {providers.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="model">Model</label>
              <div className="model-control">
                {provider !== 'Other' ? (
                  <select
                    id="model"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                  >
                    {providerModels[provider].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="model"
                    type="text"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    placeholder="Enter your custom model name"
                  />
                )}
                <button
                  type="button"
                  className="settings-button"
                  onClick={() => setShowApiSettings((current) => !current)}
                  aria-label="Show API key settings"
                >
                  ⚙️
                </button>
              </div>
              {showApiSettings && (
                <div className="api-key-panel">
                  <label htmlFor="apiKey">API key for {providerName}</label>
                  <input
                    id="apiKey"
                    type="text"
                    value={apiKeyInput}
                    onChange={(event) => setApiKeyInput(event.target.value)}
                    placeholder="Enter API key for selected provider"
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleSaveApiKey}
                  >
                    Save key
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="prompt">Story prompt</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Write me a story about why it is important to go to sleep early"
              required
            />
          </div>

          <button type="submit" disabled={planLoading || !prompt.trim()}>
            {planLoading ? 'Generating plan...' : 'Generate plan'}
          </button>
        </form>

        {planError && <div className="error-banner">{planError}</div>}

        {planResponse && (
          <div className="plan-output">
            <h3>Plan ahead</h3>
            <p><strong>{planResponse.title}</strong></p>
            <p>{planResponse.summary}</p>
            <pre>{planResponse.plan}</pre>
            <button type="button" className="open-outcome-button" onClick={handleOpenOutcomeWindow}>
              Open outcome in a new window
            </button>
          </div>
        )}
      </section>

      {planResponse && (
        <section className="card">
          <h2>Create a new story</h2>
          <form onSubmit={handleSubmit} className="grid">
            <div className="grid grid-2">
              <div>
                <label htmlFor="pageCount">Page count</label>
                <input
                  id="pageCount"
                  type="number"
                  min="2"
                  max="12"
                  value={pageCount}
                  onChange={(event) => setPageCount(Number(event.target.value))}
                />
              </div>

              <div>
                <label htmlFor="theme">Theme</label>
                <input
                  id="theme"
                  type="text"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value)}
                  placeholder="Describe the story theme in your own words"
                />
              </div>
            </div>

            <div>
              <label htmlFor="artStyle">Art style</label>
              <input
                id="artStyle"
                type="text"
                value={artStyle}
                onChange={(event) => setArtStyle(event.target.value)}
                placeholder="Describe the illustration style or upload a reference image"
              />
            </div>

            <div className="grid grid-2">
              <div className="upload-zone">
                <label>Reference image</label>
                <div
                  className={`drop-area ${dragActive ? 'drag-active' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <p>
                    Drag and drop an image here, or{' '}
                    <button type="button" className="text-button" onClick={handleBrowse}>
                      browse files
                    </button>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileChange}
                  />
                </div>
                <label htmlFor="referenceImageUrl">Or paste a reference image URL</label>
                <input
                  id="referenceImageUrl"
                  type="url"
                  value={referenceImageUrl}
                  onChange={handleUrlChange}
                  placeholder="https://example.com/image.png"
                />
                {previewUrl && (
                  <img className="upload-preview" src={previewUrl} alt="Reference preview" />
                )}
              </div>
            </div>

            <button type="submit" disabled={loading || !prompt.trim()}>
              {loading ? 'Generating...' : 'Generate story'}
            </button>
          </form>
        </section>
      )}
    </>
  );
}

export default PromptForm;
