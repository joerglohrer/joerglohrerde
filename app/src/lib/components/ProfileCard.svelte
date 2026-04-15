<script lang="ts">
	import type { Profile } from '$lib/nostr/loaders';
	interface Props {
		profile: Profile | null;
	}
	let { profile }: Props = $props();
</script>

{#if profile}
	<div class="profile">
		{#if profile.picture}
			<img class="avatar" src={profile.picture} alt={profile.display_name ?? profile.name ?? ''} />
		{:else}
			<div class="avatar"></div>
		{/if}
		<div class="info">
			<div class="name">{profile.display_name ?? profile.name ?? ''}</div>
			{#if profile.about}
				<div class="about">{profile.about}</div>
			{/if}
			{#if profile.nip05 || profile.website}
				<div class="meta-line">
					{#if profile.nip05}<span>{profile.nip05}</span>{/if}
					{#if profile.nip05 && profile.website}<span class="sep">·</span>{/if}
					{#if profile.website}
						<a href={profile.website} target="_blank" rel="noopener">
							{profile.website.replace(/^https?:\/\//, '')}
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.profile {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}
	.avatar {
		flex: 0 0 80px;
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
		background: var(--code-bg);
	}
	.info {
		flex: 1;
		min-width: 0;
	}
	.name {
		font-size: 1.3rem;
		font-weight: 600;
		margin: 0 0 0.2rem;
	}
	.about {
		color: var(--muted);
		font-size: 0.95rem;
		margin: 0 0 0.3rem;
	}
	.meta-line {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.meta-line a {
		color: var(--accent);
		text-decoration: none;
	}
	.meta-line a:hover {
		text-decoration: underline;
	}
	.sep {
		margin: 0 0.4rem;
		opacity: 0.5;
	}
</style>
