<script lang="ts">
	import { t } from '$lib/i18n';

	interface Props {
		loading: boolean;
		error: string | null;
	}
	let { loading, error }: Props = $props();
</script>

{#if loading && !error}
	<p class="status">{$t('status.loading')}</p>
{:else if error}
	<p class="status status-error">{error}</p>
{/if}

<style>
	.status {
		padding: 1rem;
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--muted);
		text-align: center;
	}
	.status-error {
		background: var(--danger-bg);
		color: var(--danger);
	}
</style>
