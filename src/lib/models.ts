export interface ModelOption {
  provider: 'groq' | 'nvidia';
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
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0];
