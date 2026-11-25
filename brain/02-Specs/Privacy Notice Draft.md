---
tags: [spec, privacy, draft, review]
id: SPEC-010-NOTICE
version: 0.3
status: review   # ready for RJ's final read; becomes `approved` only when RJ writes the date in "Approval gate" below
spec: "[[Accounts and Sync]] SYNC-101, SYNC-103, SYNC-104 (v0.15.1)"
research: ["[[Privacy Notice Requirements]]", "[[Card Data & Images]]"]
board: H-152, H-181, H-182, H-200, H-208
as_of: 2026-11-25
---
# Privacy Notice Draft (for RJ to approve)

> **Not legal advice.** This is a plain-language draft built from public sources gathered in
> [[Privacy Notice Requirements]] (as of 2026-11-24). It states facts about what Rift Builder does. It is not a
> legal opinion; a lawyer could settle the points marked `unverified` in that note. **Ready for RJ's final read
> (H-182):** correct anything untrue, check each **Confirm** line, then record the approval below.

## Changelog
- **0.3 (2026-11-25, H-200 and H-181):** RJ's H-182 answers applied: controller "Rift Builder, an independent fan
  project", contact `riftbuilder.support@gmail.com`, no personal name; age line 16 with no age check; changes
  announced in the public changelog (What's new) page; the three **Confirm** wordings kept; the date left as
  `[set on release: …]`. H-181 wording fixes: "no cookies" is marked **Confirm** until the DevTools check (AC 70);
  Firebase Hosting request logs named in "What we do not collect" and "Who receives it"; sign-in email replies go to
  the support inbox (H-063 sets the template's reply-to), not "are not read". The table of RJ-supplied blanks is
  removed: none is left except the release-day date. **H-208 fix:** the image-host blank (a bracketed RJ/builder marker with its
  "Keep only while…" note) is removed from "Who receives it", so no blank can ship; a rule in SYNC-103 item 9 requires
  the host line to be added before any build loads card images from a third-party host. The only marker left in the
  page text is `[set on release: …]`. **H-209:** the build check scans only the file holding the notice text for the
  case-sensitive substrings `[RJ` and `[builder` (markdown links and template bindings are not matched); the
  image-host line is a manual release step under AC 70, with no automated check.
- 0.2 (2026-11-25, H-174): username and `device-theme` lines added.
- 0.1 (2026-11-25, H-152): first draft.

## Approval gate (SYNC-007 condition 2)
| Item | State |
|---|---|
| Text approved by RJ | **not yet** (RJ: write "approved YYYY-MM-DD" here and set `status: approved`) |
| RJ-supplied blanks | **none left** (H-182 answers applied, 0.3); the page text has no image-host blank either (H-208): that line is added only if a build loads card images from a third-party host (SYNC-103 item 9, release condition below) |
| Card-image host line | **not in the text; a manual release step, no automated check** (AC 70, SYNC-103 item 9). If any card image is loaded from a host other than Rift Builder's own hosting, the notice must name that host (see "Not in this text on purpose") and RJ re-approves before that build ships; the source is undecided until H-020 |
| Release-day date | `[set on release: date dev → main ships sign-in]` stays until the release step replaces it with the real date (effective and last-updated) |
| Built page matches this text | not yet (builder item H-180, see [[Accounts and Sync]] ACs 65-70) |

Production does not get the account-only build until this is approved, the release-day date is filled (a check
fails the production deploy while `[set on release` remains, SYNC-101), H-063 (Auth providers, reply-to) and the
Firestore rules deploy are done. The changelog page (H-201, H-202) must be live before this text is, because "Changes"
points to it.

**Confirm** lines for RJ (kept as drafted; remove the word "Confirm" from the page text when approving, the built page
shows no **Confirm** markers):
1. the operator can open the database console (Who can read it);
2. the legal-basis sentence (Legal basis);
3. "answered within one month" (Your rights);
4. "Rift Builder sets no cookies": not yet checked in a browser, so it stays **Confirm** until the AC 70 DevTools
   check passes (What your browser keeps);
5. the Firebase Hosting request-log sentences (What we do not collect, Who receives it): no research row states what
   Hosting logs or for how long, so the text says only that it "may keep standard request logs".

## Proposed page text
Route `/privacy`, heading "Privacy notice". Plain headings and paragraphs.

---

**Privacy notice**
Effective `[set on release: date dev → main ships sign-in]` · Last updated `[set on release: date dev → main ships sign-in]`

### Who we are
Rift Builder, an independent fan project, is responsible for your data. It is free and non-commercial, and based in
the United States. Contact: `riftbuilder.support@gmail.com`. Rift Builder is not affiliated with Riot Games. *Rift
Builder was created under Riot Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does
not endorse or sponsor this project.*

### What we store
You can use Home and Tournaments without an account; Rift Builder stores nothing in the cloud for that. To import
cards or decks you create an account with your email address. We store:
- your email address and a Firebase user ID (in Firebase Authentication);
- your username, the display name you choose (it is shown only to you, at the top of the page; you can leave it out);
- your collection: card identifiers, counts and printing identifiers;
- your tags: labels, colours and settings;
- your decks: names, where each came from, notes and card lists;
- the times you locked decks, timestamps of changes, and the version of the app that last wrote your data.

Your username, tag labels, deck names and notes are free text that you control. Please do not put personal
information in them.

### What Google collects for us
Our account and database service is Google Firebase. When you sign in, Firebase Authentication also keeps the IP
address and user agent of the sign-in requests, to keep accounts secure and stop abuse. These IP logs are kept
for a few weeks. Sign-in emails are sent from `noreply@riftbound-deckbuilder.firebaseapp.com`; if you reply to one,
the reply goes to `riftbuilder.support@gmail.com`.

### What we do not collect
- No analytics, advertising or tracking tools.
- No Riot account, Riot login or Riot account data. Rift Builder does not use Riot Sign On.
- No payment information.
- No account data about you when you only visit Home or Tournaments. Firebase Hosting (Google), which delivers the
  site's pages, may keep standard web server request logs, which can include your IP address, for any visit, as any web
  host does. **Confirm:** the research notes do not say what Hosting logs or for how long.

### Why we use it
To run your account, keep your collection, tags, decks and locks in sync across your devices, keep the service
secure, and delete your data when you ask. We do not use it for marketing and we do not sell or share it.

### Legal basis (for people in the EU and UK)
We use your data to give you the service you ask for, and, for security logs, because keeping the service safe is in
our legitimate interest. We do not rely on consent. **Confirm:** this wording is a judgement call (research note
fact 2).

### Who receives it
Google (Firebase Authentication, Cloud Firestore and Firebase Hosting, including the Hosting request logs above)
handles the data for us as our service provider. No one else receives it.

### Where it is stored
Your collection, tags, decks and locks are stored in Google Cloud Firestore in Dallas, Texas, USA. Firebase
Authentication runs from data centers in the United States. If you are outside the US, your data is transferred to
the US; Google protects such transfers with the mechanisms it offers (the EU-US Data Privacy Framework or standard
contractual clauses).

### Who can read it
Only you, signed in, can read your data through the app, and we do not look at anyone's collection or decks.
**Confirm:** the project owner can technically open the database as an administrator; we only do so to fix a problem
or when you ask.

### What your browser keeps
While you are signed in, your browser keeps a copy of your account's data (so pages load quickly and work offline),
your view settings, the email address you typed while signing in by email link (removed when sign-in finishes), and
your Firebase sign-in session, all in the browser's own storage on your device. Your browser also remembers your
theme choice (light, dark or system) on that device; it is not part of your account, so signing out or deleting your
account does not clear it. Rift Builder sets no cookies. **Confirm:** this has not yet been checked in a browser
(AC 70); it stays marked until the DevTools check passes. We keep only what the features you asked for need, so there
is no cookie banner. Signing out or deleting your account clears the copy of your account's data from the device.

### Do Not Track and Global Privacy Control
We do not track you across websites or over time, and we do not sell or share your data, so there is nothing to opt
out of. Do Not Track and Global Privacy Control signals therefore change nothing. No other party tracks you on this
site through us.

### How long we keep it
Until you delete your account. When you sign out, the copy on your device is cleared. After you delete your account,
Google removes the data from its live and backup systems within about 180 days. Authentication IP logs are kept for
a few weeks.

### Your choices
- Change what you store in the app at any time.
- Delete everything: open the account menu, choose **Account Information**, then **Delete account and data**. This
  deletes your account and the collection, tags, decks and locks saved in it, on every device.
- For anything else, write to `riftbuilder.support@gmail.com`.

### Your rights (people in the EU and UK)
You can ask for access to your data, correction, erasure, restriction, to object to our use of it, and a portable
copy. Write to `riftbuilder.support@gmail.com`; we aim to answer within one month. **Confirm.** You can also complain
to your local data protection authority.

### Is giving us data required?
An email address is needed only to make an account. Without an account you can still use Home and Tournaments.

### No automated decisions
We do not make automated decisions or profile you.

### Children
Rift Builder is not for anyone under 16. We do not check ages, and we do not knowingly collect data from people under
16. If we learn that someone under 16 has an account, we delete the account and its data.

### Security
Data travels over HTTPS and is encrypted at rest by Google. If a breach affects you and the law requires it, we will
tell you.

### Changes
When this notice changes, we update the date at the top and describe the change in our public changelog (the What's
new page).

### Contact
`riftbuilder.support@gmail.com`

---

## Sign-in dialog age line (SYNC-104 f)
"For ages 16 and over." and the link "Privacy notice" under the form.

## Not in this text on purpose
- A line naming the card-image host (H-208). The image source is undecided until H-020, and
  [[Card Data & Images]] only says images are hotlinked from Riot's CDN for prototyping, with no final choice. If a
  build loads card images from a host other than Rift Builder's own hosting, add a sentence to "Who receives it" before
  that build ships, naming the real host and saying that when your browser fetches the pictures that host sees your IP
  address and browser user agent, as any web server does; RJ re-approves (SYNC-103 item 9). It is written with the
  real host name, never with a blank marker.
- Google sign-in: not offered at launch (H-063, email link only). Adding it changes this notice (SYNC-103 item 24).
- A postal address (not required by the sources read, research fact 23).
- Cookie banner text (none needed, research facts 24 to 26; check DevTools before launch, AC 70).
- An in-app notice of privacy changes on sign-in: RJ has not decided it (H-182 answer 5); the changelog is the only
  announcement promised.

## Open points for RJ (research, unverified)
GDPR applicability, COPPA 2025 changes, whether Google's data processing terms cover a free Spark project, and the
Firebase "business use" wording are `unverified` in [[Privacy Notice Requirements]]. This draft states facts and
hedges nothing as law. The age line 16 is RJ's choice (H-182); it is not an age check and not a legal finding.
