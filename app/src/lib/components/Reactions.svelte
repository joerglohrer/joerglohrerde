<script lang="ts">
	import { onMount } from 'svelte';
	import type { ReactionSummary } from '$lib/nostr/loaders';
	import { loadReactions } from '$lib/nostr/loaders';

	interface Props {
		dtag: string;
	}
	let { dtag }: Props = $props();

	let reactions: ReactionSummary[] = $state([]);

	onMount(async () => {
		try {
			reactions = await loadReactions(dtag);
		} catch {
			reactions = [];
		}
	});

	function displayChar(c: string): string {
		if (c === '+' || c === '') return '👍';
		if (c === '-') return '👎';
		return c;
	}
</script>

{#if reactions.length > 0}
	<div class="reactions">
		{#each reactions as r}
			<span class="reaction">
				<span class="emoji">{displayChar(r.content)}</span>
				<span class="count">{r.count}</span>
			</span>
		{/each}
	</div>
{/if}

<style>
	.reactions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 1.5rem 0;
	}
	.reaction {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.6rem;
		background: var(--code-bg);
		border-radius: 999px;
		font-size: 0.9rem;
	}
	.count {
		color: var(--muted);
	}
</style>
