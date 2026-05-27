import { useEffect, useRef, useState } from 'react';
import {
  generateStoryDraft,
  regeneratePageImage,
  regeneratePageText,
  updateBookPageContent,
} from './api/backendClient';
import CharacterManager from './components/CharacterManager';
import PromptForm from './components/PromptForm';
import SettingsManager from './components/SettingsManager';
import StoryHistory from './components/StoryHistory';
import StoryPreview from './components/StoryPreview';
import StorySummaryPanel from './components/StorySummaryPanel';
import UsageManager from './components/UsageManager';
import { normalizeSavedCharacters } from './data/characterLibrary';
import {
  clearLatestBook,
  loadLatestBook,
  loadPersistentStoryHistory,
  saveLatestBook,
  savePersistentStoryHistory,
} from './data/persistentStorage';
import { mergeModelSettings } from './data/providerConfig';
import {
  addStoryToHistory,
  createHistoryRequestSnapshot,
} from './data/storyHistory';
import {
  normalizeUsageStats,
  recordBookImageGeneration,
  recordStoryDraftGeneration,
  recordImageRegeneration,
} from './data/usageTracker';

const SETTINGS_KEY = 'aistory-model-settings';
const DARK_MODE_KEY = 'aistory-dark-mode';
const CHARACTER_LIBRARY_KEY = 'aistory-character-library';
const USAGE_KEY = 'aistory-model-usage';
const UI_MODE_KEY = 'aistory-ui-mode';
const idleProcessState = {
  stage: 'idle',
  message: '',
  detail: '',
};
const flowSteps = [
  {
    id: 'setup',
    eyebrow: 'Step 1',
    title: 'Set the book',
    description: 'Characters, references, language, theme, pages, and story idea.',
  },
  {
    id: 'story',
    eyebrow: 'Step 2',
    title: 'Approve story',
    description: 'Review each page, edit text, or ask AI for another try.',
  },
  {
    id: 'book',
    eyebrow: 'Step 3',
    title: 'Build book',
    description: 'Generate pictures, retry images, preview, print, or save.',
  },
];

function loadModelSettings() {
  try {
    return mergeModelSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'));
  } catch {
    return mergeModelSettings(null);
  }
}

function loadDarkMode() {
  try {
    const savedPreference = localStorage.getItem(DARK_MODE_KEY);

    if (savedPreference === null) {
      return true;
    }

    return savedPreference === 'true';
  } catch {
    return true;
  }
}

function loadUiMode() {
  try {
    return localStorage.getItem(UI_MODE_KEY) === 'guided' ? 'guided' : 'full';
  } catch {
    return 'full';
  }
}

function loadCharacterLibrary() {
  try {
    return normalizeSavedCharacters(JSON.parse(localStorage.getItem(CHARACTER_LIBRARY_KEY) || '[]'));
  } catch {
    return [];
  }
}

function loadUsageStats() {
  try {
    return normalizeUsageStats(JSON.parse(localStorage.getItem(USAGE_KEY) || '[]'));
  } catch {
    return [];
  }
}

