<script lang="ts">
	import PostCard from '$lib/components/PostCard.svelte';
	import { t } from '$lib/i18n';

	let { data } = $props();
	const tagName = $derived(data.tagName);
</script>

<svelte:head>
	<title>{$t('tag.doc_title', { tag: tagName })}</title>
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<nav class="breadcrumb"><a href="/">{$t('post.back_to_overview')}</a></nav>

<h1 class="tag-title">#{tagName}</h1>

{#if data.posts.length === 0}
	<p class="status">{$t('tag.empty', { tag: tagName })}</p>
{/if}

{#each data.posts as post (post.slug)}
	<PostCard {post} />
{/each}

<style>
	.breadcrumb {
		font-size: 0.9rem;
		margin-bottom: 1rem;
	}
	.breadcrumb a {
		text-decoration: none;
	}
	.breadcrumb a:hover {
		text-decoration: underline;
	}
	.tag-title {
		margin: 0 0 1.5rem;
		font-size: 1.6rem;
		letter-spacing: -0.02em;
	}
	.status {
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--muted);
		text-align: center;
	}
</style>
