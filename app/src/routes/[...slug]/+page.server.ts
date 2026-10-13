import { readSnapshotIndex } from '$lib/snapshot/read.server';
import type { EntryGenerator } from './$types';

/**
 * Nur `entries` (welche slugs prerendern) — bewusst ohne server-load, damit
 * der client bei navigation kein __data.json anfragt. Der eigentliche load
 * ist universal in +page.ts und zieht das JSON ueber /snapshot-data/.
 */
export const entries: EntryGenerator = async () => {
	const idx = await readSnapshotIndex();
	return idx.posts.map((p) => ({ slug: p.slug }));
};
