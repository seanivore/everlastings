# Everlastings by Emaline — Brand Guide

**Created**: 2026-03-16
**Updated**: 2026-04-09
**Source**: Consolidated from v0 brand docs, v1 planning, client input

---

## Brand Essence

Everlastings by Emaline creates miniature sanctuaries — handcrafted havens where loss transforms into something you can hold, where memory becomes miniature magic, and where tiny worlds offer quiet beauty, soft wonder, and the feeling of being home. Born from a personal ritual of processing grief through art, each piece carries the intention of transformation, healing, and hope.

---

## Tagline + Secondary Lines

  **Primary Tagline:**
  > Handcrafted havens for the stories that stay.

  **Secondary (Origin Story):**
  > When the world cracked open, I made something small enough to hold.
  > For those who need more than this world gives.
  > For those who believe in Elsewhere.

  **Mission Statement:**
  Everlastings by Emaline exists to create havens of beauty and quiet wonder for those who need a reminder that there is still magic in the world.

---

## Voice & Tone

### Characteristics

| Voice Quality            | Description                                        |
| ------------------------ | -------------------------------------------------- |
| **Warm & Poetic**        | Language feels like a gentle embrace.              |
|                          | Metaphors drawn from light, home, memory, seasons. |
|                          | Never clinical or transactional.                   |
| ------------------------ | -------------------------------------------------- |
| **Emotionally Resonant** | Acknowledges pain without dwelling in it.          |
|                          | Celebrates small moments of beauty.                |
|                          | Honors the complexity of healing.                  |
| ------------------------ | -------------------------------------------------- |
| **Quietly Magical**      | Hints at otherworldliness without being mystical.  |
|                          | Invites wonder without demanding belief.           |
|                          | Uses "elsewhere," "haven," "sanctuary," "portal."  |
| ------------------------ | -------------------------------------------------- |
| **Authentic & Personal** | Emy's voice, not a corporate brand.                |
|                          | Story-driven, never sales-y.                       |
|                          | Vulnerable without being heavy.                    |
| ------------------------ | -------------------------------------------------- |

### Tone by Context

| Context          | Tone                         | Example                                    |
| ---------------- | ---------------------------- | ------------------------------------------ |
| Homepage/Hero    | Invitational, wonder-filled, | *"Step into Elsewhere. Where memory*       |
|                  | slightly mysterious          | *becomes miniature, and loss transforms*   |
|                  |                              | *into something you can hold."*            |
| ---------------- | ---------------------------- | ------------------------------------------ |
| Product Pages    | Intimate, descriptive,       | *"The Sun-keeper watches over a garden*    |
|                  | emotionally grounded         | *where time stands still, where*           |
|                  |                              | *every bloom is a promise kept."*          |
| ---------------- | ---------------------------- | ------------------------------------------ |
| Collection Pages | Organized but poetic,        | *"Each piece in the Portals to Peace*      |
|                  | guiding without pushing      | *series offers passage to*                 |
|                  |                              | *somewhere gentler."*                      |
| ---------------- | ---------------------------- | ------------------------------------------ |
| About/Story      | Vulnerable, honest, human    | *"When everything changed, I needed*       |
|                  |                              | *somewhere I could still have control.*    |
|                  |                              | *So I built worlds small enough to hold."* |
| ---------------- | ---------------------------- | ------------------------------------------ |
| Transactional    | Clear, warm, reassuring      | *"Almost there. Your haven is*             |
|                  |                              | *ready to find its home."*                 |
| ---------------- | ---------------------------- | ------------------------------------------ |

### Error & Empty State Voice

| State              | Message                                                 | Tone                                                     |
| ------------------ | ------------------------------------------------------- | -------------------------------------------------------- |
| Product sold       | "This piece has already found its home."                | Warm, celebratory — not disappointing                    |
| Product not found  | "This haven could not be found."                        | Gentle, redirecting                                      |
| Checkout error     | "Something went awry. Please try again."                | Reassuring, not technical                                |
| Payment success    | "Your haven is on its way."                             | Warm, confirming                                         |
| Sold while in cart | "These havens have found their homes." + discount offer | Empathetic, recovery-focused — turn loss into connection |
| Empty shop         | "New havens are being crafted. Check back soon."        | Hopeful, inviting return                                 |
| No filter results  | "No havens match your search."                          | Simple, factual                                          |
| Newsletter success | "Welcome to the Firelight Council."                     | Warm, community-building                                 |
| Already subscribed | "You're already part of the Firelight Council."         | Acknowledging, not scolding                              |

