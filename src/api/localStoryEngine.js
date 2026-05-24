const themeProfiles = {
  bedtime: {
    setting: 'a cozy bedroom, a quiet window, and a moonlit neighborhood',
    settingShort: 'cozy room',
    guide: 'the moon lamp',
    closing: 'tomorrow would feel brighter after a good rest',
    object: 'Moonlit Clock',
    mood: 'soft and sleepy',
    palette: ['#f8d98b', '#9bb8e8', '#c9a8f2', '#fff7df'],
  },
  adventure: {
    setting: 'a friendly garden path, rolling hills, and a tiny wooden bridge',
    settingShort: 'garden path',
    guide: 'a folded map',
    closing: 'brave steps are easier when taken one at a time',
    object: 'Little Map',
    mood: 'bright and full of possibility',
    palette: ['#95d5b2', '#ffd166', '#6ec6ca', '#fff3b0'],
  },
  kindness: {
    setting: 'a sunny classroom corner, a shared table, and a basket of craft paper',
    settingShort: 'sunny corner',
    guide: 'a paper heart',
    closing: 'kindness grows whenever it is shared',
    object: 'Paper Heart',
    mood: 'warm and welcoming',
    palette: ['#ffb3ba', '#bae1ff', '#baffc9', '#fff2b2'],
  },
  curiosity: {
    setting: 'a small backyard observatory, jars of buttons, and a sky full of questions',
    settingShort: 'backyard observatory',
    guide: 'a little notebook',
    closing: 'questions can become lanterns when we follow them carefully',
    object: 'Question Lantern',
    mood: 'sparkly and thoughtful',
    palette: ['#80ced7', '#f6d365', '#fda085', '#f7f7ff'],
  },
  courage: {
    setting: 'a friendly stage, velvet curtains, and a row of smiling chairs',
    settingShort: 'little stage',
    guide: 'a ribbon badge',
    closing: 'being brave means trying while your heart is still thumping',
    object: 'Brave Badge',
    mood: 'gentle and encouraging',
    palette: ['#f4a261', '#2a9d8f', '#e9c46a', '#fff8e8'],
  },
  family: {
    setting: 'a busy kitchen, a soft rug, and a table set for everyone',
    settingShort: 'family kitchen',
    guide: 'a tiny recipe card',
    closing: 'home feels best when everyone helps in their own small way',
    object: 'Tiny Recipe',
    mood: 'busy and loving',
    palette: ['#ffcad4', '#bde0fe', '#caffbf', '#fdffb6'],
  },
};

const styleProfiles = {
  'soft watercolor': {
    description: 'soft watercolor, gentle paper texture, rounded shapes, airy brush edges',
    marker: 'star pajamas',
  },
  'cozy storybook': {
    description: 'classic cozy storybook illustration, warm light, tidy details, soft outlines',
    marker: 'striped scarf',
  },
  'bright cartoon': {
    description: 'bright cartoon illustration, cheerful shapes, expressive faces, clean colors',
    marker: 'yellow backpack',
  },
  'paper cutout': {
    description: 'layered paper cutout illustration, simple shapes, visible paper shadows',
    marker: 'patched pocket',
  },
  'crayon doodle': {
    description: 'crayon doodle illustration, childlike texture, playful lines, soft color fill',
    marker: 'rainbow socks',
  },
};

const defaultArtStyleDirection = 'warm child-friendly storybook illustration';

const defaultNames = ['Milo', 'Luna', 'Nori', 'Ari', 'Sam', 'Tali', 'Noa', 'Pip'];

const pageActions = [
  'paused to listen',
  'looked more closely',
  'tried a tiny experiment',
  'asked a gentle question',
  'noticed something helpful',
  'shared the discovery',
  'took one careful step',
  'smiled at the small change',
];

