---
tags: [spec, privacy, draft, review]
id: SPEC-010-NOTICE
version: 0.1
status: review   # becomes `approved` only when RJ writes the date in "Approval gate" below
spec: "[[Accounts and Sync]] SYNC-101, SYNC-103, SYNC-104 (v0.13)"
research: ["[[Privacy Notice Requirements]]"]
board: H-152
as_of: 2026-11-25
---
# Privacy Notice Draft (for RJ to approve)

> **Not legal advice.** This is a plain-language draft built from public sources gathered in
> [[Privacy Notice Requirements]] (as of 2026-11-24). It states facts about what Rift Builder does. It is not a
> legal opinion; a lawyer could settle the points marked `unverified` in that note. Read it as RJ, correct anything
> untrue, fill every `[RJ: …]` blank, then record the approval below.

## Approval gate (SYNC-007 condition 2)
| Item | State |
|---|---|
| Text approved by RJ | **not yet** (RJ: write "approved YYYY-MM-DD" here and set `status: approved`) |
| Blanks filled | **not yet** (list below) |
| Built page matches this text | not yet (builder item, see [[Accounts and Sync]] ACs 65-70) |

Production does not get the account-only build until this is approved, H-063 (Auth providers) and the Firestore
rules deploy are done.

## Blanks RJ must fill
| Blank | What it is | Where used |
|---|---|---|
| `[RJ: name]` | the name or handle that runs the project | "Who we are" |
| `[RJ: contact email]` | the dedicated support inbox | "Who we are", "Your choices", "Rights" |
| `[RJ: effective date]` | date the notice takes effect (also "last updated") | top of page |
| `[RJ: age 13 or 16]` | minimum age line (research suggests 13; 16 is the safer GDPR-style line) | "Children", sign-in dialog age line |
| `[RJ: change notice]` | how a material change is announced; proposed default: new date on the page, plus a notice in the app the next time you sign in | "Changes" |

Items for RJ to confirm (marked **Confirm** in the text): the wording that the operator can open the database
console; the legal-basis sentence; "answered within one month".

## Proposed page text
Route `/privacy`, heading "Privacy notice". Plain headings and paragraphs.

---

**Privacy notice**
Effective `[RJ: effective date]` · Last updated `[RJ: effective date]`

### Who we are
Rift Builder is a free, non-commercial fan project run by one individual, `[RJ: name]`, in the United States.
Contact: `[RJ: contact email]`. Rift Builder is not affiliated with Riot Games. *Rift Builder was created under Riot
Games' "Legal Jibber Jabber" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this
project.*

### What we store
You can use Home and Tournaments without an account; nothing is stored in the cloud for that. To import cards or
decks you create an account with your email address. We store:
- your email address and a Firebase user ID (in Firebase Authentication);
- your collection: card identifiers, counts and printing identifiers;
- your tags: labels, colours and settings;
- your decks: names, where each came from, notes and card lists;
- the times you locked decks, timestamps of changes, and the version of the app that last wrote your data.

Tag labels, deck names and notes are free text that you control. Please do not put personal information in them.

### What Google collects for us
Our account and database service is Google Firebase. When you sign in, Firebase Authentication also keeps the IP
address and browser user agent of the sign-in requests, to keep accounts secure and stop abuse. These IP logs are kept
for a few weeks. Sign-in emails are sent from `noreply@riftbound-deckbuilder.firebaseapp.com`; that address only
sends, replies are not read. Write to `[RJ: contact email]` instead.

### What we do not collect
- No analytics, advertising or tracking tools.
- No Riot account, Riot login or Riot account data. Rift Builder does not use Riot Sign On.
- No payment information.
- Nothing about you when you only visit Home or Tournaments.

### Why we use it
To run your account, keep your collection, tags, decks and locks in sync across your devices, keep the service
secure, and delete your data when you ask. We do not use it for marketing and we do not sell or share it.

### Legal basis (for people in the EU and UK)
We use your data to give you the service you ask for, and, for security logs, because keeping the service safe is in
our legitimate interest. We do not rely on consent. **Confirm:** this wording is a judgement call (research note
fact 2).

### Who receives it
Google (Firebase Authentication, Cloud Firestore and Firebase Hosting) handles the data for us as our service
provider. Nobody else receives it.
*[Keep only while card images load from a host other than Rift Builder's own (board H-020):]* Card pictures are loaded
from `[RJ/builder: image host name, e.g. Riot's image servers]`; when your browser fetches them, that host sees your IP
address and browser user agent, as any web server does.

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
your Firebase sign-in session, all in the browser's own storage on your device. Rift Builder sets no cookies. We keep
only what the features you asked for need, so there is no cookie banner. Signing out or deleting your account clears
this copy from the device.

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
- For anything else, write to `[RJ: contact email]`.

### Your rights (people in the EU and UK)
You can ask for access to your data, correction, erasure, restriction, to object to our use of it, and a portable
copy. Write to `[RJ: contact email]`; we aim to answer within one month. **Confirm.** You can also complain to your
local data protection authority.

### Is giving us data required?
An email address is needed only to make an account. Without an account you can still use Home and Tournaments.

### No automated decisions
We do not make automated decisions or profile you.

### Children
Rift Builder is not directed to children under 13 and we do not knowingly collect data from them. Accounts are for
people aged `[RJ: age 13 or 16]` and over (and, where your local law sets a higher age, with a parent's permission).
If we learn that someone under that age has an account, we delete the account and its data.

### Security
Data travels over HTTPS and is encrypted at rest by Google. If a breach affects you and the law requires it, we will
tell you.

### Changes
`[RJ: change notice; proposed: We update this page and its date when something changes. For a material change we also
show a notice in the app the next time you sign in.]`

### Contact
`[RJ: contact email]`

---

## Sign-in dialog age line (SYNC-104 f)
"For ages `[RJ: 13 or 16]` and over." and the link "Privacy notice" under the form.

## Not in this text on purpose
- Google sign-in: not offered at launch (H-063, email link only). Adding it changes this notice (SYNC-103 item 24).
- A postal address (not required by the sources read, research fact 23).
- Cookie banner text (none needed, research facts 24 to 26; check DevTools before launch, AC 70).

## Open points for RJ (research, unverified)
GDPR applicability, COPPA 2025 changes, whether Google's data processing terms cover a free Spark project, and the
Firebase "business use" wording are `unverified` in [[Privacy Notice Requirements]]. This draft states facts and
hedges nothing as law.
