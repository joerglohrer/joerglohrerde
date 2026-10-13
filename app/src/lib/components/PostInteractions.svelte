<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import type { NostrEvent } from '$lib/nostr/loaders';
	import type { SignedEvent } from '$lib/nostr/signer';
	import ExternalClientLinks from './ExternalClientLinks.svelte';
	import { t } from '$lib/i18n';

	interface Props {
		dtag: string;
		eventId: string;
		naddr: string;
	}
	let { dtag, eventId, naddr }: Props = $props();

	/**
	 * Der live-teil der post-seite (reaktionen, kommentare, composer) haengt
	 * an applesauce/rxjs/nostr-tools. Die werden erst nach der hydration
	 * nachgeladen, damit der vorgerenderte artikel sofort interaktiv ist.
	 */
	type Live = {
		Reactions: Component<{ dtag: string }>;
		ReplyComposer: Component<{ dtag: string; eventId: string; onPublished?: (ev: SignedEvent) => void }>;
		ReplyList: Component<{ dtag: string; optimistic?: NostrEvent[] }>;
	};
	let live: Live | null = $state(null);

	onMount(async () => {
		const [reactions, composer, list] = await Promise.all([
			import('./Reactions.svelte'),
			import('./ReplyComposer.svelte'),
			import('./ReplyList.svelte')
		]);
		live = { Reactions: reactions.default, ReplyComposer: composer.default, ReplyList: list.default };
	});

	let optimisticReplies: NostrEvent[] = $state([]);
	function handlePublished(signed: SignedEvent) {
		optimisticReplies = [...optimisticReplies, signed as unknown as NostrEvent];
	}
</script>

{#if live}
	<live.Reactions {dtag} />
{/if}
<ExternalClientLinks {naddr} />
{#if live}
	<live.ReplyComposer {dtag} {eventId} onPublished={handlePublished} />
	<live.ReplyList {dtag} optimistic={optimisticReplies} />
{:else}
	<section class="replies-placeholder" aria-live="polite">
		<h3>{$t('post.comments')}</h3>
		<p class="hint">{$t('post.comments_loading')}</p>
	</section>
{/if}

<style>
	.replies-placeholder {
		margin: 2rem 0;
	}
	h3 {
		font-size: 1.1rem;
		margin: 0 0 0.8rem;
	}
	.hint {
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
