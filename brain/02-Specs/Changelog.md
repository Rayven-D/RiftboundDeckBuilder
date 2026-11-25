---
tags: [spec]
id: SPEC-012
version: 0.1
status: draft
depends_on: [SPEC-010]
research: []
---
# SPEC-012: Changelog ("What's new")

> **Summary.** A public page at `/changelog`, titled **What's new**, lists one entry per production release, newest first: a version (`0.0.X`), a date and a short plain-language summary (a title line plus 1 to 5 bullets). It works signed out, loads no Firebase and stores nothing. It is linked from the footer (next to "Privacy notice") and from the account menu (after "Privacy notice", before "Sign out"). Entries live in one JSON file in the repo (`web/src/app/core/changelog/changelog.json`) that RJ's release PR (`dev` into `main`) edits. The version rule is `0.0.X`, X plus 1 per production release; preview deploys get no entry. The first entry, `0.0.1` (the sign-in release), has a **null date** until release day: the page shows "Coming soon" for it, tests and preview builds pass, and a release-time script (`npm run check:changelog-release`) fails while any date is null. The privacy notice points here for announced changes (Impacts).

Requested by RJ 2026-11-25 (board H-201): "make a changelog for a simple easy to digest summary of changes released with version numbers"; "we can keep 0.0.X versions. We'll probably squash them later". Ships with the sign-in release. Build item: H-202. No game rules are used, so there is no research dependency.

## Purpose
Give players one short, readable list of what changed in each release. It is also the place the privacy notice points to for announced changes ([[Privacy Notice Draft]], SYNC-103 item 3).

## Definitions
- **Release:** a deploy of `main` to production (the live site). A preview channel deploy is not a release.
- **Release version:** the human-facing number `0.0.X` of a release. Not the same as `appVersion`.
- **`appVersion`:** the per-build machine value `web-<prod|preview>-<7 hex>` ([[Accounts and Sync]] SYNC-012). Written to the account document; never shown to users by this spec.
- **Unreleased entry:** an entry whose `date` is `null` (the placeholder, see LOG-052).

## Requirements

### A. Route, access, title
| ID | Level | Requirement | Source |
|---|---|---|---|
| LOG-001 | MUST | **Route `/changelog`.** One page, public: it is never behind the sign-in gate ([[Accounts and Sync]] SYNC-009), works signed out and signed in, and works offline once the app has loaded (its text is bundled with the app, like `/privacy`, SYNC-104 a). Unknown paths such as `/changelogs` still go to Home. The normal header and footer stay. | RJ 2026-11-25; SYNC-009, SYNC-104 a |
| LOG-002 | MUST | **Titles.** Page heading (the one `<h1>`): `What's new`. Browser tab title: `What's new · Rift Builder` (the same `<name> · Rift Builder` pattern as the other routes). | RJ 2026-11-25; `web/src/app/app.routes.ts` pattern |
| LOG-003 | MUST | **Nothing new is loaded or kept.** The page loads no Firebase and makes no Firestore read ([[Accounts and Sync]] SYNC-002); no request beyond the app's own static files; no new storage key, cookie or analytics ([[Accounts and Sync]] SYNC-100, SYNC-104 h). The page reads nothing from the browser cache. | SYNC-002, SYNC-100 |

### B. Links
| ID | Level | Requirement | Source |
|---|---|---|---|
| LOG-010 | MUST | **Footer link.** A text link `What's new` in the site footer on every page, signed in or out, placed **after** the `Privacy notice` link (SYNC-104 e) in the same row as the theme switch and legal line. Opens `/changelog` in the **same tab**. | RJ 2026-11-25; SYNC-104 e, SYNC-158 |
| LOG-011 | MUST | **Account menu item.** A menu item `What's new` placed **after `Privacy notice` and before `Sign out`**, in the same divider group as Privacy notice (the divider before Sign out stays; the menu keeps exactly 3 dividers, SYNC-151). It navigates to `/changelog` in the same tab and closes the menu. Stays enabled offline and during an unfinished deletion (it needs no network). | SYNC-151, SYNC-104 d |
| LOG-012 | MUST | Both links are real anchors with the exact text `What's new` (no icon-only link), keyboard reachable. They are not added to the main tabs, the phone tab bar or the sign-in dialog. | SYNC-104 g |
| LOG-013 | SHOULD | **Merge note for the builder.** H-180 (Privacy notice, SYNC-104) adds its links in the same two places. Whichever build lands second only adds its own link next to the other one; the final order is footer: Privacy notice, What's new; menu: Theme, Privacy notice, What's new, Sign out. | board H-180 |