const localizedThemeText = {
  English: {
    bedtime: {
      settingShort: 'cozy room',
      closing: 'tomorrow would feel brighter after a good rest',
      object: 'Moonlit Clock',
      mood: 'soft and sleepy',
      guide: 'the moon lamp',
    },
    adventure: {
      settingShort: 'garden path',
      closing: 'brave steps are easier when taken one at a time',
      object: 'Little Map',
      mood: 'bright and full of possibility',
      guide: 'a folded map',
    },
    kindness: {
      settingShort: 'sunny corner',
      closing: 'kindness grows whenever it is shared',
      object: 'Paper Heart',
      mood: 'warm and welcoming',
      guide: 'a paper heart',
    },
    curiosity: {
      settingShort: 'backyard observatory',
      closing: 'questions can become lanterns when we follow them carefully',
      object: 'Question Lantern',
      mood: 'sparkly and thoughtful',
      guide: 'a little notebook',
    },
    courage: {
      settingShort: 'little stage',
      closing: 'being brave means trying while your heart is still thumping',
      object: 'Brave Badge',
      mood: 'gentle and encouraging',
      guide: 'a ribbon badge',
    },
    family: {
      settingShort: 'family kitchen',
      closing: 'home feels best when everyone helps in their own small way',
      object: 'Tiny Recipe',
      mood: 'busy and loving',
      guide: 'a tiny recipe card',
    },
  },
  Hebrew: {
    bedtime: {
      settingShort: 'חדר נעים',
      closing: 'מחר ירגיש בהיר יותר אחרי מנוחה טובה',
      object: 'שעון הירח',
      mood: 'רך ומנומנם',
      guide: 'מנורת הירח',
    },
    adventure: {
      settingShort: 'שביל בגינה',
      closing: 'צעדים אמיצים קלים יותר כשעושים אותם אחד-אחד',
      object: 'המפה הקטנה',
      mood: 'בהיר ומלא אפשרויות',
      guide: 'מפה מקופלת',
    },
    kindness: {
      settingShort: 'פינת כיתה שטופת שמש',
      closing: 'טוב לב גדל בכל פעם שחולקים אותו',
      object: 'לב הנייר',
      mood: 'חם ומזמין',
      guide: 'לב מנייר',
    },
    curiosity: {
      settingShort: 'מצפה קטן בחצר',
      closing: 'שאלות יכולות להפוך לפנסים כשעוקבים אחריהן בעדינות',
      object: 'פנס השאלות',
      mood: 'נוצץ וחושב',
      guide: 'מחברת קטנה',
    },
    courage: {
      settingShort: 'במה קטנה',
      closing: 'אומץ הוא לנסות גם כשהלב עדיין דופק',
      object: 'סיכת האומץ',
      mood: 'עדין ומעודד',
      guide: 'סרט קטן',
    },
    family: {
      settingShort: 'מטבח משפחתי',
      closing: 'הבית נעים יותר כשכל אחד עוזר בדרכו הקטנה',
      object: 'המתכון הקטן',
      mood: 'עסוק ואוהב',
      guide: 'כרטיס מתכון קטן',
    },
  },
  Spanish: {
    bedtime: {
      settingShort: 'habitación acogedora',
      closing: 'mañana se sentiría más brillante después de descansar bien',
      object: 'Reloj de Luna',
      mood: 'suave y soñoliento',
      guide: 'la lámpara de luna',
    },
    adventure: {
      settingShort: 'sendero del jardín',
      closing: 'los pasos valientes son más fáciles cuando se dan uno por uno',
      object: 'Mapita',
      mood: 'brillante y lleno de posibilidades',
      guide: 'un mapa doblado',
    },
    kindness: {
      settingShort: 'rincón soleado',
      closing: 'la amabilidad crece cada vez que se comparte',
      object: 'Corazón de Papel',
      mood: 'cálido y acogedor',
      guide: 'un corazón de papel',
    },
    curiosity: {
      settingShort: 'observatorio del patio',
      closing: 'las preguntas pueden volverse faroles cuando las seguimos con cuidado',
      object: 'Farol de Preguntas',
      mood: 'chispeante y pensativo',
      guide: 'un cuaderno pequeño',
    },
    courage: {
      settingShort: 'escenario pequeño',
      closing: 'ser valiente es intentarlo aunque el corazón siga latiendo fuerte',
      object: 'Insignia Valiente',
      mood: 'suave y alentador',
      guide: 'una cinta',
    },
    family: {
      settingShort: 'cocina familiar',
      closing: 'el hogar se siente mejor cuando todos ayudan a su manera',
      object: 'Receta Pequeña',
      mood: 'activo y cariñoso',
      guide: 'una tarjeta de receta',
    },
  },
};

