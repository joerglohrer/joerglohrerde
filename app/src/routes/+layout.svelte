<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import { bootstrapReadRelays } from '$lib/stores/readRelays';

	let { children } = $props();

	onMount(() => {
		bootstrapReadRelays();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main>
	{@render children()}
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
	}
	@media (min-width: 640px) {
		main {
			padding: 1.5rem;
		}
	}
</style>
