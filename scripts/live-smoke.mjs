// Live end-to-end check against a real Daytona organization. Creates and
// deletes real sandboxes; requires DAYTONA_API_KEY. Nothing here is recorded.
import { runSubmission } from '../src/run-submission.mjs';
import { createPreviewWorkspace, deletePreviewWorkspace } from '../src/preview-workspace.mjs';
import { listAppSandboxes } from '../src/sandbox-inventory.mjs';

const nonce = `smoke-${Date.now()}`;
const failures = [];
async function step(name, fn) {
  try {
    const detail = await fn();
    console.log(`ok   ${name}${detail ? ` - ${detail}` : ''}`);
  } catch (error) {
    failures.push(name);
    console.log(`FAIL ${name} - ${error instanceof Error ? error.message : error}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await step('run a Python submission', async () => {
  const run = await runSubmission({ code: `print(input()[::-1])`, stdin: nonce });
  assert(run.exitCode === 0, `exit code ${run.exitCode}: ${run.output}`);
  assert(run.output.trim() === [...nonce].reverse().join(''), `unexpected output: ${run.output}`);
  return `${run.durationMs} ms`;
});

await step('report a failing submission', async () => {
  const run = await runSubmission({ code: 'import sys\nsys.exit(3)' });
  assert(run.exitCode === 3, `expected exit code 3, got ${run.exitCode}`);
});

await step('block network access in submissions', async () => {
  const run = await runSubmission({
    code: 'import urllib.request\nurllib.request.urlopen("https://example.com", timeout=5)',
    timeoutSeconds: 20,
  });
  assert(run.exitCode !== 0, 'the submission reached the internet');
});

await step('serve a private preview', async () => {
  const preview = await createPreviewWorkspace({
    files: { 'server.js': `require('http').createServer((_, res) => res.end('${nonce}')).listen(process.env.PORT)` },
    startCommand: 'node server.js',
    port: 3000,
  });
  try {
    let body = '';
    for (let attempt = 0; attempt < 20 && body !== nonce; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const response = await fetch(preview.url, { headers: { 'X-Daytona-Preview-Token': preview.token } });
      body = response.ok ? await response.text() : '';
    }
    assert(body === nonce, 'the preview URL never served the project');
    return preview.url;
  } finally {
    await deletePreviewWorkspace(preview.sandboxId);
  }
});

await step('list app sandboxes over REST', async () => {
  const sandboxes = await listAppSandboxes();
  assert(Array.isArray(sandboxes), 'expected a list');
  return `${sandboxes.length} labeled sandbox(es)`;
});

if (failures.length) {
  console.error(`\n${failures.length} live check(s) failed.`);
  process.exit(1);
}
console.log('\nAll live Daytona checks passed.');