const languageProfiles = {
  English: {
    id: 'English',
    title: ({ mainCharacterName, supportingNames, titleNoun }) => (
      supportingNames.length
        ? `${mainCharacterName}, Friends, and the ${titleNoun}`
        : `${mainCharacterName} and the ${titleNoun}`
    ),
    summary: ({ characters, mainCharacterName, lesson, theme, localizedTheme }) => (
      characters.length === 1
        ? `${mainCharacterName} learns about ${lesson} through a ${localizedTheme.mood} ${theme} story.`
        : `${joinNames(characters.map((character) => character.name))} learn about ${lesson} through a ${localizedTheme.mood} ${theme} story.`
    ),
  },
  Hebrew: {
    id: 'Hebrew',
    title: ({ mainCharacterName, supportingNames, titleNoun }) => (
      supportingNames.length
        ? `${mainCharacterName}, החברים ו${titleNoun}`
        : `${mainCharacterName} ו${titleNoun}`
    ),
    summary: ({ characters, mainCharacterName, lesson, theme, localizedTheme }) => (
      characters.length === 1
        ? `${mainCharacterName} לומד/ת על ${lesson} בסיפור ${theme} ${localizedTheme.mood}.`
        : `${joinNamesHebrew(characters.map((character) => character.name))} לומדים על ${lesson} בסיפור ${theme} ${localizedTheme.mood}.`
    ),
  },
  Spanish: {
    id: 'Spanish',
    title: ({ mainCharacterName, supportingNames, titleNoun }) => (
      supportingNames.length
        ? `${mainCharacterName}, sus amigos y el ${titleNoun}`
        : `${mainCharacterName} y el ${titleNoun}`
    ),
    summary: ({ characters, mainCharacterName, lesson, theme, localizedTheme }) => (
      characters.length === 1
        ? `${mainCharacterName} aprende sobre ${lesson} en un cuento de ${theme} ${localizedTheme.mood}.`
        : `${joinNamesSpanish(characters.map((character) => character.name))} aprenden sobre ${lesson} en un cuento de ${theme} ${localizedTheme.mood}.`
    ),
  },
};

