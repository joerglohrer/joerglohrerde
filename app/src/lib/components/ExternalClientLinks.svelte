<script lang="ts">
	import { externalClientLinks } from '$lib/nostr/naddr';
	import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config';

	interface Props {
		dtag: string;
	}
	let { dtag }: Props = $props();

	const links = $derived(
		externalClientLinks({
			pubkey: AUTHOR_PUBKEY_HEX,
			kind: 30023,
			identifier: dtag
		})
	);
</script>

<section class="external">
	<span class="label">In Nostr-Client öffnen (für Threads, Reactions, Teilen):</span>
	<ul>
		{#each links as l}
			<li><a href={l.url} target="_blank" rel="noopener">{l.label}</a></li>
		{/each}
	</ul>
</section>

<style>
	.external {
		margin: 2rem 0 1rem;
		padding: 0.8rem 1rem;
		background: var(--code-bg);
		border-radius: 4px;
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
		gap: 0.8rem;
	}
	li a {
		color: var(--accent);
		text-decoration: none;
	}
	li a:hover {
		text-decoration: underline;
	}
</style>
