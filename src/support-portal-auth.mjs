import { createClient } from '@supabase/supabase-js';

/** Browser sign-in for support agents. Use a public project key, never a server secret. */
export function createSupportPortalAuth({ supabaseUrl, publishableKey, passkeySignInEnabled = false }) {
  if (typeof passkeySignInEnabled !== 'boolean') throw new Error('The passkey setting must be a boolean.');
  const client = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      experimental: { passkey: passkeySignInEnabled },
    },
  });

  return {
    async signInWithPassword({ email, password }) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { user: data.user, session: data.session };
    },

    /** Organizations enable passkey sign-in in their portal settings; it is disabled by default. */
    async signInWithPasskey() {
      const { data, error } = await client.auth.signInWithPasskey();
      if (error) throw error;
      return { user: data.user, session: data.session };
    },
  };
}
