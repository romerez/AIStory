# AIStory Project Specification

## 1. End goal

Build a web application that generates a complete children’s story and matching page-by-page illustrations from a short prompt.

### What the app should do

- Accept a short story prompt from the user.
- Allow the user to choose a story theme and art style.
- Accept an optional reference image to guide the visual tone.
- Allow the user to choose how many pages the story will contain.
- Generate a story broken into page-sized sections.
- Generate one illustration per page in a consistent style.
- Display the story and images together so users can review them as a child-ready book.

## 2. User experience

### Story creation flow

1. Parent enters a prompt like: "Write me a story about why it is important to go to sleep early."  
2. Parent selects an art style and theme (e.g. warm watercolor, cartoon, bedtime, adventure).  
3. Parent optionally uploads or provides a reference image.  
4. Parent chooses number of pages (e.g. 4, 6, 8).  
5. App generates the story text and illustrations.  
6. Parent previews each page with its corresponding illustration.

### Primary value

- Fast creation of an illustrated bedtime story.
- Consistent story style and artwork across pages.
- Easy for parents to use even without design or storytelling skills.

## 3. MVP feature list

- Prompt input
- Theme and art style inputs
- Page count selection
- Optional reference image input
- Story generation engine integration
- Image generation via Multiplay API
- Page-by-page preview of story and images
- Simple responsive UI

## 4. Data model and source of truth

### Story generation request

- `prompt`: string
- `theme`: string
- `artStyle`: string
- `referenceImageUrl`: string | null
- `pageCount`: number

### Generated story output

- `storyTitle`: string
- `storySummary`: string
- `pages`: Array<{
  - `pageNumber`: number
  - `text`: string
  - `illustrationPrompt`: string
  - `imageUrl`: string
}>

### Image generation request

- `pagePrompt`: string
- `style`: string
- `theme`: string
- `referenceImageUrl`: string | null
- `consistencyToken`: string

## 5. API contract

### Frontend endpoint

`POST /api/generate-story`

Request body:

```json
{
  "prompt": "Why is it important to go to sleep early?",
  "theme": "bedtime",
  "artStyle": "soft watercolor",
  "referenceImageUrl": "https://...",
  "pageCount": 6
}
```

Response body:

```json
{
  "storyTitle": "The Sleepy Moon Patrol",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Once there was a little star who slept early...",
      "imageUrl": "https://..."
    }
  ]
}
```

## 6. Architecture

### Client

- React + Vite
- One page app with a multi-step creation flow
- Components for prompt entry, page preview, and generated story

### Backend / API proxy

- Node / Express or serverless function
- Accepts story inputs
- Calls:
  - text-generation endpoint for story content
  - Multiplay image generation endpoint for illustrations
- Returns structured page output to the frontend

### External services

- Multiplay image generation API
- Optional text-generation API for story content

## 7. UI structure

- `Home / Create Story`
  - Prompt input
  - Theme selector
  - Style selector
  - Reference image upload / URL
  - Page count selector
  - Generate button
- `Story Preview`
  - Title and summary
  - Page cards with text + image
  - Navigation between pages
  - Export / download action

## 8. Implementation plan

### Phase 1: Project foundation

- Create React + Vite scaffold
- Add core UI components
- Build prompt form and page count control

### Phase 2: Story generation flow

- Define request/response models
- Add placeholder story generation logic
- Display generated story sections in the UI

### Phase 3: Image generation integration

- Add Multiplay API client
- Generate one image per story page
- Use consistent style and reference guidance

### Phase 4: Preview and polish

- Add page-by-page preview cards
- Improve responsiveness
- Add loading states and error handling

### Phase 5: Export and reuse

- Add download/export option
- Allow editing prompt and regenerating pages

## 9. Success criteria

- User can generate a story from a single prompt
- Each page has its own illustration
- Generated images share a consistent visual direction
- UI is simple enough for parents to use quickly
- Story output is child-friendly and coherent

## 10. Open questions

- Which exact Multiplay API endpoints are available?
- Will story text generation use the same provider or a separate service?
- Should the app support direct image uploads or URL-only references?
- What export format is most valuable: PDF, image gallery, printable pages?
