# AIStory Project Specification

## 1. Product Goal

AIStory is a web app that turns a short parent prompt into a complete illustrated children's mini-book.

The first usable version should help a parent create something they can read tonight:

1. Set the book by adding characters, reference pictures, language, child age, built-in or free-text theme, optional art style direction, and page count.
2. Enter the story idea.
3. Generate a structured story with one page of text per page count.
4. Approve the story text page by page.
5. Produce a matching illustration prompt and image per approved page.
6. Preview the result as a simple book, regenerate images, and export it.

The product should feel like a guided book-making workflow, not a generic AI playground.

## 2. Primary User

The primary user is a parent, caregiver, or teacher who wants a fast, child-safe, personalized story.

They usually care about:

- A coherent story that fits the child's age.
- Gentle, readable page lengths.
- A consistent cast of characters and visual style.
- A quick preview they can read or share.
- Minimal technical setup.

They do not primarily care about provider settings, model names, seeds, or image pipeline details.

## 3. MVP Scope

### Must Have

- Story prompt input.
- Story language selection.
- Child age or reading level.
- Theme selection.
- Optional free-text art style direction.
- Page count selection.
- Story-writing model selection in Settings.
- Image model selection in Settings.
- Settings dialog for model profiles, endpoints, provider-level API keys, and premade prompt preview.
- Flow mode toggle for All mode or guided Steps mode.
- Add up to five characters.
- Reusable character library for saving, editing, removing, and using past characters.
- Character name, short description, and optional relationship/role.
- Optional drag-and-drop, click-to-browse, or URL reference image per character.
- Optional reference image URL or upload.
- Structured story generation.
- API Hebrew story generation should request full niqqud / nikud vowel marks (ניקוד) when Hebrew is selected.
- Story-text approval before image generation.
- Per-page image description from the story model.
- One illustration prompt per page.
- One generated illustration per page.
- Regenerate an individual page image from its prompt.
- Retry all page images by restarting the full image generation queue.
- A visual bible that keeps characters, setting, palette, and style consistent.
- Page-by-page preview.
- Clear current story with confirmation.
- Story history for the last 10 generated books, with open and recreate actions.
- Persistent latest-book and history storage that can handle generated image data without browser quota crashes.
- Export as printable browser view and JSON download.
- Usage dialog with local estimated activity by model and API key.
- Stop controls for active story or image requests.
- Loading, empty, and error states.
- Guided step navigation that allows going back to earlier steps without losing entered setup or review state.

### Should Have

- Regenerate the whole book.
- Edit the prompt and generate again.
- Clear content boundaries for child-safe output.
- Save the latest generated book in browser state for the session.
- Local demo generation mode so the app is testable without external APIs.
- OpenAI-compatible story model call for development and local proxy testing.
- OpenAI and Gemini image model calls for development and local proxy testing.

### Later

- Per-page text editing.
- PDF export.
- Account-based saved books.
- Multi-language stories.
- Real image upload storage.
- Shareable book links.

## 4. Product Promise

AIStory should consistently deliver:

- A title.
- A short summary.
- A visual bible.
- Page-sized story text.
- Page-specific illustration prompts.
- Matching images.
- A readable preview.

The core promise is:

> "Give me a bedtime-story idea, and I will give you a polished illustrated mini-book you can read to a child tonight."

## 5. Canonical Data Model

All generation code should eventually produce this shape.

```ts
type GenerateStoryRequest = {
  prompt: string;
  storyModelId: string;
  imageModelId: string;
  language: string;
  theme: string;
  themePreset?: string;
  customTheme?: string;
  artStyle?: string;
  pageCount: number;
  childAge: string;
  characters: Array<{
    name: string;
    description?: string;
    role?: string;
    referenceImageUrl?: string | null;
    referenceImageFile?: File | null;
  }>;
  referenceImageUrl?: string | null;
  referenceImageFile?: File | null;
  generationMode: "local-demo" | "api";
};

type GeneratedBook = {
  id: string;
  createdAt: string;
  source: "local-demo" | "api";
  storyModel: string;
  imageModel: string;
  workflowStage?: "story-draft" | "complete";
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
    imageDescription: string;
    illustrationPrompt: string;
    imageUrl: string;
    imageStatus: "pending" | "complete" | "failed";
  }>;
  requestSnapshot?: object;
};
```

