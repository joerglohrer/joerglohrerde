<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		/** naddr1…-Bech32 des posts (aus dem snapshot; kein nostr-tools noetig). */
		naddr: string;
	}
	let { naddr }: Props = $props();

	// EduFeed zuerst — OER/OEP-Bildungscommunity, wichtig für Jörgs Zielgruppe.
	const links = $derived([
		{ label: 'EduFeed', url: `https://edufeed.org/${naddr}` },
		{ label: 'Habla', url: `https://habla.news/a/${naddr}` },
		{ label: 'Yakihonne', url: `https://yakihonne.com/article/${naddr}` }
	]);
</script>

<section class="external">
	<span class="label">{$t('post.open_in_client')}</span>
	<ul>
		{#each links as l (l.url)}
			<li><a href={l.url} target="_blank" rel="noopener">{l.label} ↗</a></li>
		{/each}
	</ul>
</section>

<style>
	.external {
		margin: 2rem 0 1rem;
		padding: 0.8rem 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		font-size: 0.9rem;
	}
	.label {
		display: block;
		color: var(--muted);
		margin-bottom: 0.4rem;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}
	li a {
		text-decoration: none;
		font-weight: 500;
	}
	li a:hover {
		text-decoration: underline;
	}
</style>
