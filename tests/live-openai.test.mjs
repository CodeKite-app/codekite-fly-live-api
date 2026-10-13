import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.env.SOURCE_ROOT ? path.resolve(process.env.SOURCE_ROOT) : process.cwd();
const { draftSupportResponse } = await import(pathToFileURL(path.join(root, 'src/draft-response.mjs')).href);
assert.ok(process.env.OPENAI_API_KEY, 'A real OpenAI API credential is required; this test cannot use a mock or skip the provider call.');
for (const request of ['I need help finding my last invoice.', 'I need instructions for resetting my password.']) {
  test(`returns a real generated support reply: ${request}`, { timeout: 90000 }, async () => {
    const reference = randomUUID();
    const prompt = `Draft a concise response to this synthetic customer request: ${request} Include this unique reference exactly once: ${reference}.`;
    const started = Date.now();
    const text = await draftSupportResponse(prompt);
    assert.equal(typeof text, 'string');
    assert.ok(text.trim().length > 0);
    assert.ok(text.includes(reference), 'The generated reply must reflect this invocation’s newly generated reference.');
    console.log(JSON.stringify({ sourceSha: process.env.VERIFIED_PR_SHA, provider: 'https://api.openai.com/v1/responses',
      passed: true, outputCharacters: text.length, outputSha256: createHash('sha256').update(text).digest('hex'),
      uniqueInputReferencePresent: true, elapsedMs: Date.now() - started }));
  });
}
