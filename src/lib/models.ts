export interface ModelOption {
  provider: 'groq' | 'nvidia' | 'gemini';
  model: string;
  label: string;
  badge: string;
  note: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant',
    badge: 'GROQ',
    note: 'Fastest',
  },
  {
    provider: 'groq',
    model: 'gemma2-9b-it',
    label: 'Gemma 2 9B IT',
    badge: 'GROQ',
    note: 'Fast',
  },
  {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B Versatile',
    badge: 'GROQ',
    note: 'Balanced',
  },
  {
    provider: 'nvidia',
    model: 'meta/llama-3.1-70b-instruct',
    label: 'Llama 3.1 70B',
    badge: 'NVIDIA',
    note: 'Balanced',
  },
  {
    provider: 'gemini',
    model: 'gemini-2.0-flash-lite',
    label: 'Gemini 2.0 Flash Lite',
    badge: 'GEMINI',
    note: 'Free · Fastest',
  },
  {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    badge: 'GEMINI',
    note: 'Free · Fast',
  },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0];