## 6. API Contract

The frontend should treat these as the future production endpoints.

### Story Draft Endpoint

`POST /api/generate-story`

When the request body includes `skipImages: true`, this route returns a story draft with `workflowStage: "story-draft"` and page images marked `pending`.

### Request

```json
{
  "prompt": "Why is it important to go to sleep early?",
  "storyModelId": "openai-compatible-story",
  "imageModelId": "local-demo-image",
  "language": "English",
  "theme": "bedtime",
  "artStyle": "soft watercolor",
  "pageCount": 6,
  "childAge": "4-6",
  "characters": [
    {
      "name": "Milo",
      "description": "A curious child who asks one more question before bed",
      "role": "main character",
      "referenceImageUrl": null
    }
  ],
  "referenceImageUrl": null,
  "generationMode": "api"
}
```

### Response

```json
{
  "id": "book_123",
  "createdAt": "2026-05-24T10:00:00.000Z",
  "source": "api",
  "storyModel": "gpt-4o-mini",
  "imageModel": "local-demo-image",
  "workflowStage": "story-draft",
  "storyTitle": "Milo and the Moonlit Clock",
  "storySummary": "Milo learns how early sleep helps tomorrow feel bright.",
  "targetAge": "4-6",
  "language": "English",
  "theme": "bedtime",
  "artStyle": "soft watercolor",
  "visualBible": {
    "mainCharacter": "Milo, a curious child in star pajamas",
    "characters": [
      {
        "name": "Milo",
        "description": "A curious child who asks one more question before bed",
        "role": "main character",
        "referenceImageUrl": null,
        "hasReferenceImage": false
      }
    ],
    "setting": "a cozy bedroom and a moonlit neighborhood",
    "palette": ["warm amber", "moon blue", "soft lavender"],
    "repeatedVisualDetails": ["star pajamas", "small moon lamp", "rounded storybook shapes"],
    "safetyNotes": ["gentle tone", "no frightening imagery", "age-appropriate language"]
  },
  "pages": [
    {
      "pageNumber": 1,
      "text": "Milo loved one more game, one more sip, and one more question before bed.",
      "imageDescription": "Milo sits in a cozy bedroom looking at the moonlit clock, still curious but beginning to feel sleepy.",
      "illustrationPrompt": "Soft watercolor children's book illustration of Milo in star pajamas...",
      "imageUrl": "data:image/svg+xml;charset=UTF-8,...",
      "imageStatus": "pending"
    }
  ]
}
```

### Book Image Endpoint

`POST /api/generate-book-images`

Takes an approved `GeneratedBook` draft, generates images for each page, marks the book `workflowStage: "complete"`, and returns the updated book.

### Current Supporting Endpoint

`POST /api/generate-image`

Regenerates one page image from an existing `GeneratedBook` and page number. This route should remain the frontend path for per-page image retries/regeneration.

## 7. Generation Pipeline

### Step 1 - Story Writing

The user selects the active story model in Settings, then writes the story idea in the main flow. The app shows a loading state and builds a premade prompt that includes:

- The user's story idea.
- Page count.
- Story language.
- Child age.
- Characters and roles.
- Theme and tone.
- Required JSON output shape.
- Child-safety constraints.
- Per-page `imageDescription` instructions so the story model defines the visual moment for each page.
- If Hebrew is selected, full niqqud / nikud vowel marks (ניקוד) on Hebrew title, summary, and page text.
- Landscape-safe composition instructions so page image descriptions avoid cropped characters and key objects.

The model should return title, summary, exact page text, and an image description for each page. The app then builds image prompts from the returned pages and shows an approval view before images are generated.

Built-in story API models should include:

- OpenAI GPT-5.5, GPT-5.4, GPT-5.4 mini, GPT-5.4 nano, and GPT-5.2.
- Anthropic Claude Opus 4.7, Claude Sonnet 4.6, and Claude Haiku 4.5.
- Google Gemini 3.5 Flash, Gemini 3.1 Pro, Gemini 3.1 Flash-Lite, Gemini 2.5 Pro, Gemini 2.5 Flash, and Gemini 2.5 Flash-Lite.
- xAI Grok 4.3.

Built-in image API models should include:

