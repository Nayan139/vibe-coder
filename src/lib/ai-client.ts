interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIOptions {
  model?: 'primary' | 'fast' | 'agent';
  maxTokens?: number;
  temperature?: number;
  overrideProvider?: string;
  overrideModel?: string;
}

function resolveGroqModel(model: string): string {
  const normalized = model.trim();

  // Aliases for NVIDIA / legacy model names that may appear in env vars or old configs.
  const aliasMap: Record<string, string> = {
    "meta/llama-3.1-8b-instruct": "llama-3.1-8b-instant",
    "meta/llama-3.1-70b-instruct": "llama-3.3-70b-versatile",
    "meta/llama-3.3-70b-instruct": "llama-3.3-70b-versatile",
    "nvidia/llama-3.1-nemotron-70b-instruct": "llama-3.3-70b-versatile",
    "nvidia/llama-3.1-nemotron-nano-8b-instruct": "llama-3.1-8b-instant",
    // Legacy Groq model IDs that were renamed
    "llama3-70b-8192": "llama-3.3-70b-versatile",
    "llama3-8b-8192": "llama-3.1-8b-instant",
    "mixtral-8x7b-32768": "llama-3.3-70b-versatile",
  };

  return aliasMap[normalized] ?? normalized;
}

export async function callAI(messages: AIMessage[], options: AIOptions = {}): Promise<string> {
  const provider = options.overrideProvider || process.env.LLM_PROVIDER || 'groq';
  const modelKey = options.model || 'primary';

  const modelMap: Record<string, string> = {
    primary: process.env.LLM_MODEL_PRIMARY || 'llama3-70b-8192',
    fast:    process.env.LLM_MODEL_FAST    || 'llama3-8b-8192',
    agent:   process.env.LLM_MODEL_AGENT   || 'llama3-70b-8192',
  };

  const tokenMap: Record<string, number> = {
    primary: Number.parseInt(process.env.LLM_MAX_TOKENS_CODE  || '4000'),
    fast:    Number.parseInt(process.env.LLM_MAX_TOKENS_TEXT  || '800'),
    agent:   Number.parseInt(process.env.LLM_MAX_TOKENS_AGENT || '6000'),
  };

  const model = options.overrideModel || modelMap[modelKey];
  const maxTokens = options.maxTokens ?? tokenMap[modelKey];
  const temperature = options.temperature ?? Number.parseFloat(process.env.LLM_TEMPERATURE || '0.1');

  if (provider === 'groq') {
    return callGroq(messages, resolveGroqModel(model), maxTokens, temperature);
  }
  if (provider === 'nvidia') return callNvidia(messages, model, maxTokens, temperature);
  if (provider === 'gemini') return callGemini(messages, model, maxTokens, temperature);

  throw new Error(`Unknown LLM_PROVIDER: ${provider}. Must be "groq", "nvidia", or "gemini".`);
}

async function callGroq(
  messages: AIMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });

  if (!response.ok) {
    const err = await response.text();
    if (response.status === 401) {
      throw new Error(`Groq API key is invalid or expired (401). Check GROQ_API_KEY in your .env.local.`);
    }
    if (response.status === 404) {
      throw new Error(`Groq model "${model}" not found (404). Update LLM_MODEL_* in your .env.local to a valid Groq model.`);
    }
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}

async function callNvidia(
  messages: AIMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });

  if (!response.ok) {
    const err = await response.text();
    if (response.status === 401) {
      throw new Error(`NVIDIA API key is invalid or expired (401). Check NVIDIA_API_KEY in your .env.local.`);
    }
    if (response.status === 404) {
      throw new Error(`NVIDIA model "${model}" not found (404). Check the model name in your request or MODEL_OPTIONS.`);
    }
    throw new Error(`NVIDIA API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}

async function callGemini(
  messages: AIMessage[],
  model: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const systemMsg = messages.find((m) => m.role === 'system');
  const conversationMsgs = messages.filter((m) => m.role !== 'system');

  const contents = conversationMsgs.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  };

  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    if (response.status === 400) {
      throw new Error(`Gemini API key is invalid or request malformed (400). Check GEMINI_API_KEY in your .env.local.`);
    }
    if (response.status === 403) {
      throw new Error(`Gemini API key is invalid or expired (403). Check GEMINI_API_KEY in your .env.local.`);
    }
    if (response.status === 404) {
      throw new Error(`Gemini model "${model}" not found (404). Update the model name in MODEL_OPTIONS.`);
    }
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text as string;
}
