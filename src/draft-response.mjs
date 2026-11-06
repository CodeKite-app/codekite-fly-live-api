const endpoint = 'https://api.openai.com/v1/responses';

/** Draft a support response from a caller's prompt. No SDK or stored test fixture. */
export async function draftSupportResponse(prompt, apiKey = process.env.OPENAI_API_KEY) {
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('A support prompt is required.');
  if (!apiKey) throw new Error('OPENAI_API_KEY is required.');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-6-sol', input: prompt }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`OpenAI API: ${result.error?.message || `HTTP ${response.status}`}`);
  const text = result.output?.flatMap(item => item.type === 'message' ? item.content : [])
    .filter(item => item.type === 'output_text').map(item => item.text).join('\n');
  if (!text) throw new Error('OpenAI returned no response text.');
  return text;
}