- OpenAI GPT Image 2, GPT Image 1.5, GPT Image 1, and GPT Image 1 mini.
- Google Gemini 3.1 Flash Image Preview / Nano Banana 2.
- Google Gemini 3 Pro Image Preview / Nano Banana Pro.
- Google Gemini 2.5 Flash Image / Nano Banana.

External image calls should use provider-safe prompt variants and retry once with a safer fallback prompt when a provider blocks a request for safety or policy reasons. Gemini image calls should avoid optional aspect ratio/image size config in the default path unless live API testing confirms the fields are accepted.
For consistency, provider calls should attach reference images when available. Prefer character references and a dedicated style/character/location sheet over chaining every page into the next. The current frontend page-by-page JSON route should strip full generated page data URLs before API calls to avoid body-size failures, but it can send a compressed first-page cast/location/layout/style anchor for later pages. Prompts should lock the same physical story stage, indoor/outdoor choice, recurring landmarks, central props, and general character/object layout unless the story explicitly moves to a new place.
Generated images should use landscape-safe framing with enough margin that faces, hands, bodies, and important objects are not cut off. The final A4 and print views should display images with contained fitting rather than cover cropping.

Page image generation requests should not send the full book with every prior generated base64 image. Existing page `imageUrl` data URLs should be stripped from request payloads and the returned page should be merged back into the full client-side book. This keeps page 2+ generation from exceeding body-size limits. After the first successful page image, the frontend should keep a smaller `generatedStyleReferenceUrl` for cast/outfit/location/layout/style consistency. Retrying one image or all images should rebuild the affected page prompts first so older saved books pick up the current continuity rules.

### Local Demo Mode

The app must work without external services. Local demo mode generates:

- A deterministic title and story summary.
- A visual bible.
- A cast list with character descriptions and reference image metadata.
- Page text from safe story templates.
- SVG illustrations as data URLs.
- JSON and print export.

This mode is for product testing, UX iteration, and API contract validation.

### API Mode

Generation is now orchestrated on Node backend routes:

1. Validate and sanitize the request.
2. Generate the story plan and visual bible.
3. Generate page text and page illustration prompts.
4. Return a `story-draft` book with pending image placeholders.
5. After approval, call the image service once per page.
6. Support per-page image regeneration.
7. Return one canonical `GeneratedBook`.

The frontend should not hold production API keys.

The current local MVP uses one browser-saved key per provider/company, shared by all story and image models from that provider, then falls back to server environment keys. Treat browser keys as temporary local testing support.

## 8. Visual Consistency Strategy

Visual consistency is a first-class feature. Each generated book should include a visual bible and every image prompt should repeat:

- Main character and supporting character descriptions.
- Per-character reference image instructions and source metadata when supplied.
- Outfit or recurring visual marker.
- Setting.
- Palette.
- Art style, or a warm child-friendly default when no style is provided.
- The page-specific image description.
- The actual page text and what is happening in that moment.
- Camera/framing guidance.
- Negative constraints such as no scary imagery and no text in image.
- Landscape-safe margins so characters and important props are fully visible.

If the image provider supports seeds, reference images, or character references, the backend should use them. If it does not, the prompt still needs enough repeated details to keep the book coherent.

## 9. Child-Safety and Quality Rules

Stories should:

- Match the selected child age.
- Use short page-sized paragraphs.
- Avoid graphic, sexual, hateful, or frightening content.
- Prefer gentle conflict and reassuring resolution.
- Avoid medical, legal, or disciplinary advice presented as fact.
- Avoid shaming the child.
- Keep lessons warm and practical.
- End with emotional closure.

If the prompt is unsafe or not suitable for children, the app should refuse or redirect into a safer version.

## 10. UI Structure

The main page should be top-to-bottom. The book setup/options live at the top of the page. The generated story draft, page approval, visual bible, generated images, page list, and export actions live below it.

The main page also has a live side summary panel. It should fill from the current setup form before generation and from the generated book afterward, showing story summary/idea, characters, story and image models, language, age, theme/custom theme, art style, page count, reference status, and generated image progress.

The same workflow should be available in two UI modes:

- All mode: the current single-page workflow remains visible for testing and power users.
- Steps mode: the user sees one stage at a time: Set the book, Approve story, Build book. Finishing one stage moves focus to the next, while the stepper allows returning to previous unlocked stages.

