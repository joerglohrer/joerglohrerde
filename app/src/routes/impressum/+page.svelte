<script lang="ts">
	import { t } from '$lib/i18n';

	let { data } = $props();
</script>

<svelte:head>
	<title>{$t('imprint.doc_title')}</title>
	<link rel="canonical" href="__SITE_URL__/impressum/" />
	<meta name="robots" content="index, follow" />
</svelte:head>

<article class="impressum">
	{@html data.html}
</article>

<style>
	.impressum :global(h1) {
		font-size: 1.8rem;
		margin: 0 0 1rem;
		letter-spacing: -0.02em;
	}
	.impressum :global(h2) {
		font-size: 1.3rem;
		margin: 2rem 0 0.6rem;
	}
	.impressum :global(h3) {
		font-size: 1.05rem;
		margin: 1.4rem 0 0.4rem;
	}
	.impressum :global(p) {
		margin: 0 0 1rem;
	}
</style>
