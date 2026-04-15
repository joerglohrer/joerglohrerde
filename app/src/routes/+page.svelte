<script lang="ts">
	import { onMount } from 'svelte';
	import type { NostrEvent, Profile } from '$lib/nostr/loaders';
	import { loadPostList, loadProfile } from '$lib/nostr/loaders';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import PostCard from '$lib/components/PostCard.svelte';
	import LoadingOrError from '$lib/components/LoadingOrError.svelte';

	let profile: Profile | null = $state(null);
	let posts: NostrEvent[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);

	onMount(async () => {
		try {
			const [p, list] = await Promise.all([loadProfile(), loadPostList()]);
			profile = p;
			posts = list;
			loading = false;
			if (list.length === 0) {
				error = 'Keine Posts gefunden auf den abgefragten Relays.';
			}
		} catch (e) {
			loading = false;
			error = e instanceof Error ? e.message : 'Unbekannter Fehler';
		}
	});

	$effect(() => {
		const name = profile?.display_name ?? profile?.name ?? 'Jörg Lohrer';
		document.title = `${name} – Blog`;
	});
</script>

<ProfileCard {profile} />

<h1 class="list-title">Beiträge</h1>

<LoadingOrError {loading} {error} />

{#each posts as post (post.id)}
	<PostCard event={post} />
{/each}

<style>
	.list-title {
		margin: 0 0 1rem;
		font-size: 1.4rem;
	}
</style>
