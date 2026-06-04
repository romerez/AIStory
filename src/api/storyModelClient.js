import {
  buildLocalCharacterSheet,
  buildLocalLocationSheet,
  createBookFromStoryDraft,
  generateLocalBook,
  regenerateLocalPageText,
  regenerateLocalPageImage,
  updateBookPageContent as updateLocalBookPageContent,
} from './localStoryEngine.js';

const PROVIDER_ENV = (typeof process !== 'undefined' && process.env) ? process.env : {};
// Cloud APIs. 5 minutes is generous enough for a slow reasoning model (GPT-5.x and
// similar) to write a full multi-page story; override with AISTORY_PROVIDER_TIMEOUT_MS.
const PROVIDER_TIMEOUT_MS = Number(PROVIDER_ENV.AISTORY_PROVIDER_TIMEOUT_MS || 300000);
// Local models (Ollama, LM Studio, llama.cpp, vLLM) can be much slower than cloud
// APIs, especially a large quantized "thinking" model loading cold, so they get a
// far more generous timeout.
const LOCAL_PROVIDER_TIMEOUT_MS = Number(PROVIDER_ENV.AISTORY_LOCAL_PROVIDER_TIMEOUT_MS || 600000);

// Live progress for streaming local story generation, so the UI can prove the
// model is actually producing tokens (not just hanging until the timeout). One
// local user => one generation at a time, so a module-level record is enough.
let storyGenerationProgress = { active: false };

export function getStoryGenerationProgress() {
  return storyGenerationProgress;
}

function beginStoryProgress(storyModel) {
  let baseUrl = '';
  try {
    baseUrl = new URL(storyModel.endpoint).origin;
  } catch {
    baseUrl = '';
  }

  storyGenerationProgress = {
    active: true,
    startedAt: Date.now(),
    lastChunkAt: Date.now(),
    chars: 0,
    words: 0,
    thinkingChars: 0,
    modelName: storyModel.modelName || '',
    baseUrl,
  };
}

function recordStoryProgress(accumulatedContent, reasoningDelta) {
  if (!storyGenerationProgress.active) {
    return;
  }

  // Any token arriving - story content OR the model's reasoning/thinking - counts
  // as a heartbeat, so a long "thinking" phase reads as working, not stuck.
  storyGenerationProgress.lastChunkAt = Date.now();
  storyGenerationProgress.chars = accumulatedContent.length;
  storyGenerationProgress.words = (accumulatedContent.match(/\S+/g) || []).length;

  if (reasoningDelta) {
    storyGenerationProgress.thinkingChars = (storyGenerationProgress.thinkingChars || 0) + reasoningDelta.length;
  }
}

function finishStoryProgress() {
  storyGenerationProgress = { ...storyGenerationProgress, active: false, endedAt: Date.now() };
}

// Reads an OpenAI/Ollama Server-Sent-Events stream, accumulating the assistant
// message text and updating the live progress record as deltas arrive.
async function consumeOpenAICompatibleStream(response, options = {}) {
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  for await (const chunk of response.body) {
    if (options.signal?.aborted) {
      throw options.signal.reason || new DOMException('Aborted', 'AbortError');
    }

    buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf('\n');

      if (!line || !line.startsWith('data:')) {
        continue;
      }

      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') {
        continue;
      }

      try {
        const json = JSON.parse(data);
        const node = json?.choices?.[0]?.delta || json?.choices?.[0]?.message || {};
        const contentDelta = node.content || '';
        const reasoningDelta = node.reasoning_content || node.reasoning || '';
        if (contentDelta) {
          full += contentDelta;
        }
        if (contentDelta || reasoningDelta) {
          recordStoryProgress(full, reasoningDelta);
        }
      } catch {
        // Ignore keep-alive or partial lines that are not complete JSON yet.
      }
    }
  }

  return full;
}

function isLocalEndpoint(endpoint) {
  try {
    const host = new URL(String(endpoint || '')).hostname.toLowerCase();

    return host === 'localhost'
      || host === '127.0.0.1'
      || host === '0.0.0.0'
      || host === '::1'
      || host === '[::1]'
      || host.endsWith('.local');
  } catch {
    return false;
  }
}

// Local OpenAI-compatible servers (Ollama, LM Studio, llama.cpp, vLLM) usually need
// no auth, so only send Authorization when a key is actually set.
function buildJsonAuthHeaders(apiKey) {
  const headers = { 'Content-Type': 'application/json' };
  const key = String(apiKey || '').trim();

  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }

  return headers;
}

// Provider calls previously had no timeout, so a slow or stalled model (common with
// large reasoning models) left the UI spinning on "Writing the story text..." with no
// way out but the Stop button. Wrap every provider fetch so a stall surfaces as a
// clear, actionable error while still honoring the caller's abort signal.
async function providerFetch(url, init = {}) {
  const externalSignal = init.signal;
  throwIfAborted(externalSignal);

  const controller = new AbortController();
  const timeoutMs = isLocalEndpoint(url) ? LOCAL_PROVIDER_TIMEOUT_MS : PROVIDER_TIMEOUT_MS;
  const timeoutSeconds = Math.round(timeoutMs / 1000);
  const onExternalAbort = () => controller.abort(externalSignal.reason);

  if (externalSignal) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => {
    controller.abort(new DOMException(`Provider request timed out after ${timeoutSeconds}s.`, 'TimeoutError'));
  }, timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      const timeoutError = new Error(`The request timed out after ${timeoutSeconds}s. The model may be overloaded or too slow. Try a faster model in Settings, or check the provider's status page.`);
      timeoutError.statusCode = 504;
      timeoutError.expose = true;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timer);

    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export function buildPremadeStoryPrompt(request) {
  // All styles are authored in English and produce the story in the selected
  // language (Hebrew with niqqud when chosen). The imageDescription always stays
  // English so the image model understands it.
  switch (request?.storyPromptStyle) {
    case 'storyteller':
      return buildStorytellerStoryPrompt(request);
    case 'playful':
      return buildPlayfulStoryPrompt(request);
    case 'bedtime':
      return buildBedtimeStoryPrompt(request);
    case 'classic':
    default:
      return buildClassicStoryPrompt(request);
  }
}

