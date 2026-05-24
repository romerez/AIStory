export function normalizeUsageStats(value) {
  const list = Array.isArray(value) ? value : [];

  return list
    .map((item) => ({
      id: String(item.id || ''),
      kind: item.kind === 'image' ? 'image' : 'story',
      provider: String(item.provider || ''),
      modelId: String(item.modelId || ''),
      modelLabel: String(item.modelLabel || ''),
      modelName: String(item.modelName || ''),
      keyLabel: String(item.keyLabel || 'No key'),
      keyId: String(item.keyId || 'no-key'),
      storyRuns: Number(item.storyRuns || 0),
      imageRuns: Number(item.imageRuns || 0),
      generatedPages: Number(item.generatedPages || 0),
      regeneratedImages: Number(item.regeneratedImages || 0),
      estimatedInputTokens: Number(item.estimatedInputTokens || 0),
      estimatedOutputTokens: Number(item.estimatedOutputTokens || 0),
      lastUsedAt: item.lastUsedAt || '',
    }))
    .filter((item) => item.id);
}

export function recordBookGeneration(currentStats, request, book, modelSettings) {
  const storyModel = findProfile(
    modelSettings.storyModels,
    request.storyModelId || modelSettings.activeStoryModelId,
  ) || modelSettings.storyModels[0];
  const imageModel = findProfile(
    modelSettings.imageModels,
    request.imageModelId || modelSettings.activeImageModelId,
  ) || modelSettings.imageModels[0];
  const pages = Array.isArray(book?.pages) ? book.pages : [];
  const generatedPages = pages.length || Number(request.pageCount || 0);
  const storyInputText = [
    request.prompt,
    request.language,
    request.childAge,
    request.theme,
    request.artStyle,
    JSON.stringify(request.characters || []),
  ].join('\n');
  const storyOutputText = [
    book?.storyTitle || '',
    book?.storySummary || '',
    ...pages.map((page) => page.text || ''),
  ].join('\n');

  let nextStats = upsertUsage(currentStats, storyModel, 'story', {
    storyRuns: 1,
    generatedPages,
    estimatedInputTokens: estimateTokens(storyInputText) + 180,
    estimatedOutputTokens: estimateTokens(storyOutputText),
  });

  nextStats = upsertUsage(nextStats, imageModel, 'image', {
    imageRuns: generatedPages,
    generatedPages,
  });

  return nextStats;
}

export function recordImageRegeneration(currentStats, book, modelSettings) {
  const imageModel = modelSettings.imageModels.find((profile) => (
    getProfileLabel(profile) === book?.imageModel
  )) || findProfile(modelSettings.imageModels, modelSettings.activeImageModelId) || modelSettings.imageModels[0];

  return upsertUsage(currentStats, imageModel, 'image', {
    imageRuns: 1,
    regeneratedImages: 1,
  });
}

export function getProfileUsageId(profile, kind) {
  return `${kind}:${profile?.id || 'unknown'}:${getProfileKeyId(profile)}`;
}

export function getProfileKeyLabel(profile) {
  if (!profile || profile.type === 'local') {
    return 'Local';
  }

  if (!profile.apiKey) {
    return 'No key';
  }

  const cleanKey = String(profile.apiKey).trim();
  const tail = cleanKey.slice(-4);

  return `Key ...${tail}`;
}

export function getProfileKeyId(profile) {
  if (!profile || profile.type === 'local') {
    return 'local';
  }

  if (!profile.apiKey) {
    return 'no-key';
  }

  const cleanKey = String(profile.apiKey).trim();

  return `${cleanKey.length}-${cleanKey.slice(-4)}`;
}

export function estimateTokens(text) {
  const cleanText = String(text || '').trim();

  if (!cleanText) {
    return 0;
  }

  return Math.ceil(cleanText.length / 4);
}

function upsertUsage(currentStats, profile, kind, increments) {
  if (!profile) {
    return normalizeUsageStats(currentStats);
  }

  const stats = normalizeUsageStats(currentStats);
  const id = getProfileUsageId(profile, kind);
  const existing = stats.find((item) => item.id === id);
  const base = existing || {
    id,
    kind,
    provider: profile.provider || '',
    modelId: profile.id || '',
    modelLabel: getProfileLabel(profile),
    modelName: profile.modelName || '',
    keyLabel: getProfileKeyLabel(profile),
    keyId: getProfileKeyId(profile),
    storyRuns: 0,
    imageRuns: 0,
    generatedPages: 0,
    regeneratedImages: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    lastUsedAt: '',
  };
  const nextEntry = {
    ...base,
    provider: profile.provider || base.provider,
    modelLabel: getProfileLabel(profile),
    modelName: profile.modelName || base.modelName,
    keyLabel: getProfileKeyLabel(profile),
    keyId: getProfileKeyId(profile),
    storyRuns: base.storyRuns + Number(increments.storyRuns || 0),
    imageRuns: base.imageRuns + Number(increments.imageRuns || 0),
    generatedPages: base.generatedPages + Number(increments.generatedPages || 0),
    regeneratedImages: base.regeneratedImages + Number(increments.regeneratedImages || 0),
    estimatedInputTokens: base.estimatedInputTokens + Number(increments.estimatedInputTokens || 0),
    estimatedOutputTokens: base.estimatedOutputTokens + Number(increments.estimatedOutputTokens || 0),
    lastUsedAt: new Date().toISOString(),
  };

  if (existing) {
    return stats.map((item) => (item.id === id ? nextEntry : item));
  }

  return [nextEntry, ...stats];
}

function findProfile(profiles, id) {
  return profiles.find((profile) => profile.id === id);
}

function getProfileLabel(profile) {
  return profile?.label || profile?.modelName || 'Untitled model';
}
