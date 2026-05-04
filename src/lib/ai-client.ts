interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIOptions {
  model?: 'primary' | 'fast' | 'agent';
  maxTokens?: number;
  temperature?: number;
}

export async function callAI(messages: AIMessage[], options: AIOptions = {}): Promise<string> {
  const provider = process.env.LLM_PROVIDER || 'groq';
  const modelKey = options.model || 'primary';

  const modelMap: Record<string, string> = {
    primary: process.env.LLM_MODEL_PRIMARY || 'llama3-70b-8192',
    fast:    process.env.LLM_MODEL_FAST    || 'llama3-8b-8192',
    agent:   process.env.LLM_MODEL_AGENT   || 'llama3-70b-8192',
  };

  const tokenMap: Record<string, number> = {
    primary: parseInt(process.env.LLM_MAX_TOKENS_CODE  || '4000'),
    fast:    parseInt(process.env.LLM_MAX_TOKENS_TEXT  || '800'),
    agent:   parseInt(process.env.LLM_MAX_TOKENS_AGENT || '6000'),
  };

  const model = modelMap[modelKey];
  const maxTokens = options.maxTokens ?? tokenMap[modelKey];
  const temperature = options.temperature ?? parseFloat(process.env.LLM_TEMPERATURE || '0.1');

  if (provider === 'groq') return callGroq(messages, model, maxTokens, temperature);
  if (provider === 'nvidia') return callNvidia(messages, model, maxTokens, temperature);

  throw new Error(`Unknown LLM_PROVIDER: ${provider}. Must be "groq" or "nvidia".`);
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
    throw new Error(`GROQ API error ${response.status}: ${err}`);
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
    throw new Error(`NVIDIA API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}
