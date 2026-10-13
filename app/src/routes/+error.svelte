<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? $t('error.not_found_title') : $t('error.generic_title')} – Jörg Lohrer</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="error">
	<p class="code">{page.status}</p>
	<h1>{notFound ? $t('error.not_found_title') : $t('error.generic_title')}</h1>
	<p class="hint">
		{notFound ? $t('error.not_found_hint') : (page.error?.message ?? $t('post.unknown_error'))}
	</p>
	<p><a href="/">{$t('post.back_to_overview')}</a> · <a href="/archiv/">{$t('nav.archive')}</a></p>
</section>

<style>
	.error {
		padding: 3rem 0;
		text-align: center;
	}
	.code {
		margin: 0;
		font-size: 0.85rem;
		letter-spacing: 0.2em;
		color: var(--muted);
	}
	h1 {
		margin: 0.25rem 0 0.75rem;
		font-size: 1.6rem;
	}
	.hint {
		color: var(--muted);
		margin: 0 0 1.5rem;
	}
</style>
