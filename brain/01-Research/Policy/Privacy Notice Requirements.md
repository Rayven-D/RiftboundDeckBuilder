---
tags: [research, policy, privacy]
area: policy
status: partial   # sources are primary where stated; legal applicability is judgement, see Conflicts
as_of: 2026-11-24
sources:
  - url: https://gdpr-info.eu/art-13-gdpr/
    tier: secondary (GDPR text mirror)
  - url: https://gdpr-info.eu/art-27-gdpr/
    tier: secondary (GDPR text mirror)
  - url: https://gdpr-info.eu/recitals/no-18/
    tier: secondary (GDPR text mirror)
  - url: https://gdpr-info.eu/recitals/no-23/
    tier: secondary (GDPR text mirror)
  - url: https://gdpr-info.eu/art-8-gdpr/
    tier: secondary (GDPR text mirror)
  - url: https://edpb.europa.eu/sites/edpb/files/files/file1/edpb_guidelines_3_2018_territorial_scope_en.pdf
    tier: regulator (only seen via search snippets)
  - url: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0058
    tier: official (original 2002 ePrivacy text, Art. 5(3))
  - url: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/
    tier: regulator
  - url: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/
    tier: regulator
  - url: https://www.cppa.ca.gov/regulations/cpi_adjustment.html
    tier: regulator
  - url: https://oag.ca.gov/privacy/ccpa
    tier: regulator
  - url: https://california.public.law/codes/business_and_professions_code_section_22575
    tier: secondary (statute mirror; official leginfo and Justia returned 403)
  - url: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
    tier: regulator
  - url: https://firebase.google.com/support/privacy
    tier: vendor (official Google)
  - url: https://firebase.google.com/terms/data-processing-terms
    tier: vendor (official Google)
  - url: https://firebase.google.com/terms
    tier: vendor (official Google)
  - url: https://cloud.google.com/terms/data-processing-addendum
    tier: vendor (official Google)
  - url: https://developers.google.com/terms
    tier: vendor (official Google)
  - url: https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification
    tier: vendor (official Google)
  - url: https://developers.google.com/terms/api-services-user-data-policy
    tier: vendor (official Google)
  - url: https://firebase.google.com/docs/auth/web/auth-state-persistence
    tier: vendor (official Google)
  - url: https://developer.riotgames.com/policies/general
    tier: official (Riot)
  - url: https://developer.riotgames.com/policies/riftbound
    tier: official (Riot)
  - url: https://globalprivacycontrol.org/faq
    tier: secondary (via search snippet)
---
# Privacy Notice Requirements

## Summary
**Not legal advice: this is general information gathered from public sources, not legal advice.** For Rift Builder (free hobby site, US operator, worldwide reach, optional email-link accounts on Firebase), the law most certain to bite is **CalOPPA** (a posted policy with set contents), plus Google's own terms (a privacy policy that matches reality). GDPR probably does **not** apply (no targeting of the EU), but a GDPR-style notice costs little and covers the case. CCPA and other US state laws are almost certainly out of scope. The app is not for under-13s and should say so. No cookie banner appears necessary: nothing is stored beyond what the user asked for (their data, their session), and there is no analytics. The checklist at the end is the input for SYNC-101.