### Do / Don't

| DO                                           | DON'T                            |
| -------------------------------------------- | -------------------------------- |
| Lead with emotion, follow with specifics     | Over-explain the obvious         |
| Use sensory language (see, feel, experience) | Use generic e-commerce language  |
| Tell the story behind each piece             | Rush the emotional moment        |
| Honor healing without being prescriptive     | Make grief the only story        |
| Invite rather than insist                    | Apologize for premium pricing    |
| Let white space breathe                      | Compare to mass-produced items   |
| End with gentle calls-to-action              | Use excessive exclamation points |

---

## Color Palette

### Primary Colors

| Color              | Hex       | Usage                                            |
| ------------------ | --------- | ------------------------------------------------ |
| **Deep Plum**      | `#4A1942` | Logo, primary accent, headings, buttons          |
| **Dusty Lavender** | `#B8A5C8` | Secondary accent, hover states, soft backgrounds |
| **Fog Gray**       | `#D4D4D4` | Borders, dividers, ethereal backgrounds          |

### Accent Colors

| Color         | Hex       | Usage                                         |
| ------------- | --------- | --------------------------------------------- |
| **Cream**     | `#FFF8E7` | Page background, warmth, vintage feel         |
| **Soft Gold** | `#D4AF7A` | Highlights, firelight effects, luxury touches |
| **Ink Black** | `#1A1A1A` | Body text, grounding, silhouettes             |

### Special Use

| Color              | Hex       | Usage                                   |
| ------------------ | --------- | --------------------------------------- |
| **Deep Star Blue** | `#1B3A52` | Night sky themes, deeper portal moments |
| **Amethyst**       | `#9B6B9E` | Featured items, richer accent moments   |

### CSS Custom Properties

  ```css
  :root {
    --color-plum: #4A1942;
    --color-lavender: #B8A5C8;
    --color-fog: #D4D4D4;
    --color-cream: #FFF8E7;
    --color-gold: #D4AF7A;
    --color-ink: #1A1A1A;
    --color-star-blue: #1B3A52;
    --color-amethyst: #9B6B9E;

    --bg-primary: var(--color-cream);
    --bg-secondary: var(--color-fog);
    --bg-dark: var(--color-ink);

    --text-primary: var(--color-ink);
    --text-secondary: #5A5A5A;
    --text-muted: #8A8A8A;
    --text-inverse: var(--color-cream);

    --accent-primary: var(--color-plum);
    --accent-hover: var(--color-lavender);
    --accent-gold: var(--color-gold);
  }
  ```

---

## Typography

### Cormorant Garamond (Display Font)

  - **Use for**: Hero text, section headings, product titles, taglines, special moments
  - **Why**: High-contrast letter-forms match the deep plum + cream palette. Slight drama fits "quietly magical" brand voice. Works beautifully at large display sizes.
  - **Load**: Regular (400) + Italic (400i) + Bold (700) via Google Fonts
  - **Fallback**: Georgia, "Times New Roman", serif

