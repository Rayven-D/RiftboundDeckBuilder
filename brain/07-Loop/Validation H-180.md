---
tags: [validation]
item: H-180
date: 2026-11-25
result: PASS
---
# Validation H-180: the `/privacy` page and its links

Branch `loop/H-180-privacy-page`, uncommitted work (`git diff dev` plus untracked `web/` files; `web/public/import/` and `brain/Build Matching.md` ignored). Spec: [[Accounts and Sync]] SYNC-101, 103, 104, 007, ACs 65-70; text: [[Privacy Notice Draft]] 0.3.

2026-11-25 · H-180 · PASS · V-008 web, check 1 injection, check 2, text vs draft, no-Firebase chunk, headless Edge DevTools check (signed-out leg), V-009 · 0 blocking failures; 3 follow-ups below

## Checks run
| Check | Result |
|---|---|
| V-008 `npm run lint` | clean |
| V-008 `npm run build` | ok; `privacy-page` lazy chunk 10.8 kB |
| V-008 `npm test -- --watch=false` | 65 files / 885 tests pass |
| Check 1 on injected `[RJ` (appended to the notice file, restored after) | `node scripts/build.mjs production` exits 1: `Privacy notice has unfilled blanks: "[RJ" in src/app/core/privacy/privacy-notice.md.` before `ng build` |
| Check 1 on injected `[builder` | exits 1, names `"[builder"`. File restored byte for byte (diffed) |
| Check 1 with the real file (date marker present) | build passes (the `npm run build` above) |
| Check 2 `npm run check:privacy-release` today | exits 1: `Privacy notice still has "[set on release": ...` |
| Check 2 with both markers replaced by `2026-12-02` (temp copy, restored) | exits 0 |
| Check 2 wiring | in `.github/workflows/firebase-hosting-deploy.yml` (after the changelog check) and first line of `firebase.json` hosting predeploy; not in `scripts/build.mjs`, the `package.json` build scripts or `firebase.preview.json` (its predeploy is `build.mjs preview --channel-deploy`, check 1 only) |
| Page text vs draft 0.3 | every section, bullet and sentence matches in order; nothing invented; the only additions are the `mailto:` links, the `/changelog` link on "What's new page" (SYNC-103 item 3) and the `<h1>`. Dropped: the word and notes **Confirm** in five places (see choice 1). AC 66 strings all present (independent fan project, support address, "IP address and user agent", Dallas, 180 days, Do Not Track, Global Privacy Control, no cookies, "Riot Games does not endorse or sponsor this project.", under 16, Firebase Hosting, public changelog, no Riot account data); no personal name |
| No Firebase on `/privacy` | the `privacy-page` chunk imports only `main-*.js` (no `firebase-adapters` chunk, no identitytoolkit or firestore code; the only "Firebase" strings are the notice text). Page injects nothing from sync. Browser run below: only `127.0.0.1` requests |
| Never gated | `gated-pages.spec.ts` and `app.routes.spec.ts` additions pass; browser: `/privacy` signed out shows the h1 and no sign-in panel; `/privacies` goes to `/`; page still shows the text with the network switched offline after load; one `<h1>` |
| V-009 | `API Contracts.md` v1.19: new "Privacy notice" section is accurate against the code (paths, token, check commands, release step); `[[Privacy Notice Draft]]` resolves; the v1.19 changelog line is present. Builder's `Session Log.md` entry present and names the choices. Board row H-180 is still `doing` (the orchestrator's to move) |

## AC 70 DevTools check (signed-out leg, recorded)
Script: Node static server on `127.0.0.1:4399` serving `web/dist/web/browser` (SPA fallback) plus headless Microsoft Edge driven over the DevTools protocol (fresh profile; neither is a project dependency; server and Edge both stopped, ports free). Visited `/`, `/tournaments`, `/privacy` signed out, then opened the Sign in dialog.

| Page | Cookies (app origin) | `document.cookie` | localStorage / sessionStorage / IndexedDB | Hosts contacted |
|---|---|---|---|---|
| `/` | none | empty | none / none / none | `127.0.0.1:4399` only |
| `/tournaments` | none | empty | none / none / none | `127.0.0.1:4399` only |
| `/privacy` | none | empty | none / none / none | `127.0.0.1:4399` only |
| Sign in dialog open | none | | none | no request at all |

No third-party host, no Firebase request, no card-image request signed out (Home art is same-origin). The Sign in dialog shows "For ages 16 and over. Privacy notice" under the form; the link is `href="/privacy" target="_blank" rel="noopener"` with a hidden "Opens in a new tab." description.

**Not run, and why:** the sign-in and sign-out leg of AC 70 (keys beyond SYNC-141's list, cookies and hosts while signed in, card-image host while signed in) needs a real email-link sign-in against Firebase and an inbox; a validator cannot do it. It stays a manual step for RJ at release (H-240). It does not block PASS: this item adds no storage key, request or cookie (`/privacy` is static, the links are anchors), which the signed-out run and the unit tests confirm; the signed-in leg tests existing H-062/H-176 behaviour, not H-180's change. The draft's own rule (the "no cookies" sentence stays **Confirm** until the check passes) is not fully met yet; see choice 1.

## Builder's choices checked
1. **"Confirm" markers removed by dropping three note sentences** (Hosting-logs research note, legal-basis "judgement call", "no cookies not yet checked") plus the bare "**Confirm.**" after "one month": accepted. The draft says "remove the word Confirm from the page text when approving, the built page shows no Confirm markers", and these sentences were notes to RJ, not facts for readers. The two facts that carry content (operator can open the database; Hosting may keep request logs) are kept. Caveat: RJ approves the draft, but the page now differs from it, and it asserts "sets no cookies" before the signed-in leg is checked. H-241 records the built text as the approved text; H-240 gives RJ the signed-in leg.
2. **Footer link placement** (SYNC-104 e / AC 69 "next to the Riot legal line"): accepted. It is first in the footer links row directly above the unchanged legal paragraph, same footer, keyboard reachable, on every page. Not on the same line; the spec wording is loose and the layout follows the already-built What's new link (SPEC-012).
3. **Check 2 in the `firebase.json` predeploy blocks every local `firebase deploy --only hosting` until release**: intended. SYNC-101 check 2 names "the production deploy (GitHub Actions deploy of `main`, `firebase deploy --only hosting`)". The documented preview path (`deploy:preview`, `firebase.preview.json`) is unaffected. A bare `firebase hosting:channel:deploy` with the default config would also be held; the spec's preview path avoids that.

## Failures
None blocking.

## Follow-ups
- **H-240** (RJ, release checklist, manual): AC 70 signed-in leg. On a preview channel, sign in by email link, then sign out, and list cookies, storage keys (expect only SYNC-141 keys, `rift.emailForSignIn` during sign-in, `device-theme` after a pick) and hosts (Firebase plus any card-image host). If any image host is not own hosting, add it to "Who receives it" and re-approve (SYNC-103 item 9). Until then "no cookies" is unconfirmed while signed in.
- **H-241** (spec-writer, P3): record in [[Privacy Notice Draft]] that the built `privacy-notice.md` drops the Confirm notes and uses `mailto:` and `/changelog` links, so RJ approves that text; reword SYNC-104 e / AC 69 to "in the site footer on every page" or confirm the row layout is wanted.
- **H-242** (builder, P3, optional): only if RJ wants the footer link on the same line as the legal paragraph (layout tweak).
