# AIStory Project Instructions

This is the source-of-truth handoff document for AIStory. It is intended for a new developer, product manager, or AI coding agent joining the project.

## 1. Product Intent

AIStory is a guided web app that turns a short parent prompt into a child-ready illustrated mini-book.

The product promise:

> Give me a bedtime-story idea, and I will give you a polished illustrated mini-book you can read to a child tonight.

This should feel like a simple book-making workflow, not a generic AI playground.

## 2. Current MVP

The current app is a React + Vite single-page app with a small Node API server. It works without external APIs through local demo generation.

The current workflow is:

1. Set the book: add characters, picture references, story language, child age, built-in or free-text theme, optional free-text art style direction, page count, and optional style reference.
2. Write the story idea.
3. Generate the story text draft only. This returns page text, image prompts, and pending image placeholders.
4. Review and approve page text.
5. Edit any page manually, or ask the story model to rewrite one page while preserving continuity.
6. Generate the illustrated book after all pages are approved.
7. Preview page text with matching local SVG illustrations or API-generated images when an image provider is selected.
8. Regenerate an individual page image through the active image model.
9. Retry all pictures, which clears the old generated images, clears the generated style anchor, rebuilds the page image prompts with the latest continuity rules, and restarts the full image queue from page 1.
10. Review the final book in an A4 landscape page display with picture and story text.
11. Move page-to-page in the reader and final book preview.
12. Save the story manually to History, save as PDF through the browser print dialog, print, or download JSON.
13. Open past stories from History, or recreate them from the saved setup.
14. Clear the current story after confirming.
15. Copy the image prompt.

The Characters button opens an in-page modal dialog for saving, editing, removing, and reusing character profiles.
The History button opens an in-page modal dialog with the last 10 generated stories and each story's saved setup snapshot.
Settings open in an in-page modal dialog. They should not push the story workflow down the page.
Model settings and active model choices belong only in the Settings dialog. The creation form should not include model pickers or model-management controls.
Selecting an active story or image model in Settings saves that choice immediately. API keys are saved once per provider/company, then shared by all story and image models from that provider. The global Save settings button remains available for all settings edits.
The header has a Flow control with two modes: All keeps the current full-page workflow visible, and Steps uses a guided flow where each completed step disappears and the next step takes focus. Users can always go back to earlier unlocked steps.
The live premade story prompt preview also belongs in Settings, not in the main creation flow.
The current local demo language selector supports English, Hebrew, and Spanish. API models receive the selected language in the premade prompt.
When Hebrew is selected, the story prompt and per-page rewrite prompt should ask for full niqqud / nikud vowel marks (ניקוד) on Hebrew title, summary, and page text.
The current default API path is Gemini: Google Gemini 2.5 Flash for story text and Google Gemini 2.5 Flash Image for page images. Users can still choose OpenAI, Anthropic, xAI, local demo, or custom providers in Settings.

## 2A. Product Vibe And Screen Flow

The app should feel like a calm guided workshop for a parent, not a technical dashboard.

The main page layout is top-to-bottom:

1. Top: book setup options, including characters, references, language, age, built-in/custom theme, art direction, page count, style reference, and story idea.
2. Below: generated story draft, page review, approval controls, visual bible, generated pages, and export/regeneration actions.
3. Side: a live summary panel that fills from the setup form, then from the generated book. It shows story summary, characters, story/image models, settings, and generation state.

The app can present that same flow in two UI modes:

- All mode: setup and generated output stay visible on one page for faster testing and power use.
- Steps mode: Step 1 Set the book, Step 2 Approve story, and Step 3 Build book are shown one at a time. The stepper keeps previous steps reachable without losing the form or review state.

Keep provider/model complexity in Settings. The parent-facing flow should say what is happening in plain language: set the book, generate story text, approve pages, generate book images, read/export.

Where we are right now:

