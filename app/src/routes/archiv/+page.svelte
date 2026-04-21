<script lang="ts">
	import { onMount } from 'svelte';
	import type { NostrEvent } from '$lib/nostr/loaders';
	import { loadPostList } from '$lib/nostr/loaders';
	import PostCard from '$lib/components/PostCard.svelte';
	import LoadingOrError from '$lib/components/LoadingOrError.svelte';
	import { t, activeLocale } from '$lib/i18n';
	import { get } from 'svelte/store';

	let posts: NostrEvent[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);

	onMount(async () => {
		try {
			posts = await loadPostList();
			loading = false;
			if (posts.length === 0) {
				error = get(t)('home.empty');
			}
		} catch (e) {
			loading = false;
			error = e instanceof Error ? e.message : get(t)('post.unknown_error');
		}
	});

	let currentLocale = $state('de');
	activeLocale.subscribe((v) => (currentLocale = v));

	const filtered = $derived.by(() =>
		posts.filter((p) => {
			const l = p.tags.find((tag) => tag[0] === 'l')?.[1];
			return (l ?? 'de') === currentLocale;
		})
	);

	// Posts nach Jahr gruppieren (neueste zuerst)
	type YearGroup = { year: number; posts: NostrEvent[] };
	const groupsByYear = $derived.by<YearGroup[]>(() => {
		const byYear = new Map<number, NostrEvent[]>();
		for (const p of filtered) {
			const ts = Number(p.tags.find((t) => t[0] === 'published_at')?.[1] ?? p.created_at);
			const year = new Date(ts * 1000).getUTCFullYear();
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
</svelte:head>

<h1 class="title">{$t('archive.title')}</h1>
<p class="meta">{$t('archive.subtitle')}</p>

<LoadingOrError {loading} {error} />

{#each groupsByYear as group (group.year)}
	<section class="year-group">
		<h2 class="year">{group.year}</h2>
		{#each group.posts as post (post.id)}
			<PostCard event={post} />
		{/each}
	</section>
{/each}

<style>
	.title {
		margin: 0 0 0.3rem;
		font-size: 1.8rem;
	}
	.meta {
		color: var(--muted);
		margin: 0 0 2rem;
		font-size: 0.95rem;
	}
	.year-group {
		margin-bottom: 2.5rem;
	}
	.year {
		font-size: 1.2rem;
		font-weight: 600;
		margin: 0 0 1rem;
		padding-bottom: 0.3rem;
		border-bottom: 1px solid var(--border);
		color: var(--muted);
	}
</style>
