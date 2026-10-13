<script lang="ts">
  import PostInteractions from '$lib/components/PostInteractions.svelte'
  import { t, activeLocale } from '$lib/i18n'
  import { formatDate } from '$lib/i18n/date'

  let { data } = $props()
  const snapshot = $derived(data.snapshot)

  const siteUrl = '__SITE_URL__'

  // Site-default-OG-bild aus app/static. Dimensionen sind hartcodiert,
  // weil das asset stabil ist (siehe spec §Algorithmus-Schritt 8).
  const DEFAULT_OG_IMAGE = `${siteUrl}/joerg-profil-2024.webp`
  const DEFAULT_OG_IMAGE_WIDTH = 512
  const DEFAULT_OG_IMAGE_HEIGHT = 512

  const canonical = $derived(`${siteUrl}/${snapshot.slug}/`)
  const ogImage = $derived(snapshot.cover_image?.url ?? DEFAULT_OG_IMAGE)
  const ogImageAlt = $derived(snapshot.cover_image?.alt ?? snapshot.title ?? 'Jörg Lohrer')
  const ogImageWidth = $derived(
    snapshot.cover_image?.width ?? (snapshot.cover_image ? undefined : DEFAULT_OG_IMAGE_WIDTH),
  )
  const ogImageHeight = $derived(
    snapshot.cover_image?.height ?? (snapshot.cover_image ? undefined : DEFAULT_OG_IMAGE_HEIGHT),
  )
  // x-default zeigt auf die DE-variante, weil der autor DE-first arbeitet.
  // Bei EN-posts: DE-slug aus translations[] suchen; sonst (DE-post)
  // bleibt x-default = canonical.
  const xDefaultHref = $derived(
    snapshot.lang === 'en'
      ? `${siteUrl}/${snapshot.translations.find((tr) => tr.lang === 'de')?.slug ?? snapshot.slug}/`
      : canonical,
  )
  const publishedIso = $derived(new Date(snapshot.published_at * 1000).toISOString())
  const publishedLabel = $derived(formatDate(snapshot.published_at, $activeLocale))
  const translations = $derived(
    [...snapshot.translations].sort((a, b) => a.lang.localeCompare(b.lang)),
  )

  const jsonLd = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: snapshot.title,
      description: snapshot.summary,
      datePublished: publishedIso,
      dateModified: new Date(snapshot.created_at * 1000).toISOString(),
      author: { '@type': 'Person', name: 'Jörg Lohrer' },
      inLanguage: snapshot.lang,
      image: ogImage,
      mainEntityOfPage: canonical,
    }).replace(/<\/script>/gi, '<\\/script>'),
  )
</script>

