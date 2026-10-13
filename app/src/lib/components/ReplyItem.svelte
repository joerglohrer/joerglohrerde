<script lang="ts">
	import { onMount } from 'svelte';
	import type { NostrEvent, Profile } from '$lib/nostr/loaders';
	import { getProfile } from '$lib/nostr/profileCache';
	import { buildNjumpProfileUrl } from '$lib/nostr/naddr';
	import { activeLocale } from '$lib/i18n';
	import { formatDateTime } from '$lib/i18n/date';

	interface Props {
		event: NostrEvent;
	}
	let { event }: Props = $props();

	const date = $derived(formatDateTime(event.created_at, $activeLocale));
	const npubPrefix = $derived(event.pubkey.slice(0, 12) + '…');
	const profileUrl = $derived(buildNjumpProfileUrl(event.pubkey));

	let profile = $state<Profile | null>(null);

	onMount(async () => {
		try {
			profile = await getProfile(event.pubkey);
		} catch {
			profile = null;
		}
	});

	const displayName = $derived(profile?.display_name || profile?.name || npubPrefix);
</script>

<li class="reply">
	<a class="header" href={profileUrl} target="_blank" rel="noopener">
		{#if profile?.picture}
			<img class="avatar" src={profile.picture} alt="" loading="lazy" decoding="async" width="32" height="32" />
		{:else}
			<div class="avatar avatar-placeholder" aria-hidden="true"></div>
		{/if}
		<div class="meta">
			<span class="name">{displayName}</span>
			<span class="date">{date}</span>
		</div>
	</a>
	<div class="content">{event.content}</div>
</li>

<style>
	.reply {
		list-style: none;
		padding: 0.8rem 0;
		border-bottom: 1px solid var(--border);
	}
	.header {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		margin-bottom: 0.4rem;
		color: inherit;
		text-decoration: none;
		border-radius: var(--radius);
		padding: 2px;
		margin-left: -2px;
	}
	.header:hover {
		background: var(--surface);
	}
	.header:hover .name {
		color: var(--accent);
	}
	.avatar {
		flex: 0 0 32px;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		object-fit: cover;
		background: var(--surface);
		border: 1px solid var(--border);
	}
	.avatar-placeholder {
		display: block;
	}
	.meta {
		font-size: 0.85rem;
		color: var(--muted);
		display: flex;
		flex-direction: column;
		line-height: 1.3;
	}
	.name {
		color: var(--fg);
		font-weight: 500;
		word-break: break-word;
	}
	.content {
		white-space: pre-wrap;
		word-wrap: break-word;
		margin-left: calc(32px + 0.6rem);
	}
	@media (max-width: 479px) {
		.content {
			margin-left: 0;
		}
	}
</style>
