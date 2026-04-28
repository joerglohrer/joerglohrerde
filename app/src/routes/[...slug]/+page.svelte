<script lang="ts">
  import type { NostrEvent } from '$lib/nostr/loaders'
  import { loadPost } from '$lib/nostr/loaders'
  import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config'
  import { buildHablaLink } from '$lib/nostr/naddr'
  import PostView from '$lib/components/PostView.svelte'
  import LoadingOrError from '$lib/components/LoadingOrError.svelte'
  import { renderMarkdown } from '$lib/render/markdown'
  import { t } from '$lib/i18n'
  import { get } from 'svelte/store'
  import { onMount } from 'svelte'

  let { data } = $props()
  const dtag = $derived(data.dtag)
  const snapshot = $derived(data.snapshot)

  let post: NostrEvent | null = $state(null)
  let loading = $state(false)
  let error: string | null = $state(null)

  const hablaLink = $derived(
    buildHablaLink({
      pubkey: AUTHOR_PUBKEY_HEX,
      kind: 30023,
      identifier: dtag,
    }),
  )

  const siteUrl = '__SITE_URL__'
  const canonical = $derived(`${siteUrl}/${snapshot?.slug ?? dtag}/`)
  const ogImage = $derived(
    snapshot?.cover_image?.url ?? `${siteUrl}/joerg-profil-2024.webp`,
  )
  const ogImageAlt = $derived(
    snapshot?.cover_image?.alt ?? snapshot?.title ?? 'Jörg Lohrer',
  )
  const bodyHtmlPrerendered = $derived(
    snapshot ? renderMarkdown(snapshot.content_markdown) : '',
  )

  onMount(() => {
    if (snapshot) return
    loading = true
    const currentDtag = dtag
    loadPost(currentDtag)
      .then((p) => {
        if (currentDtag !== dtag) return
        if (!p) error = get(t)('post.not_found', { values: { slug: currentDtag } })
        else post = p
      })
      .catch((e) => {
        if (currentDtag !== dtag) return
        error = e instanceof Error ? e.message : get(t)('post.unknown_error')
      })
      .finally(() => {
        if (currentDtag === dtag) loading = false
      })
  })

  const jsonLd = $derived(
    snapshot
      ? JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: snapshot.title,
          description: snapshot.summary,
          datePublished: new Date(snapshot.published_at * 1000).toISOString(),
          dateModified: new Date(snapshot.created_at * 1000).toISOString(),
          author: { '@type': 'Person', name: 'Jörg Lohrer' },
          inLanguage: snapshot.lang,
          image: ogImage,
          mainEntityOfPage: canonical,
        })
      : '',
  )
</script>

<svelte:head>
  {#if snapshot}
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
    {#if snapshot.cover_image?.width}
      <meta property="og:image:width" content={String(snapshot.cover_image.width)} />
    {/if}
    {#if snapshot.cover_image?.height}
      <meta property="og:image:height" content={String(snapshot.cover_image.height)} />
    {/if}
    <meta property="article:published_time" content={new Date(snapshot.published_at * 1000).toISOString()} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={snapshot.title} />
    <meta name="twitter:description" content={snapshot.summary} />
    <meta name="twitter:image" content={ogImage} />
    {#each snapshot.translations as alt}
      <link rel="alternate" hreflang={alt.lang} href={`${siteUrl}/${alt.slug}/`} />
    {/each}
    <link rel="alternate" hreflang="x-default" href={canonical} />
    <script type="application/ld+json">{jsonLd}</script>
  {/if}
</svelte:head>

<nav class="breadcrumb"><a href="/">{$t('post.back_to_overview')}</a></nav>

{#if snapshot}
  <article class="post">
    <h1 class="post-title">{snapshot.title}</h1>
    {#if snapshot.cover_image}
      <p class="cover">
        <img src={snapshot.cover_image.url} alt={snapshot.cover_image.alt ?? ''} />
      </p>
    {/if}
    {#if snapshot.summary}
      <p class="summary">{snapshot.summary}</p>
    {/if}
    <div class="body">{@html bodyHtmlPrerendered}</div>
  </article>
{:else}
  <LoadingOrError {loading} {error} {hablaLink} />
  {#if post}
    <PostView event={post} />
  {/if}
{/if}

<style>
  .breadcrumb {
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  .breadcrumb a {
    color: var(--accent);
    text-decoration: none;
  }
  .breadcrumb a:hover {
    text-decoration: underline;
  }
  .post-title {
    font-size: 1.5rem;
    line-height: 1.25;
    margin: 0 0 0.4rem;
    word-wrap: break-word;
  }
  @media (min-width: 640px) {
    .post-title {
      font-size: 2rem;
      line-height: 1.2;
    }
  }
  .cover {
    max-width: 480px;
    margin: 1rem auto 1.5rem;
  }
  .cover img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 4px;
  }
  .summary {
    font-style: italic;
    color: var(--muted);
  }
  .body :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }
  .body :global(a) {
    color: var(--accent);
    word-break: break-word;
  }
  .body :global(pre) {
    background: var(--code-bg);
    padding: 0.8rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.88em;
    max-width: 100%;
  }
  .body :global(code) {
    background: var(--code-bg);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 0.92em;
    word-break: break-word;
  }
  .body :global(pre code) {
    padding: 0;
    background: none;
    word-break: normal;
  }
  .body :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2rem 0;
  }
  .body :global(blockquote) {
    border-left: 3px solid var(--border);
    padding: 0 0 0 1rem;
    margin: 1rem 0;
    color: var(--muted);
  }
</style>
