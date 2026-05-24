# AIStory Project Specification

## 1. Product Goal

AIStory is a web app that turns a short parent prompt into a complete illustrated children's mini-book.

The first usable version should help a parent create something they can read tonight:

1. Set the book by adding characters, reference pictures, language, child age, theme, optional art style direction, and page count.
2. Enter the story idea.
3. Generate a structured story with one page of text per page count.
4. Produce a matching illustration prompt and image per page.
5. Preview the result as a simple book, regenerate images, and export it.

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
- Settings dialog for model profiles, endpoints, API keys, and premade prompt preview.
- Add up to five characters.
- Reusable character library for saving, editing, removing, and using past characters.
- Character name, short description, and optional relationship/role.
- Optional drag-and-drop, click-to-browse, or URL reference image per character.
- Optional reference image URL or upload.
- Structured story generation.
- One illustration prompt per page.
- One generated illustration per page.
- Regenerate an individual page image from its prompt.
- A visual bible that keeps characters, setting, palette, and style consistent.
- Page-by-page preview.
- Clear current story with confirmation.
- Story history for the last 10 generated books, with open and recreate actions.
- Export as printable browser view and JSON download.
- Usage dialog with local estimated activity by model and API key.
- Loading, empty, and error states.

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
- Regenerate one page image.
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

## 6. API Contract

The frontend should treat this as the future production endpoint.

### Endpoint

`POST /api/generate-story`

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
      "illustrationPrompt": "Soft watercolor children's book illustration of Milo in star pajamas...",
      "imageUrl": "https://example.com/page-1.png",
      "imageStatus": "complete"
    }
  ]
}
```

## 7. Generation Pipeline

### Step 1 - Story Writing

The user selects the active story model in Settings, then writes the story idea in the main flow. The app builds a premade prompt that includes:

- The user's story idea.
- Page count.
- Story language.
- Child age.
- Characters and roles.
- Theme and tone.
- Required JSON output shape.
- Child-safety constraints.

The model should return title, summary, and exact page text. The app then builds image prompts from the returned pages.

Built-in story API models should include:

- OpenAI GPT-5.5.
- Anthropic Claude Opus 4.7.
- Google Gemini 3 Pro Preview.
- xAI Grok 4.3.

Built-in image API models should include:

- OpenAI GPT Image 2.
- OpenAI GPT Image 1.5.
- Google Gemini 3.1 Flash Image Preview.
- Google Gemini 3 Pro Image Preview.
- Google Gemini 2.5 Flash Image.

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

Production generation should be orchestrated on the backend:

1. Validate and sanitize the request.
2. Generate the story plan and visual bible.
3. Generate page text and page illustration prompts.
4. Call the image service once per page.
5. Support per-page image regeneration.
6. Return one canonical `GeneratedBook`.

The frontend should not hold production API keys.

The current MVP may call built-in OpenAI and Gemini image models from the browser for local development. Treat this as temporary wiring for testing the product flow.

## 8. Visual Consistency Strategy

Visual consistency is a first-class feature. Each generated book should include a visual bible and every image prompt should repeat:

- Main character and supporting character descriptions.
- Per-character reference image instructions when supplied.
- Outfit or recurring visual marker.
- Setting.
- Palette.
- Art style, or a warm child-friendly default when no style is provided.
- Camera/framing guidance.
- Negative constraints such as no scary imagery and no text in image.

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

### Create Story

- Set the book first: characters, references, language, child age, theme, optional art style direction, and page count.
- Character list with a + button to add up to five characters.
- Characters dialog for saved reusable characters.
- Character picture reference drag-and-drop, click-to-browse, or URL.
- Book details: language, age, theme, style, and page count.
- Settings dialog for story models, image models, endpoints, keys, and premade prompt preview.
- Overall style reference input.
- Story idea.
- Generate button.

### Story Preview

- Title and summary.
- Visual bible summary.
- Page navigation.
- Text and image for the selected page.
- Full page list.
- Regenerate image action per page.
- Clear story action with confirmation.
- Print button.
- Download JSON button.

### History

- Last 10 generated stories.
- Open a past generated book.
- Recreate a past story from its saved request.
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

### Phase 2 - Backend Contract

- Add `/api/generate-story`.
- Move production provider keys to server environment variables.
- Validate request body.
- Return the canonical book model.

### Phase 3 - Real Text and Image Generation

- Move story and image provider calls behind backend endpoints.
- Add Multiplay image integration.
- Generate image prompts from the visual bible.
- Track image status per page.
- Add per-page image regeneration through the image provider.

### Phase 4 - Editing and Export

- Edit page text.
- Regenerate one page image.
- Export PDF or printable spread.
- Persist generated books.

## 12. Success Criteria

The MVP is successful when:

- A parent can create a complete illustrated story from one prompt.
- The preview feels like a coherent child-ready mini-book.
- Page text fits the selected age and page count.
- Story text is written in the selected language.
- Images share a recognizable style and character direction.
- The app works in local demo mode without external APIs.
- The same data shape can later be returned by the real backend.

## 13. Open Questions

- Which Multiplay image endpoints, auth headers, and response fields are available?
- Does Multiplay support seeds, reference images, character references, or style references?
- Which provider should generate story text in production?
- Should uploaded reference images be stored temporarily or only used during generation?
- Is the first export target print view, PDF, or shareable web link?