### C. Entries
| ID | Level | Requirement | Source |
|---|---|---|---|
| LOG-020 | MUST | **One entry per release**, newest first. Each shows: the **title** (an `<h2>`), a meta line `Version 0.0.X` and the release date, then the bullets as a list. | RJ 2026-11-25 |
| LOG-021 | MUST | **Date display.** A dated entry shows the date in American long form, e.g. `November 27, 2026`, inside `<time datetime="2026-11-27">`. The ISO date is parsed as a calendar date (no time zone shift: the day shown is the day in the data). An unreleased entry (LOG-052) shows the text `Coming soon` instead of a date, with no `<time>` element. | RJ 2026-11-25 (American spelling, product rule) |
| LOG-022 | MUST | **Content limits** (checked by the unit test, LOG-041): title 1 to 60 characters; 1 to 5 bullets per entry; each bullet 1 to 140 characters. Plain words a player understands, written as what the player can now do or see. No commit hashes, build ids, file or code names, and no ban, legality or meta claims (ADR-0003). Bullet and title text is plain text (never rendered as HTML). | RJ 2026-11-25 ("simple easy to digest") |
| LOG-023 | MUST | **Page copy.** Under the `<h1>`, one intro line: `What's changed in Rift Builder, newest first.` Empty state (no valid entries): `Nothing to show yet.` | this spec |
| LOG-024 | MUST | **Bad data does not break the page.** At run time an entry that fails the shape check of LOG-030 is skipped (never thrown); the rest still show. If none is valid the empty state of LOG-023 shows. Order is the file's order (the page does not re-sort); the unit test guarantees newest first. | this spec |
| LOG-025 | MUST NOT | The page shows no play rates, win rates, tiers or any statistic ([[ADR-0003 Tournament Results Only]]), and does not show `appVersion`: it is machine-facing, hash-like, and a player gains nothing from it. | ADR-0003; this spec |

### D. Data file and validation
| ID | Level | Requirement | Source |
|---|---|---|---|
| LOG-030 | MUST | **Data file** `web/src/app/core/changelog/changelog.json`: a JSON array of entries, newest first, shape below. It is imported into the app at build time (the builder enables JSON imports if the Angular config needs it; a `changelog.ts` constant with the same shape is an acceptable fallback, but then the release script of LOG-053 must read it too). Nothing is fetched at run time. | RJ 2026-11-25 ("a data file the release process updates") |
| LOG-031 | MUST | **Field rules.** `version`: exactly `0.0.X` where X is an integer of at least 1 without leading zeros (e.g. `0.0.1`, `0.0.12`). `date`: an ISO calendar date `YYYY-MM-DD` that is a real date, or `null` (LOG-052). `title`: string. `bullets`: array of strings. | this spec |
| LOG-040 | MUST | **Release version rule** (RJ 2026-11-25). Versions are `0.0.X` during early development. X goes up by exactly 1 for each production release (a deploy of `main` to live) and a release adds exactly one entry. Preview deploys get no entry and no number. Existing numbers are never reused or rewritten. RJ may later squash the `0.0.X` history into a bigger version; that is a new spec version, not a reason to change this rule now. | RJ 2026-11-25 |
| LOG-041 | MUST | **Unit test** (runs in the normal web test run, must pass on `dev` and in preview builds even while a date is null): over `changelog.json` assert (a) at least one entry; (b) every entry passes LOG-031 and LOG-022 (also: no token of 7 to 40 hex characters containing a digit, as a hash guard); (c) versions are unique and strictly **decreasing** down the file, with consecutive X (newest is the highest; the oldest is `0.0.1`, no gaps); (d) dates that are not `null` are valid and never increase going down the file (the same day twice is allowed); (e) at most one `null` date, and only in the first (newest) entry. The page's skip rule (LOG-024) has its own tests with malformed entries. | this spec |
| LOG-042 | MUST | **Release step.** In the release PR (`dev` into `main`), RJ (or an agent he asks) edits `changelog.json`: add the new entry on top with version = previous + 1, or, for `0.0.1`, set its `date`; fill every `null` date with the release day (the day the PR merges and the deploy runs); read the bullets once for plain words. Then `npm run check:changelog-release` (LOG-053) must pass before the merge. The builder of H-202 also writes this step into the repo's release notes where the deploy notes live. | RJ 2026-11-25 |
| LOG-043 | MUST | **No build embedding.** The release version is not injected into the build and not put in `appVersion`; the only link between the two is the release process. This keeps `appVersion` as SYNC-012 defines it and needs no build step. | SYNC-012; this spec |

