# Structured Image Metadata for Markdown-Sourced Nostr Long-Form Content

**Status:** Working draft — a practice convention, not (yet) a NIP.
**Scope:** Authors who maintain Markdown long-form posts (`kind:30023`, NIP-23) in a git repository and publish them to Nostr via a build pipeline. The convention defines how image metadata (author, license, source, alt text, caption) lives in the repository, how it becomes `imeta` tags (NIP-92) in the event, and how to round-trip between the two.
**Goal:** Zero data loss between repository and event. Human-readable in raw Markdown. Machine-readable in the published event. Safe defaults against accidental misattribution.

---

## Why this exists

Markdown's native image syntax — `![alt](file.png)` — only carries two fields: the target and an alt text. Everything else a properly attributed image needs (author, license, license link, source, modifications — the "TULLU-BA" rule in German copyright practice) has nowhere to go.

Authors have three unsatisfying options today:

1. **Stuff everything into a visible caption line** under each image. Good for human readers, bad for machine parsing, risky because easily forgotten or inconsistent.
2. **Inline HTML `<figure>` blocks** with `<figcaption>`. Breaks Markdown lint tooling, hard to re-edit.
3. **Lose the metadata entirely.** Silent misattribution risk when the post is re-published without provenance.

NIP-92's `imeta` tag fixes the event-side machine-readability problem (url, mime, sha256, alt, etc. per image). But it doesn't answer where the data lives *before* the event exists.

This convention proposes: **structured YAML frontmatter as source of truth, free-form Markdown body for prose, deterministic bidirectional mapping between them.**

---

## The convention in one example

```yaml
---
title: "Schoko-Zimt-Schnecken"
slug: "schoko-schnecken"
date: 2023-02-26

# Text license (the post body). Image licenses are set per image.
license: "https://creativecommons.org/publicdomain/zero/1.0/"

# Post text authors (array, even for single author).
authors:
  - name: "Jane Doe"
    url: "https://jane.example/"

images:
  - file: cover.jpg
    role: cover
    alt: "Golden baked yeast buns in a round pan, fresh from the oven"
    license: "https://creativecommons.org/publicdomain/zero/1.0/"
    authors:
      - name: "Jane Doe"

  - file: dough-filling.jpg
    alt: "Rolled-out yeast dough, spread with cocoa-cinnamon-sugar filling"
    license: "https://creativecommons.org/publicdomain/zero/1.0/"
    authors:
      - name: "Jane Doe"

  # Foreign image with full TULLU-BA attribution:
  - file: flickr-buns.jpg
    alt: "Basket of freshly baked cinnamon rolls"
    caption: "On a market stall in Lyon"
    authors:
      - name: "Max Mustermann"
    source_url: "https://www.flickr.com/photos/mustermann/12345/"
    license: "https://creativecommons.org/licenses/by-sa/4.0/"
    modifications: "cropped"
---

Roll out the dough and spread the filling evenly:
![](dough-filling.jpg)

Slice into 16 pieces and arrange in the pan...
```

The Markdown body stays clean. The YAML carries the truth.

---

## Field reference

### Post-level (applies to the post text, not images)

| Field | Required | Type | Semantics |
|---|---|---|---|
| `license` | yes | URL | License of the post **text**. Does **not** cascade to images. |
| `authors` | yes | Array of `{name, url?, orcid?, ...}` | Authors of the post text. Array even with one author. |

Pipeline implementations may provide env-level defaults (`DEFAULT_LICENSE`, `DEFAULT_AUTHORS`) so single-author blogs don't repeat the same block on every post.

### Per-image (under the `images:` list)

| Field | Required | Type | Semantics |
|---|---|---|---|
| `file` | yes | String | Filename relative to the post directory. Must exist on disk. |
| `role` | no | `cover` | At most one image per post may carry `role: cover`. Its URL becomes the event's `image` tag. |
| `alt` | yes | String | Accessibility description. Empty string is allowed (decorative image); missing field is a validation error. |
| `caption` | no | String | Optional human context beyond the alt text. |
| `license` | yes | URL or `UNKNOWN` | Full schema.org-style license URL, or the literal `UNKNOWN`. No cascading from post-level. |
| `authors` | yes | Array or `UNKNOWN` | Author list, or the literal `UNKNOWN`. No cascading from post-level. |
| `source_url` | no | URL | Where the image was originally sourced (Flickr, Sketchfab, self-reference, etc.). |
| `modifications` | no | String | Free-text description of any derivative work ("cropped", "color-adjusted", "AI-generated with prompt: ..."). The "BA" in TULLU-BA. |

