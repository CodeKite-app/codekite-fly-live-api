import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { draftSupportResponse } from './draft-response.mjs';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function supportDatabase() {
  // Optional, owner-configured Node environment input: SUPABASE_SECRET_KEY is a
  // plain-string server secret key, not the Edge Functions JSON key map.
  // When nonempty it takes precedence over SUPABASE_SERVICE_ROLE_KEY; otherwise
  // the existing required legacy key remains the fallback during rollout.
  // Owner rollout is still required: create a Supabase secret key and configure
  // it in this backend's runtime environment, never in source or browser code.
  // Verify support-request writes with the new key before relying on it. Keep
  // the legacy variable available during rollout and legacy credentials active
  // until all their consumers have migrated and been verified.
  const key = process.env.SUPABASE_SECRET_KEY || required('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(required('SUPABASE_URL'), key, {
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
