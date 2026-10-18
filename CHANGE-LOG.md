# Muyamuri — Development Changelog & Status

**Source:** Consolidated from development task list (v2 — additional items appended)
**Status legend:**

| Symbol | Meaning |
|--------|---------|
| ✅ | Done / Resolved |
| 🔄 | In Progress |
| ❌ | Not Started / Open |
| ⚠️ | Status unspecified — needs confirmation |
| 🐛 | Issue (bug / defect) |
| ✨ | Feature / Enhancement |

> **Note on chronology & clustering:** Sections follow the original list's chronological order. Related items are clustered; items that appear later but belong to an earlier theme are noted. Duplicates have been consolidated (see §14). Issues are isolated in §12 and summarised in §13.

---

## 1. Core Platform, Security & Routing

| # | Change | Type | Status |
|---|--------|------|--------|
| 1 | Rebuild the NLP classifier | ✨ Feature | ✅ Done |
| 2 | Encrypt citizen media at rest | ✨ Security | ✅ Done |
| 3 | Close the public consent and report endpoints | ✨ Security | ✅ Done |
| 4 | Add consent and data rights to the profile menu | ✨ Feature | ✅ Done |
| 5 | Fix transport config and document the posture | 🐛 Fix / Config | ✅ Resolved |
| 6 | Add read auditing for citizen data | ✨ Security | ✅ Done |
| 7 | Fix multi-department routing end to end | 🐛 Fix | ✅ Resolved |

---

## 2. Consular Services

| # | Change | Type | Status |
|---|--------|------|--------|
| 8 | Build the consular module | ✨ Feature | ✅ Done |
| 9 | Card/online payment adapter | ✨ Feature | ✅ Done |
| 10 | Consular fees wired to card payment | ✨ Feature | ✅ Done |
| 11 | Mission appointments | ✨ Feature | ✅ Done |
| 12 | Document upload on consular requests | ✨ Feature | ✅ Done |
| 13 | Mission-scoped notices | ✨ Feature | ✅ Done |
| 14 | Diaspora web and mobile surfaces | ✨ Feature | ✅ Done |

---

## 3. Mobile App, Validation & Emergency Reporting

| # | Change | Type | Status |
|---|--------|------|--------|
| 15 | Zimbabwe mobile number validation + canonical format | ✨ Feature | ✅ Done |
| 16 | Diagnose media upload network failure | 🐛 Issue | ✅ Resolved |
| 17 | Rebuild `ReportDetailScreen` | ✨ Feature | ✅ Done |
| 18 | Build out the Account screen | ✨ Feature | ✅ Done |
| 19 | Fix geofence accepting non-Zimbabwe coordinates | 🐛 Issue | ✅ Resolved |
| 20 | Stop duplicate submissions and cluster similar reports | ✨ Feature / Fix | ✅ Done |
| 21 | Multi-service emergency types + description analysis | ✨ Feature | ✅ Done |
| 22 | WhatsApp: submit on critical info, attach media after | ✨ Feature | ✅ Done |
| 102 | Fix mobile needs: walk structured steps at `info_requested` | 🐛 Fix | ✅ Resolved |
| 103 | Fix `Unsupported FormDataPart` upload error | 🐛 Issue | ✅ Resolved |

> **Note:** #102 and #103 are late additions to this theme. #103 fixes the `FormDataPart` upload defect and is the likely root cause of the still-open mobile media upload issue (#25) — see §12, I2 and I18.

---

## 4. RBAC, WhatsApp & Mobile Follow-ups

| # | Change | Type | Status |
|---|--------|------|--------|
| 23 | Building the department hierarchy and RBAC | ✨ Feature | 🔄 In Progress |
| 24 | Enhance WhatsApp NLP for Shona and mixed-language reports | ✨ Enhancement | ✅ Done |
| 25 | Fix mobile media upload (still failing) | 🐛 Issue | ❌ Open — verify against #103 |
| 26 | WhatsApp report retrieval, grouping, and `departments=0` fix | 🐛 Fix / ✨ Feature | ✅ Resolved |
| 27 | Mobile: persistent verification, account gating, service landing page | ✨ Feature | ❌ Not Started |
| 104 | Fix WhatsApp: image reply after "My Applications" falls to emergency matcher | 🐛 Issue | ✅ Resolved |

> **Note:** #25 and #27 continue the mobile thread from §3. #104 is a WhatsApp intent-routing fix in the same family as the #26 retrieval fix.

---

## 5. RAG Pipeline & Knowledge Management

