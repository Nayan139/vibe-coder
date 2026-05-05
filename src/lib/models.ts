export interface ModelOption {
  provider: 'groq' | 'nvidia';
  model: string;
  label: string;
  badge: string;
  note: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { provider: 'groq',   model: 'llama3-70b-8192',                          label: 'Llama 3 70B',   badge: 'GROQ',   note: 'Fast' },
  { provider: 'groq',   model: 'llama3-8b-8192',                           label: 'Llama 3 8B',    badge: 'GROQ',   note: 'Fastest' },
  { provider: 'groq',   model: 'mixtral-8x7b-32768',                       label: 'Mixtral 8x7B',  badge: 'GROQ',   note: 'Long ctx' },
  { provider: 'nvidia', model: 'meta/llama-3.1-70b-instruct',              label: 'Llama 3.1 70B', badge: 'NVIDIA', note: 'Balanced' },
  { provider: 'nvidia', model: 'nvidia/llama-3.1-nemotron-70b-instruct',   label: 'Nemotron 70B',  badge: 'NVIDIA', note: 'Best quality' },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0];
