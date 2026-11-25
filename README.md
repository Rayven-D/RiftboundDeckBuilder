# Rift Builder

Import your physical Riftbound TCG collection and find out which meta decks you can build
today, which ones you're close to, and what you're missing.

- `brain/`: project knowledge base (Obsidian vault). Start at `brain/Home.md`.
- `web/`: front end (to come)
- `services/`: back end & data pipeline (to come)

See `CLAUDE.md` for how the project is organized.

## Deploy notes

- **Production:** `firebase deploy --only hosting`, or a push to `main` (GitHub Actions). Both run
  `npm --prefix web run build` (sign-in off, `appVersion` `web-prod-<7 hex of the commit>`).
- **Preview channel with sign-in on** (for testing only), from `web/`:

  ```bash
  npm run deploy:preview -- <channel> [expires]
  # e.g. npm run deploy:preview -- sync-test        (expires after Firebase's default 7 days)
  #      npm run deploy:preview -- sync-test 3d
  ```

  `<channel>` is required (lowercase letters, digits, hyphens; never `live`). It builds
  `ng build --configuration preview` (`appVersion` `web-preview-…`) and deploys only that channel,
  using `firebase.preview.json`. **Preview URLs are public to anyone who has the link:** share them
  privately and let them expire.
- **Release step** (the `dev` → `main` release PR, SPEC-012 LOG-042): in
  `web/src/app/core/changelog/changelog.json` add the new entry on top with version = previous + 1
  (`0.0.X`; for `0.0.1`, set its `date`), fill every `null` date with the release day, read the bullets
  once for plain words, then run `npm --prefix web run check:changelog-release` (fails while any date is
  `null`; the `main` deploy workflow runs it too). Preview deploys get no entry.
  Then, once RJ has approved the privacy notice, replace both `[set on release: …]` markers in
  `web/src/app/core/privacy/privacy-notice.md` with the release day and run
  `npm --prefix web run check:privacy-release` (SPEC-010 SYNC-101; fails while the marker remains; the `main` deploy
  workflow and `firebase deploy --only hosting` run it too, so production cannot ship without the date).
- Details: `brain/05-Services/API Contracts.md`, section "Builds and deploys".
