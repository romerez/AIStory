export const defaultModelSettings = {
  settingsVersion: 3,
  activeStoryModelId: 'google-gemini-2-5-flash',
  activeImageModelId: 'google-gemini-2-5-flash-image',
  providerKeys: {
    openai: '',
    anthropic: '',
    google: '',
    xai: '',
    multiplay: '',
    custom: '',
  },
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
      id: 'openai-gpt-5-5',
      label: 'OpenAI GPT-5.5',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-5.5',
      endpoint: 'https://api.openai.com/v1/responses',
      apiKey: '',
      type: 'openai-responses',
      locked: true,
    },
    {
      id: 'openai-gpt-5-4',
      label: 'OpenAI GPT-5.4',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-5.4',
      endpoint: 'https://api.openai.com/v1/responses',
      apiKey: '',
      type: 'openai-responses',
      locked: true,
    },
    {
      id: 'openai-gpt-5-4-mini',
      label: 'OpenAI GPT-5.4 mini',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-5.4-mini',
      endpoint: 'https://api.openai.com/v1/responses',
      apiKey: '',
      type: 'openai-responses',
      locked: true,
    },
    {
      id: 'openai-gpt-5-4-nano',
      label: 'OpenAI GPT-5.4 nano',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-5.4-nano',
      endpoint: 'https://api.openai.com/v1/responses',
      apiKey: '',
      type: 'openai-responses',
      locked: true,
    },
    {
      id: 'openai-compatible-story',
      label: 'OpenAI GPT-5.2',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-5.2',
      endpoint: 'https://api.openai.com/v1/responses',
      apiKey: '',
      type: 'openai-responses',
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
      id: 'anthropic-claude-sonnet-4-6',
      label: 'Anthropic Claude Sonnet 4.6',
      provider: 'Anthropic',
      icon: 'A',
      modelName: 'claude-sonnet-4-6',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: '',
      type: 'anthropic-messages',
      locked: true,
    },
    {
      id: 'anthropic-claude-haiku-4-5',
      label: 'Anthropic Claude Haiku 4.5',
      provider: 'Anthropic',
      icon: 'A',
      modelName: 'claude-haiku-4-5-20251001',
      endpoint: 'https://api.anthropic.com/v1/messages',
      apiKey: '',
      type: 'anthropic-messages',
      locked: true,
    },
    {
      id: 'google-gemini-3-5-flash',
      label: 'Google Gemini 3.5 Flash',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-3.5-flash',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      apiKey: '',
      type: 'google-gemini',
      locked: true,
    },
    {
      id: 'google-gemini-3-1-pro',
      label: 'Google Gemini 3.1 Pro',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-3.1-pro',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro:generateContent',
      apiKey: '',
      type: 'google-gemini',
      locked: true,
    },
    {
      id: 'google-gemini-3-1-flash-lite',
      label: 'Google Gemini 3.1 Flash-Lite',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-3.1-flash-lite',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
      apiKey: '',
      type: 'google-gemini',
      locked: true,
    },
    {
      id: 'google-gemini-2-5-pro',
      label: 'Google Gemini 2.5 Pro',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-2.5-pro',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
      apiKey: '',
      type: 'google-gemini',
      locked: true,
    },
    {
      id: 'google-gemini-2-5-flash',
      label: 'Google Gemini 2.5 Flash',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-2.5-flash',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      apiKey: '',
      type: 'google-gemini',
      locked: true,
    },
    {
      id: 'google-gemini-2-5-flash-lite',
      label: 'Google Gemini 2.5 Flash-Lite',
      provider: 'Google',
      icon: 'G',
      modelName: 'gemini-2.5-flash-lite',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
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
      id: 'openai-gpt-image-1',
      label: 'OpenAI GPT Image 1',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-image-1',
      endpoint: 'https://api.openai.com/v1/images/generations',
      apiKey: '',
      type: 'openai-image',
      locked: true,
    },
    {
      id: 'openai-gpt-image-1-mini',
      label: 'OpenAI GPT Image 1 mini',
      provider: 'OpenAI',
      icon: 'AI',
      modelName: 'gpt-image-1-mini',
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

export const providerKeyProfiles = [
  {
    id: 'openai',
    label: 'OpenAI',
    envLabel: 'OPENAI_API_KEY',
    icon: 'AI',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    envLabel: 'ANTHROPIC_API_KEY',
    icon: 'A',
  },
  {
    id: 'google',
    label: 'Google / Gemini',
    envLabel: 'GEMINI_API_KEY or GOOGLE_API_KEY',
    icon: 'G',
  },
  {
    id: 'xai',
    label: 'xAI',
    envLabel: 'XAI_API_KEY',
    icon: 'xAI',
  },
  {
    id: 'multiplay',
    label: 'Multiplay',
    envLabel: 'MULTIPLAY_API_KEY',
    icon: 'M',
  },
  {
    id: 'custom',
    label: 'Custom',
    envLabel: 'custom backend env',
    icon: '+',
  },
];

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
  const providerKeys = mergeProviderKeys(saved);
  const storyModels = mergeProfiles(defaultModelSettings.storyModels, saved.storyModels, providerKeys);
  const imageModels = mergeProfiles(defaultModelSettings.imageModels, saved.imageModels, providerKeys);

  return {
    settingsVersion: defaultModelSettings.settingsVersion,
    providerKeys,
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

export function getProviderKeyId(provider = '') {
  const normalized = String(provider || '').trim().toLowerCase();

  if (normalized.includes('openai')) {
    return 'openai';
  }

  if (normalized.includes('anthropic')) {
    return 'anthropic';
  }

  if (normalized.includes('google') || normalized.includes('gemini')) {
    return 'google';
  }

  if (normalized.includes('xai') || normalized.includes('x.ai')) {
    return 'xai';
  }

  if (normalized.includes('multiplay')) {
    return 'multiplay';
  }

  if (normalized.includes('local')) {
    return 'local';
  }

  return 'custom';
}

export function getProviderKeyLabel(provider = '') {
  const keyId = getProviderKeyId(provider);
  const profile = providerKeyProfiles.find((item) => item.id === keyId);

  return profile?.label || 'Custom';
}

function mergeProviderKeys(saved) {
  const keys = { ...defaultModelSettings.providerKeys };
  const explicitProviderKeys = saved.providerKeys && typeof saved.providerKeys === 'object'
    ? saved.providerKeys
    : null;
  const explicitKeyIds = new Set(explicitProviderKeys ? Object.keys(explicitProviderKeys) : []);
  const migrateProfileKey = (profile) => {
    const keyId = getProviderKeyId(profile?.provider);

    if (keyId === 'local' || explicitKeyIds.has(keyId) || !(keyId in keys)) {
      return;
    }

    const apiKey = String(profile?.apiKey || '').trim();

    if (apiKey && !keys[keyId]) {
      keys[keyId] = apiKey;
    }
  };

  (Array.isArray(saved.storyModels) ? saved.storyModels : []).forEach(migrateProfileKey);
  (Array.isArray(saved.imageModels) ? saved.imageModels : []).forEach(migrateProfileKey);

  if (explicitProviderKeys) {
    Object.keys(keys).forEach((keyId) => {
      if (Object.prototype.hasOwnProperty.call(explicitProviderKeys, keyId)) {
        keys[keyId] = String(explicitProviderKeys[keyId] || '').trim();
      }
    });
  }

  return keys;
}

function mergeProfiles(defaultProfiles, savedProfiles, providerKeys) {
  const savedList = Array.isArray(savedProfiles)
    ? savedProfiles.filter((profile) => profile && typeof profile === 'object')
    : [];
  const savedById = new Map(savedList.map((profile) => [profile.id, profile]));
  const mergedDefaults = defaultProfiles.map((profile) => {
    const savedProfile = savedById.get(profile.id);

    if (profile.locked) {
      return {
        ...profile,
        apiKey: getProviderKeyForProfile(profile, providerKeys),
      };
    }

    const mergedProfile = {
      ...profile,
      ...savedProfile,
      icon: savedProfile?.icon || profile.icon,
      locked: profile.locked,
      type: profile.type,
    };

    return {
      ...mergedProfile,
      apiKey: getProviderKeyForProfile(mergedProfile, providerKeys),
    };
  });
  const customProfiles = savedList
    .filter((profile) => !defaultProfiles.some((item) => item.id === profile.id))
    .map((profile) => {
      const mergedProfile = {
        ...profile,
        icon: profile.icon || '+',
        locked: false,
      };

      return {
        ...mergedProfile,
        apiKey: getProviderKeyForProfile(mergedProfile, providerKeys),
      };
    });

  return [...mergedDefaults, ...customProfiles];
}

function getProviderKeyForProfile(profile, providerKeys) {
  if (!profile || profile.type === 'local') {
    return '';
  }

  const keyId = getProviderKeyId(profile.provider);

  if (keyId === 'local') {
    return '';
  }

  return String(providerKeys?.[keyId] || '').trim();
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
