<script lang="ts">
	import { renderMarkdown } from '$lib/render/markdown';
	import impressumRaw from '../../../../content/impressum.md?raw';
	import { t } from '$lib/i18n';

	// Frontmatter abtrennen, nur Body rendern.
	// Toleriert trailing spaces auf den ---/--- trenner-zeilen.
	const match = impressumRaw.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n([\s\S]*)$/);
	const body = match ? match[1] : impressumRaw;
	const html = renderMarkdown(body);
</script>

<svelte:head>
	<title>{$t('imprint.doc_title')}</title>
	<meta name="robots" content="index, follow" />
</svelte:head>

<article class="impressum">
	{@html html}
</article>

<style>
	.impressum :global(h1) {
		font-size: 1.8rem;
		margin: 0 0 1rem;
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
	.impressum :global(a) {
		color: var(--accent);
	}
</style>
