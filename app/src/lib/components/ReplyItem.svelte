<script lang="ts">
	import type { NostrEvent } from '$lib/nostr/loaders';

	interface Props {
		event: NostrEvent;
	}
	let { event }: Props = $props();

	const date = $derived(new Date(event.created_at * 1000).toLocaleString('de-DE'));
	const authorNpub = $derived(event.pubkey.slice(0, 12) + '…');
</script>

<li class="reply">
	<div class="meta">
		<span class="author">{authorNpub}</span>
		<span class="sep">·</span>
		<span class="date">{date}</span>
	</div>
	<div class="content">{event.content}</div>
</li>

<style>
	.reply {
		list-style: none;
		padding: 0.8rem 0;
		border-bottom: 1px solid var(--border);
	}
	.meta {
		font-size: 0.85rem;
		color: var(--muted);
		margin-bottom: 0.3rem;
	}
	.author {
		font-family: monospace;
	}
	.sep {
		margin: 0 0.4rem;
		opacity: 0.5;
	}
	.content {
		white-space: pre-wrap;
		word-wrap: break-word;
	}
</style>
