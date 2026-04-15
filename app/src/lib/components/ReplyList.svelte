<script lang="ts">
	import { onMount } from 'svelte';
	import type { NostrEvent } from '$lib/nostr/loaders';
	import { loadReplies } from '$lib/nostr/loaders';
	import ReplyItem from './ReplyItem.svelte';

	interface Props {
		dtag: string;
		/**
		 * Optimistisch hinzugefügte Events (z. B. frisch gesendete Kommentare).
		 * Werden vor dem Rendern zur geladenen Liste gemerged, dedupliziert per id.
		 */
		optimistic?: NostrEvent[];
	}
	let { dtag, optimistic = [] }: Props = $props();

	let fetched: NostrEvent[] = $state([]);
	let loading = $state(true);

	const merged = $derived.by(() => {
		const byId = new Map<string, NostrEvent>();
		for (const ev of fetched) byId.set(ev.id, ev);
		for (const ev of optimistic) byId.set(ev.id, ev);
		return [...byId.values()].sort((a, b) => a.created_at - b.created_at);
	});

	onMount(async () => {
		try {
			fetched = await loadReplies(dtag);
		} finally {
			loading = false;
		}
	});
</script>

<section class="replies">
	<h3>Kommentare ({merged.length})</h3>
	{#if loading}
		<p class="hint">Lade Kommentare …</p>
	{:else if merged.length === 0}
		<p class="hint">Noch keine Kommentare.</p>
	{:else}
		<ul>
			{#each merged as reply (reply.id)}
				<ReplyItem event={reply} />
			{/each}
		</ul>
	{/if}
</section>

<style>
	.replies {
		margin: 2rem 0;
	}
	h3 {
		font-size: 1.1rem;
		margin: 0 0 0.8rem;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.hint {
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