function App() {
  const [book, setBook] = useState(null);
  const [modelSettings, setModelSettings] = useState(loadModelSettings);
  const [characterLibrary, setCharacterLibrary] = useState(loadCharacterLibrary);
  const [usageStats, setUsageStats] = useState(loadUsageStats);
  const [storyHistory, setStoryHistory] = useState([]);
  const [characterToUse, setCharacterToUse] = useState(null);
  const [currentDraftRequest, setCurrentDraftRequest] = useState(null);
  const [lastGeneratedRequest, setLastGeneratedRequest] = useState(null);
  const [processState, setProcessState] = useState(idleProcessState);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState('');
  const [persistentStorageReady, setPersistentStorageReady] = useState(false);
  const [darkMode, setDarkMode] = useState(loadDarkMode);
  const [uiMode, setUiMode] = useState(loadUiMode);
  const [activeStep, setActiveStep] = useState('setup');
  const [storySaveStatus, setStorySaveStatus] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCharacters, setShowCharacters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const activeRequestControllerRef = useRef(null);
  const stopRequestedRef = useRef(false);
  const saveStatusTimerRef = useRef(null);
  const loading = processState.stage !== 'idle';

  useEffect(() => {
    return () => {
      activeRequestControllerRef.current?.abort();
      window.clearTimeout(saveStatusTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPersistentState() {
      try {
        const [savedBook, savedHistory] = await Promise.all([
          loadLatestBook(),
          loadPersistentStoryHistory(),
        ]);

        if (cancelled) {
          return;
        }

        if (savedBook) {
          setBook(savedBook);
          setLastGeneratedRequest(savedBook.requestSnapshot || null);
          setActiveStep(getStepForBook(savedBook));
        }

        if (savedHistory.length > 0) {
          setStoryHistory(savedHistory);
        }
      } catch (err) {
        console.warn('AIStory could not load saved browser data.', err);
        if (!cancelled) {
          setStorageWarning('AIStory could not load saved browser data. You can keep working, but old local history may be unavailable.');
        }
      } finally {
        if (!cancelled) {
          setPersistentStorageReady(true);
        }
      }
    }

    loadPersistentState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!persistentStorageReady) {
      return undefined;
    }

    let cancelled = false;

    async function persistBook() {
      try {
        if (book) {
          await saveLatestBook(book);
        } else {
          await clearLatestBook();
        }
      } catch (err) {
        console.warn('AIStory could not save the current book.', err);
        if (!cancelled) {
          setStorageWarning('AIStory could not save the current book locally. The page still works, but avoid refreshing until this is fixed.');
        }
      }
    }

    persistBook();

    return () => {
      cancelled = true;
    };
  }, [book, persistentStorageReady]);

  useEffect(() => {
    if (!loading) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading]);

  useEffect(() => {
    document.body.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem(DARK_MODE_KEY, String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(UI_MODE_KEY, uiMode);
  }, [uiMode]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(modelSettings));
  }, [modelSettings]);

  useEffect(() => {
    localStorage.setItem(CHARACTER_LIBRARY_KEY, JSON.stringify(characterLibrary));
  }, [characterLibrary]);

  useEffect(() => {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usageStats));
  }, [usageStats]);

  useEffect(() => {
    if (!persistentStorageReady) {
      return undefined;
    }

    let cancelled = false;

    async function persistHistory() {
      try {
        await savePersistentStoryHistory(storyHistory);
      } catch (err) {
        console.warn('AIStory could not save story history.', err);
        if (!cancelled) {
          setStorageWarning('AIStory could not save story history locally. Your current story is still on screen.');
        }
      }
    }

    persistHistory();

    return () => {
      cancelled = true;
    };
  }, [persistentStorageReady, storyHistory]);

  const rememberBookInHistory = (nextBook, requestOverride = null) => {
    const historyRequest = requestOverride
      || nextBook?.requestSnapshot
      || lastGeneratedRequest
      || currentDraftRequest;

    if (!nextBook || !historyRequest) {
      return;
    }

    setStoryHistory((current) => addStoryToHistory(current, nextBook, historyRequest));
  };

  const startAbortableRequest = () => {
    activeRequestControllerRef.current?.abort();
    const controller = new AbortController();

    stopRequestedRef.current = false;
    activeRequestControllerRef.current = controller;
    return controller;
  };

  const finishAbortableRequest = (controller) => {
    if (activeRequestControllerRef.current === controller) {
      activeRequestControllerRef.current = null;
    }
  };

  const throwIfStopped = (controller) => {
    if (stopRequestedRef.current || controller.signal.aborted) {
      throw new DOMException('Request stopped by the user.', 'AbortError');
    }
  };

  const handleStopRequest = () => {
    stopRequestedRef.current = true;
    activeRequestControllerRef.current?.abort();
    setProcessState((current) => (
      current.stage === 'idle'
        ? current
        : {
          ...current,
          stage: 'stopping',
          message: 'Stopping...',
          detail: 'Cancelling the current request. Finished pages stay saved.',
        }
    ));
  };

  const showStorySaveStatus = (message) => {
    setStorySaveStatus(message);
    window.clearTimeout(saveStatusTimerRef.current);
    saveStatusTimerRef.current = window.setTimeout(() => {
      setStorySaveStatus('');
    }, 1800);
  };

  const handleSaveStory = async () => {
    if (!book) {
      return;
    }

    try {
      const historyRequest = await createCompleteSetupSnapshot({
        book,
        currentDraftRequest,
        lastGeneratedRequest,
      });
      const savedBook = {
        ...book,
        requestSnapshot: historyRequest,
        savedSetupSnapshot: historyRequest,
        manuallySavedAt: new Date().toISOString(),
      };

      setBook(savedBook);
      setLastGeneratedRequest(historyRequest);
      setStoryHistory((current) => addStoryToHistory(current, savedBook, historyRequest));
      showStorySaveStatus('Story saved to History');
    } catch (err) {
      setError(err.message || 'Unable to save this story.');
    }
  };

  const handleGenerate = async (request) => {
    const controller = startAbortableRequest();

    if (uiMode === 'guided') {
      setActiveStep('story');
    }

    setProcessState({
      stage: 'story',
      message: 'Writing the story text...',
      detail: 'Creating the page-by-page draft. Images wait until you approve the story.',
    });
    setError('');

    try {
      const generatedBook = await generateStoryDraft(request, modelSettings, { signal: controller.signal });
      throwIfStopped(controller);
      const historyRequest = await createHistoryRequestSnapshot(request);
      const draftBook = {
        ...generatedBook,
        requestSnapshot: historyRequest,
        savedSetupSnapshot: historyRequest,
      };

      setLastGeneratedRequest(historyRequest);
      setBook(draftBook);
      setStoryHistory((current) => addStoryToHistory(current, draftBook, historyRequest));
      if (uiMode === 'guided') {
        setActiveStep('story');
      }
      setUsageStats((current) => recordStoryDraftGeneration(current, request, draftBook, modelSettings));
    } catch (err) {
      if (!isAbortError(err)) {
        setError(err.message || 'Unable to generate the story. Please try again.');
      }
    } finally {
      finishAbortableRequest(controller);
      setProcessState(idleProcessState);
    }
  };

  const handleGenerateBookImages = async (options = {}) => {
    if (!book) {
      return;
    }

    const controller = startAbortableRequest();
    const restartAllImages = Boolean(options?.restartAllImages);
    const baseBook = restartAllImages ? resetBookImagesForRetry(book) : book;
    const pageNumbersToGenerate = (baseBook.pages || [])
      .filter((page) => restartAllImages || page.imageStatus !== 'complete')
      .map((page) => page.pageNumber);
    const sourceBook = rebuildImagePromptsForPages(baseBook, pageNumbersToGenerate);
    const pagesToGenerate = (sourceBook.pages || [])
      .filter((page) => pageNumbersToGenerate.includes(page.pageNumber));

    if (pagesToGenerate.length === 0) {
      finishAbortableRequest(controller);
      setProcessState(idleProcessState);
      return;
    }

    const totalImages = pagesToGenerate.length;
    const startedAt = Date.now();
    const initialBook = {
      ...sourceBook,
      workflowStage: 'image-building',
      imagesStartedAt: new Date(startedAt).toISOString(),
    };
    let workingBook = await ensureGeneratedStyleReference(initialBook);
    const historyRequest = initialBook.requestSnapshot
      || sourceBook.requestSnapshot
      || lastGeneratedRequest
      || (currentDraftRequest ? await createHistoryRequestSnapshot(currentDraftRequest) : null);

    setBook(workingBook);
    if (historyRequest) {
      setStoryHistory((current) => addStoryToHistory(current, workingBook, historyRequest));
    }
    if (uiMode === 'guided') {
      setActiveStep('book');
    }
    setProcessState({
      stage: 'images',
      message: `Building image 1 of ${totalImages}...`,
      detail: restartAllImages
        ? 'Restarting the whole picture set. The new first page becomes the fresh style anchor.'
        : 'Starting the image queue. The estimate appears after the first picture finishes.',
      currentPage: pagesToGenerate[0]?.pageNumber || 1,
      completedImages: 0,
      totalImages,
      estimatedRemainingSeconds: null,
    });
    setError('');

    try {
      for (const [index, page] of pagesToGenerate.entries()) {
        throwIfStopped(controller);
        const completedImages = index;

        setProcessState({
          stage: 'images',
          message: `Building image ${index + 1} of ${totalImages}...`,
          detail: buildImageProgressDetail({
            pageNumber: page.pageNumber,
            completedImages,
            totalImages,
            startedAt,
            restartAllImages,
          }),
          currentPage: page.pageNumber,
          completedImages,
          totalImages,
          estimatedRemainingSeconds: estimateRemainingSeconds({
            completedImages,
            totalImages,
            startedAt,
          }),
        });

        workingBook = await regeneratePageImage(workingBook, page.pageNumber, modelSettings, {
          signal: controller.signal,
        });
        throwIfStopped(controller);
        workingBook = await ensureGeneratedStyleReference(workingBook, page.pageNumber);
        workingBook = {
          ...workingBook,
          workflowStage: 'image-building',
          requestSnapshot: historyRequest || workingBook.requestSnapshot,
        };
        setBook(workingBook);
        if (historyRequest) {
          setStoryHistory((current) => addStoryToHistory(current, workingBook, historyRequest));
        }
      }

      const completedBook = {
        ...workingBook,
        workflowStage: 'complete',
        imagesGeneratedAt: new Date().toISOString(),
        requestSnapshot: historyRequest || workingBook.requestSnapshot,
      };

      setBook(completedBook);
      if (uiMode === 'guided') {
        setActiveStep('book');
      }

      if (historyRequest) {
        setStoryHistory((current) => addStoryToHistory(current, completedBook, historyRequest));
      }

      setUsageStats((current) => (
        recordBookImageGeneration(current, historyRequest || currentDraftRequest || {}, completedBook, modelSettings)
      ));
    } catch (err) {
      setBook(workingBook);
      if (historyRequest) {
        setStoryHistory((current) => addStoryToHistory(current, workingBook, historyRequest));
      }
      if (!isAbortError(err)) {
        setError(err.message || 'Unable to build the illustrated book. Please try again.');
      }
    } finally {
      finishAbortableRequest(controller);
      setProcessState(idleProcessState);
    }
  };

  const handleRegeneratePageImage = async (pageNumber) => {
    if (!book) {
      return;
    }

    const controller = startAbortableRequest();
    setProcessState({
      stage: 'image-regenerate',
      message: `Regenerating page ${pageNumber}...`,
      detail: 'Refreshing one illustration without changing the approved story text.',
    });
    setError('');

    try {
      const refreshedBook = rebuildImagePromptsForPages(book, [pageNumber]);
      const sourceBook = await ensureGeneratedStyleReference(refreshedBook);
      throwIfStopped(controller);
      const updatedBook = await regeneratePageImage(sourceBook, pageNumber, modelSettings, {
        signal: controller.signal,
      });
      throwIfStopped(controller);
      const nextBook = await ensureGeneratedStyleReference({
        ...updatedBook,
        requestSnapshot: updatedBook.requestSnapshot || sourceBook.requestSnapshot,
      }, pageNumber);

      setUsageStats((current) => recordImageRegeneration(current, sourceBook, modelSettings));
      setBook(nextBook);
      rememberBookInHistory(nextBook);
    } catch (err) {
      if (!isAbortError(err)) {
        setError(err.message || 'Unable to regenerate the image. Please try again.');
      }
    } finally {
      finishAbortableRequest(controller);
      setProcessState(idleProcessState);
    }
  };

  const handleUpdatePageContent = (pageNumber, updates) => {
    if (!book) {
      return;
    }

    const updatedBook = updateBookPageContent(book, pageNumber, updates);

    setBook(updatedBook);
    rememberBookInHistory(updatedBook);
  };

  const handleRegeneratePageText = async (pageNumber, instruction = '') => {
    if (!book) {
      return;
    }

    const controller = startAbortableRequest();
    setProcessState({
      stage: 'text-regenerate',
      message: `Rewriting page ${pageNumber}...`,
      detail: 'Asking the story model for a fresh version of this page and image direction.',
    });
    setError('');

    try {
      const updatedBook = await regeneratePageText(book, pageNumber, modelSettings, instruction, {
        signal: controller.signal,
      });
      throwIfStopped(controller);
      const nextBook = {
        ...updatedBook,
        requestSnapshot: updatedBook.requestSnapshot || book.requestSnapshot,
      };

      setBook(nextBook);
      rememberBookInHistory(nextBook);
    } catch (err) {
      if (!isAbortError(err)) {
        setError(err.message || 'Unable to rewrite the page. Please try again.');
      }
    } finally {
      finishAbortableRequest(controller);
      setProcessState(idleProcessState);
    }
  };

  const handleClearStory = () => {
    if (!book) {
      return;
    }

    if (window.confirm('Are you sure you want to clear the current story?')) {
      setBook(null);
      setLastGeneratedRequest(null);
      setError('');
      setActiveStep('setup');
    }
  };

  const handleUiModeChange = (nextMode) => {
    setUiMode(nextMode);

    if (nextMode === 'guided') {
      setActiveStep((currentStep) => (
        canOpenStep(currentStep, book) ? currentStep : getStepForBook(book)
      ));
    }
  };

  const handleStepChange = (stepId) => {
    if (canOpenStep(stepId, book)) {
      setActiveStep(stepId);
    }
  };

  return (
    <div className={darkMode ? 'app-shell dark' : 'app-shell'}>
      <header className="app-header">
        <div>
          <p className="eyebrow">Stepped MVP demo</p>
          <h1>AIStory</h1>
          <p>Set the book, write the idea, then preview a child-ready mini-book.</p>
        </div>
        <div className="header-actions">
          <div className="flow-mode-control" aria-label="Choose page flow">
            <span>Flow</span>
            <button
              type="button"
              className={uiMode === 'full' ? 'active' : ''}
              onClick={() => handleUiModeChange('full')}
            >
              All
            </button>
            <button
              type="button"
              className={uiMode === 'guided' ? 'active' : ''}
              onClick={() => handleUiModeChange('guided')}
            >
              Steps
            </button>
          </div>
          <button
            type="button"
            className="icon-text-button"
            onClick={() => {
              setShowCharacters((current) => !current);
              setShowSettings(false);
              setShowHistory(false);
              setShowUsage(false);
            }}
          >
            Characters
          </button>
          <button
            type="button"
            className="icon-text-button"
            onClick={() => {
              setShowHistory((current) => !current);
              setShowCharacters(false);
              setShowSettings(false);
              setShowUsage(false);
            }}
          >
            History
          </button>
          <button
            type="button"
            className="icon-text-button"
            onClick={() => {
              setShowUsage((current) => !current);
              setShowCharacters(false);
              setShowHistory(false);
              setShowSettings(false);
            }}
          >
            Usage
          </button>
          <button
            type="button"
            className="icon-text-button"
            onClick={() => {
              setShowSettings((current) => !current);
              setShowCharacters(false);
              setShowHistory(false);
              setShowUsage(false);
            }}
          >
            Settings
          </button>
          <button
            type="button"
            className="icon-text-button"
            onClick={() => setDarkMode((current) => !current)}
          >
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>

      <main className={uiMode === 'guided' ? 'guided-layout' : 'app-layout'}>
        <div className="workflow-main">
          {uiMode === 'guided' && (
            <FlowStepper
              activeStep={activeStep}
              book={book}
              onStepChange={handleStepChange}
            />
          )}

          {uiMode === 'guided' && (error || storageWarning) && (
            <div className="error-banner guided-error">{error || storageWarning}</div>
          )}

          <div
            className={uiMode === 'guided' ? 'guided-step-panel' : 'layout-pane'}
            hidden={uiMode === 'guided' && activeStep !== 'setup'}
          >
            <PromptForm
              onGenerate={handleGenerate}
              onStop={handleStopRequest}
              loading={loading}
              processState={processState}
              modelSettings={modelSettings}
              characterToUse={characterToUse}
              onDraftChange={setCurrentDraftRequest}
            />
          </div>

          <div
            className={uiMode === 'guided' ? 'guided-step-panel' : 'layout-pane'}
            hidden={uiMode === 'guided' && activeStep === 'setup'}
          >
            {uiMode !== 'guided' && (error || storageWarning) && (
              <div className="error-banner">{error || storageWarning}</div>
            )}
            <StoryPreview
              book={book}
              loading={loading}
              processState={processState}
              onStop={handleStopRequest}
              onGenerateBookImages={handleGenerateBookImages}
              onRegeneratePageImage={handleRegeneratePageImage}
              onUpdatePageContent={handleUpdatePageContent}
              onRegeneratePageText={handleRegeneratePageText}
              onSaveStory={handleSaveStory}
              saveStatus={storySaveStatus}
              onClearStory={handleClearStory}
            />
          </div>
        </div>

        <StorySummaryPanel
          book={book}
          currentDraftRequest={currentDraftRequest}
          modelSettings={modelSettings}
          processState={processState}
        />
      </main>

      {showSettings && (
        <SettingsManager
          modelSettings={modelSettings}
          currentDraftRequest={currentDraftRequest}
          onSaveSettings={(settings, options = {}) => {
            setModelSettings(mergeModelSettings(settings));
            if (!options.keepOpen) {
              setShowSettings(false);
            }
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showCharacters && (
        <CharacterManager
          savedCharacters={characterLibrary}
          currentDraftCharacters={currentDraftRequest?.characters || []}
          onSaveCharacters={(characters) => {
            setCharacterLibrary(normalizeSavedCharacters(characters));
          }}
          onUseCharacter={(character) => {
            setCharacterToUse({
              ...character,
              useToken: Date.now(),
            });
          }}
          onClose={() => setShowCharacters(false)}
        />
      )}

      {showHistory && (
        <StoryHistory
          history={storyHistory}
          onOpenStory={(historyBook) => {
            setBook(historyBook);
            setLastGeneratedRequest(historyBook?.requestSnapshot || null);
            if (uiMode === 'guided') {
              setActiveStep(getStepForBook(historyBook));
            }
            setShowHistory(false);
          }}
          onRecreateStory={(request) => {
            setShowHistory(false);
            if (uiMode === 'guided') {
              setActiveStep('story');
            }
            handleGenerate(request);
          }}
          onRemoveStory={(id) => {
            setStoryHistory((current) => current.filter((entry) => entry.id !== id));
          }}
          onClearHistory={() => {
            setStoryHistory([]);
          }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showUsage && (
        <UsageManager
          usageStats={usageStats}
          modelSettings={modelSettings}
          onClearUsage={() => setUsageStats([])}
          onClose={() => setShowUsage(false)}
        />
      )}
    </div>
  );
}

function FlowStepper({ activeStep, book, onStepChange }) {
  const activeIndex = flowSteps.findIndex((step) => step.id === activeStep);
  const previousStep = flowSteps[Math.max(0, activeIndex - 1)];
  const nextAvailableStep = flowSteps.find((step, index) => (
    index > activeIndex && canOpenStep(step.id, book)
  ));

  return (
    <section className="flow-stepper" aria-label="Story creation steps">
      <div className="flow-stepper-top">
        <div>
          <p className="eyebrow">Guided flow</p>
          <h2>{flowSteps[activeIndex]?.title || 'Set the book'}</h2>
        </div>
        <div className="flow-stepper-actions">
          <button
            type="button"
            className="icon-text-button"
            onClick={() => previousStep && onStepChange(previousStep.id)}
            disabled={activeIndex <= 0}
          >
            Back
          </button>
          {nextAvailableStep && (
            <button
              type="button"
              className="icon-text-button"
              onClick={() => onStepChange(nextAvailableStep.id)}
            >
              Next ready step
            </button>
          )}
        </div>
      </div>

      <div className="flow-steps">
        {flowSteps.map((step, index) => {
          const available = canOpenStep(step.id, book);
          const complete = isStepComplete(step.id, book);
          const active = step.id === activeStep;

          return (
            <button
              key={step.id}
              type="button"
              className={[
                'flow-step',
                active ? 'active' : '',
                complete ? 'complete' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onStepChange(step.id)}
              disabled={!available}
              aria-current={active ? 'step' : undefined}
            >
              <span>{step.eyebrow}</span>
              <strong>{step.title}</strong>
              <small>{step.description}</small>
              {complete && <em>Done</em>}
              {!available && index > 0 && <em>Locked</em>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function canOpenStep(stepId, book) {
  if (stepId === 'setup') {
    return true;
  }

  if (stepId === 'story') {
    return Boolean(book);
  }

  if (stepId === 'book') {
    return Boolean(book && !isStoryDraftBook(book));
  }

  return false;
}

function isStepComplete(stepId, book) {
  if (stepId === 'setup') {
    return Boolean(book);
  }

  if (stepId === 'story') {
    return Boolean(book && !isStoryDraftBook(book));
  }

  if (stepId === 'book') {
    return book?.workflowStage === 'complete';
  }

  return false;
}

function getStepForBook(book) {
  if (!book) {
    return 'setup';
  }

  return isStoryDraftBook(book) ? 'story' : 'book';
}

function isStoryDraftBook(book) {
  const hasPendingImages = Boolean(book?.pages?.some((page) => page.imageStatus === 'pending'));

  return book?.workflowStage !== 'image-building'
    && book?.workflowStage !== 'complete'
    && (book?.workflowStage === 'story-draft' || hasPendingImages);
}

function resetBookImagesForRetry(book) {
  return {
    ...book,
    workflowStage: 'image-building',
    generatedStyleReferenceUrl: '',
    generatedStyleReferencePage: null,
    generatedStyleReferenceCreatedAt: '',
    imagesGeneratedAt: '',
    imagesStartedAt: '',
    pages: (book?.pages || []).map((page) => ({
      ...page,
      imageUrl: buildImageRetryPlaceholder(page.pageNumber),
      imageStatus: 'pending',
      imageError: '',
    })),
  };
}

function rebuildImagePromptsForPages(book, pageNumbers = []) {
  const targetPageNumbers = new Set(pageNumbers.map((pageNumber) => Number(pageNumber)));

  if (targetPageNumbers.size === 0) {
    return book;
  }

  return (book?.pages || []).reduce((nextBook, page) => {
    if (!targetPageNumbers.has(Number(page.pageNumber))) {
      return nextBook;
    }

    return updateBookPageContent(nextBook, page.pageNumber, {
      text: page.text,
      imageDescription: page.imageDescription,
    });
  }, book);
}

function buildImageRetryPlaceholder(pageNumber) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560">
  <rect width="800" height="560" fill="#eef4f3"/>
  <rect x="46" y="46" width="708" height="468" rx="28" fill="#ffffff" stroke="#d7dee2" stroke-width="3" stroke-dasharray="16 14"/>
  <circle cx="400" cy="208" r="${50 + (Number(pageNumber || 1) % 3) * 5}" fill="#d7dee2"/>
  <path d="M220 402 C298 314, 352 360, 426 292 C500 224, 592 302, 662 402 Z" fill="#c7d8d8"/>
  <circle cx="296" cy="328" r="20" fill="#e1b45d" opacity="0.78"/>
  <circle cx="520" cy="336" r="16" fill="#235d6a" opacity="0.42"/>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function ensureGeneratedStyleReference(book, preferredPageNumber = null) {
  if (book?.generatedStyleReferenceUrl) {
    return book;
  }

  const pages = book?.pages || [];
  const preferredPage = pages.find((page) => page.pageNumber === preferredPageNumber);
  const sourcePage = isUsableImageReferenceSource(preferredPage)
    ? preferredPage
    : pages.find((page) => isUsableImageReferenceSource(page));

  if (!sourcePage) {
    return book;
  }

  const generatedStyleReferenceUrl = await createCompressedImageReference(sourcePage.imageUrl);

  if (!generatedStyleReferenceUrl) {
    return book;
  }

  return {
    ...book,
    generatedStyleReferenceUrl,
    generatedStyleReferencePage: sourcePage.pageNumber,
    generatedStyleReferenceCreatedAt: new Date().toISOString(),
  };
}

function isUsableImageReferenceSource(page) {
  return page?.imageStatus === 'complete'
    && typeof page.imageUrl === 'string'
    && page.imageUrl.startsWith('data:image/');
}

function createCompressedImageReference(imageUrl) {
  if (typeof Image === 'undefined' || !String(imageUrl || '').startsWith('data:image/')) {
    return Promise.resolve('');
  }

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      try {
        const maxDimension = 1024;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
        const width = Math.max(1, Math.round((image.naturalWidth || 1) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || 1) * scale));
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.74));
      } catch (error) {
        console.warn('AIStory could not create a compressed style reference.', error);
        resolve('');
      }
    };
    image.onerror = () => resolve('');
    image.src = imageUrl;
  });
}

function estimateRemainingSeconds({ completedImages, totalImages, startedAt }) {
  if (!completedImages) {
    return null;
  }

  const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
  const averageSeconds = elapsedSeconds / completedImages;
  const remainingImages = Math.max(0, totalImages - completedImages);

  return Math.round(averageSeconds * remainingImages);
}

function buildImageProgressDetail({ pageNumber, completedImages, totalImages, startedAt, restartAllImages = false }) {
  const estimatedRemainingSeconds = estimateRemainingSeconds({
    completedImages,
    totalImages,
    startedAt,
  });
  const base = restartAllImages
    ? `Regenerating page ${pageNumber}. Finished ${completedImages} of ${totalImages} replacement images.`
    : `Generating page ${pageNumber}. Finished ${completedImages} of ${totalImages} images.`;

  if (!estimatedRemainingSeconds) {
    return `${base} Please keep this page open.`;
  }

  return `${base} About ${formatDuration(estimatedRemainingSeconds)} remaining based on the current pace.`;
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

function isAbortError(error) {
  return error?.name === 'AbortError'
    || /aborted|abort|stopped by the user/i.test(String(error?.message || ''));
}

async function createCompleteSetupSnapshot({ book, currentDraftRequest, lastGeneratedRequest }) {
  const baseRequest = book?.requestSnapshot
    || lastGeneratedRequest
    || currentDraftRequest
    || createFallbackRequestFromBook(book);
  const snapshot = await createHistoryRequestSnapshot(baseRequest);
  const fallback = createFallbackRequestFromBook(book);
  const characters = snapshot.characters?.length > 0
    ? snapshot.characters
    : fallback.characters;

  return {
    ...fallback,
    ...snapshot,
    characters,
    prompt: snapshot.prompt || fallback.prompt,
    language: snapshot.language || fallback.language,
    childAge: snapshot.childAge || fallback.childAge,
    theme: snapshot.theme || fallback.theme,
    themePreset: snapshot.themePreset || fallback.themePreset || snapshot.theme || fallback.theme,
    customTheme: snapshot.customTheme || fallback.customTheme || '',
    artStyle: snapshot.artStyle || fallback.artStyle,
    pageCount: Number(snapshot.pageCount || fallback.pageCount || 6),
    referenceImageUrl: snapshot.referenceImageUrl || fallback.referenceImageUrl || null,
    referenceImageFile: null,
  };
}

function createFallbackRequestFromBook(book) {
  return {
    prompt: book?.storySummary || book?.storyTitle || 'Saved story',
    storyModelId: '',
    imageModelId: '',
    language: book?.language || 'English',
    childAge: book?.targetAge || '4-6',
    theme: book?.theme || 'bedtime',
    themePreset: book?.requestSnapshot?.themePreset || book?.theme || 'bedtime',
    customTheme: book?.requestSnapshot?.customTheme || '',
    artStyle: book?.artStyle || '',
    pageCount: Array.isArray(book?.pages) ? book.pages.length : 6,
    characters: (book?.visualBible?.characters || []).map((character, index) => ({
      name: character.name || '',
      role: character.role || (index === 0 ? 'main character' : 'supporting character'),
      description: character.description || '',
      referenceImageUrl: character.referenceImageUrl || null,
      referenceImageFile: null,
    })),
    referenceImageUrl: book?.requestSnapshot?.referenceImageUrl || null,
    referenceImageFile: null,
  };
}

export default App;
