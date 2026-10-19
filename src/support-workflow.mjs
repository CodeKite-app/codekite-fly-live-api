import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { draftSupportResponse } from './draft-response.mjs';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function supportDatabase() {
  // Optional server-only SUPABASE_SECRET_KEY takes precedence; when absent or empty,
  // retain the required SUPABASE_SERVICE_ROLE_KEY fallback for existing deployments.
  // Migration remains incomplete: the owner must provision a secret key for the
  // same SUPABASE_URL project, deploy it in SUPABASE_SECRET_KEY with this source,
  // verify support-draft saves use it, and audit other legacy-key consumers before
  // deactivating legacy keys. Never expose either privileged key in browser code.
  return createClient(required('SUPABASE_URL'), process.env.SUPABASE_SECRET_KEY || required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function billingClient() {
  return new Stripe(required('STRIPE_SECRET_KEY'), { apiVersion: '2026-09-30.endive' });
}

/** Draft a reply and persist it for a support agent to review. */
export async function createSupportDraft({ email, prompt }) {
  if (typeof email !== 'string' || !email.trim()) throw new Error('A customer email is required.');
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('A support prompt is required.');

  const draft = await draftSupportResponse(prompt);
  const { data, error } = await supportDatabase()
    .from('support_requests')
    .insert({ customer_email: email.trim(), prompt, draft, status: 'needs_review' })
    .select('id, created_at')
    .single();
  if (error) throw new Error(`Could not save the support request: ${error.message}`);
  return { id: data.id, createdAt: data.created_at, draft, status: 'needs_review' };
}

/** Start a hosted Stripe subscription checkout for the support product. */
export async function createSubscriptionCheckout({ email, successUrl, cancelUrl }) {
  if (typeof email !== 'string' || !email.trim()) throw new Error('A customer email is required.');
  for (const [name, value] of [['successUrl', successUrl], ['cancelUrl', cancelUrl]]) {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      throw new Error(`${name} must be an absolute HTTP or HTTPS URL.`);
    }
  }

  const session = await billingClient().checkout.sessions.create({
    mode: 'subscription',
    allowed_payment_method_types: ['card'],
    line_items: [{ price: required('STRIPE_PRICE_ID'), quantity: 1 }],
    customer_email: email.trim(),
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL.');
  return { id: session.id, url: session.url };
}

