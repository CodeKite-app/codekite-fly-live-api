import { Daytona } from '@daytonaio/sdk';

export const defaultApiUrl = 'https://app.daytona.io/api';

/** Label put on every sandbox this app creates, so stale ones can be found and removed. */
export const appLabel = { app: 'codekite-grader' };

export function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

/** Server-side Daytona client. The API key must never reach browser code. */
export function sandboxClient() {
  return new Daytona({
    apiKey: required('DAYTONA_API_KEY'),
    apiUrl: process.env.DAYTONA_API_URL || defaultApiUrl,
    target: process.env.DAYTONA_TARGET || 'us',
  });
}
