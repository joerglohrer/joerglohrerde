import { json } from '@sveltejs/kit';
import { readSnapshotIndex } from '$lib/snapshot/read.server';

/**
 * Prerendert `build/snapshot-data/index.json`: listen-metadaten + profil.
 * Universal-loads (startseite, archiv, tag) holen sich das hier — zur
 * build-zeit intern, im browser per HTTP.
 */
export const prerender = true;

export async function GET() {
	return json(await readSnapshotIndex());
}
