<script lang="ts">
	import { onMount } from 'svelte';
	import type { PostSummary } from '$lib/snapshot/types';
	import { fetchLivePosts, mergePosts } from '$lib/nostr/live';
	import PostCard from '$lib/components/PostCard.svelte';
	import { t, activeLocale } from '$lib/i18n';

	let { data } = $props();

	let livePosts: PostSummary[] | null = $state(null);
	const posts = $derived(livePosts ?? data.posts);

	onMount(() => {
		let cancelled = false;
		fetchLivePosts().then((live) => {
			if (cancelled) return;
			const merged = mergePosts(data.posts, live);
			if (merged) livePosts = merged;
		});
		return () => {
			cancelled = true;
		};
	});

	const filtered = $derived(posts.filter((p) => p.lang === $activeLocale));

	// Posts nach Jahr gruppieren (neueste zuerst; posts sind bereits sortiert)
	type YearGroup = { year: number; posts: PostSummary[] };
	const groupsByYear = $derived.by<YearGroup[]>(() => {
		const byYear = new Map<number, PostSummary[]>();
		for (const p of filtered) {
			const year = new Date(p.published_at * 1000).getUTCFullYear();
			if (!byYear.has(year)) byYear.set(year, []);
			byYear.get(year)!.push(p);
		}
		return [...byYear.entries()]
			.map(([year, p]) => ({ year, posts: p }))
			.sort((a, b) => b.year - a.year);
	});
</script>

<svelte:head>
	<title>{$t('archive.doc_title')}</title>
	<meta name="description" content={$t('archive.subtitle')} />
	<link rel="canonical" href="__SITE_URL__/archiv/" />
	<meta property="og:title" content={$t('archive.doc_title')} />
	<meta property="og:url" content="__SITE_URL__/archiv/" />
</svelte:head>

<h1 class="title">{$t('archive.title')}</h1>
<p class="meta">{$t('archive.subtitle')}</p>

{#if filtered.length === 0}
	<p class="status">{$t('home.empty')}</p>
{/if}

{#each groupsByYear as group (group.year)}
	<section class="year-group">
		<h2 class="year">{group.year}</h2>
		{#each group.posts as post (post.slug)}
			<PostCard {post} />
		{/each}
	</section>
{/each}

<style>
	.title {
		margin: 0 0 0.3rem;
		font-size: 1.8rem;
		letter-spacing: -0.02em;
	}
	.meta {
		color: var(--muted);
		margin: 0 0 2rem;
		font-size: 0.95rem;
	}
	.status {
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--muted);
		text-align: center;
	}
	.year-group {
		margin-bottom: 2.5rem;
	}
	.year {
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		margin: 0 0 0.5rem;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid var(--border);
		color: var(--muted);
	}
</style>
