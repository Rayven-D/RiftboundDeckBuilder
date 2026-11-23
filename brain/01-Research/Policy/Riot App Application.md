---
tags: [research, policy]
area: policy
status: verified
as_of: 2026-11-23
sources:
  - url: https://developer.riotgames.com/docs/riftbound
    tier: official
  - url: https://developer.riotgames.com/policies/riftbound
    tier: official
  - url: https://developer.riotgames.com/docs/portal
    tier: official
---
# Riot App Application (Riftbound production key)

## Summary
To get an approved, app-specific key for Riftbound, register the product on the Developer Portal
and submit an application that shows an approved use case (deck builders and card libraries
qualify) and evidence that we can deliver it. Riot answers through the portal's messages and may
grant, deny, or revoke keys at its sole discretion. No published timeline or fee.

## Steps
1. Sign in at developer.riotgames.com, then click **Register Product**. Signing in already gave us the development key.
2. Fill in the application:
   - name and contact information
   - an app description: use case, a demonstration of how the app delivers it, and the user flow
   - where it will be distributed and which platforms (web)
   - **a valid URL** where the app, a prototype, or a mockup can be accessed
3. If the app isn't testable yet, a working prototype or a detailed mockup showing purpose and user flow is acceptable.
4. Make the application "complete and reasonably comprehensive". Incomplete ones aren't approved.
5. Put gray-area questions in an **App Note** inside the application.
6. Riot replies with approval, rejection, or questions in the portal's application messages.

## What Riot evaluates
- Is the use case approved? Deck builders and card libraries: yes.
- Can we deliver it? Evidence ranges from an established brand, to a functional app, to a mostly testable prototype, to mockups of the user flow.

## Ways an application gets rejected (relevant to us)
- **No link to a site or mockup.** A localhost-only prototype won't do, so we need a reachable URL (a hosted mockup or a demo page).
- **A small, personal audience.** Describe it as a public tool for the Riftbound community.
- Publishing or retaining metagame data: avoided per [[ADR-0003 Tournament Results Only]].
- Middle-man data reselling, gambling, crypto, ranks or ladders: not applicable.

## Requirements to receive and keep the key
- A built-in deckbuilder must **enforce the official deckbuilding rules** (SPEC-002).
- Official English card text; only assets from the Riot API; label previewed cards.
- Don't alter official formats; label custom formats as unofficial.
- The Legal Jibber Jabber Section 6 statement must be easy to find; don't imply endorsement.
- Support new card properties within a reasonable time.
- One product per production key; HTTPS; the key is never in client code; keep the product's description current.
- Riot Sign-On isn't needed (it's only for apps that simulate gameplay).

## Conflicts / uncertainties
- The general portal rules RJ received forbid charging money at all, while the Riftbound policy allows transformative paid content. We stay free, so this doesn't matter.
- Neither page gives a review timeline.

## Impacts
[[Deck Legality]] (rule enforcement is a requirement), [[UI Index]] (legal notice, labels for previewed cards), H-011