### E. First entry and the date placeholder
| ID | Level | Requirement | Source |
|---|---|---|---|
| LOG-050 | MUST | **First entry `0.0.1`**, the sign-in release, in the file at the start of H-202, exactly: title `Accounts are here`; bullets (1) `Create a free account with just your email. We send you a sign-in link, no password needed.` (2) `Your collection and decks are saved to your account, so they follow you to every device.` (3) `Pick a username and choose a light or dark theme.` (4) `Read how your data is handled in the new Privacy notice.` (5) `New: this What's new page.` (the strings may be corrected for spelling only; RJ reviews the wording on release day, LOG-060). | RJ 2026-11-25 (sign-in release); [[Current State]] (accounts, sync, username, theme, `/privacy`) |
| LOG-051 | SHOULD | If other visible changes ride in the same release (for example the simplified Collection page, SPEC-007), RJ adds bullets on release day, within the LOG-022 limits (max 5; merge or drop the weakest). The spec does not list them because what ships is decided at release time. | this spec |
| LOG-052 | MUST | **Date placeholder.** While the release day is unknown, the entry's `date` is **`null`** (like the privacy notice's effective date `[set on release: date dev → main ships sign-in]`, [[Privacy Notice Draft]]). The page shows `Coming soon` for it (LOG-021), so `dev` and preview channels look right and nothing is invented. | RJ 2026-11-25; Privacy Notice Draft |
| LOG-053 | MUST | **Release check.** A script `web/scripts/check-changelog-release.mjs`, run with `npm --prefix web run check:changelog-release`, reads `changelog.json` and **exits non-zero with the message `Changelog has an undated entry: set its date before releasing.`** if any entry's `date` is `null`; it also exits non-zero if the file is not valid JSON or is not an array. It exits 0 otherwise. It is **not** part of the web test run, lint or the preview build, so `dev`, preview deploys and tests pass with the placeholder. SHOULD: the builder also adds it as a step before the build in the GitHub Actions deploy of `main` (`.github/workflows/firebase-hosting-deploy.yml`), so a production deploy cannot go out with a null date; the builder says in the board note whether it did. This mirrors the privacy notice's `[RJ:` check (SYNC-104, AC 66), but as a release-time check. | AC 66 pattern; this spec |
| LOG-054 | MUST | The check ignores `null` only in the sense above; a date that is present but not valid fails the unit test (LOG-041), not this script. | this spec |

