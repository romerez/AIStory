# AIStory

AIStory turns a short prompt into a complete illustrated children's mini-book.

The current MVP defaults to local demo mode, so you can test the full product loop without external API keys. It now runs with a small Node API server that owns `/api/generate-story`, `/api/generate-book-images`, and `/api/generate-image`:

- Set the book with characters, picture references, language, age, built-in or free-text theme, optional art style direction, and page count.
- Switch between All mode and guided Steps mode from the header.
- Save and reuse past characters from the Characters dialog.
- Enter a story idea.
- Generate story text first, with image slots paused.
- API Hebrew story text asks the model for full ניקוד when Hebrew is selected.
- Approve page text, then generate the illustrated book as a separate step.
- Reopen or recreate the last 10 generated stories from History.
- History saves story drafts immediately and keeps partial image progress instead of waiting for the whole book to finish.
- Manually save the current story/progress to History, including the story idea, characters, references, book details, custom theme, and generated pages.
- Preview page text with matching local SVG illustrations or API-generated images.
- Generate book images page-by-page with visible progress, rough remaining-time estimates, and partial results saved after each page.
- Regenerate a page image from its illustration prompt through the backend API.
- Retry all pictures to restart the full image process without rewriting the story.
- Stop active story or image requests while keeping finished page progress.
- Clear the current story with confirmation.
- Print the result or download the generated JSON.
- Manage active models, endpoints, one API key per provider/company, provider badges, and the premade prompt preview from the Settings dialog.
- Review local estimated usage by model and key from the Usage dialog.
- See a live side summary with the story summary, characters, selected models, and book settings as the form/story fills in.
- See loading/progress states while story text or book images are being generated.
- Preview and print landscape pages without UI image cropping.
- In Steps mode, finish setup, review story text, then build images one stage at a time while keeping Back available.
- If old browser data breaks the app, the recovery screen can reload or reset local AIStory data.
- Generated books and history are stored in IndexedDB so image-heavy books do not crash `localStorage`/`sessionStorage`.

Gemini is the current default provider path: story text uses Google Gemini 2.5 Flash and images use Google Gemini 2.5 Flash Image unless the user chooses another model in Settings.
Built-in story API models include current OpenAI GPT-5.5/GPT-5.4 options, Anthropic Claude Opus/Sonnet/Haiku options, Google Gemini 3.5/3.1/2.5 options, and xAI Grok 4.3.
Built-in image API models include OpenAI GPT Image 2/1.5/1/1 mini and Google Gemini Nano Banana image models: 3.1 Flash Image Preview, 3 Pro Image Preview, and 2.5 Flash Image. For local development, one browser-saved key per provider/company is used before server environment keys.
External image prompts are sanitized before provider calls, and provider safety blocks retry once with a simpler wholesome storybook prompt.
Character/background consistency is handled through a repeated visual bible and consistency-lock instructions in every image prompt. Prompts lock the same physical story stage, indoor/outdoor choice, landmarks, central props, and general layout unless the story explicitly moves. Prompts also ask for landscape-safe framing so important subjects are not cut off.
When reference images are available, Gemini receives them as inline image inputs and OpenAI uses the image edits endpoint. The app uses character references first, then the style reference, then a compressed first completed page as a cast/location/layout/style anchor for later pages. Retrying images rebuilds the page prompts first so saved books use the latest continuity rules.

## Project Artifacts

- `PROJECT-INSTRUCTIONS.md` - source-of-truth handoff for product, engineering, UX, data shape, and next steps.
- `PROJECT-SPEC.md` - product spec, data model, API contract, and implementation plan.
- `src/api/localStoryEngine.js` - local demo generator for testable story output.
- `src/api/backendClient.js` - browser client for the AIStory backend routes.
- `src/api/storyModelClient.js` - story model prompt builder and story provider clients.
- `server/index.js` - Node API server for story/image generation and built-app serving.
- `src/components/CharacterManager.jsx` - reusable character library dialog.
- `src/components/StoryHistory.jsx` - past story history dialog.
- `src/components/SettingsManager.jsx` - model, endpoint, key, and premade prompt manager.
- `src/components/UsageManager.jsx` - local estimated model/key usage dialog.
- `src/components/PromptForm.jsx` - story creation form with cast and reference image controls.
- `src/components/StoryPreview.jsx` - story approval, book preview, page navigation, print, and JSON export.
- `src/components/StorySummaryPanel.jsx` - live side summary for setup, story, characters, models, and generated state.

## Getting Started

Install dependencies:

```powershell
npm install
```

Run the development server:

```powershell
npm run dev
```

This starts the API server on `http://127.0.0.1:8787` and the Vite app on `http://127.0.0.1:5173`.

On Windows you can also run the one-file launcher:

```powershell
.\run-aistory.ps1
```

Or double-click/run:

```bat
run-aistory.bat
```

The Windows launcher opens the app in your browser automatically when the dev server is ready. If both frontend and backend are already running, it opens the existing local app. If only the frontend is running, it starts the missing backend API so model calls still work.

The launcher starts the API and web server in the background and writes logs to `.aistory-logs`. To stop them:

```bat
stop-aistory.bat
```

Build for production:

```powershell
npm run build
```

Serve the built app with the API server:

```powershell
npm run serve
```

Copy `.env.example` to `.env` or set environment variables for provider keys:

```powershell
$env:OPENAI_API_KEY='...'
$env:GEMINI_API_KEY='...'
```

## Next Steps

- Remove browser-saved provider keys once server-side key management is enough.
- Add a dedicated character/style sheet step for stronger image consistency.
- Add real provider usage/billing lookup.
- Connect Multiplay image generation once the real endpoint contract is known.
- Add a dedicated PDF renderer if browser print is not enough.
