const API_BASE = import.meta.env.VITE_MULTIPLAY_API_URL || 'https://api.multiplay.example';

export async function generateStory(requestBody) {
  const response = await fetch('/api/generate-story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error('Story generation request failed.');
  }

  return response.json();
}

export async function generateImage(promptRequest) {
  const response = await fetch(`${API_BASE}/images/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_MULTIPLAY_API_KEY}`,
    },
    body: JSON.stringify(promptRequest),
  });

  if (!response.ok) {
    throw new Error('Image generation request failed.');
  }

  return response.json();
}
