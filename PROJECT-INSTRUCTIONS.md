# AIStory Project Instructions

This is the source-of-truth handoff document for AIStory. It is intended for a new developer, product manager, or AI coding agent joining the project.

## 1. Product Intent

AIStory is a guided web app that turns a short parent prompt into a child-ready illustrated mini-book.

The product promise:

> Give me a bedtime-story idea, and I will give you a polished illustrated mini-book you can read to a child tonight.

This should feel like a simple book-making workflow, not a generic AI playground.

## 2. Current MVP

The current app is a React + Vite single-page app. It works without external APIs through local demo generation.

The current workflow is:

1. Set the book: add characters, picture references, story language, child age, theme, optional free-text art style direction, page count, and optional style reference.
2. Write the story idea.
3. Generate the story.
4. Preview page text with matching local SVG illustrations or API-generated images when an image provider is selected.
5. Regenerate an individual page image through the active image model.
6. Open past stories from History, or recreate them from the saved setup.
7. Clear the current story after confirming.
8. Copy the image prompt, print the book, or download JSON.

The Characters button opens an in-page modal dialog for saving, editing, removing, and reusing character profiles.
The History button opens an in-page modal dialog with the last 10 generated stories.
Settings open in an in-page modal dialog. They should not push the story workflow down the page.
Model settings and active model choices belong only in the Settings dialog. The creation form should not include model pickers or model-management controls.
The live premade story prompt preview also belongs in Settings, not in the main creation flow.
The current local demo language selector supports English, Hebrew, and Spanish. API models receive the selected language in the premade prompt.

## 3. Important Files

- `PROJECT-INSTRUCTIONS.md` - this handoff and source-of-truth document.
- `PROJECT-SPEC.md` - product spec, data model, API contract, and phased implementation plan.
- `README.md` - quick project overview and run commands.
- `src/App.jsx` - top-level state, settings persistence, dark mode memory, generation orchestration.
- `src/components/PromptForm.jsx` - simple story creation form with cast, reference image, book-detail, and story-idea controls.
- `src/components/CharacterManager.jsx` - reusable character library modal for saving, editing, removing, and using past characters.
- `src/components/StoryHistory.jsx` - story history modal for opening or recreating past stories.
- `src/components/StoryPreview.jsx` - generated book preview, page navigation, prompt copy, image regeneration, export.
- `src/components/SettingsManager.jsx` - story/image model profile manager and premade prompt preview.
- `src/components/UsageManager.jsx` - usage modal for local estimated activity by model and API key.
- `src/data/characterLibrary.js` - saved character normalization and merge helpers.
- `src/data/providerConfig.js` - default model settings and profile merge helpers.
- `src/data/storyHistory.js` - story history normalization and request snapshot helpers.
- `src/data/usageTracker.js` - local usage counters and token-estimate helpers.
- `src/data/storyOptions.js` - child age, language, theme, and art style suggestion options.
- `src/api/storyModelClient.js` - premade story prompt builder, story provider clients, and image provider clients.
- `src/api/localStoryEngine.js` - local demo story generation, visual bible, SVG image generation, local image regeneration.
- `src/api/multiplayClient.js` - early placeholder client for future image API integration.

## 4. Current Persistence

Browser storage is intentionally lightweight for the MVP:

- Latest generated book is saved in `sessionStorage` under `aistory-latest-book`.
- Model profiles, endpoints, and API keys are saved in `localStorage` under `aistory-model-settings`.
- Reusable characters are saved in `localStorage` under `aistory-character-library`.
- Local estimated usage by model and key is saved in `localStorage` under `aistory-model-usage`.
- The last 10 generated stories are saved in `localStorage` under `aistory-story-history`.
- Dark mode is saved in `localStorage` under `aistory-dark-mode`.

Do not treat browser-stored API keys as production-safe. This is for local development and testing only.
The usage dialog is a local estimate only. Real billing, quota, and token accounting must come from provider dashboards or backend/provider usage APIs.

