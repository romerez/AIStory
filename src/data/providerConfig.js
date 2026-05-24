export const providers = [
  { value: 'Multiplay', label: 'Multiplay' },
  { value: 'OpenAI', label: 'OpenAI' },
  { value: 'Anthropic', label: 'Anthropic' },
  { value: 'Other', label: 'Other' },
];

export const providerModels = {
  Multiplay: [
    { value: 'multiplay-image-standard', label: 'multiplay-image-standard' },
    { value: 'multiplay-image-v2', label: 'multiplay-image-v2' },
    { value: 'multiplay-image-high-detail', label: 'multiplay-image-high-detail' },
  ],
  OpenAI: [
    { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
    { value: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' },
  ],
  Anthropic: [
    { value: 'claude-3.5', label: 'claude-3.5' },
    { value: 'claude-3.5-100k', label: 'claude-3.5-100k' },
  ],
  Other: [{ value: 'custom', label: 'Custom model' }],
};