export async function generateLocalBook(request) {
  await new Promise((resolve) => setTimeout(resolve, 450));

  const prompt = normalizePrompt(request.prompt);
  const theme = request.theme || 'bedtime';
  const artStyle = cleanText(request.artStyle, 140) || defaultArtStyleDirection;
  const language = request.language || 'English';
  const languageProfile = getLanguageProfile(language);
  const themeProfile = themeProfiles[theme] || themeProfiles.bedtime;
  const localizedTheme = getLocalizedTheme(theme, themeProfile, languageProfile);
  const styleProfile = getStyleProfile(request.artStyle);
  const pageCount = clamp(Number(request.pageCount) || 6, 2, 12);
  const characters = normalizeCharacters(request.characters, {
    prompt,
    styleProfile,
  });
  const mainCharacter = characters[0];
  const mainCharacterName = mainCharacter.name;
  const supportingNames = characters.slice(1).map((character) => character.name);
  const lesson = toLessonPhrase(prompt);
  const titleNoun = localizedTheme.object;
  const storyTitle = languageProfile.title({
    mainCharacterName,
    supportingNames,
    titleNoun,
  });
  const storySummary = languageProfile.summary({
    characters,
    mainCharacterName,
    lesson,
    theme,
    localizedTheme,
  });

  const visualBible = {
    mainCharacter: `${mainCharacter.name}, ${mainCharacter.description}`,
    characters,
    setting: themeProfile.setting,
    palette: themeProfile.palette,
    repeatedVisualDetails: [
      styleProfile.marker,
      themeProfile.guide,
      `${joinNames(characters.map((character) => character.name))} stay visually consistent`,
      'rounded child-friendly shapes',
      'warm, reassuring expressions',
    ],
    safetyNotes: [
      'age-appropriate language',
      'gentle conflict',
      'no frightening imagery',
      'no text inside illustrations',
    ],
  };

  const pages = Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const text = buildPageText({
      pageNumber,
      pageCount,
      name: mainCharacterName,
      supportingNames,
      lesson,
      theme,
      themeProfile,
      localizedTheme,
      languageProfile,
      childAge: request.childAge || '4-6',
    });
    const illustrationPrompt = buildIllustrationPrompt({
      pageNumber,
      text,
      artStyle,
      visualBible,
      themeProfile,
      referenceImageUrl: request.referenceImageUrl,
    });

    return {
      pageNumber,
      text,
      illustrationPrompt,
      imageUrl: buildSvgIllustration({
        pageNumber,
        pageCount,
        artStyle,
        theme,
        themeProfile,
        styleProfile,
        characters,
        variation: 0,
      }),
      imageStatus: 'complete',
    };
  });

  return {
    id: `local_${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: 'local-demo',
    storyModel: request.storyModelLabel || 'Local demo writer',
    imageModel: request.imageModelLabel || 'Local demo illustrator',
    storyTitle,
    storySummary,
    targetAge: request.childAge || '4-6',
    language,
    theme,
    artStyle,
    visualBible,
    pages,
  };
}

export function createBookFromStoryDraft(request, draft, source = 'api') {
  const prompt = normalizePrompt(request.prompt);
  const theme = request.theme || 'bedtime';
  const artStyle = cleanText(request.artStyle, 140) || defaultArtStyleDirection;
  const language = request.language || 'English';
  const languageProfile = getLanguageProfile(language);
  const themeProfile = themeProfiles[theme] || themeProfiles.bedtime;
  const localizedTheme = getLocalizedTheme(theme, themeProfile, languageProfile);
  const styleProfile = getStyleProfile(request.artStyle);
  const pageCount = clamp(Number(request.pageCount) || 6, 2, 12);
  const characters = normalizeCharacters(request.characters, {
    prompt,
    styleProfile,
  });
  const mainCharacter = characters[0];
  const mainCharacterName = mainCharacter.name;
  const supportingNames = characters.slice(1).map((character) => character.name);
  const lesson = toLessonPhrase(prompt);
  const titleNoun = localizedTheme.object;
  const storyTitle = cleanText(draft?.storyTitle, 90)
    || languageProfile.title({ mainCharacterName, supportingNames, titleNoun });
  const storySummary = cleanText(draft?.storySummary, 220)
    || languageProfile.summary({
      characters,
      mainCharacterName,
      lesson,
      theme,
      localizedTheme,
    });

  const visualBible = {
    mainCharacter: `${mainCharacter.name}, ${mainCharacter.description}`,
    characters,
    setting: themeProfile.setting,
    palette: themeProfile.palette,
    repeatedVisualDetails: [
      styleProfile.marker,
      themeProfile.guide,
      `${joinNames(characters.map((character) => character.name))} stay visually consistent`,
      'rounded child-friendly shapes',
      'warm, reassuring expressions',
    ],
    safetyNotes: [
      'age-appropriate language',
      'gentle conflict',
      'no frightening imagery',
      'no text inside illustrations',
    ],
  };

  const draftPages = Array.isArray(draft?.pages) ? draft.pages : [];
  const pages = Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    const draftPage = draftPages.find((page) => Number(page.pageNumber) === pageNumber) || draftPages[index];
    const text = cleanText(draftPage?.text, 850) || buildPageText({
      pageNumber,
      pageCount,
      name: mainCharacterName,
      supportingNames,
      lesson,
      theme,
      themeProfile,
      localizedTheme,
      languageProfile,
      childAge: request.childAge || '4-6',
    });
    const illustrationPrompt = buildIllustrationPrompt({
      pageNumber,
      text,
      artStyle,
      visualBible,
      themeProfile,
      referenceImageUrl: request.referenceImageUrl,
    });

    return {
      pageNumber,
      text,
      illustrationPrompt,
      imageUrl: buildSvgIllustration({
        pageNumber,
        pageCount,
        artStyle,
        theme,
        themeProfile,
        styleProfile,
        characters,
        variation: 0,
      }),
      imageStatus: 'complete',
    };
  });

  return {
    id: `${source}_${Date.now()}`,
    createdAt: new Date().toISOString(),
    source,
    storyModel: request.storyModelLabel || 'Story model',
    imageModel: request.imageModelLabel || 'Local demo illustrator',
    storyTitle,
    storySummary,
    targetAge: request.childAge || '4-6',
    language,
    theme,
    artStyle,
    visualBible,
    pages,
  };
}

export function regenerateLocalPageImage(book, pageNumber) {
  const themeProfile = themeProfiles[book.theme] || themeProfiles.bedtime;
  const styleProfile = getStyleProfile(book.artStyle);
  const characters = book.visualBible?.characters?.length
    ? book.visualBible.characters
    : normalizeCharacters([], { prompt: book.storySummary, styleProfile });
  const variation = Math.floor(Date.now() / 1000) % 997;

  return {
    ...book,
    pages: book.pages.map((page) => {
      if (page.pageNumber !== pageNumber) {
        return page;
      }

      return {
        ...page,
        imageUrl: buildSvgIllustration({
          pageNumber,
          pageCount: book.pages.length,
          themeProfile,
          styleProfile,
          characters,
          variation,
        }),
        imageStatus: 'complete',
      };
    }),
  };
}

function normalizeCharacters(rawCharacters, { prompt, styleProfile }) {
  const supplied = Array.isArray(rawCharacters) ? rawCharacters.slice(0, 5) : [];
  const fallbackName = pickName(prompt);
  const normalized = supplied
    .map((character, index) => {
      const name = cleanName(character?.name) || (index === 0 ? fallbackName : '');
      if (!name) {
        return null;
      }

      const description = cleanText(character?.description, 120)
        || `a curious child wearing ${styleProfile.marker}`;
      const role = cleanText(character?.role, 42) || (index === 0 ? 'main character' : 'supporting character');
      const referenceImageUrl = cleanUrl(character?.referenceImageUrl);
      const hasReferenceImage = Boolean(referenceImageUrl || character?.referenceImageFile);

      return {
        name,
        description,
        role,
        referenceImageUrl,
        referenceImageName: character?.referenceImageFile?.name || '',
        hasReferenceImage,
      };
    })
    .filter(Boolean);

  if (normalized.length > 0) {
    return normalized;
  }

  return [
    {
      name: fallbackName,
      description: `a curious child wearing ${styleProfile.marker}`,
      role: 'main character',
      referenceImageUrl: null,
      referenceImageName: '',
      hasReferenceImage: false,
    },
  ];
}

function normalizePrompt(prompt) {
  return String(prompt || '')
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim();
}

function cleanName(name) {
  const cleaned = String(name || '')
    .replace(/[^\p{L}\p{M} '-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 24);
}

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url) {
    return null;
  }

  return /^https?:\/\//i.test(url) ? url : null;
}

function joinNames(names) {
  const cleanNames = names.filter(Boolean);

  if (cleanNames.length === 0) {
    return 'The characters';
  }

  if (cleanNames.length === 1) {
    return cleanNames[0];
  }

  if (cleanNames.length === 2) {
    return `${cleanNames[0]} and ${cleanNames[1]}`;
  }

  return `${cleanNames.slice(0, -1).join(', ')}, and ${cleanNames[cleanNames.length - 1]}`;
}

function joinNamesHebrew(names) {
  const cleanNames = names.filter(Boolean);

  if (cleanNames.length === 0) {
    return 'הדמויות';
  }

  if (cleanNames.length === 1) {
    return cleanNames[0];
  }

  if (cleanNames.length === 2) {
    return `${cleanNames[0]} ו${cleanNames[1]}`;
  }

  return `${cleanNames.slice(0, -1).join(', ')} ו${cleanNames[cleanNames.length - 1]}`;
}

function joinNamesSpanish(names) {
  const cleanNames = names.filter(Boolean);

  if (cleanNames.length === 0) {
    return 'Los personajes';
  }

  if (cleanNames.length === 1) {
    return cleanNames[0];
  }

  if (cleanNames.length === 2) {
    return `${cleanNames[0]} y ${cleanNames[1]}`;
  }

  return `${cleanNames.slice(0, -1).join(', ')} y ${cleanNames[cleanNames.length - 1]}`;
}

function getLanguageProfile(language) {
  return languageProfiles[language] || languageProfiles.English;
}

function getLocalizedTheme(theme, themeProfile, languageProfile) {
  return localizedThemeText[languageProfile.id]?.[theme] || localizedThemeText.English[theme] || {
    settingShort: themeProfile.settingShort,
    closing: themeProfile.closing,
    object: themeProfile.object,
    mood: themeProfile.mood,
    guide: themeProfile.guide,
  };
}

function getStyleProfile(artStyle) {
  const normalized = String(artStyle || '').trim().toLowerCase();

  return styleProfiles[normalized] || styleProfiles['soft watercolor'];
}

function pickName(seedText) {
  const seed = Array.from(seedText || 'aistory').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return defaultNames[seed % defaultNames.length];
}

function toLessonPhrase(prompt) {
  const cleaned = prompt
    .toLowerCase()
    .replace(/^write me a story about\s+/, '')
    .replace(/^tell me a story about\s+/, '')
    .replace(/^a story about\s+/, '')
    .replace(/^why it is important to\s+/, '')
    .replace(/^why is it important to\s+/, '')
    .replace(/^the importance of\s+/, '')
    .replace(/[?.!]+$/g, '')
    .trim();

  if (!cleaned) {
    return 'trying a kind little change';
  }

  if (cleaned.startsWith('go ')) {
    return `going ${cleaned.slice(3)}`;
  }

  if (cleaned.startsWith('be ')) {
    return `being ${cleaned.slice(3)}`;
  }

  return cleaned;
}

function buildPageText({
  pageNumber,
  pageCount,
  name,
  supportingNames,
  lesson,
  theme,
  localizedTheme,
  languageProfile,
  childAge,
}) {
  const younger = childAge === '3-4' || childAge === '4-6';
  const action = pageActions[(pageNumber - 1) % pageActions.length];
  const cast = supportingNames.length ? `${name}, ${joinNames(supportingNames)}` : name;
  const hebrewCast = supportingNames.length ? joinNamesHebrew([name, ...supportingNames]) : name;
  const spanishCast = supportingNames.length ? joinNamesSpanish([name, ...supportingNames]) : name;
  const companion = supportingNames[(pageNumber - 2) % Math.max(supportingNames.length, 1)];

  if (languageProfile.id === 'Hebrew') {
    if (pageNumber === 1) {
      return younger
        ? `${hebrewCast} שאל/ה שאלה קטנה על ${lesson}. ב${localizedTheme.settingShort}, הכול הרגיש ${localizedTheme.mood}, אבל ${name} עוד לא לגמרי הבין/ה.`
        : `${hebrewCast} חשב/ה על ${lesson}. ה${localizedTheme.settingShort} הרגיש ${localizedTheme.mood}, והשאלה הלכה איתו/ה כמו אבן קטנה בכיס.`;
    }

    if (pageNumber === pageCount) {
      return younger
        ? `בלילה ההוא, ${name} זכר/ה את התשובה בדרך חמה ופשוטה: ${localizedTheme.closing}. העולם הרגיש רגוע, והסיפור נגמר בנשימה שמחה.`
        : `בסוף, ${name} הבין/ה את השיעור בלי לחץ ובלי נזיפה: ${localizedTheme.closing}. זה הרגיש פחות כמו חוק ויותר כמו מתנה קטנה למחר.`;
    }

    if (pageNumber === pageCount - 1) {
      return younger
        ? `${name} ניסה/תה שינוי קטן${companion ? ` עם ${companion}` : ''}. זה לא היה מושלם, וזה היה בסדר. ${localizedTheme.guide} כאילו אמר/ה, "צעדים קטנים נחשבים."`
        : `${name} ניסה/תה שינוי קטן${companion ? ` עם ${companion}` : ''} ושם/ה לב שהיום נעשה קצת קל יותר. זה לא היה קסם, אבל זה הספיק כדי שהשיעור ירגיש אמיתי.`;
    }

    return younger
      ? `${name}${companion ? ` ו${companion}` : ''} עצר/ה ליד ${localizedTheme.guide}. רמז קטן הופיע והראה ש${lesson} יכול לעזור בדרך עדינה, שימושית ואמיתית.`
      : `${name}${companion ? ` ו${companion}` : ''} עצר/ה ליד ${localizedTheme.guide}. כל רמז הפך את הרעיון לברור יותר: ${lesson} לא נועד להיות מושלם, אלא לעזור לרגע הבא להיות טוב יותר.`;
  }

  if (languageProfile.id === 'Spanish') {
    if (pageNumber === 1) {
      return younger
        ? `${spanishCast} tenía una pequeña pregunta sobre ${lesson}. En la ${localizedTheme.settingShort}, todo se sentía ${localizedTheme.mood}, pero ${name} aún no terminaba de entender.`
        : `${spanishCast} había estado pensando en ${lesson}. La ${localizedTheme.settingShort} se sentía ${localizedTheme.mood}, y la pregunta lo acompañaba como una piedrita en el bolsillo.`;
    }

    if (pageNumber === pageCount) {
      return younger
        ? `Esa noche, ${name} recordó la respuesta de una manera cálida y sencilla: ${localizedTheme.closing}. El mundo se sintió tranquilo, y el cuento terminó con una respiración feliz.`
        : `Al final, ${name} entendió la lección sin sentirse presionado: ${localizedTheme.closing}. Se sintió menos como una regla y más como un pequeño regalo para mañana.`;
    }

    if (pageNumber === pageCount - 1) {
      return younger
        ? `${name} probó un pequeño cambio${companion ? ` con ${companion}` : ''}. No fue perfecto, y eso estaba bien. ${localizedTheme.guide} pareció brillar como diciendo: "Los pasos pequeños cuentan."`
        : `${name} probó un pequeño cambio${companion ? ` con ${companion}` : ''} y notó que el día se volvía un poco más fácil. No era magia, pero bastó para que la lección se sintiera real.`;
    }

    return younger
      ? `${name}${companion ? ` y ${companion}` : ''} se detuvo junto a ${localizedTheme.guide}. Apareció una pista pequeña que mostró que ${lesson} podía ayudar de una forma suave, útil y verdadera.`
      : `${name}${companion ? ` y ${companion}` : ''} se detuvo junto a ${localizedTheme.guide}. Cada pista aclaró la idea: ${lesson} no era ser perfecto, sino ayudar a que el próximo momento saliera mejor.`;
  }

  if (pageNumber === 1) {
    return younger
      ? `${cast} had a small question about ${lesson}. In the ${localizedTheme.settingShort}, everything felt ${localizedTheme.mood}, but ${name} was not quite ready to understand.`
      : `${cast} had been wondering about ${lesson}. The ${localizedTheme.settingShort} felt ${localizedTheme.mood}, and the question followed along like a pebble in a pocket.`;
  }

  if (pageNumber === pageCount) {
    return younger
      ? `That night, ${name} remembered the answer in a warm, simple way: ${localizedTheme.closing}. The ${theme} world felt calm, and the story ended with a happy breath.`
      : `By the end, ${name} understood the lesson without feeling pushed or scolded: ${localizedTheme.closing}. It felt less like a rule and more like a small gift for tomorrow.`;
  }

  if (pageNumber === pageCount - 1) {
    return younger
      ? `${name} tried one little change${companion ? ` with ${companion}` : ''}. It was not perfect, and that was okay. The ${localizedTheme.guide} seemed to shine as if to say, "Small steps count."`
      : `${name} tried one small change${companion ? ` with ${companion}` : ''} and noticed the day becoming easier around the edges. It was not magic, but it was enough to make the lesson feel real.`;
  }

  return younger
    ? `${name}${companion ? ` and ${companion}` : ''} ${action} beside ${localizedTheme.guide}. A tiny clue appeared, showing that ${lesson} could help in a way that felt gentle, useful, and true.`
    : `${name}${companion ? ` and ${companion}` : ''} ${action} beside ${localizedTheme.guide}. Each clue made the idea clearer: ${lesson} was not about being perfect, but about helping the next moment go better.`;
}

function buildIllustrationPrompt({
  pageNumber,
  text,
  artStyle,
  visualBible,
  themeProfile,
  referenceImageUrl,
}) {
  const styleInstruction = cleanText(artStyle, 140) || defaultArtStyleDirection;
  const referenceInstruction = referenceImageUrl
    ? `Use the reference image for visual tone only: ${referenceImageUrl}.`
    : 'No external reference image.';
  const characterInstructions = visualBible.characters.map((character) => {
    const reference = character.hasReferenceImage
      ? `Keep close to the supplied reference for ${character.name}.`
      : `Design ${character.name} from description only.`;

    return `${character.name}: ${character.description}; role: ${character.role}. ${reference}`;
  });

  return [
    `Page ${pageNumber} children's book illustration.`,
    visualBible.mainCharacter,
    `Cast: ${characterInstructions.join(' ')}`,
    `Setting: ${themeProfile.setting}.`,
    `Style: ${styleInstruction}.`,
    `Palette: ${visualBible.palette.join(', ')}.`,
    `Recurring details: ${visualBible.repeatedVisualDetails.join(', ')}.`,
    `Scene text to illustrate: ${text}`,
    referenceInstruction,
    'Gentle, child-safe, no scary imagery, no readable text inside the image.',
  ].join(' ');
}