### F. Accessibility and layout
| ID | Level | Requirement | Source |
|---|---|---|---|
| LOG-070 | MUST | **Semantics.** One `<h1>` (`What's new`); each entry title is an `<h2>`; the entries are a list (`<ol>` or `<ul>`, newest first) and each entry's bullets are a nested `<ul>`; dates in `<time datetime="YYYY-MM-DD">`; the version is plain text (`Version 0.0.1`). Heading order has no gaps. Normal landmarks (`main`, with the skip link target). | this spec |
| LOG-071 | MUST | **Responsive.** One column, readable line length (about 65 characters at desktop width, centred in the content width like `/privacy`), no horizontal scroll at 320 px width; text wraps, nothing is cut off; the footer links wrap onto a second line if needed; each footer and menu link is at least 44 px tall to tap. Colours and focus ring follow the app theme (light and dark). | SYNC-158 (44 px), design rules |
| LOG-072 | SHOULD | Entries are visually separated by space and a thin rule, with the title larger than the meta line; no images, icons or animation beyond the app's route transition. | this spec |

### G. Release rule and confirmation
| ID | Level | Requirement | Source |
|---|---|---|---|
| LOG-060 | MUST | **Ships with the sign-in release.** The page and `0.0.1` are on `dev` before the `dev` into `main` merge. On release day RJ reads the `0.0.1` text and the date is filled (LOG-042). Nothing in this spec deploys anything; production stays held by [[Accounts and Sync]] SYNC-007. | RJ 2026-11-25 |

## Data contract
```ts
// web/src/app/core/changelog/changelog.json  (array, newest first)
interface ChangelogEntry {
  version: string;        // "0.0.X", X >= 1, no leading zeros (LOG-031, LOG-040)
  date: string | null;    // "YYYY-MM-DD" calendar date, or null = unreleased placeholder (LOG-052)
  title: string;          // 1..60 chars
  bullets: string[];      // 1..5 items, each 1..140 chars, plain words
}
```
Example first file content: `[ { "version": "0.0.1", "date": null, "title": "Accounts are here", "bullets": [ ...LOG-050 ] } ]`.

## Acceptance criteria
1. **Public route** (LOG-001, LOG-002, LOG-003)
   **Given** a signed-out visitor with empty browser storage **When** they open `/changelog` directly **Then** the tab title is `What's new · Rift Builder`, the one `<h1>` reads `What's new`, the intro line shows, no sign-in panel appears, no request goes to Firebase or any host other than the app's own, and no cookie or storage key is added. **Given** instead RJ is signed in, or the browser is offline after the app loaded **When** he opens `/changelog` **Then** the same page shows. **Given** `/changelogs` **Then** the app goes to Home.
2. **Footer link** (LOG-010, LOG-012)
   **Given** any page, signed in or out, desktop and phone **When** RJ scrolls to the footer **Then** `Privacy notice` and then `What's new` links show in the same row as the theme switch (once H-180 is built; before that, `What's new` alone), the Riot legal line is unchanged, and choosing `What's new` opens `/changelog` in the same tab.
