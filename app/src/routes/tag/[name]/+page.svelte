<script lang="ts">
	import { onMount } from 'svelte';
	import type { NostrEvent } from '$lib/nostr/loaders';
	import { loadPostsByTag } from '$lib/nostr/loaders';
	import PostCard from '$lib/components/PostCard.svelte';
	import LoadingOrError from '$lib/components/LoadingOrError.svelte';

	let { data } = $props();
	const tagName = $derived(data.tagName);

	let posts: NostrEvent[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);

	onMount(async () => {
		try {
			posts = await loadPostsByTag(tagName);
			loading = false;
			if (posts.length === 0) {
				error = `Keine Posts mit Tag "${tagName}" gefunden.`;
			}
		} catch (e) {
			loading = false;
			error = e instanceof Error ? e.message : 'Unbekannter Fehler';
		}
	});

	$effect(() => {
		document.title = `#${tagName} – Jörg Lohrer`;
	});
</script>

<nav class="breadcrumb"><a href="/">← Zurück zur Übersicht</a></nav>

<h1 class="tag-title">#{tagName}</h1>

<LoadingOrError {loading} {error} />

{#each posts as post (post.id)}
	<PostCard event={post} />
{/each}

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
	.tag-title {
		margin: 0 0 1.5rem;
		font-size: 1.6rem;
	}
</style>
