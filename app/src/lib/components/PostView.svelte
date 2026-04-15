<script lang="ts">
	import type { NostrEvent } from '$lib/nostr/loaders';
	import type { SignedEvent } from '$lib/nostr/signer';
	import { renderMarkdown } from '$lib/render/markdown';
	import Reactions from './Reactions.svelte';
	import ReplyList from './ReplyList.svelte';
	import ReplyComposer from './ReplyComposer.svelte';

	interface Props {
		event: NostrEvent;
	}
	let { event }: Props = $props();

	function tagValue(e: NostrEvent, name: string): string {
		return e.tags.find((t) => t[0] === name)?.[1] ?? '';
	}
	function tagsAll(e: NostrEvent, name: string): string[] {
		return e.tags.filter((t) => t[0] === name).map((t) => t[1]);
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
	const tags = $derived(tagsAll(event, 't'));
	const bodyHtml = $derived(renderMarkdown(event.content));

	// Optimistisch gesendete Replies: der Composer pusht sie rein,
	// ReplyList merged sie mit den vom Relay geladenen Replies (dedup per id).
	let optimisticReplies: NostrEvent[] = $state([]);
	function handlePublished(signed: SignedEvent) {
		optimisticReplies = [...optimisticReplies, signed as unknown as NostrEvent];
	}

	$effect(() => {
		document.title = `${title} – Jörg Lohrer`;
	});
</script>

<h1 class="post-title">{title}</h1>
<div class="meta">
	Veröffentlicht am {date}
	{#if tags.length > 0}
		<div class="tags">
			{#each tags as t}
				<a class="tag" href="/tag/{encodeURIComponent(t)}/">{t}</a>
			{/each}
		</div>
	{/if}
</div>

{#if image}
	<p class="cover"><img src={image} alt="Cover-Bild" /></p>
{/if}

{#if summary}
	<p class="summary">{summary}</p>
{/if}

<article>{@html bodyHtml}</article>

{#if dtag}
	<Reactions {dtag} />
	<ReplyComposer {dtag} eventId={event.id} onPublished={handlePublished} />
	<ReplyList {dtag} optimistic={optimisticReplies} />
{/if}

<style>
	.post-title {
		font-size: 1.5rem;
		line-height: 1.25;
		margin: 0 0 0.4rem;
		word-wrap: break-word;
	}
	@media (min-width: 640px) {
		.post-title {
			font-size: 2rem;
			line-height: 1.2;
		}
	}
	.meta {
		color: var(--muted);
		font-size: 0.92rem;
		margin-bottom: 2rem;
	}
	.tags {
		margin-top: 0.4rem;
	}
	.tag {
		display: inline-block;
		background: var(--code-bg);
		border-radius: 3px;
		padding: 1px 7px;
		margin: 0 4px 4px 0;
		font-size: 0.85em;
		color: var(--fg);
		text-decoration: none;
	}
	.tag:hover {
		background: var(--border);
	}
	.cover {
		max-width: 480px;
		margin: 1rem auto 1.5rem;
	}
	.cover img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: 4px;
	}
	.summary {
		font-style: italic;
		color: var(--muted);
	}
	article :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 4px;
	}
	article :global(a) {
		color: var(--accent);
		word-break: break-word;
	}
	article :global(pre) {
		background: var(--code-bg);
		padding: 0.8rem;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.88em;
		max-width: 100%;
	}
	article :global(code) {
		background: var(--code-bg);
		padding: 1px 4px;
		border-radius: 3px;
		font-size: 0.92em;
		word-break: break-word;
	}
	article :global(pre code) {
		padding: 0;
		background: none;
		word-break: normal;
	}
	article :global(hr) {
		border: none;
		border-top: 1px solid var(--border);
		margin: 2rem 0;
	}
	article :global(blockquote) {
		border-left: 3px solid var(--border);
		padding: 0 0 0 1rem;
		margin: 1rem 0;
		color: var(--muted);
	}
</style>