// "Classic" - the original prompt: format-first, explicit warm lessons, strong
// image-consistency rules. Reliable and literal.
function buildClassicStoryPrompt(request) {
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
    '- Write each imageDescription IN ENGLISH ONLY, even when the story text is in another language. The image generator only understands English, so a non-English imageDescription produces broken pictures.',
    '- In that English imageDescription, refer to each character by name with their FIXED look in parentheses, plus the action, emotion, setting, and key objects (no non-English words).',
    '- CRITICAL CONSISTENCY: decide each character\'s exact look ONCE (hair color and style, exact clothing items and colors, skin tone, accessories, and each one\'s creature) and copy those EXACT same words into every page they appear on. A character\'s hair color and clothing colors must NEVER change between pages.',
    '- Set each page background to where THIS page actually happens in the story. When the same place appears on more than one page, describe it the same way so it reads as the same place; move to a new background only when the story moves to a new place - scenes change as the story progresses (like a TV episode in one world), not a random new background on every page.',
    '- Keep the characters consistent across pages (same faces, hair, skin tone, clothing and colors, and each one\'s creature companion) and one steady art style; the location changes only when the story moves there.',
    '- Use a landscape-safe composition: keep all important faces, bodies, hands, objects, and background details comfortably inside the frame with generous margins. Do not crop characters at the edges.',
    '- End with emotional closure.',
    '',
    `User story idea: ${request.prompt}`,
  ].join('\n');
}

// "Storyteller" - craft-first prompt aimed at depth: a real want + obstacle, a
// story arc, show-don't-tell, sensory voice, and no tacked-on morals. Keeps the
// same JSON contract, language/niqqud handling, and image-consistency essentials.
function buildStorytellerStoryPrompt(request) {
  const artStyleInstruction = request.artStyle?.trim()
    ? `Art style direction: ${request.artStyle.trim()}.`
    : 'Art style direction: No specific style was provided. Choose a warm, child-friendly illustration direction that fits the story.';
  const languageInstruction = isHebrewLanguage(request.language)
    ? 'Story language: Hebrew. Write the title, summary, and all page text in Hebrew with full niqqud / nikud vowel marks on every Hebrew word.'
    : `Story language: ${request.language || 'English'}. Write the title, summary, and all page text in this language.`;
  const characters = (request.characters || []).map((character, index) => ({
    name: character.name || `Character ${index + 1}`,
    role: character.role || (index === 0 ? 'main character' : 'supporting character'),
    description: character.description || 'No description provided',
    hasPictureReference: Boolean(character.referenceImageUrl || character.referenceImageFile),
  }));

  return [
    'You are an award-winning author of children\'s picture books. Write a vivid, warm, emotionally true mini-book that a parent loves reading aloud and a child asks for again and again.',
    '',
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
    'Write it like a real picture book, not a summary:',
    '- Give the main character one clear, concrete want, and put a real obstacle in the way. Keep the stakes small but genuinely meaningful to a child.',
    '- Shape an arc across the pages: a hook that pulls the reader in, rising trouble or curiosity, a turning point where something shifts, and a warm, earned ending. Every page must move the story forward (cause leads to effect), not just describe a scene.',
    '- Show, do not tell. Reveal feelings through actions, the senses, and small bits of dialogue. Instead of "she was scared," show the held breath, the dark doorway, the small hand squeezing tight.',
    '- Use concrete, sensory detail (sounds, textures, colors, smells) and strong simple verbs. One fresh, surprising image beats ten generic ones.',
    '- Give the narration a warm, playful voice with read-aloud rhythm. Vary sentence length. A gentle repeated phrase or refrain across pages is welcome.',
    '- Let the meaning arrive on its own. Do NOT state a moral or lesson outright, and never lecture the child. Trust the reader to feel it.',
    '- Avoid cliches, filler, and generic "and everyone was happy" endings. Make the resolution specific to THIS story and emotionally satisfying.',
    '- Keep each page short enough to read aloud comfortably, but make every line earn its place.',
    '',
    'For each page also write an imageDescription (the picture for that page), ALWAYS IN ENGLISH ONLY - even though the story text is in another language - because the image generator only understands English:',
    '- Describe the single key visual moment: which characters are present (each named with their FIXED look in parentheses), their action and emotion, the setting, and one or two telling details. No non-English words.',
    '- CRITICAL CONSISTENCY: lock each character\'s exact look ONCE (hair color and style, exact clothing and colors, skin tone, accessories, and each one\'s creature) and reuse those EXACT words on every page - never change a character\'s hair or clothing colors between pages.',
    '- Set each page background to where THIS page happens in the story: keep recurring places consistent (the same place, described the same way, each time it appears) and move to a new background only when the story moves there - scenes change as the story progresses, like a TV episode in one world, not a random new place on every page. Keep the characters and art style consistent throughout.',
    '- Compose landscape-safe: keep faces, bodies, hands, and key objects fully inside the frame with generous margins, never cropped.',
    '',
    'Stay child-safe: nothing frightening, graphic, hateful, sexual, or unsafe; stay gentle even during conflict; use age-appropriate words. Do not dumb the story down, though - real feelings, humor, and wonder belong here.',
    '',
    `User story idea: ${request.prompt}`,
  ].join('\n');
}