## Facts
| # | Fact | Source | As of |
|---|---|---|---|
| **Q1 Notice contents** | | | |
| 1 | GDPR Art. 13 list (when collected from the person): controller identity and contact; purposes and legal basis; recipients; transfers outside the EU and the safeguard; retention (or the criteria); rights (access, correction, erasure, restriction, objection, portability); right to withdraw consent if consent is the basis; right to complain to a supervisory authority; whether providing data is required and the consequence of not giving it; automated decisions/profiling (we have none). DPO and representative only if appointed. | gdpr-info.eu Art. 13 (secondary mirror of the regulation) | 2026-11-24 |
| 2 | Suggested legal basis (my reading, not a source): account and sync = performance of the service the user asks for (Art. 6(1)(b)); Firebase security logs = legitimate interest. No consent basis is used, so no "withdraw consent" right to state. `status: unverified` (judgement) | derived | 2026-11-24 |
| **Q2 Which laws apply** | | | |
| 3 | GDPR household exemption (Recital 18) covers purely private activity with no business link, and does not shield those who provide the means for it. A public site run for others is not "household". CJEU Lindqvist (C-101/01) held that publishing to an indefinite audience is outside the exemption (seen via secondary commentary; Lindqvist was decided under the old Directive). Conclusion: do not rely on the exemption. | gdpr-info.eu Recital 18; secondary commentary on C-101/01 (`unverified` against CURIA text) | 2026-11-24 |
| 4 | GDPR Art. 3(2) for a non-EU operator needs offering services to people in the Union (or monitoring them). Recital 23: a site merely reachable from the EU, an email address, or the operator's home language is not enough; signs of intent are an EU language or currency, or mentioning EU users. EDPB Guidelines 3/2018 require a clear intention to serve EU customers. Rift Builder has no EU-targeting signals known to us (English only, no prices, no EU wording). Conclusion: GDPR probably does not apply; low confidence given that Riftbound is played in the EU and the notice may be read there. | gdpr-info.eu Recital 23; EDPB Guidelines 3/2018 (via search snippets) | 2026-11-24 |
| 5 | Art. 27: a non-EU controller caught by Art. 3(2) needs an EU representative, unless processing is occasional, not large-scale special-category data, and unlikely to risk people's rights, all together. Account processing is ongoing, so "occasional" is doubtful; do not rely on the exemption. The practical stance is "Art. 3(2) is not met", so no representative. UK GDPR has a parallel UK representative rule (`unverified`, not fetched). | gdpr-info.eu Art. 27 | 2026-11-24 |
| 6 | CCPA/CPRA "business" needs for-profit operation, doing business in California, and one of: revenue above **$26,625,000** (adjusted from $25M, effective 2025-01-01; adjusts again in odd years, so a 2027 figure may differ), buying/selling/sharing data of 100,000+ California residents or households, or 50%+ of revenue from selling/sharing personal information. A free, non-commercial hobby site meets none. | cppa.ca.gov CPI adjustment page; oag.ca.gov/privacy/ccpa | 2026-11-24 |
| 7 | **CalOPPA** (Bus. & Prof. Code 22575): applies to an operator of a commercial website or online service that collects personally identifiable information from California consumers. "Commercial" is not defined to exclude free sites, and an email address is PII, so treat it as applying. Requirements: post the policy where users easily see it (conspicuous link); list the categories of PII collected and the categories of third parties it may be shared with; how users can review/change their data, if offered; how users are told of material changes; the effective date; how the operator responds to Do Not Track signals (a statement is enough, honouring is not required); whether other parties may collect info about users across sites. Liability only arises after 30 days' notice of non-compliance. | california.public.law Sec. 22575 (statute mirror) | 2026-11-24 |
| 8 | Other US state comprehensive laws: they use thresholds such as 100,000 consumers (several states; Maryland 35,000), usually with revenue or sale-of-data alternatives. A hobby site with a small user base is expected to be below all of them. `status: unverified` for each state; only a secondary summary was seen (no chart fetched). Re-check if the user base grows. | search results (Perkins Coie, Foley, Coblentz charts, not opened) | 2026-11-24 |
| 9 | Canada PIPEDA reaches foreign organisations with a "real and substantial connection" and applies to commercial activity; a free service can still count as commercial activity. A hobby site not marketed to Canada is unlikely to be caught. `status: unverified` (no hobby-specific source). | OPC findings via search snippet | 2026-11-24 |
| 10 | **COPPA**: applies to services directed to under-13s that collect personal information, and to general-audience services with **actual knowledge** they collect it from under-13s. Factors for "child-directed" include subject matter, visuals, language, ads and audience evidence; some child visitors alone do not make a site child-directed. With actual knowledge you must get parental consent or delete the child's information and stop collecting. Email is personal information. The Rule was amended on 2025-04-22; the FAQ does not describe the changes, so `unverified` which amended duties apply to us. | FTC COPPA FAQ (D.1, D.3, H.1, H.6) | 2026-11-24 |
| 11 | GDPR Art. 8: where **consent** is the basis for an online service offered to a child, the child must be 16, or a parent consents; Member States may lower to 13 (not below). Because Rift Builder relies on contract/service need rather than consent (row 2), Art. 8 may not be triggered; this reading is `unverified`. | gdpr-info.eu Art. 8 | 2026-11-24 |
| 12 | UK Children's Code (15 standards) applies to information society services likely to be accessed by children (apps, games, websites). Whether a free hobby tool for a card game is "likely accessed by children", and whether a free unpaid service is an ISS, is unclear. `status: unverified`. Standards that are cheap to meet anyway: data minimisation, transparency in plain language, no profiling or nudging, no sharing. | ICO Children's code page (small-service text not seen) | 2026-11-24 |
| **Q3 Google/Firebase** | | | |
| 13 | Google APIs ToS 3(d): provide and follow a privacy policy that accurately describes what user information you collect and how you use and share it, with Google and third parties; follow applicable privacy law. 3(b): protect user info and report unauthorized access to users where law requires. 5(d): let users export their equivalent data (applies to data obtained through Google APIs). | developers.google.com/terms | 2026-11-24 |
| 14 | Terms mapping: Firebase **Authentication and Cloud Firestore** are governed by the Google Cloud Platform Terms; **Hosting** by Google APIs ToS plus the Firebase Data Processing and Security Terms. The Cloud DPA covers Google Cloud Platform; the terms table does not list the DPA for these three services. Whether the DPA applies to a free (Spark) project: `unverified`. | firebase.google.com/terms; cloud.google.com DPA | 2026-11-24 |
| 15 | Roles: Firebase says customers are generally the controller (GDPR) or business (CCPA), and Google the processor/service provider; the customer handles data-subject requests. Both the Firebase DP&S Terms and Cloud DPA state Google is a processor. Sub-processor lists are published; Google gives 30 days' notice of new ones. | firebase.google.com/support/privacy; DP&S Terms 5.1, 11; Cloud DPA 4.1, 11 | 2026-11-24 |
| 16 | Transfers: Firebase Auth runs only from US data centers. Under the DP&S Terms Google relies on the EU-US Data Privacy Framework (Google certified) where available, otherwise SCCs (DP&S 10.2, 10.6). Cloud DPA names an "Alternative Transfer Solution" and SCCs, not DPF by name. For the notice: say data is stored in the US and name the safeguard as "the transfer mechanisms Google offers (EU-US Data Privacy Framework or standard contractual clauses)". | Firebase privacy page; DP&S Terms 10; Cloud DPA App. 3 | 2026-11-24 |
| 17 | What Firebase Auth stores: email, password/phone if used, **user agent and IP address** (used for security and abuse prevention). IP logs are kept "a few weeks"; other auth data until the customer deletes the user. Deleted data leaves live and backup systems within **180 days**. Firestore: the page lists no end-user data and no retention; Google's general 180-day deletion applies under the DP&S Terms/Cloud DPA (6.1). Firestore location is chosen by us (`us-south1`); the page says Firestore is global unless a location is set. | firebase.google.com/support/privacy; DP&S Terms 6.1 | 2026-11-24 |
| 18 | The Firebase terms table has a business-use clause: you accept that use is for purposes related to a trade, business, craft or profession. A pure hobby project may sit awkwardly with that wording; whether it matters is `unverified` and is RJ's call. | firebase.google.com/terms (intro table) | 2026-11-24 |
| 19 | Google OAuth (only if Google sign-in is added): apps that are External, Published and show a name or logo need **brand verification**. Needs a publicly reachable home page that describes the app and links to the privacy policy; the privacy policy must be hosted on the **same domain** as the home page, linked from the consent screen, and say how Google user data is accessed, used, stored and shared; authorised domains must be verified in Search Console. The policy URL must be set in the OAuth client config. Use of Google user data must stay within what the policy says; if usage changes, notify users and get consent. Limited Use rules apply to sensitive/restricted scopes; basic sign-in scopes are not classified on the page (`unverified`). The policy also says child-directed apps should not use Google Sign-In. `riftbound-deckbuilder.web.app` is a Firebase-owned domain, so Search Console ownership of `.web.app` for authorised domains may be an obstacle (`unverified`; a custom domain may be needed). | developers.google.com brand-verification and API Services User Data Policy | 2026-11-24 |
| **Q4 Riot** | | | |
| 20 | Riot's developer policies (general and Riftbound) do not set any privacy-policy, data-retention or data-deletion rule for third-party tools. They link to Riot's own privacy notice for Riot's data. General policy: do not de-anonymise players; do not share your own Riot login. Riftbound policy: apps that keep deck/card win-rate metagame data are not allowed (matches ADR-0003); RSO (Riot Sign On) is the way to learn which Riot account is logged in. Rift Builder does not use RSO and collects no Riot account data, so say so in the notice. Fan content must carry the Legal Jibber Jabber statement (see [[Riot Developer Rules]]). | developer.riotgames.com/policies/general, /riftbound | 2026-11-24 |
| 21 | H-011 (production key / app application) has no privacy-policy field known to us from these pages. Offering the notice URL in the application is still sensible. `status: unverified` (application form not visible to researcher). | [[Riot App Application]] | 2026-11-24 |
| 22 | If card images load from a Riot CDN or any third-party host (H-020, [[Card Data & Images]]), the user's browser sends its IP address and user agent to that host. That is a recipient and must be named in the notice. Self-hosted/cached images or same-origin images avoid this. Source not final, so keep a conditional line in the notice. | derived; HTTP behaviour | 2026-11-24 |
| **Q5 Practicalities** | | | |
| 23 | Contact: GDPR Art. 13 and CalOPPA ask for how to reach the controller/for a request process; an email address is the practical minimum. A postal address is **not** required by the laws read here; CAN-SPAM-style postal addresses apply to marketing email, which we do not send. `status: unverified` for countries not covered (a UK/EU authority could expect more). | Art. 13; CalOPPA text | 2026-11-24 |
| 24 | ePrivacy Art. 5(3) (and UK PECR reg. 6): storing or reading data on a user's device needs clear information and a chance to refuse, except storage **strictly necessary** for a service the user explicitly requested. ICO: judged from the user's side; authentication (staying logged in) is an example of an exempt use; a second purpose (advertising, tracking, personalisation) removes the exemption. The ICO page seen does not name local storage; secondary summaries say the 2026 guidance covers local storage, IndexedDB-style tech. Our storage (collection, tags, decks, locks, view state, sync log, Firebase Auth session, `rift.emailForSignIn`) is used only to run the feature the user asked for, so consent is not needed. Still state it in the notice. | EUR-Lex Dir. 2002/58 Art. 5(3) (original text); ICO exceptions page; Lewis Silkin/ICO news via search | 2026-11-24 |
| 25 | Firebase Auth persistence is browser storage (the default is `local`); the docs say nothing of cookies except that the browser must allow its storage. Firebase Hosting passes only a `__session` cookie to Functions/Run, which we do not use. Nothing found shows Firebase setting a cookie for our setup; in-browser confirmation of "no cookies" is `unverified` (check DevTools Application tab before launch). | firebase.google.com/docs auth persistence, hosting cache | 2026-11-24 |
| 26 | Cookie banner: not needed given row 24 and no analytics, ads or third-party embeds (verified in `web/` by RJ's check on 2026-11-24: no gtag/GA/measurementId; fonts self-hosted; `cli.analytics` in angular.json is Angular CLI developer telemetry only). It would be needed if analytics, ads, or a third-party widget were added. | derived from row 24 and the web/ check | 2026-11-24 |
| 27 | Do Not Track / Global Privacy Control: CalOPPA only requires saying how DNT is handled. Rift Builder does not track, so say "we do not track you across sites, so there is nothing to opt out of, and we do not respond to DNT because we do not do tracking". GPC is required to be honoured only by covered businesses under CCPA (not us); the notice may say the site does not sell or share data and ignores no choice because none is tracked. | CalOPPA text; globalprivacycontrol.org FAQ (via search) | 2026-11-24 |
| 28 | Retention for the notice: account data until the user deletes the account (SYNC-095/096); deleted data leaves Google's live and backup systems within about 180 days; Auth IP logs a few weeks; the local copy is cleared on sign-out. Firestore/Auth deletion speed in practice: the app deletes documents and the Auth user immediately; backups follow Google's 180-day window. | Firebase privacy page; DP&S Terms 6.1; SYNC-096 | 2026-11-24 |
| 29 | Facts RJ verified in `web/` on 2026-11-24 (not re-checked by researcher): no analytics SDK; self-hosted fonts; localStorage keys prefixed `rift.` plus `rift.emailForSignIn`; Firebase Auth session persistence in IndexedDB, falling back to localStorage (`firebase-adapters.ts`, validator 2026-11-24; `rift-builder-sync` is a Web Locks name, not storage); no cookies set by the app itself. | RJ's check via orchestrator | 2026-11-24 |

## Conflicts / uncertainties
- `status: unverified` **Applicability of GDPR/UK GDPR**: judgement call (rows 4, 5). Writing the notice to GDPR standard hedges the risk. A lawyer would settle it.
- `status: unverified` **Art. 8 / Children's Code** (rows 11, 12): depends on legal basis and whether the app is "likely accessed by children".
- `status: unverified` **COPPA 2025 amendments** (row 10): effective and compliance dates not confirmed.
- `status: unverified` **Google DPA coverage on the free Spark plan** and the Firebase "business use" wording (rows 14, 18).
- `status: unverified` **Google sign-in later**: authorised-domain verification for a `.web.app` domain (row 19).
- `status: unverified` **Other US states, PIPEDA, UK representative** (rows 5, 8, 9).
- Secondary sources only for GDPR text (gdpr-info.eu mirror) and CalOPPA (public.law mirror); the official leginfo and Justia pages returned 403. The ICO "strictly necessary" page was fetched but did not name local storage.
- Conflict between Google documents, minor: Firebase DP&S Terms name the EU-US DPF; Cloud DPA does not by name (row 16). The notice wording avoids naming only one.
- CalOPPA 30-day cure window and low enforcement risk for hobby sites do not remove Google's own "accurate privacy policy" requirement (row 13).

## Impacts
[[Accounts and Sync]] SYNC-101 (the notice contents beyond the facts it lists; this note replaces its `BLOCKED: needs research`), SYNC-007 (RJ approves the notice before `signInEnabled` goes on in production), and open question 10 (privacy notice: "yes", stays gated until this is turned into a notice and RJ approves it). Also [[Riot Developer Rules]], [[Riot App Application]] (H-011), [[Card Data & Images]] (H-020, image host as a recipient).

## Checklist: what the notice must state
Numbered for spec-writer to turn into SYNC-101 wording. "RJ supplies" = a value only RJ can give.

1. **Who we are**: Rift Builder is a free, non-commercial fan project run by one individual in the US; not affiliated with or endorsed by Riot Games (plus the Legal Jibber Jabber line). Drives: GDPR Art. 13(1)(a), CalOPPA. **RJ supplies**: the name to use (name or handle) and a **contact email** (or form). No postal address is required (row 23).
2. **Effective date** and "last updated" date. Drives: CalOPPA 22575(b)(4). **RJ supplies** the date.
3. **How you will be told of changes**: the page is updated with a new date; for material changes, a notice in the app on next sign-in (the exact method is a product choice for RJ; the notice must say which). Drives: CalOPPA (b)(3); Google user-data policy (notify and get consent if use of data changes).
4. **What we collect, by category**: email address (via Firebase Authentication); Firebase user ID; collection (card keys, counts, printing ids); tags (labels, colours, flags); decks (names, sources, notes, card lists); deck lock times; timestamps; app build version. Free-text fields are chosen by the user: advise not to put personal data in them. Drives: GDPR 13(1), CalOPPA (b)(1), Google APIs ToS 3(d); SYNC-100.
5. **What Google collects on our behalf**: Firebase Authentication also keeps IP address and user agent for security and abuse prevention; IP logs for a few weeks. Drives: Google APIs ToS 3(d) (accuracy), GDPR 13(1)(e).
6. **What we do not collect**: no analytics, advertising or tracking tools; no Riot account data or Riot login; no payment data; no data from signed-out use (Home and Tournaments store nothing in the cloud). Drives: CalOPPA DNT disclosure; Riot policy fit; accuracy (verified 2026-11-24).
7. **Why (purposes)**: to run the account, keep the collection, tags, decks and locks in sync across the user's devices, keep the service secure, and delete on request. Not used for marketing or sale. Drives: GDPR 13(1)(c).
8. **Legal basis (if EU/UK users are addressed)**: the service the user asks for (contract) and our legitimate interest in security. Drives: GDPR 13(1)(c). Wording is a judgement item: **RJ approves** (row 2).
9. **Who receives it**: Google (Firebase Authentication, Cloud Firestore, Firebase Hosting) as our service provider/processor; nobody else; the data is not sold or shared. Add any image host if card images load from a third-party/Riot CDN (row 22). Drives: GDPR 13(1)(e); CalOPPA (b)(1) categories of third parties.
10. **Where it is stored and international transfer**: Firestore in `us-south1` (Dallas, USA); Firebase Authentication runs from US data centers; people outside the US are told their data goes to the US, protected by Google's transfer mechanisms (EU-US Data Privacy Framework or standard contractual clauses). Drives: GDPR 13(1)(f).
11. **Who can read it**: only the signed-in owner, through owner-only security rules (SYNC-110); the operator can technically access the database console as administrator (state it honestly: **RJ confirms** the wording). Drives: accuracy.
12. **Browser storage**: the app stores the user's own data and view settings on the device (`rift.` keys), keeps the email typed during an email-link sign-in (`rift.emailForSignIn`) and the Firebase sign-in session in browser storage; no cookies set by the app (verify before launch); used only to run features the user asked for, so no consent banner; sign-out clears the device copy (SYNC-091). Drives: ePrivacy Art. 5(3) / PECR reg. 6 (information duty), CalOPPA accuracy.
13. **Do Not Track / Global Privacy Control**: say we do not track users across sites or over time, and do not sell or share data, so DNT and GPC signals change nothing. Drives: CalOPPA 22575(b)(5); other parties' tracking line (b)(6): "no third party tracks you on this site through us" (true only while no analytics/ad/embed is added).
14. **Retention**: kept until the user deletes the account; local copy cleared on sign-out; after deletion, Google removes data from live and backup systems within about 180 days; Auth IP logs a few weeks. Drives: GDPR 13(2)(a).
15. **How to see, change and delete**: edit in the app; export (if offered; Google APIs ToS 5(d) applies to Google-API-sourced data, so optional); delete everything in Settings, Delete account and data (SYNC-095, SYNC-096); email for other requests. Drives: GDPR 13(2)(b); CalOPPA (b)(2).
16. **Rights (for people in the EU/UK)**: access, correction, erasure, restriction, objection, portability; how to ask (contact email); we answer within one month (GDPR Art. 12 timing, not re-fetched; `unverified` figure). Drives: GDPR 13(2)(b).
17. **Right to complain** to a data protection authority (for example in the user's country). Drives: GDPR 13(2)(d).
18. **Whether providing the data is required**: an email is needed only to make an account; without an account the user can still use Home and Tournaments. Drives: GDPR 13(2)(e).
19. **No automated decisions or profiling.** Drives: GDPR 13(2)(f).
20. **Children**: the service is not directed to children under 13 and we do not knowingly collect data from them; accounts are for people 13 and over (and if local law sets a higher age, with a parent's permission); if we learn an under-13 has an account, we delete it and its data. Drives: COPPA (actual knowledge), GDPR Art. 8, Children's Code spirit. **RJ chooses** the age line (13 or 16).
21. **Security**: data travels over HTTPS and is encrypted at rest by Google; how breaches are handled (tell affected users where the law requires). Drives: Google APIs ToS 3(b); US state breach laws (unverified).
22. **Riot**: fan project, not endorsed by Riot Games; the Legal Jibber Jabber statement; no Riot account or API data about the user is collected. Drives: [[Riot Developer Rules]] rule 6; Legal Jibber Jabber.
23. **Link placement**: link from the sign-in dialog, Settings and the footer (SYNC-101), and conspicuous on the home page. Drives: CalOPPA "conspicuously post"; Google brand verification (same-domain home page link) if Google sign-in is added.
24. **If Google sign-in is added later**: add what Google gives us (email, name, photo not stored in Firestore), and that use of that data stays within this notice; revisit rows 19 and 20.

## Possible follow-ups
For the orchestrator to file (none done by this note):
- **Spec-writer**: turn the checklist into SYNC-101 wording and drop `BLOCKED: needs research`; add acceptance criteria (the page lists every item; footer, Settings and sign-in dialog link to it).
- **Builder**: a `/privacy` route and footer link (also in the sign-in dialog and Settings); a short age line near the sign-in form ("For ages 13 and over", wording by RJ); no new data fields.
- **Builder / validator**: before launch, check DevTools for cookies and third-party requests (`Set-Cookie`, requests to googleapis beyond Firebase, image host) to confirm the notice is accurate; re-run if an image CDN or analytics is added.
- **Researcher**: decide with RJ whether to confirm the unverified rows (UK representative, COPPA 2025 dates, Spark plan DPA, `.web.app` domain verification for Google sign-in) before Google sign-in is added; recheck the CCPA threshold in January 2027.
- **RJ decisions**: contact email, effective date, name used, age line (13 or 16), how material changes are announced, and whether the Firebase "business use" wording and Spark plan DPA matter to him.
- **Handoff**: card image source (H-020): if a Riot or third-party CDN is used, update checklist item 9.
