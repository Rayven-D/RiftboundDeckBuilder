---
tags: [adr, hosting]
status: deferred
date: 2026-11-23
revisit: when the MVP is feature-complete locally
---
# ADR-0004: Hosting (Deferred)

## Context
RJ wants to host the app eventually on **Firebase or AWS, whichever is cheaper** for our usage.
Development stays local until the MVP is done ([[ADR-0001 Tech Stack]]).

## To decide later
- Compare costs at the expected traffic: static hosting for the Angular build, the API
  (Cloud Functions / Cloud Run vs. Lambda / App Runner), storage, egress for card images (or none,
  if images are served from Riot's API), and the database, if we have one by then.
- The region should be close to Texas (e.g. GCP us-south1 Dallas, AWS us-east-2 Ohio / us-east-1).
- The Riot API key requirements: the production URL and any server-side key handling.

## Until then
Code must stay host-neutral (see the consequences in ADR-0001). Validation check V-011 enforces this.
