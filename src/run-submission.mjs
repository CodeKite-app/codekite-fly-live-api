import { appLabel, sandboxClient } from './daytona.mjs';

const runtimes = {
  python: { file: 'main.py', command: 'python3 main.py' },
  typescript: { file: 'main.ts', command: 'npx --yes tsx main.ts' },
  javascript: { file: 'main.js', command: 'node main.js' },
};

/**
 * Run a learner's submission in a throwaway sandbox with no network access and
 * return its exit code and combined output. The sandbox is always deleted.
 */
export async function runSubmission({ code, language = 'python', stdin = '', timeoutSeconds = 30 }) {
  if (typeof code !== 'string' || !code.trim()) throw new Error('Submission code is required.');
  const runtime = runtimes[language];
  if (!runtime) throw new Error(`Unsupported language: ${language}.`);
  if (typeof stdin !== 'string') throw new Error('stdin must be a string.');
  if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 300) {
    throw new Error('timeoutSeconds must be an integer from 1 to 300.');
  }

  const daytona = sandboxClient();
  const sandbox = await daytona.create({
    language,
    labels: { ...appLabel, purpose: 'submission' },
    networkBlockAll: true,
    ephemeral: true,
    autoStopInterval: 5,
  }, { timeout: 120 });

  try {
    const home = await sandbox.getUserRootDir();
    if (!home) throw new Error('Daytona did not report the sandbox home directory.');
    const workdir = `${home}/submission`;
    await sandbox.fs.createFolder(workdir, '755');
    await sandbox.fs.uploadFile(Buffer.from(code), `${workdir}/${runtime.file}`);
    await sandbox.fs.uploadFile(Buffer.from(stdin), `${workdir}/stdin.txt`);

    const started = Date.now();
    const execution = await sandbox.process.executeCommand(
      `${runtime.command} < stdin.txt`,
      workdir,
      { PYTHONUNBUFFERED: '1' },
      timeoutSeconds,
    );
    return {
      sandboxId: sandbox.id,
      exitCode: execution.exitCode,
      output: execution.result,
      durationMs: Date.now() - started,
    };
  } finally {
    await sandbox.delete();
  }
}