- Local demo story and image generation works without external APIs.
- Story API calls and image API calls are routed through the Node server.
- Long story/image requests can be stopped from the UI. Stopping aborts the active browser request, propagates the abort signal to the backend provider fetch where possible, and keeps any pages that already finished.
- Story generation and final image generation are now separate actions.
- The UI shows loading/progress while story text or images are being generated.
- A live side summary panel shows the current story idea/summary, characters, selected or used models, language, age, theme/custom theme, art style, page count, reference status, and generated image state.
- Pages can be approved before images are generated.
- Individual pages can be edited by the user before approval or after completion.
- Individual pages can be rewritten by the active story model.
- Individual images can be regenerated by the active image model, and the page image prompt is rebuilt first so older saved books pick up current consistency rules.
- All pictures can be regenerated as a full restarted image pass, with prompts rebuilt before the queue starts.
- Book image generation runs page-by-page from the UI so progress can be shown and partial results are saved after each page.
- If the browser refreshes during image generation, the current in-flight provider request is lost, but completed pages already saved to IndexedDB remain. The UI should offer Resume book images for remaining/failed pages.
- History is updated as soon as a story draft is generated, then updated again after each completed image. The user can also press Save story to manually pin the current draft/progress into History. Manual and automatic saves must include the full setup snapshot: story idea, characters, picture references, language, age, theme/custom theme, art style, page count, and generated book/pages. A failed or stopped image run should not make the user start from scratch.
- Completed books show an A4 landscape page preview with page navigation.
- Browser print supports saving the A4 landscape book as a PDF.
- Hebrew/RTL stories use right-to-left text layout in the reader, final preview, and print output.
- Hebrew final preview and print put the image on the left and RTL text on the right.
- External and local image prompts include landscape-safe framing instructions with generous margins so faces, hands, bodies, and important objects are not cropped.
- Final A4/print image display uses contained image fitting, not cover cropping.
- All-vs-Steps UI mode is saved locally and should not reset the current form or page review state when switching.
- Settings, Characters, History, and Usage are modal dialogs.

What is still missing:

- Real provider usage/billing lookup.
- Stronger JSON schema validation and repair when a story model returns malformed JSON.
- A dedicated in-app PDF renderer/exporter beyond the browser print dialog.
- Persistent account-based saved books.

## 3. Important Files

- `PROJECT-INSTRUCTIONS.md` - this handoff and source-of-truth document.
- `PROJECT-SPEC.md` - product spec, data model, API contract, and phased implementation plan.
- `README.md` - quick project overview and run commands.
- `src/App.jsx` - top-level state, settings persistence, dark mode memory, generation orchestration.
- `src/components/PromptForm.jsx` - simple story creation form with cast, reference image, book-detail, and story-idea controls.
- `src/components/CharacterManager.jsx` - reusable character library modal for saving, editing, removing, and using past characters.
- `src/components/StoryHistory.jsx` - story history modal for opening or recreating past stories.
- `src/components/StoryPreview.jsx` - story approval, page editing, page rewrite retry, generated book preview, A4 print preview, page navigation, prompt copy, image regeneration, export.
- `src/components/StorySummaryPanel.jsx` - live side summary for current setup, story summary, characters, models, settings, and generated state.
- `src/components/SettingsManager.jsx` - story/image model profile manager and premade prompt preview.
- `src/components/UsageManager.jsx` - usage modal for local estimated activity by model and API key.
- `src/data/characterLibrary.js` - saved character normalization and merge helpers.
- `src/data/providerConfig.js` - default model settings and profile merge helpers.
- `src/data/storyHistory.js` - story history normalization and request snapshot helpers.
- `src/data/usageTracker.js` - local usage counters and token-estimate helpers.
- `src/data/storyOptions.js` - child age, language, theme, and art style suggestion options.
- `src/api/backendClient.js` - browser client for `/api/generate-story`, `/api/generate-book-images`, `/api/generate-image`, and `/api/regenerate-page-text`.
- `src/api/storyModelClient.js` - shared premade story prompt builder, story provider clients, page rewrite clients, and image provider clients.
- `src/api/localStoryEngine.js` - local demo story generation, visual bible, SVG image generation, local page rewrite, local image regeneration, and image prompt rebuilding.
- `src/api/multiplayClient.js` - early placeholder client for future image API integration.
- `server/index.js` - Node API server, server-side key resolution, generation routes, static `dist` serving.
- `scripts/dev.js` - starts the Node API server and Vite dev server together.

