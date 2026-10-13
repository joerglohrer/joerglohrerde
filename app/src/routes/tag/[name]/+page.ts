import { loadSnapshotIndex } from '$lib/snapshot/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	let tagName: string;
	try {
		tagName = decodeURIComponent(params.name);
	} catch {
		tagName = params.name;
	}
	const index = await loadSnapshotIndex(fetch);
	const norm = tagName.toLowerCase();
	const posts = index.posts.filter((p) => p.tags.some((t) => t.toLowerCase() === norm));
	return { tagName, posts };
};