### Google Fonts Load Line

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
```

### System Fonts (Body)

  - **Use for**: Product descriptions, features, navigation, UI elements, buttons, captions
  - **Stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
  - **Body line-height**: 1.6-1.8 for readability
  - **Buttons**: Medium weight, slight uppercase tracking

### Hierarchy

  ```css
  :root {
    --font-display: "Cormorant Garamond", Georgia, serif;
    --font-body: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

    --text-xs: 0.75rem;     /* 12px - captions */
    --text-sm: 0.875rem;    /* 14px - small labels */
    --text-base: 1rem;      /* 16px - body */
    --text-lg: 1.125rem;    /* 18px - large body */
    --text-xl: 1.25rem;     /* 20px */
    --text-2xl: 1.5rem;     /* 24px */
    --text-3xl: 2rem;       /* 32px - section headings */
    --text-4xl: 2.5rem;     /* 40px - page titles */
    --text-5xl: 3rem;       /* 48px - hero display */
  }
  ```

---

## Photography Standards

### Aspect Ratio

All product images: **4:5** (portrait orientation). This is enforced in the admin upload UI and prevents messy grid layouts.

### Format

  - **WebP** for all web-served images
  - Original high-res JPG/PNG accepted; we convert to WebP
  - Max file size: 2MB per image after conversion

### Naming Convention

Images are stored in Cloudflare R2 with SEO-friendly filenames:

  ```
  /products/{slug}/hero-{slug}.webp
  /products/{slug}/gallery-{slug}-01.webp
  /products/{slug}/gallery-{slug}-02.webp
  ...
  /products/{slug}/thumbnail-{slug}.webp
  /products/{slug}/video-{slug}-01.mp4
  /products/{slug}/detail-{slug}-01.gif
  ```

Raw images are transformed via Cloudinary (4:5 crop, WebP, compress) before upload to R2. Videos and GIFs upload directly to R2 without transformation.

### Shot Guide

| Shot Type     | Description                                        | Count |
| ------------- | -------------------------------------------------- | ----- |
| **Hero**      | Clean, well-lit front view. This is the thumbnail. | 1     |
| **Angles**    | Front, back, sides, top-down                       | 3-4   |
| **Details**   | Close-ups of features, textures, tiny details      | 2-3   |
| **Lighting**  | Each lighting mode (on/off, warm/cool)             | 2-3   |
| **Scale**     | Next to a common object for size reference         | 1     |
| **Lifestyle** | In its intended setting (bookshelf, desk)          | 1-2   |

---

## Logo

I got the SVG file and started create quite a large variety of versions and sizes, primarily in .jpg or .wepb and you can find them all here. Let me know if there are any to create specifically or to adjust. 

`assets/brand/favicon/`
`assets/brand/logo/`

### Specs

  - **Style**: 1950s-inspired silhouette
  - **Imagery**: Miniature house cupped in hands
  - **Text**: Arc text "Everlastings by Emaline"
  - **Detail**: Lace hemline
  - **Color**: Deep plum/wine (`#4A1942`)
  - **Usage**: Clean, simple, evocative without being literal
  - **Format needed**: SVG preferred, high-res PNG fallback, light/dark variants

### About Design 

  **The Meaning Behind the Everlastings by Emaline Logo**

  The Everlastings by Emaline logo was intentionally designed to represent the heart of the work: creating small places of peace in a world that often feels overwhelming.

  The silhouette of the woman is inspired by mid-century illustration styles from the 1950s. That era evokes a sense of nostalgia, warmth, and timeless storytelling. Qualities that are deeply woven into the miniature worlds I create. 

  The figure is elegant but simple, meant to feel both classic and approachable, like a character stepping out of an old storybook. She is slightly bent forward, holding a tiny house gently in her cupped hands.

  That gesture is the center of the logo meaning.

  She is not presenting the house like a product. She is offering it carefully, almost protectively. The small house represents the miniature worlds I build; places of quiet, wonder, breath and reflection. They are intentionally small enough to hold, symbolizing the idea that sometimes comfort, imagination, and beauty come in the smallest spaces.

  The house is a metaphor for what the work represents: a moment of peace, a story, a memory, or an “Elsewhere” someone can step into when the real world feels heavy.

  The figure herself can be read in multiple ways. She is the maker, the storyteller, the caretaker of these small worlds, but she also represents the viewer. The gesture invites people to imagine holding a place of peace in their own hands.

  The lace detail along the hem of her skirt carries the brand name, "Everlastings by Emaline," reinforcing the idea that the work blends craftsmanship, storytelling, and artistry.

  The logo reflects the core philosophy behind the brand: Small things can hold enormous meaning. These miniature houses are not just objects. They are tiny sanctuaries, handcrafted havens for stories, memories, and moments of stillness.

  The logo captures that moment of offering: a quiet invitation to step into Elsewhere