## 4. Current Persistence

Browser storage is intentionally lightweight for the MVP:

- Latest generated book is saved in IndexedDB under the `aistory-persistence` database, `latest-book` key.
- Model profiles, endpoints, active model picks, and provider-level API keys are saved in `localStorage` under `aistory-model-settings`.
- Reusable characters are saved in `localStorage` under `aistory-character-library`.
- Local estimated usage by model and key is saved in `localStorage` under `aistory-model-usage`.
- The last 10 generated stories are saved in IndexedDB under the `aistory-persistence` database, `story-history` key. Legacy `localStorage` history is migrated when available.
- Dark mode is saved in `localStorage` under `aistory-dark-mode`.
- UI flow mode is saved in `localStorage` under `aistory-ui-mode`.

For local development, a browser-saved provider key is used for every selected model from that company. Server environment keys are the fallback when no browser provider key is saved.
Use `.env.example` as the list of supported server environment variables.
Do not treat browser-stored API keys as production-safe.
The usage dialog is a local estimate only. Real billing, quota, and token accounting must come from provider dashboards or backend/provider usage APIs.
Never commit real provider keys to `.env.example`, docs, screenshots, or source files.

Browser storage loaders must tolerate malformed older data. A bad saved model, character, story history item, usage row, or UI mode should be ignored or repaired instead of crashing the frontend.
`AppErrorBoundary` catches unexpected render crashes and offers Reload or Reset local AIStory data.
Do not store generated image data URLs in `localStorage` or `sessionStorage`; generated page images are too large and can crash the frontend through browser quota errors.

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
  workflowStage?: "story-draft" | "complete";
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
    imageDescription: string;
    illustrationPrompt: string;
    imageUrl: string;
    imageStatus: "pending" | "complete" | "failed";
  }>;
  requestSnapshot?: object;
};
```

Keep this shape stable. UI, export, and future backend work should converge on it.

## 6. Story Generation Design

Story generation is a reviewed two-stage workflow:

1. The story model writes structured page text.
2. The app builds illustration prompts and returns a `story-draft` book with `pending` image placeholders.
3. The user reviews each page.
4. The user can edit a page manually or ask the story model to rewrite that page.
5. Any edited or rewritten page rebuilds its illustration prompt, marks its image as pending, and requires approval again.
6. The user approves the page text.
7. The image model builds the final page images and the book moves to `complete`.

The premade story prompt must include:

- User story idea.
- Exact page count.
- Story language.
- Child age.
- Theme and optional art style direction.
- Character names, roles, descriptions, and whether each has a picture reference.
- Required JSON output shape.
- Child-safety constraints.
- A per-page `imageDescription` that describes the scene, action, emotion, setting, and visual focus for that page.
- If the language is Hebrew and an API story model is used, full niqqud / nikud vowel marks (ניקוד) for every Hebrew title, summary, and page-text word.
- Landscape-safe image composition guidance so the model plans scenes with margins and avoids cropped characters or key objects.

The model should return JSON with `storyTitle`, `storySummary`, and `pages`. Each page should include `pageNumber`, `text`, and `imageDescription`.

## 7. Image Generation Design

Each page should have a page-specific `imageDescription` and `illustrationPrompt`.

Every illustration prompt should repeat:

- Main character and supporting character descriptions.
- Whether each character has a reference image.
- Reference image source when a URL is available, or a note that an uploaded reference exists in request metadata.
- Setting.
- Palette.
- Art style, or a warm child-friendly default when no style is provided.
- Recurring visual details.
- The actual page text.
- The page-specific image description.
- Safety constraints.
- "No readable text inside the image."

Every illustration prompt should also include a consistency lock:

- Keep each named character's face shape, hair, skin tone, body proportions, outfit, clothing colors, accessories, and illustration style the same across pages.
- Preserve supplied reference-image identity cues when available.
- Keep the same physical story stage, indoor/outdoor choice, palette, lighting mood, recurring landmarks, central props, and general character/object layout across pages.
- Do not move to a different room, classroom, park, outdoor area, or indoor/outdoor setting unless the story text explicitly says the characters moved.
- Only vary camera angle, pose, action, and small scene props needed for the page.
- Keep the full important scene comfortably inside a landscape frame. Do not crop faces, hands, bodies, key props, or important background details at the edges.

Prompt repetition improves consistency but does not guarantee it. True production consistency should eventually use provider-specific reference-image inputs, image-to-image/edit APIs, seed controls where available, or a character/style sheet generated before page images.

Current reference-image behavior:

- Gemini image calls attach available data-URL reference images as inline image parts. The app prefers saved character references, then the overall style reference, then a compressed generated cast/location/layout/style anchor created from the first completed page.
- OpenAI image calls use `/v1/images/edits` with multipart image inputs when reference images are available. Without references, OpenAI uses `/v1/images/generations`.
- In the normal frontend page-by-page flow, full generated page image data URLs are stripped before `/api/generate-image` requests to prevent page 2+ payload bloat. After the first completed image, the frontend stores a smaller JPEG `generatedStyleReferenceUrl` on the book and sends that as the cast/location/layout/style anchor for later pages.
- The first completed page can help as a cast and location anchor, but do not chain every page into the next as the only strategy. Sequential chaining can accumulate mistakes and make later pages inherit the wrong scene, pose, or background. Prefer stable character references or a dedicated character/location sheet as the main anchor.
- Keep reference inputs limited and compressed. Large data-URL references can increase request size, provider cost, and latency.

Local demo mode uses generated SVG data URLs. OpenAI, Gemini, and generic custom image endpoints are wired through the Node API server. Production image generation should stay behind backend routes, not direct frontend provider calls.

Before sending prompts to external image providers, the backend creates a provider-safe prompt variant. It keeps the page scene and visual bible context but avoids wording that commonly trips image safety filters, such as direct minor/bedroom/pajama phrasing. If OpenAI or another provider rejects the first prompt for safety/policy reasons, the backend automatically retries once with a simpler wholesome storybook fallback prompt.

Gemini image generation uses a conservative `responseModalities: ["IMAGE"]` config. If Gemini rejects generation config fields, the backend retries the same prompt without `generationConfig`. Do not add Gemini aspect ratio or image size config back into the default path unless it is tested against the live Generative Language API.

Current backend routes:

- `GET /api/health` returns server status and which provider keys are present.
- `POST /api/generate-story` validates the story request, resolves server-side provider keys, runs story generation, builds image prompts, and returns a canonical `GeneratedBook`. When `skipImages: true` is supplied, it returns a `story-draft` with pending image placeholders.
- `POST /api/generate-book-images` takes an approved story draft, generates page images through the active image model, and returns a complete `GeneratedBook`.
- `POST /api/generate-image` regenerates one page image through the same backend/provider path.
- `POST /api/regenerate-page-text` rewrites one page through the active story model, rebuilds that page's image description and illustration prompt, marks its image as pending, and returns the updated `GeneratedBook`.

The frontend should prefer calling `POST /api/generate-image` page-by-page for the normal book build, because this gives visible progress, preserves partial results, and enables resume after refresh. The batch route remains useful for backend smoke tests and future worker queues.

When calling `POST /api/generate-image` or `POST /api/regenerate-page-text`, the frontend must send a slimmed book payload with existing generated page `imageUrl` data URLs removed. The response should be merged back into the full in-memory book by page number. Sending the full image-heavy book back to the API after page 1 can exceed JSON body limits and crash or stall the second image generation. If a generated visual anchor is needed, use the compressed `generatedStyleReferenceUrl`, not the original full page image.

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
- API keys are stored once per provider/company, not repeated per model.
- Type.

Built-in top story API models:

- OpenAI GPT-5.5, GPT-5.4, GPT-5.4 mini, GPT-5.4 nano, and GPT-5.2: `https://api.openai.com/v1/responses`
- Anthropic Claude Opus 4.7, Claude Sonnet 4.6, and Claude Haiku 4.5: `https://api.anthropic.com/v1/messages`
- Google Gemini 3.5 Flash, Gemini 3.1 Pro, Gemini 3.1 Flash-Lite, Gemini 2.5 Pro, Gemini 2.5 Flash, and Gemini 2.5 Flash-Lite: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- xAI Grok 4.3: `https://api.x.ai/v1/chat/completions`

