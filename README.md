# Live API watcher sample

A small Node app that calls OpenAI's Responses API over HTTP. It has no SDK
dependency, recorded changelog, canned provider response, expected patch, or
special scan configuration.

The initial app uses the model selected for this sample project. The actual
OpenAI deprecation page is discovered and reread by CodeKite's normal watcher.
The source contains no release title, migration instructions, date, or preferred
replacement, so the assessment and repair come from the live API evidence.

To try it with the normal portal flow:

1. Seed a new private repository with
   `npm run fly:live-api -- seed OWNER/codekite-fly-live-api`.
2. Open `/fly`, connect that repository, select OpenAI, and enable monitoring.
3. Start First Look. It scans the real GitHub main branch, sets up the ordinary
   changelog watcher, and assesses whatever OpenAI has actually published.
4. If CodeKite judges a live change to need a repair, it asks the repair agent to
   propose a source patch, uses the independent reviewer, and opens a draft PR
   through the normal product path. No test publishes an event or chooses the
   repair contents.

`npm run fly:live-api -- run OWNER/codekite-fly-live-api` invokes the same
production scan, subscription, watcher, First Look, repair, review, and GitHub
PR operations directly for repeatable backend testing. The GitHub base branch
must stay unchanged during a run. The job receipt records actual discovered
source URLs, entry dates and outcomes under `.data/fly-live-api-e2e/`; it does not
record the GitHub token or model credentials.

Live runs depend on the model finding a relevant recent API notice in the
provider's current public changelog. If it finds no current source or no
repository-specific impact, the ordinary `no-source-found` or `all_clear` outcome
is correct: this sample never manufactures a PR trigger.
