# Live Daytona API sample

A small Node code-grading service built on [Daytona](https://www.daytona.io)
sandboxes, Daytona's fast-moving API for running untrusted code:

- `runSubmission` runs a learner's Python, JavaScript or TypeScript submission
  in a throwaway sandbox with all network access blocked, then deletes it.
- `createPreviewWorkspace` uploads a learner's web project, starts its server in
  a background session, and returns a private preview URL and access token.
- `listAppSandboxes` and `deleteStaleSandboxes` call the Daytona REST API
  directly over HTTP, without the SDK, to find and clean up leftover sandboxes.

The sandbox workflows use Daytona's official TypeScript SDK at an exact pinned
version. The app contains no recorded changelog, canned provider response,
expected repair, or special scanner configuration. It deliberately imports the
SDK through its original npm package name and calls 0.x SDK helpers as they are
written today, so a live upstream rename, deprecation, or removal has real code
to hit. The upstream notices and repairs are not stored here.

## Configure the app

Create an API key in the [Daytona dashboard](https://app.daytona.io/dashboard/keys)
with sandbox permissions, and set these variables in the server environment:

```text
DAYTONA_API_KEY=dtn_...
DAYTONA_API_URL=https://app.daytona.io/api   # optional
DAYTONA_TARGET=us                            # optional region
```

Never put the Daytona API key in browser code. A browser that loads a preview
sends the returned token in the `X-Daytona-Preview-Token` header.

Every sandbox the app creates carries the label `app=codekite-grader`.
Submission sandboxes are ephemeral and deleted after each run; preview
sandboxes stop after 15 idle minutes and are removed by
`deletePreviewWorkspace(sandboxId)` or `deleteStaleSandboxes({ maxAgeMinutes })`.
No function makes a provider request until it is called.

## Verify

```sh
npm ci
npm run check   # type-checks the app against the installed SDK's declarations
npm run smoke   # live: creates and deletes real sandboxes; needs DAYTONA_API_KEY
```

`npm run check` makes no network requests; it fails when an SDK upgrade changes
a signature, option, or return type the app relies on. `npm run smoke` runs
each workflow end to end against your Daytona organization: a submission's
output and exit code, network isolation, a private preview served through its
token, and the REST listing. It uses a few seconds of sandbox time.

The `check` workflow runs `npm run check` on every push and pull request. On
pushes to `main` and manual runs it also runs `npm run smoke` when the
repository has a `DAYTONA_API_KEY` Actions secret, and skips it otherwise.

## Exercise live CodeKite discovery

To make a fresh copy, run the seed command from the CodeKite checkout with `gh`
authenticated:

```sh
npm run fly:live-api -- seed OWNER/codekite-fly-daytona-api
```

Then connect the repository through `/fly`, select the detected Daytona
dependency, and run First Look, or run the direct backend path:

```sh
npm run fly:live-api -- run OWNER/codekite-fly-daytona-api
```

The run reads current Daytona sources and the repository's actual default
branch. It does not inject releases or patches. A draft PR is conditional on
CodeKite finding a relevant, repairable live change.