Built-in image API models:

- OpenAI GPT Image 2, GPT Image 1.5, GPT Image 1, and GPT Image 1 mini: `https://api.openai.com/v1/images/generations`
- Google Gemini 3.1 Flash Image Preview / Nano Banana 2: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent`
- Google Gemini 3 Pro Image Preview / Nano Banana Pro: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`
- Google Gemini 2.5 Flash Image / Nano Banana: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`

Current story model behavior:

- `local` uses the local demo story engine.
- `openai-responses` sends a Responses API request with structured JSON output.
- `openai-compatible` sends a chat-completions style request to the configured endpoint.
- `anthropic-messages` sends a Messages API request with `x-api-key` and `anthropic-version`.
- `google-gemini` sends a `generateContent` request with `x-goog-api-key`.

Current image model behavior:

- `local` uses generated SVG data URLs.
- `openai-image` sends text-to-image requests to the OpenAI Images endpoint when no references are available, and uses the OpenAI image edits endpoint with multipart image inputs when references are available.
- `google-gemini-image` sends native Gemini `generateContent` requests with `x-goog-api-key`, including inline image parts when references are available.
- `custom-image` sends a generic JSON `{ model, prompt, input }` request to the configured endpoint and extracts common image response fields.
- `multiplay-image` uses `custom-image` behavior when a real endpoint/key is configured in Settings or `MULTIPLAY_IMAGE_ENDPOINT` / `MULTIPLAY_API_KEY`.
- Current active image model selection in Settings is used when generating book images or retrying one image. The saved book image model is only a fallback.
- Provider failures are logged to `.aistory-logs/api.err.log` with action, page number, model label, provider status, and sanitized provider message.

## 9. Product Rules

Do:

- Keep the user flow step-based.
- Keep story writing and book/image generation as separate actions.
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
- A top-to-bottom page structure: setup options first, generated story/pages below.
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
- Practical actions: generate story text, approve text, generate book images, regenerate image, copy prompt, print, download JSON.
- Practical full-book image action: retry all pictures, starting from page 1 and creating a fresh generated style anchor.
- Practical per-page actions: edit story text, edit image direction, ask AI to retry one page, retry one image.
- A final A4 landscape book view after image generation, with page-to-page navigation.
- RTL text layout for Hebrew and other RTL stories.
- Full ניקוד in API-generated Hebrew story text when Hebrew is selected.
- Contained final/print images and no-crop image prompts for landscape spreads.
- A visible loading/progress state while story text or images are being generated.
- Image progress should show current page, completed count, total count, and a rough remaining-time estimate after the first image completes.
- Warn the user before refresh while a story/image request is in flight.
- A Flow toggle for All mode and Steps mode. Steps mode must hide inactive steps visually while keeping their React state alive so going back feels reliable.

Avoid:

- Marketing landing-page layouts.
- Overly decorative UI.
- Large empty hero areas.
- Provider/model complexity in the main flow beyond what is needed.
- Settings/manage buttons beside story or image model fields.
- Model pickers in the main creation form.

## 11. Security Notes

Current local API-key handling uses the browser-saved provider/company key first, with server environment keys as the fallback.

Production must:

- Store provider keys in server environment variables.
- Validate request bodies.
- Sanitize generated JSON.
- Rate-limit generation routes.
- Avoid logging sensitive prompts, keys, or uploaded image contents.
- Keep recovery UI available for bad local saved state; do not remove the app error boundary without replacing it.

## 12. Current Limitations

- External image generation is wired for built-in OpenAI, Gemini, and generic custom image endpoints through the Node API server.
- Browser-stored keys are still allowed as a development fallback; production should rely on server env keys only.
- Reference image uploads are previewed locally and recorded as data URLs for request/history metadata. Gemini receives data-URL references as inline image parts. OpenAI uses the image edits endpoint when references are available.
- Local image regeneration changes the SVG illustration. OpenAI and Gemini image regeneration calls the selected external image model.
- External provider safety blocks can still happen. The backend retries once with a safer fallback prompt, then leaves the page marked `failed` with the provider message visible in the UI.
- Local page rewrite appends a simple warm revision. API page rewrite uses the active story model and the current book context.
- Real provider usage/billing lookup is not wired; Usage remains a local estimate.
- PDF saving currently uses the browser print dialog with A4 landscape print CSS. There is no dedicated PDF generation library yet.

## 13. Recommended Next Steps

1. Remove browser-stored provider keys once server env/key management is enough for normal testing.
2. Add a dedicated character/style sheet generation step for stronger cross-page consistency.
3. Add real provider usage/billing lookup where supported.
4. Add stricter JSON schema validation and repair for story model responses.
5. Add a dedicated PDF renderer/exporter if browser print is not enough.
6. Add richer final book layouts, such as cover page, end page, and optional full-bleed image pages.

## 14. Run And Verify

Install dependencies:

```powershell
npm install
```

Run the dev server:

```powershell
npm run dev
```

This starts both the Node API server on `http://127.0.0.1:8787` and the Vite app on `http://127.0.0.1:5173`.