// "Playful" - funny, silly, energetic, with a bouncy read-aloud rhythm.
function buildPlayfulStoryPrompt(request) {
  const artStyleInstruction = request.artStyle?.trim()
    ? `Art style direction: ${request.artStyle.trim()}.`
    : 'Art style direction: No specific style was provided. Choose a warm, child-friendly illustration direction that fits the story.';
  const languageInstruction = isHebrewLanguage(request.language)
    ? 'Story language: Hebrew. Write the title, summary, and all page text in natural, flowing Hebrew with full niqqud / nikud vowel marks on every Hebrew word.'
    : `Story language: ${request.language || 'English'}. Write the title, summary, and all page text in this language.`;
  const characters = (request.characters || []).map((character, index) => ({
    name: character.name || `Character ${index + 1}`,
    role: character.role || (index === 0 ? 'main character' : 'supporting character'),
    description: character.description || 'No description provided',
    hasPictureReference: Boolean(character.referenceImageUrl || character.referenceImageFile),
  }));

  return [
    'You are a funny, energetic children\'s author. Write a playful, giggly mini-book that makes kids laugh and want to read along.',
    '',
    'Return only valid JSON. Do not wrap it in markdown.',
    '',
    'Required JSON shape:',
    '{',
    '  "storyTitle": "string",',
    '  "storySummary": "string",',
    '  "pages": [',
    '    { "pageNumber": 1, "text": "page-sized story text", "imageDescription": "scene, action, mood, and visual focus IN ENGLISH" }',
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
    'Story style - Playful and funny:',
    '- Keep it light, silly, and full of fun, with a bouncy voice and a strong read-aloud rhythm.',
    '- Use gentle humor, surprises, fun sound words (boing, splash, whoosh), and a repeated catchphrase the child can say along.',
    '- Still tell a real little story: a beginning, a funny problem, and a happy, satisfying turn - not random gags.',
    '- Keep each page short and snappy. Stay warm and kind; never mean humor at a character\'s expense.',
    '',
    'Image rules:',
    '- Write each imageDescription IN ENGLISH ONLY (the image generator only understands English); no non-English words.',
    '- Name the characters present with their FIXED look in parentheses, plus action, emotion, setting, and key objects.',
    '- CRITICAL CONSISTENCY: lock each character\'s exact look ONCE (hair, exact clothing and colors, skin tone, accessories, and each one\'s creature) and reuse those EXACT words on every page - never change their hair or clothing colors between pages.',
    '- Set each page background to where THIS page happens in the story; keep recurring places consistent and change location only when the story moves there - scenes change with the story, like a TV episode in one world, not a random background on every page. Keep the characters and art style consistent. Landscape-safe framing, nothing cropped, no readable text in the image.',
    '',
    'Stay child-safe: nothing frightening, graphic, hateful, sexual, or unsafe.',
    '',
    `User story idea: ${request.prompt}`,
  ].join('\n');
}

// "Bedtime" - soft, soothing, low-tension, winds down toward sleep.
function buildBedtimeStoryPrompt(request) {
  const artStyleInstruction = request.artStyle?.trim()
    ? `Art style direction: ${request.artStyle.trim()}.`
    : 'Art style direction: No specific style was provided. Choose a warm, child-friendly illustration direction that fits the story.';
  const languageInstruction = isHebrewLanguage(request.language)
    ? 'Story language: Hebrew. Write the title, summary, and all page text in natural, flowing Hebrew with full niqqud / nikud vowel marks on every Hebrew word.'
    : `Story language: ${request.language || 'English'}. Write the title, summary, and all page text in this language.`;
  const characters = (request.characters || []).map((character, index) => ({
    name: character.name || `Character ${index + 1}`,
    role: character.role || (index === 0 ? 'main character' : 'supporting character'),
    description: character.description || 'No description provided',
    hasPictureReference: Boolean(character.referenceImageUrl || character.referenceImageFile),
  }));

  return [
    'You are a gentle bedtime storyteller. Write a soft, soothing mini-book that helps a child wind down and feel safe and sleepy.',
    '',
    'Return only valid JSON. Do not wrap it in markdown.',
    '',
    'Required JSON shape:',
    '{',
    '  "storyTitle": "string",',
    '  "storySummary": "string",',
    '  "pages": [',
    '    { "pageNumber": 1, "text": "page-sized story text", "imageDescription": "scene, action, mood, and visual focus IN ENGLISH" }',
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
    'Story style - Calm bedtime:',
    '- Use a slow, gentle, lulling rhythm with soft, warm words and calm imagery (moonlight, hush, cozy blankets, sleepy animals).',
    '- Keep tension very low; any tiny problem resolves softly and reassuringly, with no excitement spikes near the end.',
    '- Wind down toward stillness, ending on a peaceful, comforting note that eases the child toward sleep.',
    '- Short, calm pages; a gentle repeated goodnight-style refrain is welcome.',
    '',
    'Image rules:',
    '- Write each imageDescription IN ENGLISH ONLY (the image generator only understands English); no non-English words.',
    '- Name the characters present with their FIXED look in parentheses, plus action, emotion, setting, and key objects. Prefer soft, warm, night-time lighting.',
    '- CRITICAL CONSISTENCY: lock each character\'s exact look ONCE (hair, exact clothing and colors, skin tone, accessories, and each one\'s creature) and reuse those EXACT words on every page - never change their hair or clothing colors between pages.',
    '- Set each page background to where THIS page happens in the story; keep recurring places consistent and change location only when the story moves there - scenes change with the story, like a TV episode in one world, not a random background on every page. Keep the characters and art style consistent. Landscape-safe framing, nothing cropped, no readable text in the image.',
    '',
    'Stay child-safe and reassuring throughout; nothing frightening.',
    '',
    `User story idea: ${request.prompt}`,
  ].join('\n');
}

