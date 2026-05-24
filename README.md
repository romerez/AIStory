# AIStory

AIStory turns a short prompt into a complete illustrated children's mini-book.

The current MVP defaults to local demo mode, so you can test the full product loop without external API keys:

- Set the book with characters, picture references, language, age, theme, optional art style direction, and page count.
- Save and reuse past characters from the Characters dialog.
- Enter a story idea.
- Generate a complete structured book.
- Reopen or recreate the last 10 generated stories from History.
- Preview page text with matching local SVG illustrations or API-generated images.
- Regenerate a page image from its illustration prompt.
- Clear the current story with confirmation.
- Print the result or download the generated JSON.
- Manage active models, endpoints, keys, provider badges, and the premade prompt preview from the Settings dialog.
- Review local estimated usage by model and key from the Usage dialog.

Built-in story API models include OpenAI GPT-5.5, Anthropic Claude Opus 4.7, Google Gemini 3 Pro Preview, and xAI Grok 4.3.
Built-in image API models include OpenAI GPT Image 2, OpenAI GPT Image 1.5, Google Gemini 3.1 Flash Image Preview, Google Gemini 3 Pro Image Preview, and Google Gemini 2.5 Flash Image. API keys are stored in the browser for development only.

## Project Artifacts

- `PROJECT-INSTRUCTIONS.md` - source-of-truth handoff for product, engineering, UX, data shape, and next steps.
- `PROJECT-SPEC.md` - product spec, data model, API contract, and implementation plan.
- `src/api/localStoryEngine.js` - local demo generator for testable story output.
- `src/api/storyModelClient.js` - story model prompt builder and story provider clients.
- `src/components/CharacterManager.jsx` - reusable character library dialog.
- `src/components/StoryHistory.jsx` - past story history dialog.
- `src/components/SettingsManager.jsx` - model, endpoint, key, and premade prompt manager.
- `src/components/UsageManager.jsx` - local estimated model/key usage dialog.
- `src/components/PromptForm.jsx` - story creation form with cast and reference image controls.
- `src/components/StoryPreview.jsx` - book preview, page navigation, print, and JSON export.

## Getting Started

Install dependencies:

```powershell
npm install
```

Run the development server:

```powershell
npm run dev
```

Build for production:

```powershell
npm run build
```

## Next Steps

- Add `/api/generate-story` as a backend orchestration endpoint.
- Move production provider keys to server-side environment variables.
- Move story and image provider calls behind backend routes.
- Connect Multiplay image generation.
- Add per-page editing and PDF export.