Windows one-file launcher:

```powershell
.\run-aistory.ps1
```

Or:

```bat
run-aistory.bat
```

The Windows launcher opens the app in the default browser once the Vite dev server is ready. It starts missing API/frontend servers directly with `node`, writes logs to `.aistory-logs`, and avoids passing Vite flags through `npm`.

To stop background dev servers:

```bat
stop-aistory.bat
```

Run only the API server:

```powershell
npm run dev:api
```

Serve the built app and API together:

```powershell
npm run build
npm run serve
```

Build:

```powershell
npm run build
```

Manual smoke test:

1. Open the app.
2. Toggle dark mode, refresh, confirm it stays.
3. Switch Flow between All and Steps, refresh, and confirm the choice stays.
4. In Steps mode, confirm only Step 1 is visible before generation.
5. Open Settings and confirm `Local demo writer` and `Local demo illustrator` are active.
6. Open Characters, save the current cast, edit one saved character, save, reopen, and use that character.
7. Add a second character.
8. Drag or browse a character picture reference.
9. Select a language.
10. Generate story text and confirm a loading state appears and Steps mode moves to Step 2.
11. Confirm the preview shows pending image placeholders and the expected page count/language metadata.
12. Use Back in Steps mode and confirm the setup form is still filled in.
13. Return to Step 2 and approve each page, or use Approve all.
14. Edit one page, save it, and confirm the page becomes unapproved with a pending image.
15. Ask AI to retry one page and confirm the page text and image direction update.
16. Approve the edited/retried page.
17. Generate book images and confirm Steps mode moves to Step 3 with a separate loading state.
18. Confirm the final A4 landscape book preview appears and page navigation works.
19. Use Save PDF / Print and confirm the browser print preview uses landscape pages with image and text.
20. For Hebrew with an API story model, confirm the reader, A4 preview, and print layout are RTL, final spreads show image left/text right, and generated story text includes ניקוד.
21. Open Usage and confirm the story model incremented after text generation and the image model incremented after image generation.
22. Open History and confirm the completed story appears with the selected language.
23. Open the story from History.
24. Recreate the story from History.
25. Use Clear story and confirm it asks "Are you sure?"
26. Open an illustration prompt.
27. Regenerate one page image.
28. Use Retry all pictures and confirm every image is regenerated from page 1 with progress shown.
29. Open Usage and confirm it increments image regeneration.
30. Download JSON and confirm it includes `language`, `visualBible`, `characters`, `workflowStage`, `pages`, and per-page `imageDescription`.
