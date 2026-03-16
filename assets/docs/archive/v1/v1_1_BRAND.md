# Everlastings by Emaline — Brand Guide

**Version**: v1.1
**Updated**: 2026-03-16
**Source**: Absorbed from v0/BRAND_GUIDE.md, v0/BRAND_STRATEGY.md, v1_1_PREP.md

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

| Voice Quality            | Description                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Warm & Poetic**        | Language feels like a gentle embrace. Metaphors drawn from light, home, memory, seasons. Never clinical or transactional.                    |
| **Emotionally Resonant** | Acknowledges pain without dwelling in it. Celebrates small moments of beauty. Honors the complexity of healing.                              |
| **Quietly Magical**      | Hints at otherworldliness without being mystical. Invites wonder without demanding belief. Uses "elsewhere," "haven," "sanctuary," "portal." |
| **Authentic & Personal** | Emy's voice, not a corporate brand. Story-driven, never salesy. Vulnerable without being heavy.                                              |

### Tone by Context

| Context          | Tone                                             | Example                                                                                                             |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Homepage/Hero    | Invitational, wonder-filled, slightly mysterious | *"Step into Elsewhere. Where memory becomes miniature, and loss transforms into something you can hold."*           |
| Product Pages    | Intimate, descriptive, emotionally grounded      | *"The Sunkeeper watches over a garden where time stands still, where every bloom is a promise kept."*               |
| Collection Pages | Organized but poetic, guiding without pushing    | *"Each piece in the Portals to Peace series offers passage to somewhere gentler."*                                  |
| About/Story      | Vulnerable, honest, human                        | *"When everything changed, I needed somewhere I could still have control. So I built worlds small enough to hold."* |
| Transactional    | Clear, warm, reassuring                          | *"Almost there. Your haven is ready to find its home."*                                                             |

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
- **Why**: High-contrast letterforms match the deep plum + cream palette. Slight drama fits "quietly magical" brand voice. Works beautifully at large display sizes.
- **Load**: Regular (400) + Italic (400i) via Google Fonts. Bold (700) optional.
- **Fallback**: Georgia, "Times New Roman", serif

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

## Logo Specs

- **Style**: 1950s-inspired silhouette
- **Imagery**: Miniature house cupped in hands
- **Text**: Arc text "Everlastings by Emaline"
- **Detail**: Lace hemline
- **Color**: Deep plum/wine (`#4A1942`)
- **Usage**: Clean, simple, evocative without being literal
- **Format needed**: SVG preferred, high-res PNG fallback, light/dark variants

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
> *[middle paragraphs: story, meaning, craft]*
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

| Context        | Options                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **Purchasing** | "Bring This Haven Home", "Make This Yours", "Claim Your Sanctuary"                                |
| **Newsletter** | "Join the Firelight Council", "Stay Connected to Elsewhere", "Receive Dispatches from the Studio" |
| **Contact**    | "Begin a Conversation", "Commission Your Own Haven", "Get in Touch"                               |
| **Homepage**   | "Enter Elsewhere", "Step Into Elsewhere"                                                          |

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

### By Situation

| Situation          | Messaging                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Someone grieving   | *"Sometimes healing looks like building something small enough to hold when everything else feels too big."*                                                |
| Miniature lover    | *"These aren't just decorative pieces — they're portals to entire worlds, each with its own story."*                                                        |
| Price hesitation   | *"Each haven represents 40-60 hours of meticulous work. You're not buying a miniature — you're claiming a sanctuary crafted specifically to hold meaning."* |
| Commission inquiry | *"Let's build a world together. Share your story, and I'll craft a haven that holds it."*                                                                   |

---

## Page-by-Page Content Notes

### Homepage Hero

**Formula**: (Invitational statement) + (Emotional promise) + (Visual wonder)

> *"Welcome to Elsewhere — where loss transforms into something you can hold, and memory becomes miniature magic."*

### Collection Page Intro

**Formula**: (Collection name) + (Unifying theme) + (Invitation)

> *"Portals to Peace: Each piece in this series offers quiet passage to somewhere gentler. Step through."*

### Newsletter Signup

**Formula**: (Benefit) + (Community feel) + (Clear action)

> *"Join the Firelight Council for studio updates, new releases, and stories from the workbench. Your inbox deserves a little magic."*

### Footer Tagline

> *"Building Elsewhere, one haven at a time."*

---

## Brand Application Tests

When in doubt, ask:
- Does this feel warm and inviting?
- Would Emy say this?
- Does it honor the story without exploiting the pain?
- Is there room for wonder?

---

*This brand guide is a living document. The core — emotional resonance, healing, crafted magic — stays constant.*
