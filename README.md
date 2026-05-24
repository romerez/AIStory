# AIStory

AIStory is a children’s story web application designed to turn short prompts into a full illustrated bedtime story.

## Vision

Let parents and caregivers quickly generate a child-friendly story with matching illustrations by entering a simple idea, selecting a theme or art style, and choosing how many pages the story should have.

## Core features

- Prompt-based story generation
- Story theme and art-style selection
- Optional reference image support
- Multi-page story output
- One illustration generated for each story page
- Consistent visual style across all pages

## Project artifacts

- `PROJECT-SPEC.md` — source of truth and implementation plan
- `package.json` — project dependencies and scripts
- `vite.config.js` — Vite configuration for React
- `src/` — front-end application code

## Getting started

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Run the development server:

   ```powershell
   npm run dev
   ```

## Next steps

- Connect the app to a backend or serverless route that calls the Multiplay image generation API
- Add text generation integration for story creation
- Implement page-level image generation and preview
- Add export or download support