---

## Copy Formula: Story Cards

Story cards are the emotional heart of each product page — 2-8 paragraphs of poetic narrative.

### Structure

  1. **Opening**: Set the scene with sensory detail
  2. **Middle**: Weave in meaning, memory, or metaphor
  3. **Details**: Ground with physical specifics (materials, scale, lighting)
  4. **Closing**: Emotional resonance, invitation

### Example

  > *"The Sunkeeper stands watch over a garden where time has learned to be gentle. Here, every bloom is a promise kept, every shadow cast by golden hour light that never fades."*
  >
  > *{middle paragraphs: story, meaning, craft}*
  >
  > *"This is a place you can return to, whenever the world feels too loud, too fast, too much."*

### Features: Clear AND Poetic

Instead of "LED lights included" — write "Softly illuminated by warm LED glow (power adapter included)"

Instead of "8 inches tall" — write "8" height — small enough to shelter on a bookshelf, substantial enough to hold a world"

---

## Words to Use / Words to Avoid

### Embrace

Elsewhere, haven, sanctuary, portal, passage, memory, moment, story, ritual, light, glow, illuminate, shadow, tender, gentle, quiet, still, craft, build, architecture, construct, hold, gather, keep, treasure, healing, grief, loss, transformation

### Avoid

Cute, adorable, tiny (except when necessary), perfect, flawless, pristine, sale, deal, bargain, discount, escape (prefer "passage to"), sad, depressing, tragic (honor without dramatizing)

---

## Audience

  - Sentimental souls, emotional and empathetic
  - Lovers of story and memory
  - People processing grief or loss
  - Those seeking beauty and quiet wonder
  - Healers or wanting to be part of healing community
  - Create and treasure nostalgia
  - Active on Instagram, TikTok, Pinterest
  - Comfortable with Apple Pay and social media shopping

---

## Call-to-Action Language

| Context        | Options                              |
| -------------- | ------------------------------------ |
| **Purchasing** | "Bring This Haven Home"              |
|                | "Make This Yours"                    |
|                | "Claim Your Sanctuary"               |
| -------------- | ------------------------------------ |
| **Newsletter** | "Join the Firelight Council"         |
|                | "Stay Connected to Elsewhere"        |
|                | "Receive Dispatches from the Studio" |
| -------------- | ------------------------------------ |
| **Contact**    | "Begin a Conversation"               |
|                | "Commission Your Own Haven"          |
|                | "Get in Touch"                       |
| -------------- | ------------------------------------ |
| **Homepage**   | "Enter Elsewhere"                    |
|                | "Step Into Elsewhere"                |
| -------------- | ------------------------------------ |

---

## Messaging Framework

### Primary Message

Everlastings offers handcrafted miniature worlds that serve as tangible anchors for emotional healing and memory-keeping.

### Supporting Messages

  1. **Control in Chaos**: When life feels overwhelming, these miniatures offer spaces small enough to manage, beautiful enough to matter.
  2. **Healing Through Creation**: Born from a personal ritual of processing grief, each piece carries the intention of transformation through art.
  3. **Story Meets Craft**: Every miniature has a narrative — poetic story cards give context and emotional depth to the physical object.
  4. **Collectible Sanctuaries**: Limited series and one-of-a-kind pieces ensure exclusivity while building a community of collectors.
  5. **Professional Artistry**: 40-60 hours of meticulous work per piece justify premium pricing through craftsmanship.

---

## Brand Application Tests

When in doubt, ask:

  - Does this feel warm and inviting?
  - Would Emy say this?
  - Does it honor the story without exploiting the pain?
  - Is there room for wonder?

---

## Email Voice (v1.4)

Three transactional emails send from the site via Resend. All three adopt Emaline's voice — warm, attentive, poetic-but-not-purple, small-g gentle.

**Sender**: `Everlastings by Emaline <sunkeeper@everlastingsbyemaline.com>`

