import { appLabel, sandboxClient } from './daytona.mjs';

/**
 * Start a short-lived web preview of a learner's project. Uploads the files,
 * starts the server in a background session, and returns a private preview
 * URL with the token the browser must send in the `x-daytona-preview-token` header.
 */
export async function createPreviewWorkspace({ files, startCommand, port = 3000, autoStopMinutes = 15 }) {
  if (!files || typeof files !== 'object' || !Object.keys(files).length) {
    throw new Error('At least one project file is required.');
  }
  for (const path of Object.keys(files)) {
    if (path.startsWith('/') || path.split('/').includes('..')) throw new Error(`Invalid project path: ${path}.`);
  }
  if (typeof startCommand !== 'string' || !startCommand.trim()) throw new Error('A start command is required.');
  if (!Number.isInteger(port) || port < 3000 || port > 9999) throw new Error('port must be an integer from 3000 to 9999.');

  const daytona = sandboxClient();
  const sandbox = await daytona.create({
    language: 'javascript',
    labels: { ...appLabel, purpose: 'preview' },
    public: false,
    autoStopInterval: autoStopMinutes,
    autoDeleteInterval: 0,
  }, { timeout: 120 });

  try {
    const home = await sandbox.getUserRootDir();
    if (!home) throw new Error('Daytona did not report the sandbox home directory.');
    const workdir = `${home}/project`;
    await sandbox.fs.uploadFiles(Object.entries(files).map(([path, contents]) => ({
      source: Buffer.from(contents),
      destination: `${workdir}/${path}`,
    })));

    const sessionId = 'preview-server';
    await sandbox.process.createSession(sessionId);
    const { cmdId } = await sandbox.process.executeSessionCommand(sessionId, {
      command: `cd ${workdir} && PORT=${port} ${startCommand}`,
      runAsync: true,
    });

    const preview = await sandbox.getPreviewLink(port);
    return { sandboxId: sandbox.id, sessionId, commandId: cmdId, url: preview.url, token: preview.token };
  } catch (error) {
    await sandbox.delete().catch(() => {});
    throw error;
  }
}

/** Stop and remove a preview workspace created by createPreviewWorkspace. */
export async function deletePreviewWorkspace(sandboxId) {
  if (typeof sandboxId !== 'string' || !sandboxId) throw new Error('A sandbox ID is required.');
  const daytona = sandboxClient();
  await daytona.delete(await daytona.get(sandboxId));
}
