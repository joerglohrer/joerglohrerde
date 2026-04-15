<script lang="ts">
	import { onMount } from 'svelte';
	import type { NostrEvent } from '$lib/nostr/loaders';
	import { loadPost } from '$lib/nostr/loaders';
	import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config';
	import { buildHablaLink } from '$lib/nostr/naddr';
	import PostView from '$lib/components/PostView.svelte';
	import LoadingOrError from '$lib/components/LoadingOrError.svelte';

	let { data } = $props();
	const dtag = $derived(data.dtag);

	let post: NostrEvent | null = $state(null);
	let loading = $state(true);
	let error: string | null = $state(null);

	const hablaLink = $derived(
		buildHablaLink({
			pubkey: AUTHOR_PUBKEY_HEX,
			kind: 30023,
			identifier: dtag
		})
	);

	onMount(async () => {
		try {
			const p = await loadPost(dtag);
			loading = false;
			if (!p) {
				error = `Post "${dtag}" nicht gefunden.`;
			} else {
				post = p;
			}
		} catch (e) {
			loading = false;
			error = e instanceof Error ? e.message : 'Unbekannter Fehler';
		}
	});
</script>

<nav class="breadcrumb"><a href="/">← Zurück zur Übersicht</a></nav>

<LoadingOrError {loading} {error} {hablaLink} />

{#if post}
	<PostView event={post} />
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
</style>