**Visual style**: single-column centered layout, cream (#FAF6F0) background, ink (#2C2521) text, plum (#4A1942) accents. Cormorant Garamond for headlines (Google Fonts link at top of each template). One small logo at top. No heavy hero imagery; let typography do the work.

**Voice rules**:
- Address the customer by name when we have it, "Dear collector" when we don't
- Never "Hi!" or "Hey there" — always "Dear {Name}," or "{Name},"
- Close with "With care," or "Warmly," + "Everlastings by Emaline" (not "The Emaline Team")
- Avoid exclamation points except in welcome (one, maximum)
- Prefer "your haven" / "your piece" over "your order" / "your purchase"

### Template 1: Tracking Email

Fires from `PATCH /api/orders/:id` when Emy marks an order shipped.

> **Subject**: Your haven is on its way
>
> {Name},
>
> **{Product Title}** has been carefully packed and is on its way to you. ${Carrier} tells us to expect delivery within a few days.
>
> Tracking number: **{TRACKING-NUMBER}**
>
> {Track your package →}
>
> If anything arrives not as you hoped, please reply to this email directly.
>
> With care,
> Everlastings by Emaline

### Template 2: Newsletter Welcome — With Coupon (contemplation-offer source)

Fires from `api/subscribe.ts` when source is `contemplation-offer`. Generates a unique 5% promotion code + saves to `subscribers.promo_code` + emails it.

> **Subject**: Welcome to the Firelight Council
>
> {Name or "Dear collector"},
>
> Thank you for lingering long enough with the work to want to know more. That kind of attention is rare, and it is met here with the same.
>
> As a small token, use code **{PROMO-CODE}** for 5% off your first piece. Valid for 30 days.
>
> You'll hear from us when a new haven is ready — never more often than that.
>
> With care,
> Everlastings by Emaline

### Template 3: Newsletter Welcome — No Coupon (footer / homepage / checkout-started sources)

Fires from `api/subscribe.ts` for all other sources. No coupon generated.

> **Subject**: Welcome to the Firelight Council
>
> {Name or "Dear collector"},
>
> Thank you for joining us. You'll hear from us when a new haven is ready — never more often than that.
>
> In the meantime, if there's a specific piece that's caught your eye, reply and tell us. Emy reads every message.
>
> With care,
> Everlastings by Emaline

### Template 4: Cart Recovery Coupon

Fires from `POST /api/cart-recovery` (handled inside `api/cart.ts` per AR #34) when a user submits email in the 409 recovery overlay. Delivers the generated 10% code (also shown inline in the overlay; this is the record copy).

> **Subject**: A small gift, for your patience
>
> {Name or "Dear collector"},
>
> We're sorry the piece you reached for had already found its home. These are one-of-a-kind, and sometimes timing decides.
>
> As thanks for your interest, here is 10% off your next piece with us:
>
> **{PROMO-CODE}**
>
> Valid for 30 days.
>
> New havens are in the works. We'll let you know when they're ready.
>
> With care,
> Everlastings by Emaline

### HTML Skeleton (shared across all four)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{{subject}}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#FAF6F0;font-family:Georgia,serif;color:#2C2521;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560">
        <tr><td align="center" style="padding-bottom:32px;">
          <img src="https://cdn.everlastingsbyemaline.com/brand/logo.svg" alt="Everlastings by Emaline" width="180">
        </td></tr>
        <tr><td>
          <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:32px;color:#4A1942;margin:0 0 24px;">{{heading}}</h1>
          {{body}}
        </td></tr>
        <tr><td align="center" style="padding-top:40px;color:#918B82;font-size:13px;">
          With care,<br>
          Everlastings by Emaline<br>
          <a href="https://everlastingsbyemaline.com" style="color:#4A1942;">everlastingsbyemaline.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

All four templates use this skeleton, swapping only `{{subject}}`, `{{heading}}`, and `{{body}}`. The agent implementing `api/_emails/index.ts` copies this HTML and substitutes template-specific values.

---
*This brand guide is the canonical reference. Colors, voice, photography standards, and email templates are enforced across all documents.*