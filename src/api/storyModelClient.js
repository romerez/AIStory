import {
  createBookFromStoryDraft,
  generateLocalBook,
  regenerateLocalPageText,
  regenerateLocalPageImage,
  updateBookPageContent as updateLocalBookPageContent,
} from './localStoryEngine.js';

export function buildPremadeStoryPrompt(request) {
  const artStyleInstruction = request.artStyle?.trim()
    ? `Art style direction: ${request.artStyle.trim()}.`
    : 'Art style direction: No specific style was provided. Choose a warm, child-friendly illustration direction that fits the story.';
  const languageInstruction = isHebrewLanguage(request.language)
    ? 'Story language: Hebrew. Write the title, summary, and all page text in Hebrew with full niqqud / nikud vowel marks (נִקּוּד) on every Hebrew word.'
    : `Story language: ${request.language || 'English'}. Write the title, summary, and all page text in this language.`;
  const characters = (request.characters || []).map((character, index) => ({
    name: character.name || `Character ${index + 1}`,
    role: character.role || (index === 0 ? 'main character' : 'supporting character'),
    description: character.description || 'No description provided',
    hasPictureReference: Boolean(character.referenceImageUrl || character.referenceImageFile),
  }));

  return [
    'You are writing a child-safe illustrated mini-book.',
    'Return only valid JSON. Do not wrap it in markdown.',
    '',
    'Required JSON shape:',
    '{',
    '  "storyTitle": "string",',
    '  "storySummary": "string",',
    '  "pages": [',
    '    { "pageNumber": 1, "text": "page-sized story text", "imageDescription": "specific scene, action, mood, and visual focus for this page" }',
    '  ]',
    '}',
    '',
    `Write exactly ${request.pageCount} pages.`,
    languageInstruction,
    `Target age: ${request.childAge}.`,
    `Theme: ${request.theme}.`,
    request.customTheme ? `Custom theme text from the user: ${request.customTheme}.` : '',
    artStyleInstruction,
    `Characters: ${JSON.stringify(characters, null, 2)}`,
    '',
    'Safety and quality rules:',
    '- Keep language age-appropriate.',
    '- Use warm, practical lessons without shaming the child.',
    '- Avoid frightening, graphic, hateful, sexual, or unsafe content.',
    '- Each page should be short enough to read aloud.',
    '- For each page, write an imageDescription that clearly describes what is happening visually on that page.',
    '- Each imageDescription should mention the important characters, action, setting, emotion, and any object or visual detail that should appear.',
    '- Choose one primary physical story stage for the whole book. Keep every imageDescription in that same location unless the user idea explicitly says the story travels.',
    '- Keep stable background landmarks and object positions across pages: same room or outdoor area, same central table/path/window/tree/fence/shelf, same indoor/outdoor choice.',
    '- Do not switch from an outdoor setting to an indoor setting, or from one room/place to another, unless the story text explicitly requires that move.',
    '- Use a landscape-safe composition: keep all important faces, bodies, hands, objects, and background details comfortably inside the frame with generous margins. Do not crop characters at the edges.',
    '- End with emotional closure.',
    '',
    `User story idea: ${request.prompt}`,
  ].join('\n');
}

export async function generateBookFromStoryModel(request, modelSettings, options = {}) {
  const storyModel = findProfile(modelSettings.storyModels, request.storyModelId || modelSettings.activeStoryModelId)
    || modelSettings.storyModels[0];
  const imageModel = findProfile(modelSettings.imageModels, request.imageModelId || modelSettings.activeImageModelId)
    || modelSettings.imageModels[0];
  const requestWithLabels = {
    ...request,
    storyModelLabel: storyModel.label || storyModel.modelName,
    imageModelLabel: imageModel.label || imageModel.modelName,
  };

  let book;

  if (!storyModel || storyModel.type === 'local') {
    book = await generateLocalBook(requestWithLabels);
    return options.skipImages ? prepareStoryDraftBook(book, imageModel) : hydrateBookImages(book, imageModel);
  }

  let draft;

  if (storyModel.type === 'openai-responses') {
    draft = await callOpenAIResponsesStoryModel(storyModel, request, options);
  } else if (storyModel.type === 'openai-compatible') {
    draft = await callOpenAICompatibleStoryModel(storyModel, request, options);
  } else if (storyModel.type === 'anthropic-messages') {
    draft = await callAnthropicMessagesStoryModel(storyModel, request, options);
  } else if (storyModel.type === 'google-gemini') {
    draft = await callGoogleGeminiStoryModel(storyModel, request, options);
  } else {
    throw new Error('This story model type is not wired yet. Use a built-in story model or Local demo.');
  }

  book = createBookFromStoryDraft(requestWithLabels, draft, 'api');
  return options.skipImages ? prepareStoryDraftBook(book, imageModel) : hydrateBookImages(book, imageModel, options);
}

