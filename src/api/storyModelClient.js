import {
  createBookFromStoryDraft,
  generateLocalBook,
  regenerateLocalPageImage,
} from './localStoryEngine.js';

export function buildPremadeStoryPrompt(request) {
  const artStyleInstruction = request.artStyle?.trim()
    ? `Art style direction: ${request.artStyle.trim()}.`
    : 'Art style direction: No specific style was provided. Choose a warm, child-friendly illustration direction that fits the story.';
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
    '    { "pageNumber": 1, "text": "page-sized story text" }',
    '  ]',
    '}',
    '',
    `Write exactly ${request.pageCount} pages.`,
    `Story language: ${request.language || 'English'}. Write the title, summary, and all page text in this language.`,
    `Target age: ${request.childAge}.`,
    `Theme: ${request.theme}.`,
    artStyleInstruction,
    `Characters: ${JSON.stringify(characters, null, 2)}`,
    '',
    'Safety and quality rules:',
    '- Keep language age-appropriate.',
    '- Use warm, practical lessons without shaming the child.',
    '- Avoid frightening, graphic, hateful, sexual, or unsafe content.',
    '- Each page should be short enough to read aloud.',
    '- End with emotional closure.',
    '',
    `User story idea: ${request.prompt}`,
  ].join('\n');
}

export async function generateBookFromStoryModel(request, modelSettings) {
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
    return hydrateBookImages(book, imageModel);
  }

  let draft;

  if (storyModel.type === 'openai-compatible') {
    draft = await callOpenAICompatibleStoryModel(storyModel, request);
  } else if (storyModel.type === 'anthropic-messages') {
    draft = await callAnthropicMessagesStoryModel(storyModel, request);
  } else if (storyModel.type === 'google-gemini') {
    draft = await callGoogleGeminiStoryModel(storyModel, request);
  } else {
    throw new Error('This story model type is not wired yet. Use a built-in story model or Local demo.');
  }

  book = createBookFromStoryDraft(requestWithLabels, draft, 'api');
  return hydrateBookImages(book, imageModel);
}

export async function regeneratePageImageFromModel(book, pageNumber, modelSettings) {
  const imageModel = findProfileByLabel(modelSettings.imageModels, book?.imageModel)
    || findProfile(modelSettings.imageModels, modelSettings.activeImageModelId)
    || modelSettings.imageModels[0];

  if (!imageModel || imageModel.type === 'local') {
    return regenerateLocalPageImage(book, pageNumber);
  }

  const page = book.pages.find((item) => item.pageNumber === pageNumber);

  if (!page) {
    return book;
  }

  const imageUrl = await generateImageFromPrompt(imageModel, page.illustrationPrompt);

  return {
    ...book,
    imageModel: imageModel.label || imageModel.modelName,
    pages: book.pages.map((item) => (
      item.pageNumber === pageNumber
        ? { ...item, imageUrl, imageStatus: 'complete' }
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

async function hydrateBookImages(book, imageModel) {
  if (!imageModel || imageModel.type === 'local') {
    return book;
  }

  const pages = [];

  for (const page of book.pages) {
    const imageUrl = await generateImageFromPrompt(imageModel, page.illustrationPrompt);

    pages.push({
      ...page,
      imageUrl,
      imageStatus: 'complete',
    });
  }

  return {
    ...book,
    imageModel: imageModel.label || imageModel.modelName,
    pages,
  };
}

async function generateImageFromPrompt(imageModel, prompt) {
  if (imageModel.type === 'openai-image') {
    return callOpenAIImageModel(imageModel, prompt);
  }

  if (imageModel.type === 'google-gemini-image') {
    return callGoogleGeminiImageModel(imageModel, prompt);
  }

  throw new Error('This image model type is not wired yet. Use Local demo, OpenAI GPT Image, or Google Gemini Image.');
}

async function callOpenAICompatibleStoryModel(storyModel, request) {
  if (!storyModel.endpoint) {
    throw new Error('The selected story model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected story model needs an API key in Settings.');
  }

  const response = await fetch(storyModel.endpoint, {
    method: 'POST',
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
    throw new Error(`Story model request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const content = extractModelContent(payload);
  return parseJsonContent(content);
}

async function callOpenAIImageModel(imageModel, prompt) {
  if (!imageModel.endpoint) {
    throw new Error('The selected OpenAI image model needs an endpoint in Settings.');
  }

  if (!imageModel.apiKey) {
    throw new Error('The selected OpenAI image model needs an API key in Settings.');
  }

  const response = await fetch(imageModel.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${imageModel.apiKey}`,
    },
    body: JSON.stringify({
      model: imageModel.modelName,
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      output_format: 'png',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI image model request failed with status ${response.status}.`);
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

async function callGoogleGeminiImageModel(imageModel, prompt) {
  if (!imageModel.endpoint) {
    throw new Error('The selected Gemini image model needs an endpoint in Settings.');
  }

  if (!imageModel.apiKey) {
    throw new Error('The selected Gemini image model needs an API key in Settings.');
  }

  const response = await fetch(imageModel.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': imageModel.apiKey,
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
        responseModalities: ['Image'],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini image model request failed with status ${response.status}.`);
  }

  const payload = await response.json();
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

async function callAnthropicMessagesStoryModel(storyModel, request) {
  if (!storyModel.endpoint) {
    throw new Error('The selected Anthropic model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected Anthropic model needs an API key in Settings.');
  }

  const response = await fetch(storyModel.endpoint, {
    method: 'POST',
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
    throw new Error(`Anthropic story model request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const content = extractModelContent(payload);
  return parseJsonContent(content);
}

async function callGoogleGeminiStoryModel(storyModel, request) {
  if (!storyModel.endpoint) {
    throw new Error('The selected Gemini model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected Gemini model needs an API key in Settings.');
  }

  const response = await fetch(storyModel.endpoint, {
    method: 'POST',
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
    throw new Error(`Gemini story model request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const content = extractModelContent(payload);
  return parseJsonContent(content);
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
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!Array.isArray(parsed.pages)) {
    throw new Error('The story model JSON did not include pages.');
  }

  return parsed;
}
