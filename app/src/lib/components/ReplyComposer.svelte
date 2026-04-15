<script lang="ts">
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
	import { readRelays } from '$lib/stores/readRelays';

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

	const nip07 = hasNip07();

	async function submit() {
		error = null;
		info = null;
		if (!text.trim()) {
			error = 'Leeres Kommentar — nichts zu senden.';
			return;
		}
		publishing = true;
		try {
			const pubkey = await getPublicKey();
			if (!pubkey) {
				error = 'Nostr-Extension (z. B. Alby) hat den Pubkey nicht geliefert.';
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
				error = 'Signatur wurde abgelehnt oder ist fehlgeschlagen.';
				return;
			}
			const relays = get(readRelays);
			const results = await pool.publish(relays, signed);
			const okCount = results.filter((r) => r.ok).length;
			if (okCount === 0) {
				error = 'Kein Relay hat den Kommentar akzeptiert.';
				return;
			}
			info = `Kommentar gesendet (${okCount}/${results.length} Relays).`;
			text = '';
			onPublished?.(signed);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unbekannter Fehler';
		} finally {
			publishing = false;
		}
	}
</script>

<div class="composer">
	{#if !nip07}
		<p class="hint">
			Um zu kommentieren, benötigst du eine Nostr-Extension
			(<a href="https://getalby.com" target="_blank" rel="noopener">Alby</a>,
			<a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener">nos2x</a>), oder
			kommentiere direkt in einem Nostr-Client.
		</p>
	{:else}
		<textarea
			bind:value={text}
			placeholder="Dein Kommentar …"
			rows="4"
			disabled={publishing}
		></textarea>
		<div class="actions">
			<button type="button" onclick={submit} disabled={publishing || !text.trim()}>
				{publishing ? 'Sende …' : 'Kommentar senden'}
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
		background: var(--code-bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		resize: vertical;
	}
	.actions {
		margin-top: 0.5rem;
		display: flex;
		justify-content: flex-end;
	}
	button {
		padding: 0.4rem 1rem;
		background: var(--accent);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font: inherit;
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
		color: #991b1b;
		font-size: 0.9rem;
	}
	.info {
		color: #065f46;
		font-size: 0.9rem;
	}
</style>
