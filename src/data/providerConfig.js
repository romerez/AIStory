export const defaultModelSettings = {
  activeStoryModelId: 'local-demo-story',
  activeImageModelId: 'local-demo-image',
  storyModels: [
    {
      id: 'local-demo-story',
      label: 'Local demo writer',
      provider: 'Local demo',
      icon: 'L',
      modelName: 'local-template-writer',
      endpoint: '',
      apiKey: '',
      type: 'local',
      locked: true,
    },
    {
      id: 'openai-compatible-story',
      label: 'OpenAI GPT-5.5',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-5.5',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      apiKey: '',
      type: 'openai-compatible',
      locked: true,
    },
    {
      id: 'anthropic-claude-opus-4-7',
      label: 'Anthropic Claude Opus 4.7',
      provider: 'Anthropic',
      icon: 'A',
      modelName: 'claude-opus-4-7',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: '',
      type: 'anthropic-messages',
      locked: true,
    },
    {
      id: 'google-gemini-3-pro-preview',
      label: 'Google Gemini 3 Pro Preview',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-3-pro-preview',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent',
      apiKey: '',
      type: 'google-gemini',
      locked: true,
    },
    {
      id: 'xai-grok-4-3',
      label: 'xAI Grok 4.3',
      provider: 'xAI',
      icon: 'xAI',
      modelName: 'grok-4.3',
      endpoint: 'https://api.x.ai/v1/chat/completions',
      apiKey: '',
      type: 'openai-compatible',
      locked: true,
    },
  ],
  imageModels: [
    {
      id: 'local-demo-image',
      label: 'Local demo illustrator',
      provider: 'Local demo',
      icon: 'L',
      modelName: 'local-svg-illustrator',
      endpoint: '',
      apiKey: '',
      type: 'local',
      locked: true,
    },
    {
      id: 'openai-gpt-image-2',
      label: 'OpenAI GPT Image 2',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-image-2',
      endpoint: 'https://api.openai.com/v1/images/generations',
      apiKey: '',
      type: 'openai-image',
      locked: true,
    },
    {
      id: 'openai-gpt-image-1-5',
      label: 'OpenAI GPT Image 1.5',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-image-1.5',
      endpoint: 'https://api.openai.com/v1/images/generations',
      apiKey: '',
      type: 'openai-image',
      locked: true,
    },
    {
      id: 'google-gemini-3-1-flash-image-preview',
      label: 'Google Gemini 3.1 Flash Image Preview',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-3.1-flash-image-preview',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
      apiKey: '',
      type: 'google-gemini-image',
      locked: true,
    },
    {
      id: 'google-gemini-2-5-flash-image',
      label: 'Google Gemini 2.5 Flash Image',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-2.5-flash-image',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      apiKey: '',
      type: 'google-gemini-image',
      locked: true,
    },
    {
      id: 'google-gemini-3-pro-image-preview',
      label: 'Google Gemini 3 Pro Image Preview',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-3-pro-image-preview',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
      apiKey: '',
      type: 'google-gemini-image',
      locked: true,
    },
    {
      id: 'multiplay-image',
      label: 'Multiplay image',
      provider: 'Multiplay',
      icon: 'M',
      modelName: 'multiplay-image-standard',
      endpoint: '',
      apiKey: '',
      type: 'custom-image',
      locked: false,
    },
  ],
};

export function createEmptyModelProfile(kind) {
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: kind === 'story' ? 'Custom story model' : 'Custom image model',
    provider: 'Custom',
    icon: '+',
    modelName: '',
    endpoint: '',
    apiKey: '',
    type: kind === 'story' ? 'openai-compatible' : 'custom-image',
    locked: false,
  };
}

export function mergeModelSettings(savedSettings) {
  const saved = savedSettings && typeof savedSettings === 'object' ? savedSettings : {};
  const storyModels = mergeProfiles(defaultModelSettings.storyModels, saved.storyModels);
  const imageModels = mergeProfiles(defaultModelSettings.imageModels, saved.imageModels);

  return {
    activeStoryModelId: getActiveProfileId(
      saved.activeStoryModelId,
      storyModels,
      defaultModelSettings.activeStoryModelId,
    ),
    activeImageModelId: getActiveProfileId(
      saved.activeImageModelId,
      imageModels,
      defaultModelSettings.activeImageModelId,
    ),
    storyModels,
    imageModels,
  };
}

function mergeProfiles(defaultProfiles, savedProfiles) {
  const savedList = Array.isArray(savedProfiles) ? savedProfiles : [];
  const savedById = new Map(savedList.map((profile) => [profile.id, profile]));
  const mergedDefaults = defaultProfiles.map((profile) => {
    const savedProfile = savedById.get(profile.id);

    if (profile.locked) {
      return {
        ...profile,
        apiKey: savedProfile?.apiKey || profile.apiKey,
      };
    }

    return {
      ...profile,
      ...savedProfile,
      icon: savedProfile?.icon || profile.icon,
      locked: profile.locked,
      type: profile.type,
    };
  });
  const customProfiles = savedList
    .filter((profile) => !defaultProfiles.some((item) => item.id === profile.id))
    .map((profile) => ({
      ...profile,
      icon: profile.icon || '+',
      locked: false,
    }));

  return [...mergedDefaults, ...customProfiles];
}

function getActiveProfileId(savedActiveId, profiles, fallbackId) {
  if (profiles.some((profile) => profile.id === savedActiveId)) {
    return savedActiveId;
  }

  if (profiles.some((profile) => profile.id === fallbackId)) {
    return fallbackId;
  }

  return profiles[0]?.id || '';
}
