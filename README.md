# Chengeta / Londoloza — Insurance Module of the Muyamuri / Umsizi Sovereign Data Platform

**ICZ Insurance Innovation Challenge 2026**
*Artificial Intelligence for Maximum Social Impact and Data-Driven Insurance Risk Pricing*

System demonstration videos:

1. https://youtu.be/mNvA0TfymUQ
2. https://youtu.be/fRJ5T6rEpj0

### Deployment status at time of submission

The system is **partially deployed**, for the following reasons:

1. The chatbot is public on **+263 73 507 7638** and **+263 719 93 0210**, in preparation for pilot testing.
2. City council and emergency-responder buy-in is required for the civic modules that feed the risk layer.
3. Meta does not permit public exposition of a WhatsApp chatbot until it is fully tested and in production; those processes are underway.

### Honest status of the insurance module

Stated here rather than discovered later. The insurance module is **functionally complete end to end and commercially unproven**:

- There are **no live users and no written premium**. Every figure in any demonstration is seeded data on a working system.
- There is **no loss ratio and no back-test** of the rating model against real claims. The first thing we ask of a sponsoring insurer is 24 months of claims history under NDA.
- **Insurer tenancy rails in placed but not wired.** Portal access is governed by seniority, not by insurer, so two competing insurers must not both be given portal accounts until it is. See [Known Gaps](#known-gaps).

---

## Table of Contents

- [Overview](#overview)
- [What the Insurance Module Does](#what-the-insurance-module-does)
- [System Architecture](#system-architecture)
- [The Ten Civic Modules](#the-ten-civic-modules)
- [Five Channels](#five-channels)
- [Data Flow Summary](#data-flow-summary)
- [Data Governance — Route 1 and Route 2](#data-governance--route-1-and-route-2)
- [Key Features](#key-features)
  - [1. Insurance Distribution and Comparison](#1-insurance-distribution-and-comparison)
  - [2. Risk-Based Rating Engine](#2-risk-based-rating-engine)
  - [3. Parametric (Index) Cover](#3-parametric-index-cover)
  - [4. Purchase, KYC and Premium Collection](#4-purchase-kyc-and-premium-collection)
  - [5. Claims and Corroboration](#5-claims-and-corroboration)
  - [6. Insurer Portal and Verification Desk](#6-insurer-portal-and-verification-desk)
  - [7. Emergency Reporting Module](#7-emergency-reporting-module)
  - [8. Municipal Services Module](#8-municipal-services-module)
  - [9. Agricultural Support Module (Agromate)](#9-agricultural-support-module-agromate)
  - [10. Artisanal Mining Module](#10-artisanal-mining-module)
  - [11. Roadside Assistance and Nzira / Indlela](#11-roadside-assistance-and-nzira--indlela)
  - [12. Government Communication Module](#12-government-communication-module)
  - [13. Data Sovereignty (Project Zvipo)](#13-data-sovereignty-project-zvipo)
- [Security and Privacy](#security-and-privacy)
- [Prerequisites](#prerequisites)
- [Setup and Installation](#setup-and-installation)
- [Environment Variables](#environment-variables)
- [Running the System](#running-the-system)
- [Database Schema Management](#database-schema-management)
- [Seeding Demonstration Data](#seeding-demonstration-data)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Status](#project-status)
- [Known Gaps](#known-gaps)
- [Development Roadmap](#development-roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Contact](#contact)

---

## Overview

**Chengeta / Londoloza** is the insurance module of **Muyamuri / Umsizi**, a national civic platform already in use for ten services that have nothing to do with insurance. It distributes, prices and settles cover for populations the industry has never had an interface to.

Zimbabwe's insurance penetration is roughly **2% of GDP** against a global average near 6%. Around **88%** of policies in force are compulsory motor. Meanwhile some **76%** of economic activity is informal and substantially uncovered. Two distinct causes sustain this, and conventional approaches address only one at a time:

| Cause | Why existing approaches fail |
|---|---|
| **Reach.** No branch or broker network economically serves a gold panner in Kadoma or a smallholder in Gokwe. | A digital broker solves distribution but still prices blind, so it must load heavily or decline. |
| **Pricing information.** No address database, no claims history for an informal trader, no hazard map, no crop record. | A data vendor can sell a risk score but has no channel to the customer that score describes. |

The platform leverages WhatsApp's ubiquity — over 12.83 million active internet subscriptions in Zimbabwe — as an inclusion rail reaching feature phones with no data bundle, alongside USSD, a mobile app, an insurer portal and a partner API.

### The premise

> **Insurance here is a second use of data collected for a first purpose — which is exactly why it has provenance.**

A citizen files a hazard report to get a pothole fixed, walks a mining claim boundary to regularise a title, or records a field boundary to decide when to plant. Nobody produced that data to obtain a cheaper premium, which is both why it can be trusted and why it cannot be assembled by an insurer or an insurtech without first operating the civic services that generate it.

### Repository components

| Component | Technology | Purpose |
|---|---|---|
| **Platform backend** | NestJS, TypeScript, TypeORM | 39 modules including the insurance module; REST API; WhatsApp and USSD webhooks; business logic and persistence |
| **Database** | Microsoft SQL Server | 129 entities; additive schema management via `db:init` |
| **RAG service** | Python, Flask | Document retrieval, embeddings and LLM inference with citations; reached by the backend over HTTP |
| **Insurer / staff portal** | React, TypeScript, MUI | Insurer desk, claims queue, verification desk, partner administration, analytics |
| **Citizen mobile app** | React Native (Expo) | Photographic claims, document wallet, policy library, map-based reporting, mining boundary walk, Nzira navigation |

---

## What the Insurance Module Does

| Capability | Summary |
|---|---|
| **Nine covers quotable** | Household buildings and contents, household contents, motor third party, motor comprehensive, micro personal accident, micro funeral, drought index, ASM personal accident, ASM equipment |
| **Multi-insurer comparison** | Every active insurer on the panel quotes the same risk simultaneously; the citizen sees the spread and chooses |
| **Explainable pricing** | Reply `WHY 3` to receive that insurer's own rating breakdown, factor by factor, in the channel the quote was issued in |
| **Per-cover rating discipline** | Each cover declares which factors apply; a factor not declared is never requested, never queried and never loaded |
| **Parametric cover** | Index drought and excess-rain products priced on the platform's own seasonal rainfall record, with partial credibility and a minimum-seasons floor |
| **End-to-end purchase** | Product selection, KYC capture, premium collection and policy bind without leaving WhatsApp |
| **Cross-channel resumption** | A purchase interrupted on one channel resumes from the same step on any other |
| **Claims corroboration** | Claims matched against independent civic incident records on type, place and time |
| **Verification desk** | Stalled purchases queued for manual callback, with KYC document viewing and an appended verification history |

---

## System Architecture

```
   WhatsApp Cloud API        USSD gateway        Mobile app (Expo)
            |                      |                     |
            +----------+-----------+----------+----------+
                       |                      |
                 NestJS backend  <------>  Insurer portal (React)
                  (39 modules)                   |
                       |                    Partner API (REST)
          +------------+-------------+
          |                          |
   SQL Server (TypeORM)        Flask RAG service
   129 entities                (document inquiry)
          |
   Encrypted file store (KYC documents, claim media)
```

Chengeta / Londoloza is a **module inside** the Muyamuri backend, not a separate deployment. It reaches platform data through two explicitly declared ports rather than by importing civic services directly:

| Port | Adapter | Supplies |
|---|---|---|
| `RISK_SIGNAL_PORT` | `RiskApiAdapter` | Banded area incident signals (Route 2) |
| `WEATHER_SIGNAL_PORT` | `AgromateWeatherAdapter` | Seasonal rainfall at a field boundary |

Two tokens rather than one, deliberately. Rainfall for parametric cover arrives from Agromate under its own agreement; crime and incident bands arrive from authority MOUs over the risk API. A single port for both is how a drought policy ends up priced on a burglary rate.

`RiskApiAdapter` calls the platform's own risk API over loopback rather than reaching into its services in-process. Inside one process that looks like a detour, and it is the point: the request carries the insurer's key and passes the guard, the entitlement check and the audit write exactly as an external call would.

### Design properties

| Property | What it means for an underwriting partner |
|---|---|
| **Never blocks** | A hard ceiling on every external data call. A quote is never lost to a slow upstream service. |
| **Never fails visibly** | Every external-data failure degrades to a clean base-rate quote, with the reason stated on the quote — never an error shown to the applicant and never a silently cheaper price. |
| **Full audit trail** | Every premium's complete rating trace is persisted as issued — defensible to IPEC, to a reinsurer and to the customer. |
| **Modular** | Distribution, underwriting, claims, policies and navigation onboard without touching the core. |

---

## The Ten Civic Modules

Insurance is the tenth. The other nine describe a population, a place or an asset as a by-product of doing their actual job.

| Module | What it produces |
|---|---|
| Emergency reporting | Incident type, place, time, outcome |
| Roadside assistance | Breakdown cause, location, recovery |
| Road hazard reports | Corroborated hazard geography |
| Municipal services | Water, refuse and fault reports by suburb |
| Agromate | Field boundaries, rainfall, seasons |
| Mining regularisation | Claim boundaries, workings, crew sizes |
| Facility directory | Clinics, police, fire stations, workshops |
| Public notices | Authority-to-citizen broadcast |
| Nzira / Indlela | Hazard-aware navigation |
| **Chengeta / Londoloza** | **Insurance** |

---

## Five Channels

This is **not a WhatsApp product**. WhatsApp is the inclusion rail.

| Channel | Role |
|---|---|
| **WhatsApp** | Quote, compare, buy, upload KYC, pay, claim. Shona, Ndebele and English. Interactive menus rather than free-text parsing. |
| **USSD** | No smartphone, no internet. Balance, renewal, resume a purchase. The PIN prompt confirming payment arrives here. |
| **Mobile app** | Photographic claims, document wallet, policy library, map-based incident reporting, Nzira navigation, mining boundary walk. |
| **Insurer portal** | Underwriting desk, claims queue, pending applications, rating audit trail, document reveal — scoped by RBAC. |
| **Partner API** | Versioned REST. An insurer keeps its own core system and consumes quotes, policies and claims as events. |

**One policy record, five ways in.** A gold panner buys over WhatsApp, confirms with a USSD PIN, photographs damage in the app, and the insurer sees one claim on one desk.

---

## Data Flow Summary

| Step | Actor | Action | Destination |
|---|---|---|---|
| 1 | Citizen | Sends WhatsApp message (text, image, audio, video, location, document) | Backend webhook |
| 2 | Backend | Flood check, number affinity, session routing, intent classification | Session handler |
| 3 | Backend | For civic reports: triage, department routing, multi-responder dispatch | Responder network |
| 4 | Backend | For insurance: product selection, rating, multi-insurer comparison | Rating engine |
| 5 | Rating engine | Requests only the factors the chosen cover declares | Risk / weather ports |
| 6 | Backend | Returns the panel with disclosure of what each price was based on | WhatsApp |
| 7 | Citizen | Selects a quote; supplies KYC; receives an EcoCash PIN prompt on their handset | EcoCash |
| 8 | Backend | On settlement, binds the policy and writes the rating trace | SQL Server |
| 9 | Insurer desk | Works claims, verifies stalled applications, calls customers back | Portal |
| 10 | Backend | Sends status updates to citizens | WhatsApp / USSD |

---

## Data Governance — Route 1 and Route 2

The commercial value of the platform rests on data the citizen consented to. The distinction between the two routes is a business control, not a technical detail.

| | **Route 1 — first party** | **Route 2 — aggregate area signal** |
|---|---|---|
| What | The applicant's own data: their field boundary, their mining claim, their callout history | Incident density for a small geographic cell |
| Consent | Given by the applicant at quotation | Authority MOU plus platform governance |
| Granularity | That applicant only | Banded, never a raw count |
| Suppression | n/a | Released only where a cell holds at least **15 reports from at least 5 distinct reporters** |
| Needs an agreement | No | Yes |
| Status | Live | Gate built; 5 of 9 demonstration partners entitled |

### Governing rules

- **A citizen's own civic report may never increase that citizen's own premium.** If reporting a hazard could raise the reporter's premium, citizens would stop reporting and the civic platform would be consumed to feed the insurance one. The entire data asset depends on this holding absolutely.
- **A signal that is absent says so.** An unentitled insurer, a thin cell or a failed call all produce a clean base-rate quote that discloses it was priced on base rates. Never a silent substitution.
- **Area signals may price an insurer's own book. They may not be used to decline.**

Route 1 compounds from the first policy written and requires nobody's permission. Route 2 is upside on a timeline governed by signatures rather than engineering.

---

## Key Features

### 1. Insurance Distribution and Comparison

- Nine covers presented as a single WhatsApp interactive list — products first, then only the variables that product actually prices on
- Simultaneous quotation by every active insurer on the panel
- Each insurer sets its own **rate factor**, so joining the panel is not accepting someone else's risk appetite
- Reply `WHY <n>` by position in the list rather than retyping a reference
- Reply `BUY <n>` to proceed; `RESUME` to pick up anything left part-finished
- Shona, Ndebele and English

### 2. Risk-Based Rating Engine

Each cover declares a rating profile: which factors apply, the ceiling for automatic acceptance, and the sentence shown to the customer about what the price was based on.

| Cover | Factors that apply |
|---|---|
| Micro funeral | Age band and sum insured only |
| Micro personal accident | Occupation class and sum insured only |
| ASM personal accident | Exposure count, workings class |
| Household (buildings / contents) | Construction, security, claims history, area |
| Motor (third party / comprehensive) | Security, claims history |
| Index drought / excess rain | Seasonal rainfall at the insured field |

**Invariants enforced by the engine:**

- An unanswered question prices **neutral**, never at the worst case
- Referral thresholds are set **per cover**, not globally
- A cover with no rating profile **cannot be priced at all** — it throws rather than falling back to a default rate
- The risk service is **never called** where no area factor exists
- The disclosure shown to the customer lists exactly the factors applied, and no others

### 3. Parametric (Index) Cover

Agromate holds field boundaries, seasonal rainfall and forecasts because farmers use them to decide when to plant. That is the same series an index product needs to set a trigger — which makes parametric cover possible without buying a third-party weather index.

| Constant | Value | Meaning |
|---|---|---|
| Minimum seasons for rating | 10 | Below this the signal does not price at all |
| Full credibility | 30 seasons | Full weight on observed frequency |
| Maximum loading | +50% | Loading ceiling |
| Maximum discount | −30% | Discount floor |

Observed trigger frequency is blended with the rate table's assumption in proportion to seasons available — standard actuarial partial credibility. The novelty is having a first-party series to apply it to, not the mathematics.

No loss assessor ever visits a 1.5-hectare plot. The trigger is observable, the payout is arithmetic, and the dispute surface is close to zero.

### 4. Purchase, KYC and Premium Collection

A policy can be sold, paid for and bound **without leaving the chat**.

1. **Eligibility first.** A quote requiring underwriter referral, or one that has expired, is refused before any identity data is requested.
2. **Tiered KYC.** Each insurer sets its own policy and document threshold — simplified verification below it, full documentary KYC above. An unrecognised partner defaults to full.
3. **Documents in the thread.** ID and proof of address photographed on WhatsApp, encrypted before they touch disk.
4. **USSD PIN payment.** EcoCash pushes a prompt to the subscriber's own handset. No card number, and **the platform never asks for a PIN**.
5. **Pay first, bind second.** No cover is in force until the premium settles — at a desk as well as in the chat.

**Interruption handling.** Where a PIN prompt goes unanswered, the chat asks explicitly whether to continue **now** or **later**. No answer parks the purchase as resumable from the step reached, on any channel. At most three charge attempts, a 90-second PIN window, and at least 20 hours between reminder prompts so a hesitant buyer is never harassed.

### 5. Claims and Corroboration

A policyholder in a collision reports it as an emergency, because that is the urgent thing. Dispatch goes out. The report carries a type, a place, a time, an outcome and a reporter whose credibility is already scored. When a claim arrives against the same policy, that record is already beside it.

Three states, deliberately:

| State | Meaning |
|---|---|
| **Corroborated** | An independent civic report matches the claim in type, place and time |
| **No matching record** | **Not evidence of fraud.** Most losses are never reported to anyone |
| **Contradicted** | A record exists and disagrees — this one goes to a human assessor |

A binary flag would turn an absent record into an accusation, and a district with no data-sharing agreement produces the same silence as a fabricated claim. A decline must record substantive grounds.

### 6. Insurer Portal and Verification Desk

| View | Contents |
|---|---|
| **The book** | Quotes, policies bound, conversion, gross written premium, product and channel mix |
| **Pending applications** | Purchases stalled before bind, flagging those where **payment is the only outstanding step** |
| **Claims queue** | Claims with corroboration state and assessment history |
| **Insurers and entitlements** | Rate factors, KYC policy, Route 2 data entitlements |
| **Route risk** | Per-entitled-insurer cell picture |

The **verification desk** resolves stalled sales. The queue identifies nobody — references, products, amounts and how long each has been stuck. Opening an individual submission is a separate, narrower permission that decrypts a name, an ID number and a callback number, and is logged every time. KYC documents are served one at a time, decrypted in flight, inline and uncached.

A **call outcome** increments the callback counter; a **verification decision** does not. Notes are appended with timestamp and actor, never overwritten. Marking identity verified returns an explicit reminder that **no cover is in force and the premium is still outstanding**.

### 7. Emergency Reporting Module

- Automated triage of emergencies (fire, medical, crime, accidents, disasters)
- Negation-aware text matching — "nobody hurt" does not dispatch an ambulance, and "out of fuel" does not dispatch a fire engine
- GPS location integration and multi-responder parallel dispatch
- Priority-based routing with status tracked to resolution
- Reporter credibility scoring, built to stop false callouts and reusable as a fraud signal on a claim from the same identity

### 8. Municipal Services Module

- Image and location-based issue reporting (potholes, waste, water systems)
- Automated routing to the relevant department
- Citizen feedback and satisfaction tracking
- Performance analytics for municipal authorities

### 9. Agricultural Support Module (Agromate)

- Field boundary capture; hectares, perimeter and centroid derived from a walked or drawn boundary
- Seasonal rainfall and forecast history at the field
- AI-assisted crop disease diagnosis via image analysis
- Pest control and crop protection advice
- Animal invasion reporting to National Parks
- Spatial analytics for disease and pest prevalence
- **Feeds the parametric insurance trigger directly**

### 10. Artisanal Mining Module

The worked example of how a civic module creates an insurable class:

1. A syndicate registers to regularise — their reason is a mining title, not a policy
2. They walk the boundary with the app; the GPS trace becomes hectares, a perimeter and a centroid
3. Workings and crew are recorded — shaft depth, method, people underground per shift
4. Incidents accrue at that geometry through emergency reporting

An underwriter now has a located, measured risk with a stable identifier, an exposure count, an incident history at that exact site, a peer group of comparable workings, and a channel to the insured. **ASM personal accident becomes quotable** — not because an actuary got braver, but because the class finally has a description.

Includes a free compliance check (about 20 questions) against the 31 December 2026 regularisation deadline, a vetted service directory, and coordinate upload.

### 11. Roadside Assistance and Nzira / Indlela

- Roadside assistance runs as a dispatch service: tyre, battery, fuel, lockout, tow, with status tracking
- A dedicated mobile flow with an **injury gate** — a breakdown report that mentions a casualty is escalated to the emergency path rather than filed as a low-priority breakdown
- **Nzira / Indlela** routes drivers around corroborated hazards. Loss prevention, not loss measurement — it watches the road, not the driver

### 12. Government Communication Module

- Intelligent Q&A with LLM-powered responses over Zimbabwean government documents
- Document reference engine with automatic page-level citations
- Policy update broadcast for new regulations and announcements
- Multilingual support (English, Shona, Ndebele)
- Source verification with document references

### 13. Data Sovereignty (Project Zvipo)

- Public data aggregation and harmonisation
- Indigenous tree knowledge dataset
- Shona and Ndebele language corpora
- Sovereign data platform with API endpoints

---

## Security and Privacy

| Control | Implementation |
|---|---|
| **Field encryption** | AES-256-GCM over names, ID numbers, email and address |
| **Document encryption** | AES-256-GCM file envelope, verified **before** the write — a file that fails the check is refused, not stored |
| **Random filenames** | Document filenames are UUIDs; deriving them from a name or ID would put identity data in every directory listing and log line |
| **Phone numbers** | Stored as a one-way salted hash in the insurance tables |
| **Transport** | TLS throughout |
| **Reveal** | One record at a time, to named roles, logged against the staff account |
| **No bulk decrypt** | There is no bulk decrypt endpoint and none may be added |

### Access tiers

| Tier | Grants | Rationale |
|---|---|---|
| Analytics | Counts, sums, queues | Identifies nobody; the widest tier |
| Desk | Quote and bind on someone's behalf | Writes a policy in a person's name |
| Reveal | Decrypt one named record; view one document | A single record is a person, their address and their worst day |

Role guards take **rank** names, never department names — a department name silently admits nobody.

### Operational rules

- **`DATA_ENCRYPTION_KEY` must be set**, or field encryption silently stores plaintext. If lost, encrypted records are permanently unreadable. Back it up off-server.
- **`PHONE_HASH_SALT` must never be rotated.** Every citizen linkage keys on it.
- **`DB_TRUST_SERVER_CERT=false`** in production.
- **Never commit a `.env`.** Every variant is git-ignored with a committed `.env.example` holding empty values. Anything that reaches a repository or a chat must be rotated.
- **Maps API keys** use four keys with distinct restriction types. The browser key ships in the bundle and is world-readable. Maps keys must never be `EXPO_PUBLIC_`, and a Static Maps URL must never be transmitted because the URL contains the key — fetch server-side and send bytes.
- **Per-call paid APIs** require a billing budget alert and per-API daily quotas before go-live.

### Abuse controls

| Control | Value |
|---|---|
| Per-sender flood limit | 20 messages per 30 seconds |
| Number affinity | One WhatsApp number per citizen at a time, 30-minute TTL |
| Session timeout | 20 minutes |

Number affinity closes the hole where one sender could hold concurrent conversations with both public numbers and double the inbound load. The global IP-keyed throttler cannot cover this, because for a webhook the IP belongs to Meta and is shared by every citizen.

---

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| **Git** | Latest | Version control |
| **Node.js** | v20 LTS or later | Backend, portal, mobile tooling |
| **npm** | Bundled with Node | Package manager |
| **Microsoft SQL Server** | 2019+ | Primary database |
| **Python** | 3.10+ | Flask RAG service |
| **WhatsApp Business API** | Cloud API | Messaging credentials |
| **EcoCash merchant account** | — | Premium collection |

### Optional

| Requirement | Purpose |
|---|---|
| Docker / Docker Compose | Containerised deployment |
| Redis | Caching |
| Nginx | Reverse proxy |
| Prometheus / Grafana | Monitoring |
| Expo CLI | Mobile development |

---

## Setup and Installation

### 1. Clone

```bash
git clone <repository-url>
cd <repository>
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env     # then configure — see Environment Variables
npm run db:status        # compare entities against the database
npm run db:init          # create missing tables, add missing columns
npm run start:dev
```

The backend runs at `http://localhost:3000`.

### 3. Portal

```bash
cd portal
npm install
cp .env.example .env
npm start
```

The portal runs at `http://localhost:3001`.

### 4. Mobile app

```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```

### 5. RAG service

```bash
cd rag
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The RAG service runs at `http://127.0.0.1:4110` and is reached by the backend through `FLASK_BASE_URL`.

---

## Environment Variables

Each component expects a `.env` in its own root. **Never commit one.** The lists below are names and purposes only.

### Backend

```
# Server
PORT=3000
NODE_ENV=development

# SQL Server
DB_HOST=
DB_PORT=1433
DB_USERNAME=
DB_PASSWORD=
DB_DATABASE=
DB_TRUST_SERVER_CERT=false        # false in production

# Encryption — see Security and Privacy
DATA_ENCRYPTION_KEY=              # required; without it, fields store as plaintext
PHONE_HASH_SALT=                  # required; NEVER rotate

# Auth
JWT_SECRET=
JWT_EXPIRES_IN=

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_PHONE_NUMBER_ID_SECONDARY=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_API_VERSION=

# EcoCash
ECOCASH_MERCHANT_CODE=
ECOCASH_API_KEY=
ECOCASH_BASE_URL=

# RAG service
FLASK_BASE_URL=http://127.0.0.1:4110
FLASK_API_KEY=

# Storage
UPLOAD_DIR=./uploads              # encrypted document store lives under this

# Google Maps — server-side key only; never EXPO_PUBLIC_
GOOGLE_MAPS_SERVER_KEY=
GOOGLE_PLACES_KEY=
```

### Portal

```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_BUILD_VERSION=
```

### Mobile

```
EXPO_PUBLIC_API_URL=
# Maps keys must NOT be EXPO_PUBLIC_ — they ship in the bundle.
# Map imagery is fetched server-side and returned as bytes.
```

### RAG service

```
HOST=0.0.0.0
PORT=4110
API_KEY=
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
VECTOR_DB_TYPE=
VECTOR_DB_API_KEY=
DOCUMENT_STORE_PATH=./data/documents
LOG_LEVEL=INFO
```

---

## Running the System

| Order | Service | Command | Port |
|---|---|---|---|
| 1 | SQL Server | (service) | 1433 |
| 2 | RAG service | `python app.py` | 4110 |
| 3 | Backend | `npm run start:dev` | 3000 |
| 4 | Portal | `npm start` | 3001 |
| 5 | Mobile | `npx expo start` | 19000 |

A public HTTPS URL is required for the WhatsApp webhook; use a tunnel in development.

---

## Database Schema Management

| Command | Effect |
|---|---|
| `npm run db:status` | Compares every entity against the live database and reports |
| `npm run db:init` | Creates missing tables and adds missing columns via `ALTER TABLE ADD` |

`db:init` is **additive only**. It never drops a column and never changes a column type — both are reported only. A schema helper that quietly drops a column is worse than no helper.

> **Operational note.** Adding a non-nullable column to an entity without running `db:init` breaks every query that selects it, and the symptom is a total feature failure rather than a partial one. If quotation suddenly fails with a generic message, run `db:status` first.

---

## Seeding Demonstration Data

```bash
npm run seed:insurance           # 9 demonstration partners, products, rate factors
npm run seed:insurance:bulk      # ~1000 rows per scenario
```

Nine demonstration insurers span rate factors 0.92–1.18, five with Route 2 data entitlement, so price comparison and risk-based differences are both visible.

> **SQL Server imposes a hard ceiling of 2,100 parameters per statement.** A multi-row insert spends one parameter per column per row, so batch size is computed from column count rather than fixed. A flat 500-row chunk against a 16-column table is 8,000 parameters and fails.

Demonstration references are banded (`DEMO-Q-5xxxxx`, `DEMO-P-6xxxxx`, `DEMO-C-7xxxxx`) and generation is seeded, so runs are reproducible. Note that `LIKE '[DEMO]%'` treats the brackets as a character class — cleanup must escape them.

---

## Testing

```bash
# Backend
cd backend && npm test
npm run verify-di                 # dependency-injection smoke test
npm run verify-insurance-seam     # port boundary check
npm run verify-portal-tabs        # portal config items against rendered panels

# Portal
cd portal && npm test

# RAG
cd rag && pytest tests/
```

Critical paths are additionally verified by targeted execution harnesses covering the rating engine against every cover, the purchase state machine against a controllable clock, negation-aware emergency routing, the WhatsApp buy flow and the verification desk. The two newest suites are **mutation-tested** — deliberate defects are introduced and the suites confirmed to fail — because a green run on a suite that cannot detect a fault is worse than no suite.

---

## Deployment

### Production checklist

- `NODE_ENV=production` on Node services; `DEBUG=False` on Python services
- `DATA_ENCRYPTION_KEY` set and backed up **off-server**
- `PHONE_HASH_SALT` set and recorded as never-rotate
- `DB_TRUST_SERVER_CERT=false`, with a valid certificate
- `npm run db:status` clean before release
- SSL/TLS certificates and a reverse proxy (nginx)
- Billing budget alerts and per-API daily quotas on every paid external API
- Rate limiting and DDoS protection at the edge
- Monitoring (Prometheus / Grafana) and centralised logging
- Scheduled database backups, tested by restore
- Firewall and security groups
- CI/CD pipeline

### Cloud options

| Provider | Services |
|---|---|
| Azure | App Service or Container Apps, Azure SQL, Blob Storage, Azure OpenAI |
| AWS | ECS or EC2, RDS for SQL Server, S3, Bedrock or SageMaker |
| GCP | Cloud Run, Cloud SQL for SQL Server, Cloud Storage, Vertex AI |
| ZCHPC | Sovereign deployment; architecture configured |

---

## Project Status

### Running today

| Component | Status | Description |
|---|---|---|
| WhatsApp integration | Complete | Bidirectional messaging, full media support, interactive lists |
| USSD channel | Complete | Balance, renewal, purchase resumption |
| Insurance quotation | Complete | Nine covers, nine-insurer panel, explainable pricing |
| Rating engine | Complete | Per-cover factor discipline, persisted rating trace |
| Parametric cover | Complete | Partial credibility, seasons floor, bounded adjustment |
| Purchase and payment | Complete | Tiered KYC, encrypted documents, USSD PIN, resumable state |
| Claims | Complete | Three-state corroboration, FNOL from dispatch |
| Verification desk | Complete | Pending queue, document reveal, callback recording |
| Insurer portal | Complete | Book, claims, applications, partners, route risk |
| Emergency reporting | Complete | Triage, negation-aware matching, multi-responder dispatch |
| Municipal services | Complete | Reporting with tracking and routing |
| Agricultural support | Complete | Boundary capture, rainfall, disease diagnosis |
| Mining module | Complete | Compliance poll, boundary walk, service directory |
| Roadside assistance | Complete | Dispatch with injury gate |
| NLP engine | Complete | Intent classification, entity recognition |
| LLM with RAG | Complete | Citations against government documents |
| Document parsing | Complete | PDF, Excel, Word, CSV with OCR |
| Shona / Ndebele | Complete | Detection and processing on citizen channels |
| Encryption at rest | Complete | Fields and documents, with a pre-write guard |
| ZCHPC readiness | Complete | Deployment architecture configured |

### In development

| Component | Status | Description |
|---|---|---|
| Insurer tenancy | **Critical, specified** | Per-insurer scoping of portal access |
| Scheduled jobs | In progress | Stale-payment reconciliation and reminder prompts |
| Spatial analytics | In progress | Geospatial clustering for prevalence mapping |
| Full multilingual models | In progress | Complete Shona and Ndebele language models |
| Diaspora product | Planned | Hard-currency premium for a local dependent |
| Policy document generation | Planned | Signed contract artefact for the policyholder |
| Indigenous tree dataset | Planned | Field expeditions and community interviews |

---

## Known Gaps

Stated plainly, before a demonstration rather than after one.

### Critical before any insurer sees live data

**Insurer tenancy is not built.** Portal access is governed by seniority, not by insurer, so every partner account can presently see the whole book. The insurer code is recorded on every quote, policy, claim and purchase, so what is outstanding is a scoping predicate and a user-to-partner link rather than a redesign. **Until it is applied, two competing insurers must not both be given portal accounts.**

### Commercial validation

- No live users and no written premium; every demonstration figure is seeded
- No loss ratio, and no back-test of the rating model against real claims

### Functional

| Gap | Consequence |
|---|---|
| No scheduler calls the stale-payment or reminder services | Late settlements are not reconciled automatically; reminders do not send |
| Aggregation's partner read sits outside the per-partner resilience boundary | A database fault fails the whole comparison instead of degrading |
| Agromate seasonal archive depth unverified | Index cover may price on base rates until confirmed |
| Route risk reads a bounded slice of callouts | A busy cell may be understated |
| Diaspora product not built | The one segment paying hard currency is unaddressed |
| Policy document not generated | No contract artefact for the policyholder |

### Encryption consistency

`CitizenContact.phoneNumber` and `PaymentTransaction.ecocashNumber` are stored in plaintext. The former is required to address an outbound message, but both could be encrypted and decrypted on use. Database-level encryption (TDE) is unverified in the target environment; application-level encryption is in place.

---

## Development Roadmap

| Phase | Timeline | Deliverables | Gate |
|---|---|---|---|
| **Phase 1 — prove the pricing** | Months 1–4 | Back-test the rating model against a sponsor's claims history; close the tenancy and archive gaps; pilot on micro and funeral cover | The model holds against real losses |
| **Phase 2 — intelligence live** | Months 5–8 | Authority agreements land; area-adjusted pricing switches on per entitled insurer; Route 1 compounds throughout | The long pole is the MOU, not the code |
| **Phase 3 — national distribution** | Months 9–12 | Open the panel wider; Nzira to every road user; index cover across the smallholder footprint | Unit economics proven per policy |
| **Phase 4 — advanced** | Months 13–18 | Diaspora product, predictive analytics, expanded parametric triggers | — |

Phase 1 writes no policy on an unvalidated model. A pricing edge that has not been tested against an insurer's own losses is a hypothesis, and selling on a hypothesis is how a book goes wrong quietly.

---

## Contributing

### How to contribute

- Fork the repository
- Create a feature branch: `git checkout -b feature/your-feature`
- Commit your changes: `git commit -m "Add: your feature"`
- Push: `git push origin feature/your-feature`
- Open a Pull Request

### Development standards

- **TypeScript / JavaScript:** Airbnb style guide
- **Python:** PEP 8
- **Documentation:** update this README and in-code comments with the change
- **Testing:** all tests pass; new behaviour arrives with a test that fails without it
- **Schema:** entity changes ship with a `db:status` run; never drop a column in a migration helper
- **Security:** never commit `.env` or any secret. Anything that reaches a repository or a chat is compromised and must be rotated.

---

## License

This project is proprietary and confidential. All rights reserved. Copyright © 2026 Decision Edge Consulting (Private) Limited Team.

Unauthorised copying, distribution, modification, or use of this software, via any medium, is strictly prohibited without prior written permission from the authors. For licensing enquiries, please contact: info@decisionedge.co

---

## Acknowledgements

- **ICZ** — Insurance Council of Zimbabwe
- Participating insurers, municipal authorities and emergency responders engaged in pilot preparation

---

## Contact

| Role | Contact |
|---|---|
| Project Lead | tvakisai@decisionedge.co.zw |
| Technical Support | info@decisionedge.co |

---

Built with care in Zimbabwe.
