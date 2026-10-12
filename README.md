# Live API sample

A small Node support workflow that uses three recognizable startup APIs:

- OpenAI drafts a reply to a customer support request.
- Supabase stores the request and draft for human review.
- Stripe Checkout starts a paid support-plan subscription.

The OpenAI call uses the normal Responses API over HTTP. Stripe and Supabase use
their official Node clients. The app contains no recorded changelog, canned
provider response, expected repair, or special scanner configuration. Its
OpenAI model identifier is a deliberate positive control so a live matching
deprecation can be detected; the upstream notice and repair are not stored here.

## Configure the app

Use a Supabase project and apply `supabase/migrations/20261012000000_support_requests.sql`
in its SQL Editor. The table has row-level security enabled and no public policy;
the sample accesses it only from the server with a Supabase secret key. Never put
that key in browser code.

Set these variables in the server environment:

```text
OPENAI_API_KEY=...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
```

Create a recurring Price in Stripe test mode. The sample exports
`createSupportDraft({ email, prompt })` and
`createSubscriptionCheckout({ email, successUrl, cancelUrl })` from
`src/support-workflow.mjs`; neither function makes a provider request until
called.

## Exercise live CodeKite discovery

The repository is private. To make a fresh copy, run the seed command from the
CodeKite checkout with `gh` authenticated:

```sh
npm run fly:live-api -- seed OWNER/codekite-fly-live-api
```

Then connect the repository through `/fly`, select the detected dependencies,
and run First Look. The direct backend path used for repeatable live discovery is:

```sh
npm run fly:live-api -- run OWNER/codekite-fly-live-api
```

The run reads current provider sources and the repository's actual default
branch. It first copies the configured product's saved watch records into
isolated test storage, so it also exercises refresh of existing source lists.
It uses the setup UI's backend First Look entry point; browser interactions
are a separate check. It does not inject releases or patches. A draft PR is conditional on
CodeKite finding a relevant, repairable live change.