function buildSvgIllustration({ pageNumber, pageCount, themeProfile, styleProfile, characters, variation = 0 }) {
  const [primary, secondary, accent, paper] = themeProfile.palette;
  const progress = pageNumber / pageCount;
  const wiggle = (variation % 17) - 8;
  const sunX = 120 + progress * 520 + wiggle;
  const hillOffset = progress * 60 + (variation % 9);
  const characterX = 300 + progress * 110;
  const characterY = 330 - Math.sin(progress * Math.PI) * 26 + (variation % 7);
  const textureOpacity = styleProfile.description.includes('crayon') ? 0.18 : 0.08;
  const characterGroups = characters
    .map((character, index) => buildCharacterSvg({
      index,
      count: characters.length,
      pageNumber: pageNumber + variation,
      character,
      x: characterX + (index - (characters.length - 1) / 2) * 92,
      y: characterY + (index % 2) * 18,
      primary,
      accent,
      paper,
    }))
    .join('');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560">
  <defs>
    <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="${paper}"/>
      <stop offset="58%" stop-color="${secondary}"/>
      <stop offset="100%" stop-color="${primary}"/>
    </linearGradient>
    <filter id="paperTexture">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${pageNumber + variation}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 ${textureOpacity}"/>
      </feComponentTransfer>
    </filter>
  </defs>
  <rect width="800" height="560" rx="0" fill="url(#sky)"/>
  <rect width="800" height="560" filter="url(#paperTexture)" opacity="0.65"/>
  <circle cx="${sunX}" cy="105" r="46" fill="${accent}" opacity="0.82"/>
  <circle cx="${sunX + 22}" cy="88" r="19" fill="${paper}" opacity="0.56"/>
  <path d="M0 ${392 - hillOffset} C170 ${320 - hillOffset}, 300 ${430 - hillOffset}, 470 ${356 - hillOffset} C610 ${296 - hillOffset}, 710 ${360 - hillOffset}, 800 ${314 - hillOffset} L800 560 L0 560 Z" fill="${primary}" opacity="0.78"/>
  <path d="M0 432 C150 386, 290 458, 440 410 C610 356, 690 420, 800 372 L800 560 L0 560 Z" fill="${paper}" opacity="0.74"/>
  <ellipse cx="404" cy="456" rx="205" ry="34" fill="#2f3047" opacity="0.12"/>
  ${characterGroups}
  <g opacity="0.52">
    <circle cx="92" cy="212" r="13" fill="${accent}"/>
    <circle cx="696" cy="182" r="9" fill="${paper}"/>
    <circle cx="642" cy="250" r="16" fill="${secondary}"/>
    <circle cx="190" cy="286" r="10" fill="${paper}"/>
  </g>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildCharacterSvg({ index, count, pageNumber, character, x, y, primary, accent, paper }) {
  const skinColors = ['#9a6a49', '#7e5236', '#c4875b', '#6f4a3a', '#b97855'];
  const hairColors = ['#4b2f2a', '#2f2a25', '#6a3d2d', '#36211d', '#7b5038'];
  const outfitColors = [accent, primary, '#f4a261', '#2a9d8f', '#8e7cc3'];
  const scale = Math.max(0.72, 1 - Math.max(count - 1, 0) * 0.07);
  const skin = skinColors[(index + pageNumber) % skinColors.length];
  const hair = hairColors[index % hairColors.length];
  const outfit = outfitColors[index % outfitColors.length];
  const marker = character.hasReferenceImage ? `<circle cx="34" cy="63" r="8" fill="${paper}" opacity="0.95"/>` : '';

  return `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <path d="M-55 98 C-38 34, 39 31, 60 98 Z" fill="${outfit}" opacity="0.95"/>
    <rect x="-42" y="34" width="84" height="92" rx="34" fill="#ffffff" opacity="0.9"/>
    <circle cx="0" cy="0" r="44" fill="${skin}"/>
    <path d="M-38 -5 C-21 -54, 31 -52, 43 -1 C24 -18, -16 -19, -38 -5 Z" fill="${hair}"/>
    <circle cx="-14" cy="4" r="4" fill="#30231d"/>
    <circle cx="16" cy="4" r="4" fill="#30231d"/>
    <path d="M-13 22 C-3 29, 9 29, 18 22" fill="none" stroke="#30231d" stroke-width="4" stroke-linecap="round"/>
    <path d="M-74 60 C-105 78, -98 112, -68 119" fill="none" stroke="${skin}" stroke-width="16" stroke-linecap="round"/>
    <path d="M74 60 C103 82, 93 114, 64 120" fill="none" stroke="${skin}" stroke-width="16" stroke-linecap="round"/>
    <path d="M-16 82 L0 56 L16 82 L-12 66 L12 66 Z" fill="${primary}" opacity="0.95"/>
    ${marker}
  </g>`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
