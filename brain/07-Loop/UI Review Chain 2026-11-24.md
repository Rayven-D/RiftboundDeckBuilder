---
tags: [loop, chain]
date: 2026-11-24
status: done
branch: loop/ui-review-2026-11-24
---
# UI Review Chain 2026-11-24

**Summary.** The 23 findings of [[UI Review 2026-11-24]] (board H-101…H-126 and H-139, which was H-100; H-120 rejected by RJ) were run as one chain. Each step got its own branch, cut from the previous step's tip, and passed the validator before the next one started. All of it is now on **`loop/ui-review-2026-11-24`** (`60adb0c`, pushed 2026-11-24, includes `dev` @ `79cb5c0`). RJ opens the PR into `dev`. Final tests: 705 web, 38 rules.

## Steps
| # | Items | Branch @ tip | Tests (web / rules) | Validation |
|---|---|---|---|---|
| 1 | H-139 (was H-100) focus ring | `loop/H-139-focus-ring` @ `ac93f84` | 527 / 34 | [[Validation H-139]] |
| 2 | H-101 snack bars above the phone tab bar | `loop/H-101-snackbar-offset` @ `67f0eb8` | 532 / 34 | [[Validation H-101]] |
| 3 | H-102 danger button | `loop/H-102-danger-button` @ `7f92a3c` | 542 / 34 | [[Validation H-102]] |
| 4 | Spec rows H-103, H-105, H-107, H-109, H-111, H-112, H-117, H-118, H-119, H-121 → SPEC-010 v0.10 | `loop/H-103-spec010-ui-review` @ `04f9ae2` | 542 web | [[Validation H-103 spec batch]] |
| 5 | H-104, H-106, H-124 sign-in dialog layout, Send link failure, phone width | `loop/H-104-signin-dialog-layout` @ `84e6e0d` | 563 / 34 | [[Validation H-104 H-106 H-124]] |
| 6 | H-140, H-125, H-108 sent state, focus restore, confirm dialog instead of `prompt()` | `loop/H-140-signin-sent-state` @ `a524e1f` | 593 / 34 | [[Validation H-140 H-125 H-108]] |
| 7 | H-141, H-142, H-110 account menu | `loop/H-141-account-menu` @ `f3aab9e` | 605 / 34 | [[Validation H-141 H-142 H-110]] |
| 8 | H-143, H-122, H-147 delete and sign-out dialogs | `loop/H-143-delete-signout-dialogs` @ `fd5057e` | 625 / 34 | [[Validation H-143 H-122]] |
| 9 | H-144, H-114, H-115 gate panel | `loop/H-144-gate-panel` @ `5718401` | 646 / 34 | [[Validation H-144 H-114 H-115]] |
| 10 | H-113, H-116, H-123, H-126 (closes H-082) | `loop/H-113-misc-polish` @ `6eaa88c` | 670 / 34 | [[Validation H-113 H-116 H-123 H-126]] |
| 11 | H-145, H-151 email link returns to the start page | `loop/H-145-email-link-return` @ `5362d6d` | 705 / 38 | [[Validation H-145]] |
| 12 | H-146 SPEC-010 v0.11, RJ decision 16; H-150 answered | `loop/H-146-spec010-wording` @ `1b091bb` | 705 web | [[Validation H-146]] |

Steps 1–9 ran as their own Claude sessions, with ui-engineer brief → builder → ui-engineer Playwright check (1440 / 375, dark / light, keyboard) → validator → code review. Steps 10–12 ran in the orchestrator session with the same subagents, because sessions can't be started while RJ works over Remote Control.

## Board IDs
- Renumbered at the start: this branch's H-086…H-094 and H-097…H-100 became H-127…H-139 (dev owns H-086…H-100).
- New in the chain: H-140…H-145 (builder rows from the spec batch), H-146 (spec wording), H-147 (AC 38 test), H-148 (SYNC-074 combined notice), H-149 (notice OK 44 px), H-150 (RJ), H-151 (host-guard tests). `next_id` 152.
- Still open: **H-148**, **H-149** (builder, P3). H-083 closed by decision 16, which unblocks H-133.

## RJ decisions (2026-11-24)
- H-118 / decision 15: the signed-out panel line; H-120 rejected; H-126 "Free account" by mode.
- Decision 16: SPEC-010 Open questions 1–9 confirmed as written, and the confirm-dialog title "Finish signing in" ("all those look good to me").
- H-150: option A, the Import dialog may cover "You're signed in.".
- Defaults kept without asking: the strong border stays on the header account button only; "Free account" depends on the mode, not on being signed in.

## Known limits (not fixed)
- A click inside the app while an email sign-in is still finishing can leave the spent code in browser history ([[Validation H-145]]).
- If a link signs in from another tab, the first tab's dialog stays in the sent state.
- Firebase's continue-URL handling is checked on the Auth emulator only; production is still `unverified` ([[API Contracts]] v1.13).
- Light-mode gate line is body colour while the Tournaments empty state stays muted (on purpose, the gate has no heading).

## Real signed-in check with the Auth emulator
Works without app changes; the development build already points at the emulators (`useEmulators: true`). Never use the real project.
1. From the repo root, JDK 21 first on PATH: `firebase --config firebase.json emulators:start --only auth,firestore --project demo-rift-builder` (a `demo-` project never contacts a real one).
2. `npm --prefix web start` (port 4200).
3. Get a link and its code: `POST http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-api-key` with `{"requestType":"EMAIL_SIGNIN","email":"<test address>","continueUrl":"http://localhost:4200/"}`, then `GET http://127.0.0.1:9099/emulator/v1/projects/demo-rift-builder/oobCodes`. Or press Send link in the app and read the code the same way.
4. In the browser: `localStorage.setItem('rift.emailForSignIn','<test address>')`, then open `http://localhost:4200/?mode=signIn&oobCode=<code>&apiKey=demo-api-key&lang=en`. The header shows **Account**, the menu "Synced · <time>".

Screenshots from the ui-engineer checks stayed outside the repo (session notes folder) and are not kept.