| # | Change | Type | Status |
|---|--------|------|--------|
| 28 | Tune chunking and retrieval in `app.py` | ✨ Enhancement | ✅ Done |
| 29 | Make OCR conditional in `pdfChunker` | ✨ Enhancement | ✅ Done |
| 30 | Return stage timings from Flask | ✨ Feature | ✅ Done |
| 31 | Extend `RagRequest` for all channels | ✨ Feature | ✅ Done |
| 32 | Build the channel-agnostic inquiry queue | ✨ Feature | ✅ Done |
| 33 | KPI endpoint and portal tab | ✨ Feature | ✅ Done |
| 34 | Return retrieved contexts from Flask | ✨ Feature | ✅ Done |
| 35 | Add evaluation and golden-set entities | ✨ Feature | ✅ Done |
| 36 | Build `RagEvaluationService` | ✨ Feature | ✅ Done |
| 37 | Feedback and review endpoints | ✨ Feature | ✅ Done |
| 38 | Portal Review tab and client feedback buttons | ✨ Feature | ✅ Done |
| 39 | Diagnose retrieval failure after GPU switch | 🐛 Issue | ✅ Resolved |
| 40 | Implement real vector deletion in Flask | ✨ Feature | ✅ Done |
| 41 | Add document audit log entity and endpoints | ✨ Feature | ✅ Done |
| 42 | Build Document management UI in portal | ✨ Feature | ✅ Done |
| 53 | Hybrid OCR in `app.py` *(appears later in original list; clustered here)* | ✨ Enhancement | ✅ Done |

---

## 6. Documentation, Proposals & Deliverables

| # | Change | Type | Status |
|---|--------|------|--------|
| 43 | Write the updated BRD/TRD document | ✨ Docs | ✅ Done |
| 44 | Build the pitch deck | ✨ Docs | ✅ Done |
| 45 | Diagnose and fix `/removeDB` chunk deletion | 🐛 Issue | ✅ Resolved |
| 46 | Build BRD as a standalone PDF | ✨ Docs | ✅ Done |
| 47 | Build TRD as a standalone PDF | ✨ Docs | ✅ Done |
| 48 | Fix `docs.filter` crash in `KnowledgeAdminPanel` | 🐛 Issue | ✅ Resolved |
| 49 | Add original SVG artwork across the deck | ✨ Enhancement | ✅ Done |
| 63 | Encryption posture doc and verification | ✨ Docs | ✅ Done |
| 77 | Extract verified facts from both proposals | ✨ Task | ❌ Not Started |
| 78 | Audit the codebase for what is actually built | ✨ Task | ❌ Not Started |
| 79 | Build the 15-slide deck as `.pptx` and PDF | ✨ Deliverable | ❌ Not Started |
| 98 | Write the BRD and TRD as two separate PDFs | ✨ Docs | ✅ Done |
| 99 | Changelog, outstanding issues, and the demo runbook | ✨ Docs | ✅ Done |

---

## 7. Maps, Road Safety & Roadside

| # | Change | Type | Status |
|---|--------|------|--------|
| 50 | Diagnose black map and empty place search | 🐛 Issue | ✅ Resolved |
| 51 | Fix nearest-facility returning nothing | 🐛 Issue | ✅ Resolved |
| 52 | Build Road Safety map with Muyamuri overlays | ✨ Feature | ✅ Done |
| 84 | Fix roadside over-dispatch (negation handling) | 🐛 Issue | ✅ Resolved |
| 85 | Feed roadside callouts into route-risk analysis | ✨ Feature | ❌ Not Started |

---

## 8. ASM (Artisanal & Small-scale Mining) Backend

| # | Change | Type | Status |
|---|--------|------|--------|
| 54 | ASM backend entities and services | ✨ Feature | ✅ Done |
| 55 | WhatsApp perimeter walk state machine | ✨ Feature | ✅ Done |
| 56 | Mobile and portal screens | ✨ Feature | ✅ Done |

---

## 9. Polls

| # | Change | Type | Status |
|---|--------|------|--------|
| 57 | Build trilingual poll template | ✨ Feature | ✅ Done |
| 58 | Poll entities with encryption split | ✨ Feature | ✅ Done |
| 59 | Poll engine, analytics, gateway, controllers | ✨ Feature | ✅ Done |
| 60 | Auto-walk perimeter map screen | ✨ Feature | ✅ Done |
| 61 | Mobile poll screen and API client | ✨ Feature | ✅ Done |
| 62 | Portal real-time poll analytics | ✨ Feature | ✅ Done |
| 64 | Fix the 403 guard on the poll controllers | 🐛 Issue | ❌ Open |
| 68 | Diagnose why admin cannot see poll results | 🐛 Issue | ✅ Resolved |
| 71 | Rework the poll to linear order with back/next navigation | ✨ Enhancement | ✅ Done |
| 72 | Category-based real-time analytics in the dashboard | ✨ Enhancement | ✅ Done |
| 74 | ~~Make the poll sequential with back/next navigation~~ | — | ⚠️ Superseded by #71 |
| 75 | Verify the unshipped poll set compiles coherently | ✨ Verification | ✅ Done |
| 76 | Add NEXT and CLEAR to the WhatsApp poll | ✨ Enhancement | ✅ Done |

