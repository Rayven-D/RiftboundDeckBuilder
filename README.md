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
- Details: `brain/05-Services/API Contracts.md`, section "Builds and deploys".
