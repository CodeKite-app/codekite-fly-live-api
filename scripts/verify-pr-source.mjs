import assert from 'node:assert/strict';
import { appendFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const repository = process.env.GITHUB_REPOSITORY;
const number = process.env.PR_NUMBER;
assert.match(repository ?? '', /^[\w.-]+\/[\w.-]+$/);
assert.match(number ?? '', /^\d+$/);
assert.ok(process.env.GITHUB_TOKEN, 'GitHub Actions must provide its read-only repository token.');
async function api(route) {
  const response = await fetch(`https://api.github.com/repos/${repository}${route}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200, `GitHub read failed for ${route.split('?')[0]}.`);
  return response.json();
}
const pr = await api(`/pulls/${number}`);
const sha = pr.head.sha;
assert.match(sha, /^[a-f0-9]{40}$/);
const tree = await api(`/git/trees/${sha}?recursive=1`);
assert.equal(tree.truncated, false);
const files = tree.tree.filter(item => item.type === 'blob' && (item.path.startsWith('src/') || ['package.json', 'package-lock.json'].includes(item.path)));
assert.ok(files.length > 0);
const hashes = [];
for (const file of files) {
  const blob = await api(`/git/blobs/${file.sha}`);
  const expected = Buffer.from(blob.content, 'base64');
  const actual = await readFile(file.path);
  assert.deepEqual(actual, expected, `${file.path} must be byte-identical to PR #${number}'s exact head.`);
  hashes.push({ path: file.path, sha256: createHash('sha256').update(actual).digest('hex') });
}
console.log(JSON.stringify({ verifiedPR: Number(number), verifiedPRHead: sha, applicationFiles: hashes }));
await appendFile(process.env.GITHUB_OUTPUT, `sha=${sha}\n`);
