<script lang="ts">
	interface Props {
		loading: boolean;
		error: string | null;
		hablaLink?: string;
	}
	let { loading, error, hablaLink }: Props = $props();
</script>

{#if loading && !error}
	<p class="status">Lade von Nostr-Relays …</p>
{:else if error}
	<p class="status status-error">
		{error}
		{#if hablaLink}
			<br />
			<a href={hablaLink} target="_blank" rel="noopener"> In Habla.news öffnen </a>
		{/if}
	</p>
{/if}

<style>
	.status {
		padding: 1rem;
		border-radius: 4px;
		background: var(--code-bg);
		color: var(--muted);
		text-align: center;
	}
	.status-error {
		background: #fee2e2;
		color: #991b1b;
	}
	@media (prefers-color-scheme: dark) {
		.status-error {
			background: #450a0a;
			color: #fca5a5;
		}
	}
</style>