## 5. Canonical Book Shape

Generation code should return a `GeneratedBook` shaped like this:

```ts
type GeneratedBook = {
  id: string;
  createdAt: string;
  source: "local-demo" | "api";
  storyModel: string;
  imageModel: string;
  storyTitle: string;
  storySummary: string;
  targetAge: string;
  language: string;
  theme: string;
  artStyle: string;
  visualBible: {
    mainCharacter: string;
    characters: Array<{
      name: string;
      description: string;
      role: string;
      referenceImageUrl?: string | null;
      hasReferenceImage: boolean;
    }>;
    setting: string;
    palette: string[];
    repeatedVisualDetails: string[];
    safetyNotes: string[];
  };
  pages: Array<{
    pageNumber: number;
    text: string;
    illustrationPrompt: string;
    imageUrl: string;
    imageStatus: "pending" | "complete" | "failed";
  }>;
};
```

Keep this shape stable. UI, export, and future backend work should converge on it.

## 6. Story Generation Design

Story generation is two-stage:

1. The story model writes structured page text.
2. The app builds illustration prompts and images for each page.

The premade story prompt must include:

- User story idea.
- Exact page count.
- Story language.
- Child age.
- Theme and optional art style direction.
- Character names, roles, descriptions, and whether each has a picture reference.
- Required JSON output shape.
- Child-safety constraints.

The model should return JSON with `storyTitle`, `storySummary`, and `pages`.

## 7. Image Generation Design

Each page should have a page-specific `illustrationPrompt`.

Every illustration prompt should repeat:

- Main character and supporting character descriptions.
- Whether each character has a reference image.
- Setting.
- Palette.
- Art style, or a warm child-friendly default when no style is provided.
- Recurring visual details.
- Safety constraints.
- "No readable text inside the image."

Local demo mode uses generated SVG data URLs. OpenAI and Gemini image models are wired directly from the frontend for local development only. Production image generation should happen through a backend API, not directly from frontend keys.

## 8. Model Settings

The app currently supports model profiles:

- Story models.
- Image models.
- Active story and image model defaults.
- Display label.
- Provider.
- Provider icon badge.
- Model name.
- Endpoint.
- API key.
- Type.

Built-in top story API models:

- OpenAI GPT-5.5: `https://api.openai.com/v1/chat/completions`
- Anthropic Claude Opus 4.7: `https://api.anthropic.com/v1/messages`
- Google Gemini 3 Pro Preview: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent`
- xAI Grok 4.3: `https://api.x.ai/v1/chat/completions`

Built-in image API models:

- OpenAI GPT Image 2: `https://api.openai.com/v1/images/generations`
- OpenAI GPT Image 1.5: `https://api.openai.com/v1/images/generations`
- Google Gemini 3.1 Flash Image Preview: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`
- Google Gemini 3 Pro Image Preview: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
- Google Gemini 2.5 Flash Image: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`

Current story model behavior:

- `local` uses the local demo story engine.
- `openai-compatible` sends a chat-completions style request to the configured endpoint.
- `anthropic-messages` sends a Messages API request with `x-api-key` and `anthropic-version`.
- `google-gemini` sends a `generateContent` request with `x-goog-api-key`.

Current image model behavior:

- `local` uses generated SVG data URLs.
- `openai-image` sends text-to-image requests to the OpenAI Images endpoint with a Bearer API key.
- `google-gemini-image` sends native Gemini `generateContent` requests with `x-goog-api-key`.
- `custom-image` and the Multiplay placeholder are not wired yet.

## 9. Product Rules

Do:

- Keep the user flow step-based.
- Keep the visible creation flow simple enough for a non-technical parent.
- Keep local demo mode working at all times.
- Make generated output testable without paid APIs.
- Favor parent-facing language over technical model jargon.
- Preserve the canonical `GeneratedBook` shape.
- Keep story text child-safe, warm, and age-appropriate.
- Keep visual consistency as a first-class requirement.
- Add loading and error states for every external call.
- Keep API-key handling marked as development-only until a backend proxy exists.

