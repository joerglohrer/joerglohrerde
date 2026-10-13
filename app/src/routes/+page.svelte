<script lang="ts">
	import { onMount } from 'svelte';
	import type { PostSummary } from '$lib/snapshot/types';
	import { fetchLivePosts, mergePosts } from '$lib/nostr/live';
	import PostCard from '$lib/components/PostCard.svelte';
	import SocialIcons from '$lib/components/SocialIcons.svelte';
	import { t, activeLocale } from '$lib/i18n';

	let { data } = $props();

	// Lokales Profilbild aus static/ — stabil, sofort da, kein roundtrip.
	const HERO_AVATAR = '/joerg-profil-2024.webp';
	const LATEST_COUNT = 5;
	const SITE_URL = '__SITE_URL__';
	const DESCRIPTION = 'Blog von Jörg Lohrer – Bildung, Religion, offene Bildungsressourcen und Nostr.';

	// Snapshot sofort rendern, danach einmal live gegen die relays abgleichen
	// (neuer post seit dem letzten deploy). Aendert sich nichts, bleibt die
	// vorgerenderte liste unangetastet.
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

	const profile = $derived(data.profile);
	const displayName = $derived(profile?.display_name ?? profile?.name ?? 'Jörg Lohrer');
	const about = $derived(profile?.about ?? '');
	const website = $derived(profile?.website ?? '');

	const filtered = $derived(posts.filter((p) => p.lang === $activeLocale));
	const latest = $derived(filtered.slice(0, LATEST_COUNT));
	const hasMore = $derived(filtered.length > LATEST_COUNT);
</script>

<svelte:head>
	<title>{displayName} – Blog</title>
	<meta name="description" content={DESCRIPTION} />
	<link rel="canonical" href="{SITE_URL}/" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="{displayName} – Blog" />
	<meta property="og:description" content={DESCRIPTION} />
	<meta property="og:url" content="{SITE_URL}/" />
	<meta property="og:image" content="{SITE_URL}{HERO_AVATAR}" />
	<meta name="twitter:card" content="summary" />
</svelte:head>

<section class="hero">
	<div class="hero-left">
		<img class="avatar" src={HERO_AVATAR} alt={displayName} width="96" height="96" fetchpriority="high" />
		<SocialIcons />
	</div>
	<div class="hero-text">
		<h1 class="hero-name">{displayName}</h1>
		<p class="hero-greeting">{$t('home.greeting')}</p>
		{#if about}
			<p class="hero-about">{about}</p>
		{/if}
		{#if website}
			<p class="meta-line">
				<a href={website} target="_blank" rel="noopener me">
					{website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
				</a>
			</p>
		{/if}
	</div>
</section>

<section class="latest">
	<h2 class="section-title">{$t('home.latest')}</h2>
	{#if latest.length === 0}
		<p class="status">{$t('home.empty')}</p>
	{/if}
	{#each latest as post (post.slug)}
		<PostCard {post} />
	{/each}
	{#if hasMore}
		<p class="more">
			<a href="/archiv/" class="more-link">{$t('home.more_archive')}</a>
		</p>
	{/if}
</section>

<style>
	.hero {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		padding: 1rem 0 2rem;
		margin-bottom: 1.75rem;
		border-bottom: 1px solid var(--border);
	}
	.hero-left {
		flex: 0 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}
	.avatar {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		object-fit: cover;
		background: var(--surface);
		box-shadow:
			0 0 0 3px var(--bg),
			0 0 0 4px var(--border);
	}
	.hero-text {
		flex: 1;
		min-width: 0;
	}
	.hero-name {
		margin: 0.1rem 0 0.35rem;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}
	.hero-greeting {
		margin: 0 0 0.6rem;
		font-size: 1.05rem;
	}
	.hero-about {
		margin: 0 0 0.5rem;
		color: var(--muted);
		line-height: 1.45;
	}
	.meta-line {
		margin: 0;
		font-size: 0.9rem;
	}
	.section-title {
		margin: 0 0 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.status {
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--muted);
		text-align: center;
	}
	.more {
		margin: 1.75rem 0 0;
		text-align: center;
	}
	.more-link {
		font-weight: 500;
		text-decoration: none;
	}
	.more-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 520px) {
		.hero {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 1rem;
		}
	}
</style>