> **Note:** #74 is a stale duplicate of #71 (which is Done). No further action required.

---

## 10. Mining Feature

| # | Change | Type | Status |
|---|--------|------|--------|
| 65 | Add Mining to the WhatsApp menu | ✨ Feature | ✅ Done *(initially Not Started; completed at #94)* |
| 66 | Route the mobile mining screens | ✨ Feature | ✅ Done *(initially Not Started; completed at #95)* |
| 67 | Add the portal mining tabs | ✨ Feature | ✅ Done *(initially Not Started; completed at #96)* |
| 69 | Fix mines route guards and add a mines department role | 🐛 Fix / ✨ Feature | ✅ Resolved |
| 70 | Seed a mines officer account | ✨ Task | ❌ Not Started |

---

## 11. Insurance Module

| # | Change | Type | Status |
|---|--------|------|--------|
| 80 | Port the insurance module/core into Muyamuri | ✨ Feature | ❌ Not Started |
| 82 | Replace the HTTP risk seam with an internal MOU-gated call | ✨ Enhancement | ❌ Not Started |
| 83 | Wire insurance into WhatsApp, mobile and portal | ✨ Feature | ❌ Not Started |
| 86 | Scale seed data to ~1000 rows per case | ✨ Data | ✅ Done |
| 87 | Build insurer tenancy on top of rank-based RBAC | ✨ Feature | ❌ Not Started |
| 88 | Fix insurance session losing context to emergency detection | 🐛 Issue | ✅ Resolved |
| 89 | Pin each citizen to one WhatsApp number at a time | ✨ Feature | ✅ Done |
| 90 | Wire the WhatsApp BUY flow to the purchase services | ✨ Feature | ✅ Done |
| 91 | Route inbound images and documents to the insurance session | ✨ Feature | ✅ Done |
| 92 | Add PIN-timeout now-or-later handling and RESUME | ✨ Feature | ✅ Done |
| 93 | Verify the buy flow by execution | ✨ Verification | ✅ Done |
| 97 | Insurance portal: pending applications and KYC verification desk | ✨ Feature | ✅ Done |
| 100 | Invert the flow: application → underwriter decision → payment | ✨ Enhancement | 🔄 In Progress |
| 101 | Motor comprehensive: main driver details and licence front/back | ✨ Feature | ❌ Not Started *(status changed from In Progress)* |
| 105 | Build insurance analytics and reporting page | ✨ Feature | ⚠️ Status unspecified |

> **Notes:**
> - #80 and #81 (original) were duplicates; merged into a single entry above. #86–#93 were interspersed with roadside and mining items in the original list.
> - **#101 status change:** previously recorded as In Progress; now reported as Not Started. Confirm which is authoritative — the dependencies (#100 flow inversion, #87 tenancy) suggest it is still blocked.
> - **#105:** no status supplied. Placed here pending confirmation; if it is complete, it should be marked ✅ Done and added to the analytics/reporting theme alongside #33 and #72.

---

## 12. Issues Tracker (Isolated)

All bugs, defects and regressions pulled out of the clusters above.

| # | Issue | Related Area | Status | Resolution / Notes |
|---|-------|--------------|--------|-------------------|
| I1 | Media upload network failure | Mobile | ✅ Resolved | Diagnosed (#16) |
| I2 | Mobile media upload still failing | Mobile | ❌ Open | Persistent (#25); **likely root cause fixed in I18 — verify and close if confirmed** |
| I3 | Geofence accepting non-Zimbabwe coordinates | Mobile / Maps | ✅ Resolved | Fixed (#19) |
| I4 | Multi-department routing broken | Routing | ✅ Resolved | Fixed end to end (#7) |
| I5 | Transport config misconfigured | Infra | ✅ Resolved | Fixed & documented (#5) |
| I6 | Duplicate submissions / unclustered reports | Reporting | ✅ Resolved | Fixed (#20) |
| I7 | `departments=0` in WhatsApp report retrieval | WhatsApp | ✅ Resolved | Fixed (#26) |
| I8 | Retrieval failure after GPU switch | RAG | ✅ Resolved | Diagnosed (#39) |
| I9 | `/removeDB` chunk deletion broken | RAG | ✅ Resolved | Diagnosed & fixed (#45) |
| I10 | `docs.filter` crash in `KnowledgeAdminPanel` | Portal / RAG | ✅ Resolved | Fixed (#48) |
| I11 | Black map / empty place search | Maps | ✅ Resolved | Diagnosed (#50) |
| I12 | Nearest-facility returning nothing | Maps | ✅ Resolved | Fixed (#51) |
| I13 | 403 guard on poll controllers | Polls | ❌ Open | Not started (#64) |
| I14 | Admin cannot see poll results | Polls | ✅ Resolved | Diagnosed (#68; duplicate #73 removed) |
| I15 | Mines route guards / missing department role | Mining | ✅ Resolved | Fixed + role added (#69) |
| I16 | Roadside over-dispatch (negation handling) | Roadside | ✅ Resolved | Fixed (#84) |
| I17 | Insurance session losing context to emergency detection | Insurance | ✅ Resolved | Fixed (#88) |
| I18 | `Unsupported FormDataPart` upload error | Mobile / Upload | ✅ Resolved | Fixed (#103) — probable fix for I2 |
| I19 | WhatsApp image reply after "My Applications" misrouted to emergency matcher | WhatsApp | ✅ Resolved | Fixed (#104) — intent-routing defect |
| I20 | Mobile needs flow not walking structured steps at `info_requested` | Mobile | ✅ Resolved | Fixed (#102) — state-machine defect |

**Issue summary:** 20 total — ✅ **18 Resolved** · ❌ **2 Open** (I2, I13) · 1 stale duplicate removed (#73).

---

## 13. Status Dashboard

| Status | Count | Items |
|--------|-------|-------|
| ✅ Done / Resolved | ~89 | Features, fixes, docs, verifications |
| 🔄 In Progress | 2 | #23 RBAC, #100 insurance flow inversion |
| ❌ Not Started / Open | 13 | #25, #27, #64, #70, #77, #78, #79, #80, #82, #83, #85, #87, #101 |
| ⚠️ Status unspecified | 1 | #105 insurance analytics page |
| ⚠️ Superseded | 1 | #74 (duplicate of #71) |

**Open items by theme:**

- **Mobile:** #25 (media upload — verify against I18), #27 (persistent verification / gating)
- **Polls:** #64 (403 guard)
- **Mining:** #70 (seed officer account)
- **Insurance:** #80, #82, #83, #87, #101 (plus in-progress #100 and unspecified #105)
- **Roadside:** #85 (route-risk feed)
- **Proposals / Audit / Deck:** #77, #78, #79

**Immediate follow-ups arising from this revision:**

1. **Verify and close #25 / I2** now that the `FormDataPart` upload defect (I18 / #103) is fixed — re-run the mobile upload test.
2. **Confirm #101 status** (In Progress vs Not Started) — the two reports conflict.
3. **Assign a status to #105** (insurance analytics and reporting page) and confirm ownership.

---

## 14. Deduplication & Clustering Notes

| Original | Action | Rationale |
|----------|--------|-----------|
| #73 "Diagnose why admin cannot see poll results – Done" | **Removed** | Exact duplicate of #68 |
| #81 "Port the insurance core into Muyamuri – Not started" | **Merged into #80** | Same task, different wording |
| #74 "Make the poll sequential with back/next navigation – Not started" | **Superseded by #71** | #71 (Done) already delivers this |
| #65 / #94 "Add Mining to WhatsApp menu" | **Consolidated** | #65 initially Not Started; #94 marks completion |
| #66 / #95 "Route mobile mining screens" | **Consolidated** | Same as above |
| #67 / #96 "Add portal mining tabs" | **Consolidated** | Same as above |
| #53 "Hybrid OCR in app.py" | **Moved to §5 (RAG)** | Thematic fit; noted as out-of-sequence |
| #84–#85 Roadside items | **Clustered in §7** | Road-safety theme; noted as interspersed |
| #86 Seed data | **Placed in §11** | Case-volume scaling for insurance/case management |
| #102 Mobile needs structured steps | **Placed in §3** | Mobile flow defect; may also relate to insurance needs capture — confirm owner |
| #103 FormDataPart error | **Placed in §3 + §12 (I18)** | Upload defect; cross-linked to open I2 |
| #104 WhatsApp image reply misroute | **Placed in §4 + §12 (I19)** | Same WhatsApp intent-routing family as #26 |
| #105 Insurance analytics page | **Placed in §11** | Insurance reporting theme; status pending |

---

*End of document.*