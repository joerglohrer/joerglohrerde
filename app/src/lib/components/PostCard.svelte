<script lang="ts">
	import type { NostrEvent } from '$lib/nostr/loaders';
	import { canonicalPostPath } from '$lib/url/legacy';

	interface Props {
		event: NostrEvent;
	}
	let { event }: Props = $props();

	function tagValue(e: NostrEvent, name: string): string {
		return e.tags.find((t) => t[0] === name)?.[1] ?? '';
	}

	const dtag = $derived(tagValue(event, 'd'));
	const title = $derived(tagValue(event, 'title') || '(ohne Titel)');
	const summary = $derived(tagValue(event, 'summary'));
	const image = $derived(tagValue(event, 'image'));
	const publishedAt = $derived(
		parseInt(tagValue(event, 'published_at') || `${event.created_at}`, 10)
	);
	const date = $derived(
		new Date(publishedAt * 1000).toLocaleDateString('de-DE', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);
	const href = $derived(canonicalPostPath(dtag));
</script>

<a class="card" {href}>
	<div
		class="thumb"
		style:background-image={image ? `url('${image}')` : undefined}
		aria-hidden="true"
	></div>
	<div class="text">
		<div class="meta">{date}</div>
		<h2>{title}</h2>
		{#if summary}<p class="excerpt">{summary}</p>{/if}
	</div>
</a>

<style>
	.card {
		display: flex;
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--border);
		color: inherit;
		text-decoration: none;
		align-items: flex-start;
	}
	.card:hover {
		background: var(--code-bg);
	}
	.thumb {
		flex: 0 0 120px;
		aspect-ratio: 1 / 1;
		border-radius: 4px;
		background: var(--code-bg) center/cover no-repeat;
	}
	.text {
		flex: 1;
		min-width: 0;
	}
	h2 {
		margin: 0 0 0.3rem;
		font-size: 1.2rem;
		color: var(--fg);
		word-wrap: break-word;
	}
	.excerpt {
		color: var(--muted);
		font-size: 0.95rem;
		margin: 0;
	}
	.meta {
		font-size: 0.85rem;
		color: var(--muted);
		margin-bottom: 0.2rem;
	}
	@media (max-width: 479px) {
		.card {
			flex-direction: column;
			gap: 0.5rem;
		}
		.thumb {
			flex: 0 0 auto;
			width: 100%;
			aspect-ratio: 2 / 1;
		}
	}
</style>