### Why no cascading

Cascading license/author from post to images was rejected after early prototypes: it makes **silent misattribution** the easy default. If a post is tagged `license: CC0` and a contributor adds a foreign image without noticing, the image inherits CC0 implicitly and ships to Nostr with a false attribution.

Explicit per-image fields cost a few extra lines of YAML and prevent an entire class of attribution bugs.

### `UNKNOWN` as an explicit value

For legacy content where provenance has been lost:

```yaml
- file: old-screenshot.png
  alt: "Screenshot of a now-defunct learning portal's homepage"
  license: UNKNOWN
  authors: UNKNOWN
```

Pipeline behavior:

- Fields set to `UNKNOWN` are **not** written into the `imeta` tag (they are simply absent, not wrongly stated).
- A warning is logged per `UNKNOWN` field with post slug + filename — this becomes a research backlog.
- A strict mode can block publication when `UNKNOWN` values are present (opt-in).

---

## Mapping to the Nostr event

A post with this frontmatter produces a `kind:30023` event containing:

### Standard NIP-23 tags

- `["d", "<slug>"]`
- `["title", "<title>"]`
- `["published_at", "<unix-seconds>"]`
- `["summary", "<description>"]` if present
- `["image", "<cover-blossom-url>"]` — from the image marked `role: cover`
- `["t", "<tag>"]` per entry in `tags:`

### Text license

- `["license", "<url>"]` — once per event, from post-level `license`

### Per-image `imeta` (NIP-92 + extensions)

Each uploaded image yields one `imeta` tag:

```
["imeta",
  "url <blossom-url>",
  "m <mime-type>",
  "x <sha256>",
  "alt <alt>",              if non-empty
  "caption <caption>",      if present
  "license <url>",          if set (not UNKNOWN)
  "author <name>",          one entry per author, if set (not UNKNOWN)
  "source_url <url>",       if present
  "modifications <text>"    if present
]
```

NIP-92 explicitly allows implementers to add fields beyond its core set; clients ignore unknown fields. `license`, `author`, `source_url`, `modifications` are extensions this convention uses to carry TULLU-BA data inline with the image reference.

### Markdown body transformation

The Markdown body is traversed: each `![alt](filename.png)` is replaced with `![alt](<blossom-url>)` after the image has been uploaded. Size hints (`![alt](file.png =300x200)`) are stripped. Absolute URLs in the source are preserved.

---

## Round-trip: YAML ↔ Markdown

The convention is designed so authors can work in **either direction**:

### Forward: YAML → published event

1. Pipeline parses frontmatter.
2. For each `images[]` entry, uploads `file` to Blossom, receives `{url, sha256}`.
3. Builds mapping `filename → blossom-url`.
4. Rewrites Markdown body image references.
5. Assembles `imeta` tags from the structured fields + upload results.
6. Signs and publishes.

### Reverse: "flat" Markdown → YAML

Some authors write Markdown with visible attribution lines underneath images, like:

```markdown
![Yeast dough with filling](dough-filling.jpg)
*Photo: Jane Doe, [CC0](https://creativecommons.org/publicdomain/zero/1.0/)*

![Cinnamon rolls at the market](flickr-buns.jpg)
*Photo: Max Mustermann via [Flickr](https://www.flickr.com/photos/mustermann/12345/), [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/), cropped*
```

A round-trip parser can reconstruct the `images[]` YAML from this pattern because it follows a predictable shape:

```
![<alt>](<file>)
*Photo: <name>{, <name2>}{ via [<source-label>](<source-url>)}, [<license-label>](<license-url>){, <modifications>}.*
```

**Recognizable tokens** for the reverse parser:

- Image reference: standard Markdown `![alt](file)` on its own line.
- Attribution line: starts on the next line, wrapped in `*...*`, begins with a role word (`Photo`, `Foto`, `Image`, `Abb.`, etc.), ends with a period.
- **Authors**: comma-separated names between the role word and either `via` or the license bracket.
- **Source**: `via [<label>](<url>)`. The label is derived from the hostname if generated forward; on reverse, it's discarded and only the URL is kept.
- **License**: `[<short>](<url>)`. On reverse, only the URL is kept.
- **Modifications**: a trailing fragment after the license link, before the final period.

### Canonical caption format

Forward generation (YAML → caption string) uses a deterministic template:

