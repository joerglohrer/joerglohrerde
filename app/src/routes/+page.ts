import { loadSnapshotIndex } from '$lib/snapshot/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	const index = await loadSnapshotIndex(fetch);
	return { profile: index.profile, posts: index.posts };
};