Do not:

- Turn the app into a generic AI prompt playground.
- Expose production API keys in frontend code.
- Let generated output depend on hidden state that is not captured in the book JSON.
- Break local demo mode while adding real APIs.
- Add features that bypass the step flow unless the product direction changes.
- Store uploaded reference images as permanent data without an explicit storage plan.
- Generate scary, graphic, sexual, hateful, or unsafe content for children.
- Present medical, legal, or disciplinary advice as fact.

## 10. UX Rules

The main user is a parent, caregiver, or teacher. The app should feel calm, clear, and quick.

Prefer:

- Step labels that explain what happens next.
- Compact controls.
- Clear page preview.
- Visible model/settings access without making it the main story.
- Settings as an in-page dialog/modal, not an inline section that shifts the workflow.
- Model settings and active model selection only in the Settings dialog, reachable from the app header.
- Premade story prompt preview in the Settings dialog.
- Character picture references that support drag-and-drop, click-to-browse, and URL entry.
- Language selection in the book setup.
- A reusable character library in a modal dialog, reachable from the app header.
- A 10-item story history modal with Open and Recreate actions.
- A confirmed Clear story action in the preview.
- A Usage modal showing estimated activity per model/key without exposing raw API keys.
- Practical actions: generate, regenerate image, copy prompt, print, download JSON.

Avoid:

- Marketing landing-page layouts.
- Overly decorative UI.
- Large empty hero areas.
- Provider/model complexity in the main flow beyond what is needed.
- Settings/manage buttons beside story or image model fields.
- Model pickers in the main creation form.

## 11. Security Notes

Current API-key storage is browser-local only and acceptable for development demos.

Production must:

- Move story and image API calls to a backend route.
- Store provider keys in server environment variables.
- Validate request bodies.
- Sanitize generated JSON.
- Rate-limit generation routes.
- Avoid logging sensitive prompts, keys, or uploaded image contents.

## 12. Current Limitations

- External image generation is wired for built-in OpenAI and Gemini image models only.
- Story and image API calls run from the browser in this MVP, so CORS and key exposure can be an issue.
- Reference image uploads are previewed locally and recorded as metadata; they are not uploaded to storage.
- Local image regeneration changes the SVG illustration. OpenAI and Gemini image regeneration calls the selected external image model.
- There is no PDF export yet.
- There is no per-page text editor yet.

## 13. Recommended Next Steps

1. Add a backend `/api/generate-story` orchestration endpoint.
2. Move story API calls behind that endpoint.
3. Add a backend `/api/generate-image` endpoint for page images.
4. Wire Multiplay image generation.
5. Add per-page image regeneration through the backend image endpoint.
6. Add page text editing before image generation.
7. Add PDF export once preview quality is good.

## 14. Run And Verify

Install dependencies:

```powershell
npm install
```

Run the dev server:

```powershell
npm run dev
```

Build:

```powershell
npm run build
```

Manual smoke test:

1. Open the app.
2. Toggle dark mode, refresh, confirm it stays.
3. Open Settings and confirm `Local demo writer` and `Local demo illustrator` are active.
4. Open Characters, save the current cast, edit one saved character, save, reopen, and use that character.
5. Add a second character.
6. Drag or browse a character picture reference.
7. Select a language.
8. Generate a story.
9. Confirm the preview has the expected page count and selected language metadata.
10. Open Usage and confirm it increments the active story and image model rows.
11. Open History and confirm the generated story appears with the selected language.
12. Open the story from History.
13. Recreate the story from History.
14. Use Clear story and confirm it asks "Are you sure?"
15. Open an illustration prompt.
16. Regenerate one page image.
17. Open Usage and confirm it increments image regeneration.
18. Download JSON and confirm it includes `language`, `visualBible`, `characters`, and `pages`.