```
{caption + ". "}Photo: {authors joined by " / "}{ via [<source-host>](<source_url>)}, [<license-short>]({license_url}){, <modifications>}.
```

With a license short-form catalog:

| License URL prefix | Short form |
|---|---|
| `https://creativecommons.org/publicdomain/zero/1.0/` | `CC0` |
| `https://creativecommons.org/licenses/by/4.0/` | `CC BY 4.0` |
| `https://creativecommons.org/licenses/by-sa/4.0/` | `CC BY-SA 4.0` |
| `https://creativecommons.org/licenses/by-nd/4.0/` | `CC BY-ND 4.0` |
| `https://creativecommons.org/licenses/by-nc/4.0/` | `CC BY-NC 4.0` |
| `https://creativecommons.org/licenses/by-nc-sa/4.0/` | `CC BY-NC-SA 4.0` |
| `https://creativecommons.org/licenses/by-nc-nd/4.0/` | `CC BY-NC-ND 4.0` |
| *anything else* | hostname of the URL |

Locale suffixes (`/deed.de`, `/deed.en`) are collapsed to the base URL for short-form lookup.

---

## Why this is forward-safe

Three properties make the convention robust over time:

1. **Events are replaceable.** A post re-published with improved metadata (better alt text, filled-in `UNKNOWN` fields) simply overrides the previous event via NIP-23's `d`-tag identity.
2. **`imeta` extensions degrade gracefully.** Clients that don't read `license`/`author`/`source_url` in `imeta` ignore them; they still get the standard `url`/`m`/`x`/`alt` fields.
3. **Reverse parsing is optional.** A pipeline can publish without ever supporting the reverse direction; the YAML is always the source of truth.

---

## What this convention does **not** do

- **Does not inject captions into the event body.** Early drafts did; it turned into a fragile regex workout across Markdown variants (link-wrapped images, list-embedded images, block quotes). Recommended approach: let clients render attribution from `imeta` fields. Inject body captions only if a concrete client gap makes it necessary.
- **Does not define new Nostr kinds.** It uses `kind:30023` (NIP-23), `kind:10063` (Blossom user server list, BUD-03), and `kind:10002` (NIP-65 relay list) as-is.
- **Does not mandate Blossom.** The convention maps cleanly to any content-addressed image host. Blossom is just the most interoperable option in the Nostr ecosystem today.

---

## Open questions for the community

1. **License in `imeta` — convention or its own tag?** Should per-image license info live in `imeta` as a non-standard field, or should there be a companion `license` tag per image with an `x <sha256>` back-reference? The `imeta` approach keeps everything per-image in one tag. A separate tag decouples concerns but duplicates the binding.

2. **Multiple licenses per image.** CC dual-licensing exists (e.g. "CC BY-SA or GFDL"). Should the spec allow `license` as an array, or repeat the `license` field multiple times in `imeta`?

3. **Canonical short-form catalog.** The table above is practical but not authoritative. Should a registry of license-URL-to-short-form mappings live somewhere reference-able?

4. **Attribution in languages other than English.** The reverse-parser pattern uses role words like `Photo`, `Foto`, `Image`. A language-agnostic marker (e.g. a leading emoji or a structured sigil like `⸻ credit ⸻`) would sidestep i18n, at the cost of readability.

5. **Machine-readable attribution in client rendering.** Long-form clients (Habla, Flycat, etc.) vary in how (and whether) they surface `imeta.license` / `imeta.author`. Adoption of this convention is only valuable if clients pick it up — a reference renderer implementation would lower the bar.

---

## References

- [NIP-23 — Long-form Content](https://github.com/nostr-protocol/nips/blob/master/23.md)
- [NIP-92 — Media Attachments (`imeta`)](https://github.com/nostr-protocol/nips/blob/master/92.md)
- [NIP-65 — Relay List Metadata (`kind:10002`)](https://github.com/nostr-protocol/nips/blob/master/65.md)
- [Blossom BUD-01 — Server Requirements](https://github.com/hzrd149/blossom/blob/master/buds/01.md)
- [Blossom BUD-03 — User Server List (`kind:10063`)](https://github.com/hzrd149/blossom/blob/master/buds/03.md)
- [TULLU / TULLU-BA attribution rule (German, Wikimedia practice)](https://commons.wikimedia.org/wiki/Commons:Lizenzhinweisgenerator)
- [schema.org/CreativeWork — `license` field convention](https://schema.org/license)
