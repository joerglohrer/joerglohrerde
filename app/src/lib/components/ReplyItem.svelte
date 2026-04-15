<script lang="ts">
	import { onMount } from 'svelte';
	import type { NostrEvent, Profile } from '$lib/nostr/loaders';
	import { getProfile } from '$lib/nostr/profileCache';
	import { buildNjumpProfileUrl } from '$lib/nostr/naddr';

	interface Props {
		event: NostrEvent;
	}
	let { event }: Props = $props();

	const date = $derived(new Date(event.created_at * 1000).toLocaleString('de-DE'));
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
			<img class="avatar" src={profile.picture} alt={displayName} />
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
		border-radius: 4px;
		padding: 2px;
		margin-left: -2px;
	}
	.header:hover {
		background: var(--code-bg);
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
		background: var(--code-bg);
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