<svelte:head>
  <title>{snapshot.title} – Jörg Lohrer</title>
  <meta name="description" content={snapshot.summary} />
  <link rel="canonical" href={canonical} />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={snapshot.title} />
  <meta property="og:description" content={snapshot.summary} />
  <meta property="og:url" content={canonical} />
  <meta property="og:locale" content={snapshot.lang === 'de' ? 'de_DE' : 'en_US'} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:image:alt" content={ogImageAlt} />
  {#if ogImageWidth}
    <meta property="og:image:width" content={String(ogImageWidth)} />
  {/if}
  {#if ogImageHeight}
    <meta property="og:image:height" content={String(ogImageHeight)} />
  {/if}
  <meta property="article:published_time" content={publishedIso} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={snapshot.title} />
  <meta name="twitter:description" content={snapshot.summary} />
  <meta name="twitter:image" content={ogImage} />
  {#each snapshot.translations as alt (alt.slug)}
    <link rel="alternate" hreflang={alt.lang} href={`${siteUrl}/${alt.slug}/`} />
  {/each}
  <link rel="alternate" hreflang="x-default" href={xDefaultHref} />
  {@html `<script type="application/ld+json">${jsonLd}</script>`}
</svelte:head>

<nav class="breadcrumb"><a href="/">{$t('post.back_to_overview')}</a></nav>

<article class="post" lang={snapshot.lang}>
  <header class="post-header">
    <h1 class="post-title">{snapshot.title || $t('post.untitled')}</h1>
    <p class="post-meta">
      <time datetime={publishedIso}>{$t('post.published_on', { date: publishedLabel })}</time>
      {#if translations.length > 0}
        <span class="lang-switch" role="group" aria-label={$t('post.language')}>
          <span class="btn active" aria-current="true">{snapshot.lang.toUpperCase()}</span>
          {#each translations as alt (alt.slug)}
            <a class="btn" href={`/${alt.slug}/`} hreflang={alt.lang} title={alt.title}>{alt.lang.toUpperCase()}</a>
          {/each}
        </span>
      {/if}
    </p>
  </header>
  {#if snapshot.cover_image}
    <figure class="cover">
      <img
        src={snapshot.cover_image.url}
        alt={snapshot.cover_image.alt ?? ''}
        width={snapshot.cover_image.width}
        height={snapshot.cover_image.height}
        fetchpriority="high"
        decoding="async"
      />
    </figure>
  {/if}
  {#if snapshot.summary}
    <p class="summary">{snapshot.summary}</p>
  {/if}
  <div class="body">{@html snapshot.content_html}</div>
  {#if snapshot.tags.length > 0}
    <ul class="tags" aria-label="Tags">
      {#each snapshot.tags as tag (tag)}
        <li><a class="tag" href={`/tag/${encodeURIComponent(tag)}/`}>{tag}</a></li>
      {/each}
    </ul>
  {/if}
  <PostInteractions
    dtag={snapshot.slug}
    eventId={snapshot.event_id}
    naddr={snapshot.naddr}
  />
</article>

<style>
  .breadcrumb {
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
  }
  .breadcrumb a {
    color: var(--muted);
    text-decoration: none;
  }
  .breadcrumb a:hover {
    color: var(--accent);
  }
  .post-header {
    margin-bottom: 1.25rem;
  }
  .post-title {
    font-size: 1.65rem;
    line-height: 1.2;
    letter-spacing: -0.02em;
    margin: 0 0 0.5rem;
    overflow-wrap: anywhere;
    text-wrap: balance;
  }
  @media (min-width: 640px) {
    .post-title {
      font-size: 2.1rem;
    }
  }
  .post-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 1rem;
    margin: 0;
    font-size: 0.88rem;
    color: var(--muted);
  }
  .lang-switch {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .btn {
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 999px;
    padding: 0 0.55em;
    font-size: 0.75rem;
    line-height: 1.6;
    letter-spacing: 0.04em;
    text-decoration: none;
  }
  .btn:hover:not(.active) {
    color: var(--fg);
    border-color: var(--muted);
  }
  .btn.active {
    color: var(--accent);
    border-color: var(--accent);
  }
  .cover {
    max-width: 520px;
    margin: 1.25rem auto 1.75rem;
  }
  .cover img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    background: var(--surface);
  }
  .summary {
    font-size: 1.08rem;
    line-height: 1.5;
    color: var(--muted);
    margin: 0 0 1.5rem;
    padding-left: 1rem;
    border-left: 3px solid var(--accent);
    text-wrap: pretty;
  }

  /* ---- Markdown-body ----------------------------------------------- */
  .body {
    text-wrap: pretty;
  }
  .body :global(h1),
  .body :global(h2) {
    font-size: 1.4rem;
    letter-spacing: -0.015em;
    line-height: 1.25;
    margin: 2.2rem 0 0.7rem;
  }
  .body :global(h3) {
    font-size: 1.15rem;
    margin: 1.8rem 0 0.5rem;
  }
  .body :global(h4) {
    font-size: 1rem;
    margin: 1.5rem 0 0.4rem;
  }
  .body :global(p),
  .body :global(ul),
  .body :global(ol) {
    margin: 0 0 1.1rem;
  }
  .body :global(li) {
    margin-bottom: 0.3rem;
  }
  .body :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
  }
  .body :global(a) {
    overflow-wrap: anywhere;
  }
  .body :global(pre) {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 0.9rem 1rem;
    border-radius: var(--radius-lg);
    overflow-x: auto;
    font-size: 0.86em;
    line-height: 1.5;
    max-width: 100%;
    margin: 0 0 1.2rem;
  }
  .body :global(code) {
    font-family: var(--font-mono);
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 0.05em 0.35em;
    border-radius: 4px;
    font-size: 0.9em;
    overflow-wrap: anywhere;
  }
  .body :global(pre code) {
    padding: 0;
    border: 0;
    background: none;
    font-size: inherit;
    overflow-wrap: normal;
  }
  .body :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2.2rem auto;
    width: 40%;
  }
  .body :global(blockquote) {
    border-left: 3px solid var(--border);
    padding: 0.1rem 0 0.1rem 1rem;
    margin: 1.2rem 0;
    color: var(--muted);
    font-style: italic;
  }
  .body :global(blockquote p:last-child) {
    margin-bottom: 0;
  }
  .body :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.92em;
    margin: 0 0 1.2rem;
    display: block;
    overflow-x: auto;
  }
  .body :global(th),
  .body :global(td) {
    text-align: left;
    padding: 0.45rem 0.6rem;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .body :global(th) {
    font-weight: 600;
    color: var(--muted);
    font-size: 0.85em;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .body :global(figure) {
    margin: 1.5rem 0;
  }
  .body :global(figcaption) {
    font-size: 0.85rem;
    color: var(--muted);
    text-align: center;
    margin-top: 0.4rem;
  }

  /* highlight.js — dezente palette auf den design-tokens */
  .body :global(.hljs-comment),
  .body :global(.hljs-quote) {
    color: var(--muted);
    font-style: italic;
  }
  .body :global(.hljs-keyword),
  .body :global(.hljs-selector-tag),
  .body :global(.hljs-built_in),
  .body :global(.hljs-meta) {
    color: var(--code-keyword);
  }
  .body :global(.hljs-string),
  .body :global(.hljs-attr),
  .body :global(.hljs-template-variable),
  .body :global(.hljs-addition) {
    color: var(--code-string);
  }
  .body :global(.hljs-number),
  .body :global(.hljs-literal),
  .body :global(.hljs-regexp) {
    color: var(--code-number);
  }
  .body :global(.hljs-title),
  .body :global(.hljs-function),
  .body :global(.hljs-section),
  .body :global(.hljs-name) {
    color: var(--code-title);
  }
  .body :global(.hljs-deletion) {
    color: var(--code-number);
    text-decoration: line-through;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    list-style: none;
    padding: 0;
    margin: 1.75rem 0 0;
  }
  .tag {
    display: inline-block;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.1rem 0.7rem;
    font-size: 0.82rem;
    color: var(--muted);
    text-decoration: none;
    transition:
      color 120ms,
      border-color 120ms;
  }
  .tag:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