### Create Story

- Set the book first: characters, references, language, child age, theme, optional art style direction, and page count.
- Character list with a + button to add up to five characters.
- Characters dialog for saved reusable characters.
- Character picture reference drag-and-drop, click-to-browse, or URL.
- Book details: language, age, built-in/custom theme, style, and page count.
- Settings dialog for story models, image models, endpoints, provider/company keys, and premade prompt preview.
- Overall style reference input.
- Story idea.
- Generate button.

### Story Preview

- Title and summary.
- Loading/progress status while story text or images are running.
- Story approval panel while images are pending.
- Visual bible summary.
- Page navigation.
- Text and image for the selected page.
- Full page list.
- Regenerate image action per page.
- Retry all pictures action for replacing the full image set.
- Clear story action with confirmation.
- Print button.
- Download JSON button.

### History

- Last 10 generated stories.
- Open a past generated book.
- Recreate a past story from its saved request.
- Show the saved setup snapshot: story idea, characters, references, book details, custom theme, and generated-page state.
- Remove one history item or clear all history.

## 11. Implementation Plan

### Phase 1 - Working Local MVP

- Replace placeholder output with local demo generation.
- Generate complete `GeneratedBook` objects.
- Render consistent SVG page images.
- Add print and JSON export.
- Clean encoding issues in docs and UI.
- Add model/key settings manager.
- Split the flow into book setup, story idea, settings, and page preview.
- Split story writing from final image/book generation. Done.
- Move the main UI to a top setup area with generated pages below. Done.
- Add All/Steps UI mode toggle with guided step navigation. Done.

### Phase 2 - Backend Contract

- Add `/api/generate-story`. Done.
- Add `/api/generate-book-images`. Done.
- Add `/api/generate-image`. Done.
- Move provider calls behind backend routes. Done.
- Resolve production provider keys from server environment variables. Done, with browser-key fallback for local testing.
- Validate request body. Basic validation done; schema-level validation still needed.
- Return the canonical book model. Done.

### Phase 3 - Real Text and Image Generation

- Add provider-specific reference image support.
- Add real provider usage/billing lookup where supported.
- Add stricter JSON schema validation and model-output repair.
- Add Multiplay image integration once the real endpoint contract is known.
- Generate image prompts from the visual bible.
- Include per-page image descriptions and page text in every image prompt. Done.
- Track image status per page.
- Add per-page image regeneration through the image provider. Done for local/OpenAI/Gemini/custom endpoints.

### Phase 4 - Editing and Export

- Edit page text.
- Regenerate one page image.
- Export PDF or printable spread.
- Persist generated books.
- Save story drafts and image progress to history incrementally. Done.
- Manual Save story action for pinning the current draft/progress and full setup snapshot into History. Done.
- Stop active story/image requests from the UI with browser and backend provider fetch cancellation where possible, while preserving finished page progress. Done.
- Store image-heavy latest book/history data in IndexedDB instead of local/session storage. Done.
- Retry all pictures as a restarted image pass from page 1. Done.

## 12. Success Criteria

The MVP is successful when:

- A parent can create a complete illustrated story from one prompt.
- The preview feels like a coherent child-ready mini-book.
- Page text fits the selected age and page count.
- The user can review and approve page text before image generation.
- The user can choose All mode or guided Steps mode.
- Guided Steps mode can move back to earlier steps without resetting setup form state.
- History contains a draft immediately after story generation, even before images are finished.
- Image generation can continue past page 1 without sending previous full-size generated image data back to the API.
- Story text is written in the selected language.
- API-generated Hebrew story text includes ניקוד when Hebrew is selected.
- Images share a recognizable style and character direction.
- The user can regenerate the full image set without rewriting the story.
- Final/print images are not cropped by the UI, and prompts ask providers to keep important subjects fully in frame.
- Every image prompt includes the page text, page image description, visual bible, style direction, and reference-image context.
- The app works in local demo mode without external APIs.
- The same data shape can later be returned by the real backend.

## 13. Open Questions

- Which Multiplay image endpoints, auth headers, and response fields are available?
- Does Multiplay support seeds, reference images, character references, or style references?
- Which provider should generate story text in production?
- Should uploaded reference images be stored temporarily or only used during generation?
- Is the first export target print view, PDF, or shareable web link?