function buildHebrewPromptHeader(request) {
  const artStyleInstruction = request.artStyle?.trim()
    ? `הנחיית סגנון איור: ${request.artStyle.trim()}.`
    : 'הנחיית סגנון איור: לא נמסר סגנון מסוים. בחר כיוון איור חם וידידותי לילדים שמתאים לסיפור.';
  const characters = (request.characters || []).map((character, index) => ({
    name: character.name || `דמות ${index + 1}`,
    role: character.role || (index === 0 ? 'דמות ראשית' : 'דמות משנה'),
    description: character.description || 'אין תיאור',
    hasPictureReference: Boolean(character.referenceImageUrl || character.referenceImageFile),
  }));

  return [
    'החזר אך ורק אובייקט JSON תקין אחד. אל תעטוף אותו ב-markdown ואל תוסיף טקסט מחוץ ל-JSON.',
    '',
    'מבנה ה-JSON (שמות המפתחות באנגלית; הערכים בעברית, חוץ מ-imageDescription שתמיד באנגלית):',
    '{',
    '  "storyTitle": "כותרת בעברית",',
    '  "storySummary": "תקציר קצר בעברית",',
    '  "pages": [',
    '    { "pageNumber": 1, "text": "טקסט העמוד בעברית", "imageDescription": "scene description in English" }',
    '  ]',
    '}',
    '',
    `כתוב בדיוק ${request.pageCount} עמודים.`,
    'שפת הסיפור: עברית. כתוב את הכותרת, התקציר וכל טקסט העמודים בעברית תקנית, טבעית וזורמת, עם ניקוד מלא על כל מילה עברית.',
    `גיל היעד: ${request.childAge}.`,
    `נושא: ${request.theme}.`,
    request.customTheme ? `נושא חופשי מהמשתמש: ${request.customTheme}.` : '',
    artStyleInstruction,
    `דמויות: ${JSON.stringify(characters, null, 2)}`,
  ];
}

// Hebrew "Classic" - literal, format-first, with explicit warm lessons.
function buildHebrewClassicPrompt(request) {
  return [
    'אתה כותב ספר ילדים מאויר וקצר, בטוח ומתאים לילדים.',
    '',
    ...buildHebrewPromptHeader(request),
    '',
    'כללי איכות ובטיחות:',
    '- שמור על שפה מותאמת גיל.',
    '- העבר מסר חם ומעשי בלי לבייש את הילד.',
    '- הימנע מתוכן מפחיד, גרפי, פוגעני, מיני או לא בטוח.',
    '- כל עמוד קצר מספיק לקריאה בקול.',
    '- כתוב כל imageDescription באנגלית בלבד (מחולל התמונות מבין רק אנגלית), וכלול בו את הדמויות והמראה שלהן (גיל, מין, שיער, לבוש וצבעים), הפעולה, הרגש, הסביבה והאובייקטים החשובים. בלי מילים שאינן באנגלית.',
    '- בחר מקום פיזי אחד לסיפור ושמור עליו בכל ה-imageDescription, אלא אם רעיון המשתמש אומר במפורש שהסיפור עובר מקום.',
    '- סיים בסגירה רגשית.',
    '',
    `רעיון הסיפור מהמשתמש: ${request.prompt}`,
  ].join('\n');
}

// Hebrew "Storyteller" - craft-first: real want + obstacle, an arc, show-don't-tell,
// sensory voice, and no tacked-on morals.
function buildHebrewStorytellerPrompt(request) {
  return [
    'אתה סופר עטור פרסים של ספרי ילדים מאוירים. כתוב סיפור קצר, חי, חם ואמיתי רגשית - כזה שהורה ייהנה להקריא וילד יבקש לשמוע שוב ושוב.',
    '',
    ...buildHebrewPromptHeader(request),
    '',
    'כתוב כמו ספר תמונות אמיתי, לא כמו תקציר:',
    '- תן לדמות הראשית רצון אחד ברור וקונקרטי, ושים מכשול אמיתי בדרך. שמור על סיכון קטן אך משמעותי באמת לילד.',
    '- בנה קשת לאורך העמודים: פתיחה שמושכת, מתח או סקרנות שהולכים וגדלים, נקודת מפנה שבה משהו משתנה, וסיום חם ומוצדק. כל עמוד צריך לקדם את הסיפור (סיבה ותוצאה), לא רק לתאר סצנה.',
    '- הראה, אל תספר. חשוף רגשות דרך פעולות, חושים ודיאלוג קצר, לא דרך תוויות כמו "היא פחדה".',
    '- השתמש בפרטים חושיים וקונקרטיים (צלילים, מרקמים, צבעים, ריחות) ובפעלים פשוטים וחזקים. תמונה אחת רעננה ומפתיעה שווה יותר מעשר כלליות.',
    '- תן לקריינות קול חם ומשחקי, עם מקצב נעים לקריאה בקול. גוון את אורך המשפטים. חזרה עדינה של ביטוי לאורך הספר מבורכת.',
    '- תן למשמעות להגיע מעצמה. אל תנסח מוסר השכל במפורש ואל תטיף לילד. סמוך על הקורא שירגיש את זה.',
    '- הימנע מקלישאות וממילוי סרק, ומסיום גנרי בנוסח "וכולם היו מאושרים". הפוך את הפתרון לספציפי לסיפור הזה ולמספק רגשית.',
    '- כל עמוד קצר מספיק לקריאה נוחה בקול, אבל כל שורה צריכה להצדיק את מקומה.',
    '',
    'לכל עמוד כתוב גם imageDescription (התמונה של העמוד), תמיד באנגלית בלבד כי מחולל התמונות מבין רק אנגלית:',
    '- תאר את הרגע הויזואלי המרכזי: אילו דמויות מופיעות והמראה שלהן (גיל, מין, שיער, גוון עור, לבוש וצבעים), הפעולה, הרגש, הסביבה, ופרט-שניים מספרים. בלי מילים שאינן באנגלית.',
    '- שמור על מקום פיזי אחד ועקבי לאורך כל הספר, עם נקודות ציון ואביזרים יציבים, אלא אם הסיפור עובר במפורש למקום חדש.',
    '',
    'בטיחות לילדים: שום דבר מפחיד, גרפי, אלים, מיני או לא בטוח; עדין גם בקונפליקט; מילים מותאמות גיל. אבל אל תהפוך את הסיפור לטיפשי - רגש אמיתי, הומור ופליאה שייכים כאן.',
    '',
    `רעיון הסיפור מהמשתמש: ${request.prompt}`,
  ].join('\n');
}

