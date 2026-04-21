<script lang="ts">
	import { onMount } from 'svelte';
	import type { NostrEvent, Profile } from '$lib/nostr/loaders';
	import { loadPostList } from '$lib/nostr/loaders';
	import { getProfile } from '$lib/nostr/profileCache';
	import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config';
	import PostCard from '$lib/components/PostCard.svelte';
	import LoadingOrError from '$lib/components/LoadingOrError.svelte';
	import SocialIcons from '$lib/components/SocialIcons.svelte';
	import { t, activeLocale } from '$lib/i18n';
	import { get } from 'svelte/store';

	// Lokales Profilbild aus static/ — schneller als der Nostr-kind:0-Roundtrip
	// fürs kind:0 -> picture-Feld (URL wäre identisch, aber Netzwerk-Latenz).
	const HERO_AVATAR = '/joerg-profil-2024.webp';
	const LATEST_COUNT = 5;

	let profile: Profile | null = $state(null);
	let posts: NostrEvent[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);

	onMount(async () => {
		try {
			const [p, list] = await Promise.all([getProfile(AUTHOR_PUBKEY_HEX), loadPostList()]);
			profile = p;
			posts = list;
			loading = false;
			if (list.length === 0) {
				error = get(t)('home.empty');
			}
		} catch (e) {
			loading = false;
			error = e instanceof Error ? e.message : get(t)('post.unknown_error');
		}
	});

	$effect(() => {
		const p = profile;
		const name = (p && (p.display_name ?? p.name)) ?? 'Jörg Lohrer';
		document.title = `${name} – Blog`;
	});

	const displayName = $derived.by(() => {
		const p = profile;
		return (p && (p.display_name ?? p.name)) ?? 'Jörg Lohrer';
	});
	const avatarSrc = HERO_AVATAR;
	const about = $derived.by(() => profile?.about ?? '');
	const website = $derived.by(() => profile?.website ?? '');
	let currentLocale = $state('de');
	activeLocale.subscribe((v) => (currentLocale = v));

	const filtered = $derived.by(() =>
		posts.filter((p) => {
			const l = p.tags.find((tag) => tag[0] === 'l')?.[1];
			return (l ?? 'de') === currentLocale;
		})
	);
	const latest = $derived(filtered.slice(0, LATEST_COUNT));
	const hasMore = $derived(filtered.length > LATEST_COUNT);
</script>

<section class="hero">
	<div class="hero-left">
		<img class="avatar" src={avatarSrc} alt={displayName} />
		<SocialIcons />
	</div>
	<div class="hero-text">
		<h1 class="hero-name">{displayName}</h1>
		<p class="hero-greeting">{$t('home.greeting')}</p>
		{#if about}
			<p class="hero-about">{about}</p>
		{/if}
		{#if website}
			<div class="meta-line">
				<a href={website} target="_blank" rel="noopener">
					{website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
				</a>
			</div>
		{/if}
	</div>
</section>

<section class="latest">
	<h2 class="section-title">{$t('home.latest')}</h2>
	<LoadingOrError {loading} {error} />
	{#each latest as post (post.id)}
		<PostCard event={post} />
	{/each}
	{#if hasMore}
		<div class="more">
			<a href="/archiv/" class="more-link">{$t('home.more_archive')}</a>
		</div>
	{/if}
</section>

<style>
	.hero {
		display: flex;
		gap: 1.25rem;
		align-items: flex-start;
		padding: 1rem 0 2rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}
	.hero-left {
		flex: 0 0 auto;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.avatar {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		object-fit: cover;
		background: var(--code-bg);
		border: 2px solid var(--accent);
	}
	.hero-text {
		flex: 1;
		min-width: 0;
	}
	.hero-name {
		margin: 0 0 0.3rem;
		font-size: 1.6rem;
		font-weight: 700;
	}
	.hero-greeting {
		margin: 0 0 0.5rem;
		font-size: 1.05rem;
		color: var(--fg);
	}
	.hero-about {
		margin: 0 0 0.5rem;
		color: var(--muted);
		font-size: 1rem;
		line-height: 1.45;
	}
	.meta-line {
		font-size: 0.9rem;
		color: var(--muted);
	}
	.meta-line a {
		color: var(--accent);
		text-decoration: none;
	}
	.meta-line a:hover {
		text-decoration: underline;
	}
	.section-title {
		margin: 0 0 1rem;
		font-size: 1.25rem;
		font-weight: 600;
	}
	.more {
		margin-top: 1.5rem;
		text-align: center;
	}
	.more-link {
		color: var(--accent);
		text-decoration: none;
		font-weight: 500;
	}
	.more-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 520px) {
		.hero {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 0.8rem;
		}
		.hero-left {
			align-items: center;
		}
	}
</style>