export async function generateImagesForBook(book, modelSettings, options = {}) {
  const imageModel = resolveImageModel(book, modelSettings);
  const nextBook = {
    ...book,
    workflowStage: 'complete',
    imagesGeneratedAt: new Date().toISOString(),
    imageModel: imageModel?.label || imageModel?.modelName || book?.imageModel || 'Local demo illustrator',
  };

  if (!imageModel || imageModel.type === 'local') {
    let generatedBook = nextBook;

    for (const page of nextBook.pages || []) {
      throwIfAborted(options.signal);
      generatedBook = regenerateLocalPageImage(generatedBook, page.pageNumber);
    }

    return {
      ...generatedBook,
      workflowStage: 'complete',
      pages: (generatedBook.pages || []).map((page) => ({
        ...page,
        imageStatus: 'complete',
        imageError: '',
      })),
    };
  }

  return hydrateBookImages(nextBook, imageModel, options);
}

export function updateBookPageContent(book, pageNumber, updates = {}) {
  return updateLocalBookPageContent(book, pageNumber, updates);
}

export async function regeneratePageTextFromModel(book, pageNumber, modelSettings, instruction = '', options = {}) {
  const storyModel = findProfileByLabel(modelSettings.storyModels, book?.storyModel)
    || findProfile(modelSettings.storyModels, modelSettings.activeStoryModelId)
    || modelSettings.storyModels[0];

  if (!storyModel || storyModel.type === 'local') {
    return regenerateLocalPageText(book, pageNumber);
  }

  const page = (book.pages || []).find((item) => item.pageNumber === pageNumber);

  if (!page) {
    return book;
  }

  const revision = await callStoryModelJson(
    storyModel,
    buildPageRewritePrompt(book, page, instruction),
    buildPageRevisionJsonSchema(),
    `${storyModel.provider || 'Story'} page rewrite model`,
    options,
  );

  return updateLocalBookPageContent(book, pageNumber, {
    text: normalizeModelString(revision.text, 1200) || page.text,
    imageDescription: normalizeModelString(revision.imageDescription, 800)
      || page.imageDescription
      || page.text,
  });
}

export async function regeneratePageImageFromModel(book, pageNumber, modelSettings, options = {}) {
  const imageModel = resolveImageModel(book, modelSettings);

  if (!imageModel || imageModel.type === 'local') {
    return regenerateLocalPageImage(book, pageNumber);
  }

  const page = book.pages.find((item) => item.pageNumber === pageNumber);

  if (!page) {
    return book;
  }

  let imageUrl;

  try {
    throwIfAborted(options.signal);
    imageUrl = await generateImageForPage(imageModel, page, book, options);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    logProviderFailure({
      action: 'regenerate-page-image',
      model: imageModel,
      pageNumber,
      error,
    });
    return markPageImageFailed(book, pageNumber, imageModel, error);
  }

  return {
    ...book,
    imageModel: imageModel.label || imageModel.modelName,
    pages: book.pages.map((item) => (
      item.pageNumber === pageNumber
        ? { ...item, imageUrl, imageStatus: 'complete', imageError: '' }
        : item
    )),
  };
}

function markPageImageFailed(book, pageNumber, imageModel, error) {
  return {
    ...book,
    imageModel: imageModel?.label || imageModel?.modelName || book?.imageModel,
    pages: (book.pages || []).map((item) => (
      item.pageNumber === pageNumber
        ? {
          ...item,
          imageStatus: 'failed',
          imageError: error?.message || 'Image generation failed.',
        }
        : item
    )),
  };
}

function findProfile(profiles, id) {
  return profiles.find((profile) => profile.id === id);
}

function findProfileByLabel(profiles, label) {
  return profiles.find((profile) => (
    (profile.label || profile.modelName) === label
  ));
}

function resolveImageModel(book, modelSettings) {
  return findProfile(modelSettings.imageModels || [], modelSettings.activeImageModelId)
    || findProfileByLabel(modelSettings.imageModels || [], book?.imageModel)
    || modelSettings.imageModels?.[0];
}

