<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		hasNip07,
		getPublicKey,
		signEvent,
		type SignedEvent,
		type UnsignedEvent
	} from '$lib/nostr/signer';
	import { AUTHOR_PUBKEY_HEX } from '$lib/nostr/config';
	import { pool } from '$lib/nostr/pool';
	import { readRelays, bootstrapReadRelays } from '$lib/stores/readRelays';
	import { t } from '$lib/i18n';

	interface Props {
		/** d-Tag des Posts, auf den geantwortet wird */
		dtag: string;
		/** Event-ID des ursprünglichen Posts (für e-Tag) */
		eventId: string;
		/** Callback, wenn ein Reply erfolgreich publiziert wurde */
		onPublished?: (ev: SignedEvent) => void;
	}
	let { dtag, eventId, onPublished }: Props = $props();

	let text = $state('');
	let publishing = $state(false);
	let error: string | null = $state(null);
	let info: string | null = $state(null);

	// Extensions injizieren window.nostr teils erst kurz nach dem load —
	// deshalb nicht einmalig beim init pruefen, sondern beim mount.
	let nip07 = $state(false);
	onMount(() => {
		nip07 = hasNip07();
		bootstrapReadRelays();
	});

	async function submit() {
		error = null;
		info = null;
		if (!text.trim()) {
			error = get(t)('post.comment_empty');
			return;
		}
		publishing = true;
		try {
			const pubkey = await getPublicKey();
			if (!pubkey) {
				error = get(t)('post.comment_no_pubkey');
				return;
			}
			const unsigned: UnsignedEvent = {
				kind: 1,
				pubkey,
				created_at: Math.floor(Date.now() / 1000),
				tags: [
					['a', `30023:${AUTHOR_PUBKEY_HEX}:${dtag}`],
					['e', eventId, '', 'root'],
					['p', AUTHOR_PUBKEY_HEX]
				],
				content: text.trim()
			};
			const signed = await signEvent(unsigned);
			if (!signed) {
				error = get(t)('post.comment_rejected');
				return;
			}
			const relays = get(readRelays);
			const results = await pool.publish(relays, signed);
			const okCount = results.filter((r) => r.ok).length;
			if (okCount === 0) {
				error = get(t)('post.comment_no_relay');
				return;
			}
			info = get(t)('post.comment_sent', { ok: okCount, total: results.length });
			text = '';
			onPublished?.(signed);
		} catch (e) {
			error = e instanceof Error ? e.message : get(t)('post.unknown_error');
		} finally {
			publishing = false;
		}
	}
</script>

<div class="composer">
	{#if !nip07}
		<p class="hint">
			{$t('post.nip07_hint')}
			<a href="https://getalby.com" target="_blank" rel="noopener">Alby</a> ·
			<a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener">nos2x</a>
		</p>
	{:else}
		<textarea
			bind:value={text}
			placeholder={$t('post.comment_placeholder')}
			rows="4"
			disabled={publishing}
		></textarea>
		<div class="actions">
			<button type="button" onclick={submit} disabled={publishing || !text.trim()}>
				{publishing ? $t('post.comment_sending') : $t('post.comment_send')}
			</button>
		</div>
		{#if error}<p class="error">{error}</p>{/if}
		{#if info}<p class="info">{info}</p>{/if}
	{/if}
</div>

<style>
	.composer {
		margin: 1.5rem 0;
	}
	textarea {
		width: 100%;
		padding: 0.6rem;
		font: inherit;
		color: inherit;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		resize: vertical;
		transition: border-color 120ms;
	}
	textarea:focus {
		outline: none;
		border-color: var(--accent);
	}
	.actions {
		margin-top: 0.5rem;
		display: flex;
		justify-content: flex-end;
	}
	button {
		padding: 0.45rem 1.1rem;
		background: var(--accent);
		color: var(--on-accent);
		border: none;
		border-radius: var(--radius);
		cursor: pointer;
		font: inherit;
		font-weight: 500;
		transition: filter 120ms;
	}
	button:hover:not(:disabled) {
		filter: brightness(1.08);
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.hint {
		font-size: 0.9rem;
		color: var(--muted);
	}
	.error {
		color: var(--danger);
		font-size: 0.9rem;
	}
	.info {
		color: var(--success);
		font-size: 0.9rem;
	}
</style>
