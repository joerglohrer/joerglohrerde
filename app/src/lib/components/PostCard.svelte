<script lang="ts">
	import type { PostSummary } from '$lib/snapshot/types';
	import { canonicalPostPath } from '$lib/url/legacy';
	import { activeLocale, t } from '$lib/i18n';
	import { formatDate } from '$lib/i18n/date';

	interface Props {
		post: PostSummary;
	}
	let { post }: Props = $props();

	const href = $derived(canonicalPostPath(post.slug));
	const date = $derived(formatDate(post.published_at, $activeLocale));
	const title = $derived(post.title || $t('post.untitled'));
</script>

<a class="card" {href}>
	{#if post.cover_image}
		<img
			class="thumb"
			src={post.cover_image.url}
			alt=""
			loading="lazy"
			decoding="async"
			width="120"
			height="120"
		/>
	{:else}
		<div class="thumb thumb-empty" aria-hidden="true"></div>
	{/if}
	<div class="text">
		<time class="meta" datetime={new Date(post.published_at * 1000).toISOString()}>{date}</time>
		<h2>{title}</h2>
		{#if post.summary}<p class="excerpt">{post.summary}</p>{/if}
	</div>
</a>

<style>
	.card {
		display: flex;
		gap: 1.1rem;
		padding: 1.1rem 0;
		border-bottom: 1px solid var(--border);
		color: inherit;
		text-decoration: none;
		align-items: flex-start;
	}
	.thumb {
		flex: 0 0 120px;
		width: 120px;
		height: 120px;
		object-fit: cover;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border);
		background: var(--surface);
		transition: transform 200ms ease;
	}
	.thumb-empty {
		background:
			linear-gradient(135deg, var(--surface), transparent 60%),
			var(--surface);
	}
	.card:hover .thumb {
		transform: translateY(-1px);
	}
	.text {
		flex: 1;
		min-width: 0;
	}
	h2 {
		margin: 0 0 0.35rem;
		font-size: 1.2rem;
		line-height: 1.3;
		letter-spacing: -0.01em;
		color: var(--fg);
		overflow-wrap: anywhere;
		text-wrap: balance;
		transition: color 120ms;
	}
	.card:hover h2 {
		color: var(--accent);
	}
	.excerpt {
		color: var(--muted);
		font-size: 0.95rem;
		line-height: 1.5;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.meta {
		display: block;
		font-size: 0.8rem;
		letter-spacing: 0.02em;
		color: var(--muted);
		margin-bottom: 0.25rem;
	}
	@media (max-width: 479px) {
		.card {
			flex-direction: column;
			gap: 0.6rem;
		}
		.thumb {
			flex: 0 0 auto;
			width: 100%;
			height: auto;
			aspect-ratio: 2 / 1;
		}
		.excerpt {
			-webkit-line-clamp: 2;
			line-clamp: 2;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.thumb,
		h2 {
			transition: none;
		}
		.card:hover .thumb {
			transform: none;
		}
	}
</style>
