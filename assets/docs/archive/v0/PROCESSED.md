# v0 Archive Manifest

**Created**: 2026-03-16
**Purpose**: Track what was absorbed from each v0 document into v1

Every v0 file has been processed. Files are preserved (not deleted) because they contain copy examples and API reference docs useful during implementation.

---

## v0 File Disposition

| v0 File                           | Absorbed Into                                          | Unique Value Retained                                                                                                                              |
| --------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BRAND_GUIDE.md`                  | `v1_1_BRAND.md`                                        | Voice guide, copy examples, messaging framework, color hex codes                                                                                   |
| `BRAND_STRATEGY.md`               | `v1_1_BRAND.md` (5%)                                   | Brand pillars + audience definition only. Remainder was pitch/marketing strategy outside scope.                                                    |
| `BUILD_GUIDE.md`                  | `IMPL_GUIDE.md` + `EVERLASTINGS_STORE.md`              | CSS design tokens, component styles, directory structure, navigation specs, automation architecture, shipping strategy                             |
| `CHAT_PLANS_01-general.md`        | Nothing directly                                       | Raw chat thread. Architecture discussion and emotional design vision extracted into planning. Chat itself is reference only.                       |
| `CHAT_PLANS_02-interactive.md`    | Nothing directly                                       | Raw chat thread. Interactive homepage concepts (book opening, theatrical lighting, theme rotation) were incorporated into Session 6 of IMPL_GUIDE. |
| `CONTENT_PLANNING.md`             | `IMPL_GUIDE.md` + `PRODUCT_GUIDE.md`                   | Tag types, filter logic, product JSON values, Stripe Product Object reference, content deliverables list, dynamic element planning                 |
| `DOC_PREP_SPEC.md`                | Nothing                                                | Meta-instructions for creating the original v0 docs. Already followed, no longer needed.                                                           |
| `HIGH_LEVEL_SCOPE.md`             | `EVERLASTINGS_STORE.md`                                | Scope, cost analysis, timeline, contracted parties, deliverables, success criteria, terms                                                          |
| `HOW_IT_WORKS_BASICS.md`          | `EVERLASTINGS_STORE.md` → Data Flow                    | Clean 31-line data flow description (now updated for Supabase architecture)                                                                        |
| `IMPL_PLAN_MASTER.md`             | Nothing                                                | 14-line stub pointing to other docs. No unique content.                                                                                            |
| `IMPL_STRIPE_DYNAMIC_SHIPPING.md` | Keep as Phase 2 reference                              | Stripe embedded checkout dynamic shipping API docs (multiple languages). Reference during Session 4.                                               |
| `IMPL_WEBSITE.md`                 | `IMPL_GUIDE.md`                                        | Session structure, hour estimates, file structure, automation architecture, testing standards                                                      |
| `PLANNING_GUIDE.md`               | `IMPL_GUIDE.md` + `EVERLASTINGS_STORE.md` + `BRAND.md` | Master document: JSON schema proposals, hosting analysis, phased implementation, risk assessment, Stripe integration workflow                      |
| `ACTION_ITEMS.md`                 | `PRODUCT_GUIDE.md`                                     | Client-facing checklist for Emy. Content deliverables, photo requirements, timing.                                                                 |
| `1_BUILD_INSPO.md`                | `EVERLASTINGS_STORE.md` reference                      | 360-design JSON architecture model (portfolio). Referenced as inspiration for data-driven approach.                                                |
| `2_BUILD_INSPO.md`                | `EVERLASTINGS_STORE.md` reference                      | Freelance payments platform model. Referenced for Stripe integration pattern and Vercel serverless function architecture.                          |

---

## Directory Rename

`must-process-from-first-session/` renamed to `processed/`

Files NOT deleted — they contain:
- Copy examples useful during implementation
- Stripe API code samples in multiple languages
- Detailed CSS token definitions to reference during Session 2
- Chat thread with interactive design concepts for Session 6

---

## Cross-Reference Check

All build-critical information now exists in v1 documents:

| Information Type                | v1 Location                          |
| ------------------------------- | ------------------------------------ |
| Brand voice, colors, typography | `v1_1_BRAND.md`                      |
| Architecture, schema, data flow | `EVERLASTINGS_STORE.md`              |
| Build sessions, step-by-step    | `v1_1_IMPL_GUIDE.md`                 |
| Client product entry guide      | `PRODUCT_GUIDE.md`                   |
| Project overview, nav, content  | `v1_1_PREP.md`                       |
| Mobile design specs             | `.agent/2026_MOBILE_DESIGN_SPECS.md` |
| Dev protocols, git workflow     | `.agent/DEV_RULES.md`                |

**No build-critical info exists only in v0.**

---

*v0 documents are archived, processed, and safe to ignore during development.*