export async function generateBookFromStoryModel(request, modelSettings, options = {}) {
  const storyModel = findProfile(modelSettings.storyModels, request.storyModelId)
    || findProfile(modelSettings.storyModels, modelSettings.activeStoryModelId)
    || modelSettings.storyModels[0];
  const imageModel = findProfile(modelSettings.imageModels, request.imageModelId)
    || findProfile(modelSettings.imageModels, modelSettings.activeImageModelId)
    || modelSettings.imageModels[0];
  request = {
    ...request,
    storyPromptStyle: request.storyPromptStyle || modelSettings?.storyPromptStyle || 'classic',
    lockCharacterLooks: request.lockCharacterLooks ?? modelSettings?.lockCharacterLooks ?? true,
  };
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

export async function generateCharacterSheetFromModel(book, modelSettings, options = {}) {
  const imageModel = resolveImageModel(book, modelSettings);

  if (!imageModel || imageModel.type === 'local') {
    return {
      ...book,
      characterSheetUrl: buildLocalCharacterSheet(book),
      characterSheetCreatedAt: new Date().toISOString(),
    };
  }

  const prompt = buildCharacterSheetPrompt(book);
  const referenceImages = selectCharacterSheetReferences(imageModel, book);
  let sheetUrl;

  try {
    throwIfAborted(options.signal);
    sheetUrl = await generateImageFromPrompt(imageModel, prompt, referenceImages, options);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    // A failed sheet must never block the book build. Retry once without the
    // input references if those were the problem, otherwise leave the book
    // unchanged so page images fall back to the existing anchors.
    if (referenceImages.length > 0 && isReferenceInputError(error)) {
      try {
        sheetUrl = await generateImageFromPrompt(imageModel, prompt, [], options);
      } catch (retryError) {
        if (isAbortError(retryError)) {
          throw retryError;
        }

        logProviderFailure({ action: 'generate-character-sheet', model: imageModel, pageNumber: 0, error: retryError });
        return book;
      }
    } else {
      logProviderFailure({ action: 'generate-character-sheet', model: imageModel, pageNumber: 0, error });
      return book;
    }
  }

  return {
    ...book,
    imageModel: imageModel.label || imageModel.modelName,
    characterSheetUrl: sheetUrl,
    characterSheetCreatedAt: new Date().toISOString(),
  };
}

function buildCharacterSheetPrompt(book) {
  const visualBible = book?.visualBible || {};
  const characters = visualBible.characters || [];
  const styleInstruction = String(book?.artStyle || '').trim() || 'warm child-friendly storybook illustration';
  const castLines = characters.map((character) => {
    const reference = character.hasReferenceImage
      ? 'match the supplied reference image exactly'
      : 'design from this description and keep it fixed for the whole book';

    return `${character.name} (${character.role || 'character'}): ${character.description} — ${reference}`;
  });

  return [
    "A single, simple character line-up illustration for a children's picture book.",
    'One continuous image on a plain, evenly-lit pale background. No story scene, no clutter.',
    `Illustration style: ${styleInstruction}.`,
    castLines.length
      ? `Show these characters standing side by side in one straight row, each full-body, front view, one neutral friendly pose each: ${castLines.join(' | ')}.`
      : 'Show the main character once, full-body, front view, one neutral friendly pose.',
    visualBible.palette?.length ? `Use this palette: ${visualBible.palette.join(', ')}.` : '',
    'Render faces, hair, skin tone, body proportions, outfits, and accessories clearly and consistently.',
    'IMPORTANT: produce ONE single illustration only - NOT a grid, NOT a model/turnaround sheet, NOT multiple panels, no separate pose boxes, no back or side views, no arrows, and absolutely no text, letters, labels, numbers, or captions anywhere in the image.',
    'All characters fully clothed, cheerful, and child-safe. Landscape framing with generous margins; do not crop any character.',
  ].filter(Boolean).join(' ');
}

function selectCharacterSheetReferences(imageModel, book) {
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

  // Only user-supplied references feed the sheet — the sheet itself becomes the
  // generated anchor, so generated page anchors are intentionally excluded.
  for (const character of book?.visualBible?.characters || []) {
    addReference(character.referenceImageUrl, `character reference: ${character.name}`);
  }

  addReference(book?.requestSnapshot?.referenceImageUrl, 'overall style reference');

  return references;
}

export async function generateLocationSheetFromModel(book, modelSettings, options = {}) {
  const imageModel = resolveImageModel(book, modelSettings);

  if (!imageModel || imageModel.type === 'local') {
    return {
      ...book,
      locationSheetUrl: buildLocalLocationSheet(book),
      locationSheetCreatedAt: new Date().toISOString(),
    };
  }

  const prompt = buildLocationSheetPrompt(book);
  const referenceImages = selectLocationSheetReferences(imageModel, book);
  let sheetUrl;

  try {
    throwIfAborted(options.signal);
    sheetUrl = await generateImageFromPrompt(imageModel, prompt, referenceImages, options);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (referenceImages.length > 0 && isReferenceInputError(error)) {
      try {
        sheetUrl = await generateImageFromPrompt(imageModel, prompt, [], options);
      } catch (retryError) {
        if (isAbortError(retryError)) {
          throw retryError;
        }

        logProviderFailure({ action: 'generate-location-sheet', model: imageModel, pageNumber: 0, error: retryError });
        return book;
      }
    } else {
      logProviderFailure({ action: 'generate-location-sheet', model: imageModel, pageNumber: 0, error });
      return book;
    }
  }

  return {
    ...book,
    imageModel: imageModel.label || imageModel.modelName,
    locationSheetUrl: sheetUrl,
    locationSheetCreatedAt: new Date().toISOString(),
  };
}

function buildLocationSheetPrompt(book) {
  const visualBible = book?.visualBible || {};
  const styleInstruction = String(book?.artStyle || '').trim() || 'warm child-friendly storybook illustration';
  const setting = visualBible.setting || 'a cozy, consistent story setting';
  const details = (visualBible.repeatedVisualDetails || []).filter(Boolean).slice(0, 6);

  return [
    "A single establishing background illustration for a children's picture book - one continuous wide shot of the empty setting.",
    'No characters, no people, no animals.',
    `Setting: ${setting}.`,
    `Illustration style: ${styleInstruction}.`,
    visualBible.palette?.length ? `Use this palette: ${visualBible.palette.join(', ')}.` : '',
    details.length ? `Include these stable landmarks, props, and lighting: ${details.join(', ')}.` : '',
    'IMPORTANT: ONE single continuous scene only - NOT a grid, NOT a collage, NOT multiple panels or thumbnails, no split frames, no dividing borders, and absolutely no text, letters, labels, numbers, or captions.',
    'Landscape framing with generous margins. Child-safe.',
  ].filter(Boolean).join(' ');
}

function selectLocationSheetReferences(imageModel, book) {
  if (!supportsImageReferences(imageModel)) {
    return [];
  }

  // The location plate should not contain characters, so only the overall style
  // reference feeds it (character references are intentionally excluded).
  const reference = getImageReferenceLimit(imageModel) > 0
    ? parseDataImageReference(book?.requestSnapshot?.referenceImageUrl, 'overall style reference')
    : null;

  return reference ? [reference] : [];
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

async function generateImageFromPrompt(imageModel, prompt, referenceImages = [], options = {}, book = null, page = null) {
  if (imageModel.type === 'openai-image') {
    return callOpenAIImageModel(imageModel, prompt, referenceImages, options);
  }

  if (imageModel.type === 'google-gemini-image') {
    return callGoogleGeminiImageModel(imageModel, prompt, referenceImages, options);
  }

  if (imageModel.type === 'custom-image') {
    return callCustomImageModel(imageModel, prompt, referenceImages, options, book, page);
  }

  throw new Error('This image model type is not wired yet. Use Local demo, OpenAI GPT Image, Google Gemini Image, or a custom image endpoint.');
}

async function tryGenerateImage(imageModel, prompt, referenceImages, options, book = null, page = null) {
  try {
    return await generateImageFromPrompt(imageModel, prompt, referenceImages, options, book, page);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (referenceImages.length > 0 && isReferenceInputError(error)) {
      return generateImageFromPrompt(imageModel, prompt, [], options, book, page);
    }

    throw error;
  }
}

async function generateImageForPage(imageModel, page, book, options = {}) {
  const referenceImages = selectImageReferencesForPage(imageModel, book, page.pageNumber);
  // Send the full, descriptive prompt first. The earlier behaviour ran the
  // word-softening pass on every request, which stripped "child", "boy/girl",
  // "bedroom", etc. from all generations and weakened character/age/setting
  // fidelity. Now we only soften wording when a provider rejects the prompt for
  // safety/policy reasons, escalating to a plain wholesome prompt as a last resort.
  const promptTiers = [
    page.illustrationPrompt,
    buildProviderSafeImagePrompt(page.illustrationPrompt),
    buildSafeFallbackImagePrompt(book, page),
  ];

  let lastError;

  for (let index = 0; index < promptTiers.length; index += 1) {
    try {
      return await tryGenerateImage(imageModel, promptTiers[index], referenceImages, options, book, page);
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }

      lastError = error;

      const canEscalate = isImageSafetyError(error) && index < promptTiers.length - 1;

      if (!canEscalate) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Image generation failed.');
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

  // The generated character/style sheet is the strongest identity anchor, so add
  // it first. Reserving its slot keeps it from being crowded out by per-character
  // references when a book has several characters and a small reference limit.
  addReference(book?.characterSheetUrl, 'character/style reference sheet');
  // The background/location sheet is intentionally NOT added per page: pages are
  // meant to change scene like a TV episode, so anchoring every page to one fixed
  // background would fight that. Identity comes from the character sheet instead.

  for (const character of book?.visualBible?.characters || []) {
    addReference(character.referenceImageUrl, `character reference: ${character.name}`);
  }

  addReference(book?.requestSnapshot?.referenceImageUrl, 'overall style reference');

  // Legacy page-derived anchors are only useful when no character sheet exists;
  // the sheet supersedes them and keeps payloads smaller.
  if (!book?.characterSheetUrl) {
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
  }

  return references;
}

function supportsImageReferences(imageModel) {
  return imageModel?.type === 'google-gemini-image'
    || imageModel?.type === 'openai-image'
    // Local ComfyUI (IP-Adapter) opts in per profile, so the generic Multiplay
    // custom-image preset stays text-only.
    || (imageModel?.type === 'custom-image' && imageModel?.supportsReferences === true);
}

function getImageReferenceLimit(imageModel) {
  const explicitLimit = Number(imageModel?.referenceLimit);

  if (Number.isFinite(explicitLimit) && explicitLimit > 0) {
    return explicitLimit;
  }

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
    'Scene follows the story: the background matches where this page happens. Keep recurring places consistent and change the background only when the story moves to a new place - scenes change with the story, like a TV episode in one world, not a random background on every page. Keep the characters and art style consistent.',
    'Composition continuity: keep recurring characters and central objects in a coherent left-to-right relationship when possible; vary only pose, expression, action, and small page-specific props.',
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
    'Let the background match this page\'s scene; keep recurring places consistent and the characters and art style steady across pages.',
    'Use landscape-safe framing with generous margins so no character, face, hand, or important object is cut off.',
    'Use soft colors, gentle expressions, fully clothed age-neutral characters, no readable text, no unsafe content.',
  ].filter(Boolean).join(' ');
}

async function callStoryModelJson(storyModel, prompt, jsonSchema, providerName, options = {}) {
  if (!storyModel.endpoint) {
    throw new Error('The selected story model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey && !isLocalEndpoint(storyModel.endpoint)) {
    throw new Error('The selected story model needs an API key in Settings.');
  }

  let response;

  if (storyModel.type === 'openai-responses') {
    response = await providerFetch(storyModel.endpoint, {
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
    response = await providerFetch(storyModel.endpoint, {
      method: 'POST',
      signal: options.signal,
      headers: buildJsonAuthHeaders(storyModel.apiKey),
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
    response = await providerFetch(storyModel.endpoint, {
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
    return callGoogleGeminiJsonPrompt(storyModel, prompt, providerName, options, 0.8);
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

  if (!storyModel.apiKey && !isLocalEndpoint(storyModel.endpoint)) {
    throw new Error('The selected story model needs an API key in Settings.');
  }

  const useStream = typeof window === 'undefined' && isLocalEndpoint(storyModel.endpoint);
  const requestBody = {
    model: storyModel.modelName,
    temperature: 0.6,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You write coherent, child-safe children\'s stories. Return ONLY one raw JSON object with exactly these top-level keys: storyTitle (string), storySummary (string), and pages (array). Do not add commentary, markdown fences, or any wrapper field such as "content".',
      },
      {
        role: 'user',
        content: buildPremadeStoryPrompt(request),
      },
    ],
  };

  // Stream local (Ollama) generations so the UI gets a live word count and can
  // tell the model is actually producing tokens. Cloud and the in-browser
  // fallback keep the original single blocking request.
  if (useStream) {
    requestBody.stream = true;
  }

  const response = await providerFetch(storyModel.endpoint, {
    method: 'POST',
    signal: options.signal,
    headers: buildJsonAuthHeaders(storyModel.apiKey),
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw await createProviderError('OpenAI story model', response);
  }

  if (useStream && response.body) {
    beginStoryProgress(storyModel);
    try {
      const streamedContent = await consumeOpenAICompatibleStream(response, options);
      return parseJsonContent(streamedContent);
    } finally {
      finishStoryProgress();
    }
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

  const response = await providerFetch(storyModel.endpoint, {
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
      // GPT-5.x are reasoning models; without this they default to heavy reasoning
      // and a multi-page story (especially Hebrew with niqqud) can run for minutes.
      // "low" keeps plenty of quality for a children's story while staying fast.
      reasoning: { effort: 'low' },
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

  const response = await providerFetch(imageModel.endpoint, {
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

  const response = await providerFetch(editEndpoint, {
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

  const response = await providerFetch(imageModel.endpoint, {
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

    const fallbackResponse = await providerFetch(imageModel.endpoint, {
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

async function callCustomImageModel(imageModel, prompt, referenceImages = [], options = {}, book = null, page = null) {
  if (!imageModel.endpoint) {
    throw new Error('The selected custom image model needs an endpoint in Settings or server env.');
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  if (imageModel.apiKey) {
    headers.Authorization = `Bearer ${imageModel.apiKey}`;
  }

  // model/prompt/input stay exactly as before so a strict OpenAI-shaped server
  // (Multiplay/cloud) is unaffected. The rest are optional and only sent when the
  // profile opts in — the local ComfyUI proxy reads them, others ignore them.
  const requestBody = {
    model: imageModel.modelName,
    prompt,
    input: prompt,
  };
  const seed = resolveSeedForPage(book, page);

  if (seed) {
    requestBody.seed = seed;
  }

  if (imageModel.supportsNegativePrompt) {
    requestBody.negative_prompt = buildNegativePromptForBook(book);
  }

  const width = Number(imageModel.imageWidth) || 0;
  const height = Number(imageModel.imageHeight) || 0;

  if (width > 0) {
    requestBody.width = width;
  }

  if (height > 0) {
    requestBody.height = height;
  }

  if (referenceImages.length > 0) {
    requestBody.reference_images = referenceImages.map((reference) => ({
      label: reference.label,
      mimeType: reference.mimeType,
      data: reference.data,
    }));
  }

  const response = await providerFetch(imageModel.endpoint, {
    method: 'POST',
    signal: options.signal,
    headers,
    body: JSON.stringify(requestBody),
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

// Per-page deterministic seed derived from the book's base seed, so retries of the
// same page are reproducible and pages differ from each other. Returns 0 (provider
// randomizes) when the book has no base seed — e.g. one-off sheet generation.
function resolveSeedForPage(book, page) {
  const base = Number(book?.imageSeed) || 0;

  if (!base) {
    return 0;
  }

  const offset = (Number(page?.pageNumber) || 1) * 1000003;

  return (base + offset) >>> 0;
}

function buildNegativePromptForBook() {
  return [
    'grid, collage, multiple panels, split image, split screen, thumbnails, contact sheet, storyboard, picture-in-picture, frame borders, divided panels, model sheet, character turnaround',
    'text, watermark, signature, caption, letters, words, numbers, labels',
    'extra fingers, deformed hands, distorted faces, extra limbs, duplicated people, cloned faces',
    'blurry, low quality, jpeg artifacts',
    'scary, creepy, violent, gore, sexual, nudity',
  ].join(', ');
}

async function callAnthropicMessagesStoryModel(storyModel, request, options = {}) {
  if (!storyModel.endpoint) {
    throw new Error('The selected Anthropic model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected Anthropic model needs an API key in Settings.');
  }

  const response = await providerFetch(storyModel.endpoint, {
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
  const payload = await requestGoogleGeminiJsonPayload(
    storyModel,
    buildPremadeStoryPrompt(request),
    'Gemini story model',
    options,
    0.7,
  );
  const content = extractModelContent(payload);
  return parseJsonContent(content);
}

async function callGoogleGeminiJsonPrompt(storyModel, prompt, providerName, options = {}, temperature = 0.7) {
  const payload = await requestGoogleGeminiJsonPayload(storyModel, prompt, providerName, options, temperature);

  return parseJsonObjectContent(extractModelContent(payload));
}

async function requestGoogleGeminiJsonPayload(storyModel, prompt, providerName, options = {}, temperature = 0.7) {
  if (!storyModel.endpoint) {
    throw new Error('The selected Gemini model needs an endpoint in Settings.');
  }

  if (!storyModel.apiKey) {
    throw new Error('The selected Gemini model needs an API key in Settings.');
  }

  const response = await fetchGoogleGeminiGenerateContent(storyModel, prompt, options, temperature);

  if (response.ok) {
    return response.json();
  }

  const originalError = await createProviderError(providerName, response);

  if (!shouldTryGeminiModelFallback(originalError)) {
    throw originalError;
  }

  const fallbackModel = await resolveGoogleGeminiFallbackModel(storyModel, options);

  if (!fallbackModel || fallbackModel.modelName === storyModel.modelName) {
    originalError.message = `${originalError.message} The selected Gemini model is not available for this API key. Open Settings and choose Google Gemini 2.5 Flash, or use Google's models.list endpoint to see models that support generateContent.`;
    throw originalError;
  }

  const fallbackResponse = await fetchGoogleGeminiGenerateContent(
    fallbackModel,
    prompt,
    options,
    temperature,
  );

  if (!fallbackResponse.ok) {
    const fallbackError = await createProviderError(providerName, fallbackResponse);
    fallbackError.message = `${originalError.message} Automatic fallback to ${fallbackModel.modelName} also failed: ${fallbackError.message}`;
    throw fallbackError;
  }

  return fallbackResponse.json();
}

async function fetchGoogleGeminiGenerateContent(storyModel, prompt, options = {}, temperature = 0.7) {
  return providerFetch(storyModel.endpoint, {
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
        temperature,
        responseMimeType: 'application/json',
      },
    }),
  });
}

async function resolveGoogleGeminiFallbackModel(storyModel, options = {}) {
  const availableModels = await listGoogleGeminiGenerateContentModels(storyModel, options);
  const normalizedAvailable = availableModels.map((modelName) => normalizeGeminiModelName(modelName));
  const preferredModels = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ];
  const fallbackName = preferredModels.find((modelName) => normalizedAvailable.includes(modelName))
    || normalizedAvailable[0]
    || (storyModel.modelName === 'gemini-2.5-flash' ? '' : 'gemini-2.5-flash');

  if (!fallbackName) {
    return null;
  }

  return {
    ...storyModel,
    label: `${storyModel.label || 'Gemini'} fallback (${fallbackName})`,
    modelName: fallbackName,
    endpoint: buildGoogleGeminiGenerateContentEndpoint(storyModel.endpoint, fallbackName),
  };
}

async function listGoogleGeminiGenerateContentModels(storyModel, options = {}) {
  try {
    const listUrl = new URL(buildGoogleGeminiListModelsEndpoint(storyModel.endpoint));
    listUrl.searchParams.set('key', storyModel.apiKey);

    const response = await providerFetch(listUrl, {
      method: 'GET',
      signal: options.signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();

    return (payload?.models || [])
      .filter((model) => {
        const supportedMethods = model.supportedGenerationMethods
          || model.supportedActions
          || model.supported_actions
          || [];

        return supportedMethods.includes('generateContent');
      })
      .map((model) => model.name || model.baseModelId)
      .filter(Boolean);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    return [];
  }
}

function shouldTryGeminiModelFallback(error) {
  const message = String(error?.message || '');

  return Number(error?.providerStatus) === 404
    && /not found|not supported|generateContent|ModelService\.ListModels|models\.list/i.test(message);
}

function buildGoogleGeminiListModelsEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    const version = url.pathname.match(/^\/([^/]+)\//)?.[1] || 'v1beta';

    return `${url.origin}/${version}/models`;
  } catch {
    return 'https://generativelanguage.googleapis.com/v1beta/models';
  }
}

function buildGoogleGeminiGenerateContentEndpoint(endpoint, modelName) {
  try {
    const url = new URL(endpoint);
    const version = url.pathname.match(/^\/([^/]+)\//)?.[1] || 'v1beta';

    return `${url.origin}/${version}/models/${normalizeGeminiModelName(modelName)}:generateContent`;
  } catch {
    return `https://generativelanguage.googleapis.com/v1beta/models/${normalizeGeminiModelName(modelName)}:generateContent`;
  }
}

function normalizeGeminiModelName(modelName) {
  return String(modelName || '').replace(/^models\//, '');
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
  const parsed = unwrapStoryEnvelope(parseJsonObjectContent(content));

  if (!Array.isArray(parsed.pages)) {
    throw new Error('The story model JSON did not include pages.');
  }

  return parsed;
}

// Some local/"thinking" model packagings carry a baked-in system prompt that wraps
// the answer in an envelope like { "content": {...} } or { "content": "{...}" }.
// Peel those off until we reach the object that actually has the story shape.
function unwrapStoryEnvelope(value, depth = 0) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || depth > 4) {
    return value;
  }

  if (Array.isArray(value.pages)) {
    return value;
  }

  for (const key of ['content', 'response', 'output', 'result', 'json', 'data', 'story']) {
    if (value[key] == null) {
      continue;
    }

    let inner = value[key];

    if (typeof inner === 'string') {
      try {
        inner = parseJsonObjectContent(inner);
      } catch {
        continue;
      }
    }

    const unwrapped = unwrapStoryEnvelope(inner, depth + 1);

    if (unwrapped && typeof unwrapped === 'object' && Array.isArray(unwrapped.pages)) {
      return unwrapped;
    }
  }

  return value;
}

function parseJsonObjectContent(content) {
  let cleaned = String(content || '')
    // Reasoning/"thinking" models (e.g. DictaLM-3.0-Thinking) emit <think>...</think>
    // blocks that are not valid JSON. Strip them before parsing.
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  // If the model wrapped the JSON in prose (or an unclosed think block remains),
  // fall back to the outermost {...} object.
  if (cleaned && cleaned[0] !== '{') {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }

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
