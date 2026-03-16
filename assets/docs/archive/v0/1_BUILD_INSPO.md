# v5.0 JSON Architecture Reference

Technical reference for the portfolio architecture at [august.style](https://august.style). This document covers the entry schema, homepage configuration, tag system, URL routing, file structure, and data flow.

---

## 1. Entry Schema (v5.0)

Each project lives in a single JSON file at `assets/entries/uid-xxx-###.json`. The v5.0 schema is flat -- no nested `categorization` or `content` wrappers.

### Required Fields

| Field             | Type       | Description                                           |
| ----------------- | ---------- | ----------------------------------------------------- |
| `id`              | `string`   | Unique ID matching filename, e.g. `"uid-rfr-187"`     |
| `slug`            | `string`   | URL path segment, e.g. `"saas-product-sale-features"` |
| `title`           | `string`   | Display title                                         |
| `subtitle`        | `string`   | One-line tagline                                      |
| `seo_title`       | `string`   | SEO title (50-60 chars)                               |
| `seo_description` | `string`   | SEO description (150-160 chars)                       |
| `role`            | `string[]` | Role tags from the registry, e.g. `["Web Developer"]` |
| `skill`           | `string[]` | Skill tags from the registry                          |
| `product`         | `string[]` | Product tags from the registry                        |
| `company`         | `string`   | Single company name from the registry                 |
| `thumb`           | `string[]` | Thumbnail image paths (relative, no leading `/`)      |
| `thumb_alt`       | `string`   | Alt text for thumbnail slideshow                      |
| `tiles`           | `string[]` | Text lines that cycle on section tiles                |
| `challenge`       | `string`   | Problem statement (2-4 sentences)                     |
| `approach`        | `string`   | How it was solved (2-4 sentences)                     |
| `result`          | `string`   | Outcome and impact (2-4 sentences)                    |

### Optional Fields

| Field             | Type           | Default | Description                              |
| ----------------- | -------------- | ------- | ---------------------------------------- |
| `img`             | `string[]`     | `[]`    | Square page images (entry page gallery)  |
| `img_alt`         | `string`       | `""`    | Alt text for page images                 |
| `mobile_img`      | `string[]`     | `[]`    | Mobile-specific images                   |
| `mobile_img_alt`  | `string`       | `""`    | Alt text for mobile images               |
| `media_url`       | `string`       | `""`    | External video URL (e.g. YouTube link)   |
| `media_embed`     | `string`       | `""`    | Raw iframe embed HTML for video          |
| `media_alt`       | `string`       | `""`    | Alt text for video embed                 |
| `origin_url`      | `string`       | `""`    | External live project URL                |
| `origin_url_text` | `string`       | `""`    | Display text for origin URL              |
| `repository`      | `string`       | `""`    | GitHub repo URL                          |
| `role_headline`   | `string\|null` | `null`  | Headline for hero flip clock on homepage |
| `hero_btn_cta`    | `string\|null` | `null`  | CTA button text when featured in hero    |
| `final_cta_text`  | `string\|null` | `null`  | Final CTA paragraph text                 |
| `final_btn_cta`   | `string\|null` | `null`  | Final CTA button text                    |
| `skill_summary`   | `string`       | `""`    | Brief summary of skills demonstrated     |
| `process`         | `array\|null`  | `null`  | Process steps array (see below)          |
| `metric`          | `object\|null` | `null`  | Impact metric (see below)                |
| `achievement`     | `object\|null` | `null`  | Achievement accordion item (see below)   |
| `notes`           | `string[]`     | `[]`    | Internal notes, not rendered             |

### Structured Optional Fields

**`process`** -- Array of up to 3 step objects, used by the homepage Process section:

```json
"process": [
  { "word": "Discover", "summary": "Research phase description", "link_slug": "project-slug", "link_text": "View Project" }
]
```

**`metric`** -- Single impact metric, used by the homepage Impact section:

```json
"metric": { "value": "3.2B", "kpi": "Impressions", "context": "Additional detail" }
```

**`achievement`** -- Single achievement, used by the homepage Achievements accordion:

```json
"achievement": { "headline": "Award Name", "details": "Description paragraph" }
```

### Metadata Block

Every entry file includes a `_metadata` block. This is informational only and not consumed by any controller:

```json
"_metadata": { "schema_version": "5.0", "template_type": "project_entry" }
```

### Image Path Conventions

All image paths are relative to the repository root, without a leading `/`. The controllers prepend `/` at render time.

```
assets/media/{slug}/thumb-slides-{slug}-1.webp    (thumbnail)
assets/media/{slug}/img-sq-slides-{slug}-1.webp   (square page image)
```

---

## 2. Homepage Configuration (`homepage-content.json`)

Located at `assets/js/homepage-content.json`, this file controls what appears on the landing page. Changing tags here reshapes the entire homepage without touching any HTML or JS.

### Structure

The file defines sections of the homepage. Each section references project data through `filter` objects:

```json
{
  "hero": {
    "filter": { "any": ["Web Developer"] },
    "cta_secondary": { "text": "All Projects", "href": "/section.html" }
  },
  "showcase": {
    "heading": "Web Development",
    "tabs": [
      { "id": "webflow", "label": "Webflow", "filter": { "all": ["Web Developer", "Webflow"] } }
    ]
  },
  "credentials": {
    "heading": "Experience",
    "items": [
      { "display_name": "COMPANY", "company": "Company Name", "title": "Job Title", "dates": "2020-2023", "tags": ["Tag1"] }
    ]
  },
  "process": {
    "heading": "AI & Automation Process",
    "filter": { "any": ["Automation"] }
  },
  "creative": {
    "heading": "Creative Production",
    "cards": [
      { "label": "Digital Art", "title": "15+ Collections", "filter": { "any": ["Graphic Designer"] }, "href": "/section.html?tags=Graphic+Designer" }
    ]
  },
  "impact": {
    "heading": "Advertising Impact",
    "filter": { "any": ["Advertising"] }
  },
  "achievements": {
    "heading": "Achievements",
    "filter": { "any": [] }
  },
  "cta_section": {
    "heading": "Interested in web development?",
    "primary": { "text": "See All Web Projects", "href": "/section.html?tags=Web+Developer" },
    "secondary": { "text": "Explore Full Portfolio", "href": "/section.html" }
  }
}
```

### Filter Objects

Filters use two operators that combine with AND logic:

- `"any": [...]` -- project must have at least one of these tags (OR within the list)
- `"all": [...]` -- project must have every one of these tags (AND within the list)

Both can be used together. `DataLoader.resolveFilter()` applies `all` first, then `any` on the result.

### How Tags Reshape the Homepage

To pivot the homepage for a different job target (e.g., from "Web Developer" to "Brand Designer"):

1. Change `hero.filter` to `{ "any": ["Brand Designer"] }`
2. Update `showcase.tabs` with relevant skill filters
3. Adjust `process`, `creative`, `impact` filters accordingly
4. Update CTA text and hrefs

Sections with no matching projects are automatically hidden (`section.style.display = 'none'`).

---

## 3. Tag System

### Four Tag Groups

Tags are organized into four groups. Each entry declares its tags as top-level fields:

| Group       | Field     | Type       | Example Values                                    |
| ----------- | --------- | ---------- | ------------------------------------------------- |
| **role**    | `role`    | `string[]` | `"Web Developer"`, `"Creative Director"`          |
| **skill**   | `skill`   | `string[]` | `"HTML/CSS/JS"`, `"Framer"`, `"Copywriting"`      |
| **product** | `product` | `string[]` | `"Landing Page"`, `"Website"`, `"Brand Identity"` |
| **company** | `company` | `string`   | `"Freelance"`, `"PETA, Inc."`                     |

Note: `role`, `skill`, and `product` are arrays (multiple values per entry). `company` is a single string.

### Tag Registry (`assets/docs/tags.json`)

The canonical list of all valid tags, grouped by type. Use existing tags when possible before creating new ones. The registry is not consumed at runtime -- it is a reference for content authors to maintain consistency.

### Matching Behavior

All tag matching uses **exact string comparison** after URL-normalization. The `normalizeForURL()` function converts display strings for comparison:

```
"HTML/CSS/JS"  -> "html-css-js"
"Web Developer" -> "web-developer"
"PETA, Inc."   -> "peta,-inc."
```

Matching is case-insensitive via this normalization. There is no partial/substring matching -- `"Design"` does not match `"Graphic Designer"`.

### Tag Display on Pages

**Section page (filter UI):** Tags appear in a dropdown grouped by type (Role, Skill, Product). Company tags are excluded from the filter display. Active tags appear as removable pills above the dropdown.

**Entry page:** Tags render as clickable pills grouped by type (role, skill, product). Each pill links to `section.html?tags={normalized-tag}` to show all projects with that tag.

---

## 4. URL Routing

### Flat Slug Architecture

v5.0 uses flat slugs with no section/subsection hierarchy in URLs:

```
Production:  august.style/saas-product-sale-features
Local test:  localhost:5500/entry.html?path=saas-product-sale-features
```

### 404.html Routing Flow

GitHub Pages serves `404.html` for any path that does not match a physical file. The 404 handler determines page type and loads the correct template:

```
User visits: august.style/saas-product-sale-features
  |
  v
GitHub Pages: no file found -> serves 404.html
  |
  v
404.html: fetches manifest.json, checks if path is in manifest.entries
  |
  +-- Found in entries -> sets sessionStorage('entryPath'), fetches entry.html
  |
  +-- Not found in entries -> sets sessionStorage('sectionPath'), fetches section.html
  |
  v
404.html injects template body + executes controller scripts in-page (no redirect)
```

Key detail: 404.html does NOT redirect. It fetches the template HTML, replaces its own body content, and executes the controller scripts. The browser URL stays unchanged.

### Entry Resolution (entry-controller.js)

```
getEntryPath() checks in order:
  1. URL parameter: ?path=slug           (local testing)
  2. sessionStorage: entryPath           (production, set by 404.html)
  3. window.location.pathname            (fallback)

loadEntryData(slug):
  manifest.entries[slug] -> "assets/entries/uid-xxx-###.json" -> fetch + parse
```

### Section Page Routing (section-controller.js)

The section page works as a universal tag browser:

```
section.html?tags=Web+Developer          -> filter by "Web Developer" tag
section.html?tags=Web+Developer+Framer   -> filter by both tags (AND)
section.html#tags=Copywriting            -> hash-based filtering (no reload)
section.html                             -> show all projects
```

Tags in the URL are `+`-delimited. The controller parses from both query string and hash, merging them. Hash changes do not trigger page reloads, enabling smooth filter toggling.

### Manifest (`assets/js/manifest.json`)

Maps flat slugs to JSON file paths. Auto-generated by `generate_manifest.py`:

```json
{
  "entries": {
    "saas-product-sale-features": "assets/entries/uid-rfr-187.json",
    "modular-portfolio-build": "assets/entries/uid-eme-689.json"
  }
}
```

Run `python3 generate_manifest.py` after adding, renaming, or removing any entry file.

---

## 5. File Structure

```
/
+-- index.html                           Homepage (landing page)
+-- section.html                         Universal tag/filter page
+-- entry.html                           Individual project page
+-- 404.html                             SPA routing handler
+-- styles.css                           All site styles
+-- generate_manifest.py                 Manifest auto-generator
|
+-- assets/
    +-- js/
    |   +-- data-loader.js               Data fetching, caching, filtering, tag helpers
    |   +-- landing-controller.js        Homepage: loads config + projects, renders sections
    |   +-- section-controller.js        Section page: tag parsing, filtering, tile rendering
    |   +-- entry-controller.js          Entry page: loads project JSON, populates content
    |   +-- tile-renderer.js             Tile DOM construction (section tiles + homepage tiles)
    |   +-- filter-controller.js         Multi-select dropdown filter UI + URL hash state
    |   +-- manifest.json                Slug -> JSON path mapping (auto-generated)
    |   +-- homepage-content.json        Homepage section configuration
    |
    +-- entries/
    |   +-- uid-*.json                   Project entry files (v5.0 schema)
    |
    +-- media/
    |   +-- {slug}/                      Per-project image directories
    |       +-- thumb-slides-*.webp      Thumbnail images
    |       +-- img-sq-slides-*.webp     Square page images
    |
    +-- docs/
    |   +-- _entry_template.json         Blank entry template (v5.0)
    |   +-- tags.json                    Tag registry (4 groups)
    |   +-- JSON_ARCHITECTURE.md         This document
    |
    +-- scripts/
        +-- project.sh                   CLI for generating new entry files
        +-- new_project.py               Entry file generator
```

---

## 6. Data Flow

### Homepage

```
index.html
  |
  v
landing-controller.js
  |
  +-- DataLoader.loadAllProjects()       Fetches manifest.json, then all entry JSONs
  +-- DataLoader.loadHomepageContent()   Fetches homepage-content.json
  |
  v
For each homepage section (hero, showcase, process, creative, impact, achievements):
  |
  +-- DataLoader.resolveFilter(projects, section.filter)
  |     Applies { all: [...], any: [...] } logic
  |
  +-- Renders section HTML from filtered results
  |     Sections with 0 results are hidden
  |
  v
Page rendered
```

### Section Page

```
section.html (or 404.html -> section.html template)
  |
  v
section-controller.js
  |
  +-- parseURL()                         Extracts tags from ?tags= and #tags= and sessionStorage
  +-- DataLoader.loadAllProjects()       Fetches all entries via manifest
  +-- DataLoader.filterByAllTags()       Filters to projects matching ALL active tags
  +-- DataLoader.shuffleArray()          Randomizes tile order
  |
  v
FilterController.renderFilters()         Builds dropdown with grouped tags (role/skill/product)
FilterController.init(callback)          Sets up tag toggle -> re-filter -> re-render cycle
  |
  v
TileRenderer.renderSectionTiles()        Creates tile DOM elements in grid
```

### Entry Page

```
entry.html (or 404.html -> entry.html template)
  |
  v
entry-controller.js
  |
  +-- getEntryPath()                     ?path= param, sessionStorage, or pathname
  +-- DataLoader.loadManifest()          Gets slug -> file mapping
  +-- DataLoader.loadProject(jsonPath)   Fetches the single entry JSON
  |
  v
populateMetadata()                       Sets document.title, meta tags, OG tags
populateTagsCards()                      Renders role/skill/product tag pills
populateContent()                        Fills title, subtitle, challenge/approach/result,
                                         images, video, URLs
populateRelatedPosts()                   Loads all projects, picks 5 via 6-hour seeded random
```

---

## 7. Local Development

Start a local server (required -- `file://` does not support fetch):

```bash
python3 -m http.server 5500 --bind 127.0.0.1
```

Since 404.html routing only works on GitHub Pages, use query parameters locally:

```
Homepage:     http://localhost:5500/
Section:      http://localhost:5500/section.html
Section:      http://localhost:5500/section.html?tags=Web+Developer
Entry:        http://localhost:5500/entry.html?path=saas-product-sale-features
```

### Adding a New Entry

1. Run `project` CLI (or copy `assets/docs/_entry_template.json`)
2. Fill in all required fields, using tags from `assets/docs/tags.json`
3. Save as `assets/entries/uid-xxx-###.json`
4. Add images to `assets/media/{slug}/`
5. Run `python3 generate_manifest.py` to update the manifest

---

*Last updated: 2026-03-16*
*Schema version: 5.0*
