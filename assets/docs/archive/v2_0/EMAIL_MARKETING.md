# E-Commerce, Newsletter, Direct Marketing

**Created**: 2026-04-21 04:43 
**Status**: Pre-development planning research
**Version**: v2.0.0-research-to-build-out 

## Summary 

Details to start the process of thinking about how and what needs to be done to expand the email marketing and e-commerce strategy for Everlastings by Emaline. 

### Objective 

  1. Understand where we're going so that we can choose the proper tools and build in a way that accommodates our future needs 
  2. Better, more comprehensively, document current state, ensuring current accuracy is improved 
  3. Identify needs and understand modern potential 
  4. Create agentic pipeline solutions

### Research

  + Research and lay out **best practices** for e-commerce, newsletters, and direct marketing
  + Consider these items through the **modern agentic lens** 
  + Brainstorm and document **potential solutions** 
  + Explore possible integrations `https://resend.com/docs/integrations`
  + Full Resend documentation `assets/docs/archive/v2_0/RESEND_LLMS_FULL.md`
  + Resend CLI `assets/docs/archive/v2_0/RESEND_CLI.md` 

### Resend + Other Tools 

| Tool                                          | Documentation                                           |
| --------------------------------------------- | ------------------------------------------------------- |
| Send emails with Vercel Functions             | `assets/docs/archive/v2_0/VERCEL_RESEND.md`             |
| Send emails with Supabase Edge Functions      | `assets/docs/archive/v2_0/SUPABASE_RESEND.md`           |
| Send emails with Cloudflare Workers           | `assets/docs/archive/v2_0/CLOUDFLARE_WORKERS_RESEND.md` |
| Send emails with Python SDK                   | `assets/docs/archive/v2_0/PYTHON_RESEND_SDK.md`         |
| Build convo email experiences                 | `assets/docs/archive/v2_0/VERCEL_CHAT_SDK_RESEND.md`    |
| Send rich HTML card emails                    | `assets/docs/archive/v2_0/CHAT_SDK_CARD_EMAILS.md`      |
| Give AI agent email inbox                     | `assets/docs/archive/v2_0/GIVE_AGENT_EMAIL_INBOX.md`    |
| Added Resend MCP Docs Access                  | `npx add-mcp https://resend.com/docs/mcp`               |
| Added Resend Claude Code Skills               | `npx skills add resend/resend-skills`                   |
| Added Resend Claude Code Email Best Practices | `npx skills add resend/email-best-practices`            |
| Full LLM TXT Resend Documentation             | `assets/docs/archive/v2_0/RESEND_LLMS_FULL.md`          |
| Shippo API Reference                          | `assets/docs/archive/v2_0/SHIPPO_API.md`                |
| Shippo LLM TXT Full                           | `assets/docs/archive/v2_0/SHIPPO_LLMS_FULL.md`          |

---

## Current State

| Tool     | Purpose                                                                  |
| -------- | ------------------------------------------------------------------------ |
| Resend   | Transactional emails (order confirmations, shipping notifications, etc.) |
| Supabase | Email contact lists, buys, subscribers                                   |
| Stripe   | Payment processing, incoming customer data, outgoing purchase receipts   |
| Shippo   | Shipping label generation, shipping notifications                        |

---

## Requirements

### Short Term 

Newsletter 

### Long Term 

Integration of email events into Google Analytics 

