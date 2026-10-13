import { error, json } from '@sveltejs/kit';
import { readSnapshotIndex, readSnapshotPost } from '$lib/snapshot/read.server';
import type { EntryGenerator } from './$types';

/**
 * Prerendert `build/snapshot-data/posts/<slug>.json` mit fertig
 * gerendertem HTML (markdown → HTML passiert nur hier, zur build-zeit).
 */
export const prerender = true;

export const entries: EntryGenerator = async () => {
	const idx = await readSnapshotIndex();
	return idx.posts.map((p) => ({ slug: p.slug }));
};

export async function GET({ params }) {
	const post = await readSnapshotPost(params.slug);
	if (!post) throw error(404, 'Post nicht gefunden');
	return json(post);
}
