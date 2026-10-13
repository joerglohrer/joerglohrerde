import { readSnapshotIndex } from '$lib/snapshot/read.server';
import type { EntryGenerator } from './$types';

/** Eine seite pro tag aus dem snapshot; unbekannte tags rendert die SPA leer. */
export const entries: EntryGenerator = async () => {
	const idx = await readSnapshotIndex();
	const names = new Set<string>();
	for (const p of idx.posts) for (const tag of p.tags) names.add(tag);
	return [...names].map((name) => ({ name }));
};