3. **Account menu item** (LOG-011)
   **Given** signed in as `uA` **When** RJ opens the account menu **Then** the items run: username, Signed in as, sync status, Sync now, Account Information, Theme, Privacy notice, **What's new**, Sign out, with exactly 3 dividers; **When** he chooses `What's new` **Then** `/changelog` opens in the same tab and the menu closes. **Given** offline, or an unfinished deletion **Then** the item is still there and enabled.
4. **Entry layout and dates** (LOG-020, LOG-021, LOG-070)
   **Given** the test data `[ {version "0.0.3", date "2026-12-04", title "Faster Collection", bullets ["Pages open faster."]}, {version "0.0.2", date "2026-11-28", ...} ]` **When** the page renders **Then** 0.0.3 comes first, its `<h2>` is `Faster Collection`, its meta line reads `Version 0.0.3` and `December 4, 2026` inside `<time datetime="2026-12-04">`, and its bullets are a `<ul>`. **Given** `date` `null` **Then** the entry shows `Coming soon` and no `<time>` element.
5. **Bad data** (LOG-024)
   **Given** the test data has one entry with `bullets: []`, one with `version: "1.0.0"` and one valid **When** the page renders **Then** only the valid entry shows and nothing throws. **Given** an empty array **Then** `Nothing to show yet.` shows.
6. **First entry** (LOG-050, LOG-052)
   **Given** the file as H-202 ships it **When** the page renders **Then** the only entry is `Version 0.0.1`, `Coming soon`, the title `Accounts are here` and the 5 bullets of LOG-050.
7. **Data validation test** (LOG-031, LOG-022, LOG-041)
   **Given** `changelog.json` **When** the unit test runs **Then** it passes with the `null` date in `0.0.1`. **Given** a copy with versions `0.0.2, 0.0.2` or `0.0.1, 0.0.2` or `0.0.3, 0.0.1` (gap), a date `2026-02-30`, a 6-bullet entry, a 61-character title, a bullet containing `a1b2c3d4e5`, or a `null` date on a non-first entry **Then** the test helper reports each of them as an error.
8. **Release check** (LOG-053, LOG-054)
   **Given** `changelog.json` has `"date": null` **When** `npm --prefix web run check:changelog-release` runs **Then** it exits non-zero with `Changelog has an undated entry: set its date before releasing.`; the web tests, lint and `ng build --configuration preview` still pass. **Given** every date is filled **Then** the script exits 0.
9. **Versioning and release step** (LOG-040, LOG-042, LOG-043)
   **Given** the second production release **When** RJ prepares the release PR **Then** the new top entry is `0.0.2` with its date, `0.0.1` stays unchanged below it, no entry exists for any preview deploy, and `appVersion` still has the form `web-prod-<7 hex>` (not changed by this spec).
10. **Phone width and accessibility** (LOG-070, LOG-071)
    **Given** a 320 px wide viewport and 3 entries **When** the page is open **Then** there is no horizontal scroll, the heading order is h1, h2, h2, h2, the footer and menu links are at least 44 px tall, and the page is usable by keyboard only in light and dark themes.

## Out of scope
- Showing `appVersion`, a build id or commit info anywhere.
- A feed (RSS), email notices, "new" badges or in-app pop-ups when a release ships. (The privacy notice's "material change shows a notice in the app", SYNC-103 item 3, is a separate mechanism owned by SPEC-010.)
- Filtering, search, per-entry links or per-entry pages.
- Squashing the `0.0.X` history (RJ: later).
- Entries for preview deploys or for dev-only work.

## Impacts (other notes and specs that must match; this spec edits none of them)
- **[[Privacy Notice Draft]] / SPEC-010 SYNC-103 item 3 (H-200):** the changes-announcement line should call it "the public changelog (the What's new page)" and link the text `What's new` to `/changelog` once the route exists (until then, no link). SPEC-012 changes no privacy fact: no new data is collected (LOG-003).
- **SPEC-010 0.14.x SYNC-104 d and SYNC-151 (menu order) and SYNC-104 e (footer):** the menu gains `What's new` after `Privacy notice`; SYNC-151 item (7) and AC 68's order list, and the footer wording, need a one-line mention. The code is built from this spec (H-202); the SPEC-010 text catch-up is a spec-writer follow-up after H-200 and H-206 land (to avoid clashing edits). The divider count (3) is unchanged.
- **SPEC-010 SYNC-009:** add `/changelog` to the public, never-gated list (it already includes "the privacy notice"); same follow-up.
- **SPEC-010 SYNC-012:** unchanged (`appVersion` stays per build); LOG-043.

## Open questions / BLOCKED
No `BLOCKED` items. For RJ (defaults apply if no answer):
1. **Wording of the `0.0.1` entry (LOG-050).** Default: the five bullets as written. Uncertain: whether the release should also mention other visible changes that ride along (LOG-051); the text is read by RJ on release day.
2. **Release-time check in the GitHub Actions deploy (LOG-053).** Default: yes (SHOULD), so production cannot ship with an undated entry. Say no if you would rather rely on the release checklist.
3. **Page shows no build id (LOG-025).** Default: not shown. Say so if you want a small "Build `web-prod-…`" line for support.

## Changelog
- 0.1 (2026-11-25, H-201): draft from RJ's request; route `/changelog`, "What's new" links, JSON data file, `0.0.X` rule, null-date placeholder with a release-time check, first entry `0.0.1`. Build item: H-202.
