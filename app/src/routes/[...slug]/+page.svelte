<script lang="ts">
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

	$effect(() => {
		const currentDtag = dtag;
		post = null;
		loading = true;
		error = null;
		loadPost(currentDtag)
			.then((p) => {
				if (currentDtag !== dtag) return;
				if (!p) {
					error = `Post "${currentDtag}" nicht gefunden.`;
				} else {
					post = p;
				}
			})
			.catch((e) => {
				if (currentDtag !== dtag) return;
				error = e instanceof Error ? e.message : 'Unbekannter Fehler';
			})
			.finally(() => {
				if (currentDtag === dtag) loading = false;
			});
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