async function hydrateBookImages(book, imageModel, options = {}) {
  if (!imageModel || imageModel.type === 'local') {
    return {
      ...book,
      workflowStage: book.workflowStage || 'complete',
    };
  }

  const pages = [];

  for (const page of book.pages) {
    try {
      throwIfAborted(options.signal);
      const imageUrl = await generateImageForPage(imageModel, page, book, options);

      pages.push({
        ...page,
        imageUrl,
        imageStatus: 'complete',
        imageError: '',
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      logProviderFailure({
        action: 'generate-book-images',
        model: imageModel,
        pageNumber: page.pageNumber,
        error,
      });
      pages.push({
        ...page,
        imageStatus: 'failed',
        imageError: error.message || 'Image generation failed.',
      });
    }
  }

  return {
    ...book,
    imageModel: imageModel.label || imageModel.modelName,
    workflowStage: 'complete',
    pages,
  };
}

function logProviderFailure({ action, model, pageNumber, error }) {
  const status = error?.providerStatus || error?.statusCode || 'unknown';
  const message = String(error?.message || 'Image generation failed.')
    .replace(/\s+/g, ' ')
    .slice(0, 700);
  const label = model?.label || model?.modelName || 'unknown image model';

  console.error(`[AIStory] ${action} failed for page ${pageNumber} using ${label} (${status}): ${message}`);
}

function prepareStoryDraftBook(book, imageModel) {
  return {
    ...book,
    workflowStage: 'story-draft',
    imageModel: imageModel?.label || imageModel?.modelName || book.imageModel,
    pages: (book.pages || []).map((page) => ({
      ...page,
      imageUrl: buildPendingImagePlaceholder(page.pageNumber),
      imageStatus: 'pending',
      imageError: '',
    })),
  };
}

function buildPendingImagePlaceholder(pageNumber) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560">
  <rect width="800" height="560" fill="#eef4f3"/>
  <rect x="46" y="46" width="708" height="468" rx="28" fill="#ffffff" stroke="#d7dee2" stroke-width="3" stroke-dasharray="16 14"/>
  <circle cx="400" cy="208" r="${50 + (pageNumber % 3) * 5}" fill="#d7dee2"/>
  <path d="M220 402 C298 314, 352 360, 426 292 C500 224, 592 302, 662 402 Z" fill="#c7d8d8"/>
  <circle cx="296" cy="328" r="20" fill="#e1b45d" opacity="0.78"/>
  <circle cx="520" cy="336" r="16" fill="#235d6a" opacity="0.42"/>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

async function generateImageFromPrompt(imageModel, prompt, referenceImages = [], options = {}) {
  if (imageModel.type === 'openai-image') {
    return callOpenAIImageModel(imageModel, prompt, referenceImages, options);
  }

  if (imageModel.type === 'google-gemini-image') {
    return callGoogleGeminiImageModel(imageModel, prompt, referenceImages, options);
  }

  if (imageModel.type === 'custom-image') {
    return callCustomImageModel(imageModel, prompt, options);
  }

  throw new Error('This image model type is not wired yet. Use Local demo, OpenAI GPT Image, Google Gemini Image, or a custom image endpoint.');
}

async function generateImageForPage(imageModel, page, book, options = {}) {
  const safePrompt = buildProviderSafeImagePrompt(page.illustrationPrompt);
  const referenceImages = selectImageReferencesForPage(imageModel, book, page.pageNumber);

  try {
    return await generateImageFromPrompt(imageModel, safePrompt, referenceImages, options);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (referenceImages.length > 0 && isReferenceInputError(error)) {
      return generateImageFromPrompt(imageModel, safePrompt, [], options);
    }

    if (!isImageSafetyError(error)) {
      throw error;
    }

    const fallbackPrompt = buildSafeFallbackImagePrompt(book, page);

    try {
      return await generateImageFromPrompt(imageModel, fallbackPrompt, referenceImages, options);
    } catch (fallbackError) {
      if (isAbortError(fallbackError)) {
        throw fallbackError;
      }

      if (referenceImages.length > 0 && isReferenceInputError(fallbackError)) {
        return generateImageFromPrompt(imageModel, fallbackPrompt, [], options);
      }

      fallbackError.message = `${fallbackError.message} A safer fallback prompt was also tried.`;
      throw fallbackError;
    }
  }
}

function isImageSafetyError(error) {
  return /safety|policy|moderation|blocked|rejected/i.test(String(error?.message || ''));
}

function isAbortError(error) {
  return error?.name === 'AbortError'
    || /aborted|abort|stopped by the user/i.test(String(error?.message || ''));
}

function throwIfAborted(signal) {
  if (!signal?.aborted) {
    return;
  }

  const error = new Error('Request stopped by the user.');
  error.name = 'AbortError';
  throw error;
}

function isReferenceInputError(error) {
  return /image input|input image|reference|multipart|edit|invalid image|unsupported image|file/i.test(
    String(error?.message || ''),
  );
}

function selectImageReferencesForPage(imageModel, book, pageNumber) {
  if (!supportsImageReferences(imageModel)) {
    return [];
  }

  const maxReferences = getImageReferenceLimit(imageModel);
  const references = [];
  const addReference = (url, label) => {
    if (references.length >= maxReferences) {
      return;
    }

    const reference = parseDataImageReference(url, label);

    if (reference && !references.some((item) => item.data === reference.data)) {
      references.push(reference);
    }
  };

  for (const character of book?.visualBible?.characters || []) {
    addReference(character.referenceImageUrl, `character reference: ${character.name}`);
  }

  addReference(book?.requestSnapshot?.referenceImageUrl, 'overall style reference');
  addReference(
    book?.generatedStyleReferenceUrl,
    book?.generatedStyleReferencePage
      ? `compressed generated cast/location/layout/style anchor: page ${book.generatedStyleReferencePage}`
      : 'compressed generated cast/location/layout/style anchor',
  );

  const anchorPage = (book?.pages || []).find((item) => (
    item.pageNumber < pageNumber
      && item.imageStatus === 'complete'
      && typeof item.imageUrl === 'string'
      && item.imageUrl.startsWith('data:image/')
  ));

  if (anchorPage) {
    addReference(anchorPage.imageUrl, `first generated page anchor: page ${anchorPage.pageNumber}`);
  }

  return references;
}

function supportsImageReferences(imageModel) {
  return imageModel?.type === 'google-gemini-image' || imageModel?.type === 'openai-image';
}

function getImageReferenceLimit(imageModel) {
  const modelName = String(imageModel?.modelName || '').toLowerCase();

  if (modelName.includes('3-pro')) {
    return 5;
  }

  if (modelName.includes('3.1')) {
    return 4;
  }

  return 3;
}

function parseDataImageReference(value, label) {
  const raw = String(value || '');
  const match = raw.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);

  if (!match) {
    return null;
  }

  const data = match[2].replace(/\s+/g, '');

  if (data.length > 5_000_000) {
    return null;
  }

  return {
    label,
    mimeType: match[1],
    data,
  };
}

function buildProviderSafeImagePrompt(prompt) {
  return [
    String(prompt || '')
      .replace(/\bchild-friendly\b/gi, 'family-friendly')
      .replace(/\bchildren'?s book\b/gi, 'family-friendly storybook')
      .replace(/\bchildren\b/gi, 'storybook characters')
      .replace(/\bchild\b/gi, 'storybook character')
      .replace(/\bkid\b/gi, 'storybook character')
      .replace(/\bboy\b/gi, 'young storybook character')
      .replace(/\bgirl\b/gi, 'young storybook character')
      .replace(/\bbaby\b/gi, 'small storybook character')
      .replace(/\btoddler\b/gi, 'small storybook character')
      .replace(/\bminor\b/gi, 'storybook character')
      .replace(/\bpajamas?\b/gi, 'cozy outfit')
      .replace(/\bbedroom\b/gi, 'cozy room')
      .replace(/\bin bed\b/gi, 'in a cozy reading nook'),
    'Render as a wholesome non-photorealistic illustrated storybook scene.',
    'All characters are fully clothed, safe, cheerful, and age-neutral.',
    'Location continuity: keep the same physical story location and background layout across pages. Preserve stable landmarks, central props, indoor/outdoor choice, and the general character staging from the reference or visual bible. Do not move to a different room, classroom, park, or outdoor/indoor location unless the page text explicitly says the story moved.',
    'Composition continuity: keep recurring characters and central objects in a coherent left-to-right relationship when possible; vary only pose, expression, action, and small page-specific props.',
    'If the page description conflicts with the location continuity rule, keep the locked location and adapt only the action, emotion, and page-specific props.',
    'Landscape-safe framing: keep the entire important scene inside the image, with generous empty margin around faces, hands, bodies, and key objects. Do not crop characters at the edge.',
    'No nudity, no sexual content, no violence, no injury, no frightening imagery, no readable text.',
  ].join(' ');
}

function buildSafeFallbackImagePrompt(book, page) {
  const characterNames = (book?.visualBible?.characters || [])
    .map((character) => character.name)
    .filter(Boolean)
    .join(', ');

  return [
    'Create a wholesome family-friendly storybook illustration.',
    characterNames ? `Show these recurring storybook characters: ${characterNames}.` : '',
    book?.visualBible?.setting ? `Setting: ${book.visualBible.setting}.` : '',
    book?.artStyle ? `Art direction: ${book.artStyle}.` : 'Art direction: warm illustrated storybook art.',
    page?.imageDescription ? `Scene: ${page.imageDescription}.` : '',
    page?.text ? `Narrative context: ${page.text}.` : '',
    'Keep the same physical location, background landmarks, central props, and indoor/outdoor setting as the rest of the book unless this page explicitly says the characters moved.',
    'If older page directions mention a conflicting location, keep the locked book location and adapt the action into that same stage.',
    'Use landscape-safe framing with generous margins so no character, face, hand, or important object is cut off.',
    'Use soft colors, gentle expressions, fully clothed age-neutral characters, no readable text, no unsafe content.',
  ].filter(Boolean).join(' ');
}

async function callStoryModelJson(storyModel, prompt, jsonSchema, providerName, options = {}) {
  if (!storyModel.endpoint) {
    throw new Error('The selected story model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected story model needs an API key in Settings.');
  }

  let response;

  if (storyModel.type === 'openai-responses') {
    response = await fetch(storyModel.endpoint, {
      method: 'POST',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storyModel.apiKey}`,
      },
      body: JSON.stringify({
        model: storyModel.modelName,
        instructions: 'Return strict JSON only. Keep language child-safe and age-appropriate.',
        input: prompt,
        text: {
          format: jsonSchema,
        },
      }),
    });
  } else if (storyModel.type === 'openai-compatible') {
    response = await fetch(storyModel.endpoint, {
      method: 'POST',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storyModel.apiKey}`,
      },
      body: JSON.stringify({
        model: storyModel.modelName,
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Return strict JSON only. Keep language child-safe and age-appropriate.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
  } else if (storyModel.type === 'anthropic-messages') {
    response = await fetch(storyModel.endpoint, {
      method: 'POST',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': storyModel.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: storyModel.modelName,
        max_tokens: 1200,
        system: 'Return strict JSON only. Keep language child-safe and age-appropriate.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });
  } else if (storyModel.type === 'google-gemini') {
    response = await fetch(storyModel.endpoint, {
      method: 'POST',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': storyModel.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: 'application/json',
        },
      }),
    });
  } else {
    throw new Error('This story model type is not wired for page rewrites yet.');
  }

  if (!response.ok) {
    throw await createProviderError(providerName, response);
  }

  const payload = await response.json();
  return parseJsonObjectContent(extractModelContent(payload));
}

function buildPageRewritePrompt(book, page, instruction) {
  const pages = (book.pages || []).map((item) => ({
    pageNumber: item.pageNumber,
    text: item.text,
    imageDescription: item.imageDescription,
  }));
  const userInstruction = String(instruction || '').trim()
    || 'Give this page one more shot. Keep the same story continuity, but make the wording warmer, clearer, and more visual.';

  return [
    'Rewrite one page of a child-safe illustrated mini-book.',
    'Return only valid JSON. Do not wrap it in markdown.',
    '',
    'Required JSON shape:',
    '{ "text": "revised page text", "imageDescription": "specific visual scene description for the revised page" }',
    '',
    `Story title: ${book.storyTitle}`,
    `Story summary: ${book.storySummary}`,
    isHebrewLanguage(book.language)
      ? 'Language: Hebrew. Write the revised text in Hebrew with full niqqud / nikud vowel marks (נִקּוּד) on every Hebrew word.'
      : `Language: ${book.language || 'English'}. Write the revised text and imageDescription in this language.`,
    `Target age: ${book.targetAge || '4-6'}.`,
    `Page to rewrite: ${page.pageNumber} of ${(book.pages || []).length}.`,
    `User direction: ${userInstruction}`,
    '',
    `Visual bible: ${JSON.stringify(book.visualBible || {}, null, 2)}`,
    `All pages for continuity: ${JSON.stringify(pages, null, 2)}`,
    '',
    'Rules:',
    '- Keep the story coherent with previous and next pages.',
    '- Keep the page short enough to read aloud.',
    '- Preserve character names and roles.',
    '- Avoid frightening, graphic, hateful, sexual, or unsafe content.',
    '- The imageDescription must describe the action, characters, setting, mood, and visual focus for this exact page.',
    '- Preserve the book location and stage layout from the visual bible. Do not move to a different room/place or switch indoor/outdoor unless the existing story explicitly says this page moves there.',
    '- Mention stable background landmarks and central object positions in the imageDescription so the image model can keep location continuity.',
    '- The imageDescription must request safe margins and no cropped characters or important objects.',
  ].join('\n');
}

async function callOpenAICompatibleStoryModel(storyModel, request, options = {}) {
  if (!storyModel.endpoint) {
    throw new Error('The selected story model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected story model needs an API key in Settings.');
  }

  const response = await fetch(storyModel.endpoint, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${storyModel.apiKey}`,
    },
    body: JSON.stringify({
      model: storyModel.modelName,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You write coherent, child-safe stories and return strict JSON.',
        },
        {
          role: 'user',
          content: buildPremadeStoryPrompt(request),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw await createProviderError('OpenAI story model', response);
  }

  const payload = await response.json();
  const content = extractModelContent(payload);
  return parseJsonContent(content);
}

async function callOpenAIResponsesStoryModel(storyModel, request, options = {}) {
  if (!storyModel.endpoint) {
    throw new Error('The selected OpenAI model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected OpenAI model needs an API key in Settings.');
  }

  const response = await fetch(storyModel.endpoint, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${storyModel.apiKey}`,
    },
    body: JSON.stringify({
      model: storyModel.modelName,
      instructions: 'You write coherent, child-safe stories and return strict JSON only.',
      input: buildPremadeStoryPrompt(request),
      text: {
        format: buildStoryJsonSchema(request.pageCount),
      },
    }),
  });

  if (!response.ok) {
    throw await createProviderError('OpenAI story model', response);
  }

  const payload = await response.json();
  const content = extractModelContent(payload);
  return parseJsonContent(content);
}

async function callOpenAIImageModel(imageModel, prompt, referenceImages = [], options = {}) {
  if (!imageModel.endpoint) {
    throw new Error('The selected OpenAI image model needs an endpoint in Settings.');
  }

  if (!imageModel.apiKey) {
    throw new Error('The selected OpenAI image model needs an API key in Settings.');
  }

  if (referenceImages.length > 0) {
    return callOpenAIImageEditModel(imageModel, prompt, referenceImages, options);
  }

  const response = await fetch(imageModel.endpoint, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${imageModel.apiKey}`,
    },
    body: JSON.stringify({
      model: imageModel.modelName,
      prompt,
      n: 1,
      size: '1536x1024',
      quality: 'medium',
      output_format: 'png',
    }),
  });

  if (!response.ok) {
    throw await createProviderError('OpenAI image model', response);
  }

  const payload = await response.json();
  const image = payload?.data?.[0];

  if (image?.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }

  if (image?.url) {
    return image.url;
  }

  throw new Error('The OpenAI image model response did not include an image.');
}

async function callOpenAIImageEditModel(imageModel, prompt, referenceImages, options = {}) {
  const editEndpoint = imageModel.endpoint.replace(/\/generations(?:\?.*)?$/i, '/edits');
  const formData = new FormData();

  formData.append('model', imageModel.modelName);
  formData.append('prompt', [
    prompt,
    'Use the supplied reference images for consistent character identity, outfit, palette, illustration style, physical location, background landmarks, and stage layout.',
    'Keep the same indoor/outdoor setting, central props, and general character staging as the reference unless the page text explicitly says the story moved.',
    'If any page description conflicts with the reference location, keep the reference location and adapt only the action into that setting.',
    'Do not copy the exact pose, but preserve coherent relative positions between recurring characters and central objects when possible.',
    'Keep the composition safely inside the frame with no cropped faces, hands, bodies, or important objects.',
  ].join(' '));
  formData.append('size', '1536x1024');
  formData.append('quality', 'medium');
  formData.append('output_format', 'png');

  for (const [index, reference] of referenceImages.entries()) {
    formData.append(
      'image',
      dataReferenceToBlob(reference),
      `reference-${index + 1}.${mimeTypeToExtension(reference.mimeType)}`,
    );
  }

  const response = await fetch(editEndpoint, {
    method: 'POST',
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${imageModel.apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw await createProviderError('OpenAI image model', response);
  }

  const payload = await response.json();
  const image = payload?.data?.[0];

  if (image?.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }

  if (image?.url) {
    return image.url;
  }

  throw new Error('The OpenAI image model response did not include an image.');
}

function dataReferenceToBlob(reference) {
  const bytes = typeof Buffer !== 'undefined'
    ? Buffer.from(reference.data, 'base64')
    : Uint8Array.from(atob(reference.data), (char) => char.charCodeAt(0));

  return new Blob([bytes], { type: reference.mimeType });
}

function mimeTypeToExtension(mimeType) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'png';
}

async function callGoogleGeminiImageModel(imageModel, prompt, referenceImages = [], options = {}) {
  if (!imageModel.endpoint) {
    throw new Error('The selected Gemini image model needs an endpoint in Settings.');
  }

  if (!imageModel.apiKey) {
    throw new Error('The selected Gemini image model needs an API key in Settings.');
  }

  const response = await fetch(imageModel.endpoint, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': imageModel.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: buildGeminiImageParts(prompt, referenceImages),
        },
      ],
      generationConfig: buildGeminiImageGenerationConfig(imageModel),
    }),
  });
  let payload;

  if (!response.ok) {
    const error = await createProviderError('Gemini image model', response);

    if (response.status !== 400 || !/generation_config|response_format|responseModalities/i.test(error.message)) {
      throw error;
    }

    const fallbackResponse = await fetch(imageModel.endpoint, {
      method: 'POST',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': imageModel.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: buildGeminiImageParts(prompt, referenceImages),
          },
        ],
      }),
    });

    if (!fallbackResponse.ok) {
      throw await createProviderError('Gemini image model', fallbackResponse);
    }

    payload = await fallbackResponse.json();
  } else {
    payload = await response.json();
  }

  const parts = payload?.candidates?.flatMap((candidate) => (
    candidate?.content?.parts || []
  )) || [];
  const imagePart = parts.find((part) => (
    part.inlineData?.data || part.inline_data?.data
  ));
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;

  if (inlineData?.data) {
    return `data:${inlineData.mimeType || inlineData.mime_type || 'image/png'};base64,${inlineData.data}`;
  }

  throw new Error('The Gemini image model response did not include an image.');
}

function buildGeminiImageParts(prompt, referenceImages) {
  return [
    {
      text: [
        prompt,
        referenceImages.length
          ? 'Use the attached reference images as cast, location, layout, and style anchors. Keep the same recurring characters, outfits, palette, linework, physical setting, background landmarks, central props, and indoor/outdoor choice. Create the new page action described in the prompt without moving the story to a different room/place unless the page text explicitly says so.'
          : '',
        'If the page description conflicts with the reference location, keep the reference location and adapt only the action into that setting.',
        'Preserve coherent relative positions between recurring characters and central objects when possible; vary only pose, expression, action, camera angle, and small page-specific props.',
        'Keep the composition safely inside the frame with no cropped faces, hands, bodies, or important objects.',
      ].filter(Boolean).join(' '),
    },
    ...referenceImages.map((reference) => ({
      inline_data: {
        mime_type: reference.mimeType,
        data: reference.data,
      },
    })),
  ];
}

function buildGeminiImageGenerationConfig() {
  return {
    responseModalities: ['IMAGE'],
  };
}

async function callCustomImageModel(imageModel, prompt, options = {}) {
  if (!imageModel.endpoint) {
    throw new Error('The selected custom image model needs an endpoint in Settings or server env.');
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (imageModel.apiKey) {
    headers.Authorization = `Bearer ${imageModel.apiKey}`;
  }

  const response = await fetch(imageModel.endpoint, {
    method: 'POST',
    signal: options.signal,
    headers,
    body: JSON.stringify({
      model: imageModel.modelName,
      prompt,
      input: prompt,
    }),
  });

  if (!response.ok) {
    throw await createProviderError('Custom image model', response);
  }

  const payload = await response.json();
  const imageUrl = extractImageUrl(payload);

  if (!imageUrl) {
    throw new Error('The custom image model response did not include an image URL or base64 image.');
  }

  return imageUrl;
}

async function callAnthropicMessagesStoryModel(storyModel, request, options = {}) {
  if (!storyModel.endpoint) {
    throw new Error('The selected Anthropic model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected Anthropic model needs an API key in Settings.');
  }

  const response = await fetch(storyModel.endpoint, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': storyModel.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: storyModel.modelName,
      max_tokens: 2000,
      system: 'You write coherent, child-safe stories and return strict JSON only.',
      messages: [
        {
          role: 'user',
          content: buildPremadeStoryPrompt(request),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw await createProviderError('Anthropic story model', response);
  }

  const payload = await response.json();
  const content = extractModelContent(payload);
  return parseJsonContent(content);
}

async function callGoogleGeminiStoryModel(storyModel, request, options = {}) {
  if (!storyModel.endpoint) {
    throw new Error('The selected Gemini model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected Gemini model needs an API key in Settings.');
  }

  const response = await fetch(storyModel.endpoint, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': storyModel.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: buildPremadeStoryPrompt(request),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw await createProviderError('Gemini story model', response);
  }

  const payload = await response.json();
  const content = extractModelContent(payload);
  return parseJsonContent(content);
}

function buildStoryJsonSchema(pageCount) {
  const exactPageCount = Math.max(1, Number(pageCount || 1));

  return {
    type: 'json_schema',
    name: 'aistory_book',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['storyTitle', 'storySummary', 'pages'],
      properties: {
        storyTitle: {
          type: 'string',
        },
        storySummary: {
          type: 'string',
        },
        pages: {
          type: 'array',
          minItems: exactPageCount,
          maxItems: exactPageCount,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['pageNumber', 'text', 'imageDescription'],
            properties: {
              pageNumber: {
                type: 'integer',
              },
              text: {
                type: 'string',
              },
              imageDescription: {
                type: 'string',
              },
            },
          },
        },
      },
    },
  };
}

function buildPageRevisionJsonSchema() {
  return {
    type: 'json_schema',
    name: 'aistory_page_revision',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['text', 'imageDescription'],
      properties: {
        text: {
          type: 'string',
        },
        imageDescription: {
          type: 'string',
        },
      },
    },
  };
}

async function createProviderError(providerName, response) {
  const rawBody = await response.text().catch(() => '');
  let providerMessage = rawBody.trim();

  try {
    const payload = JSON.parse(rawBody);
    providerMessage = payload?.error?.message
      || payload?.message
      || payload?.error
      || providerMessage;
  } catch {
    // Keep the raw provider body when it is not JSON.
  }

  const cleanMessage = String(providerMessage || 'No provider error message returned.')
    .replace(/\s+/g, ' ')
    .slice(0, 700);
  const error = new Error(`${providerName} request failed (${response.status}): ${cleanMessage}`);

  error.statusCode = response.status === 429 ? 429 : 502;
  error.providerStatus = response.status;
  error.expose = true;
  return error;
}

function extractImageUrl(payload) {
  const candidates = [
    payload?.imageUrl,
    payload?.image_url,
    payload?.url,
    payload?.data?.[0]?.url,
    payload?.images?.[0]?.url,
    payload?.output?.[0]?.url,
    payload?.result?.url,
  ].filter(Boolean);

  if (candidates.length > 0) {
    return candidates[0];
  }

  const base64Image = payload?.b64_json
    || payload?.image_base64
    || payload?.data?.[0]?.b64_json
    || payload?.images?.[0]?.b64_json;

  if (base64Image) {
    return `data:image/png;base64,${base64Image}`;
  }

  return '';
}

function extractModelContent(payload) {
  if (typeof payload?.choices?.[0]?.message?.content === 'string') {
    return payload.choices[0].message.content;
  }

  if (typeof payload?.output_text === 'string') {
    return payload.output_text;
  }

  if (Array.isArray(payload?.output)) {
    const textChunks = payload.output
      .flatMap((item) => item.content || [])
      .map((content) => content.text || '')
      .filter(Boolean);

    if (textChunks.length > 0) {
      return textChunks.join('\n');
    }
  }

  if (Array.isArray(payload?.content)) {
    const textChunks = payload.content
      .map((content) => content.text || '')
      .filter(Boolean);

    if (textChunks.length > 0) {
      return textChunks.join('\n');
    }
  }

  if (Array.isArray(payload?.candidates?.[0]?.content?.parts)) {
    const textChunks = payload.candidates[0].content.parts
      .map((part) => part.text || '')
      .filter(Boolean);

    if (textChunks.length > 0) {
      return textChunks.join('\n');
    }
  }

  throw new Error('The story model response did not include readable text.');
}

function parseJsonContent(content) {
  const parsed = parseJsonObjectContent(content);

  if (!Array.isArray(parsed.pages)) {
    throw new Error('The story model JSON did not include pages.');
  }

  return parsed;
}

function parseJsonObjectContent(content) {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(cleaned);
}

function normalizeModelString(value, maxLength) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function isHebrewLanguage(language) {
  return /hebrew|עברית/i.test(String(language || ''));
}
