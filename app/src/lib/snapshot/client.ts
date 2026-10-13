import type { PostJson, SnapshotIndex } from './types';

type Fetch = typeof fetch;

/**
 * Zugriff auf die prerenderten JSON-endpunkte, aus universal-`load()`.
 * Zur build-zeit beantwortet SvelteKit den fetch intern (+server.ts), im
 * browser kommt er vom webserver. Der index wird pro session gecacht.
 */
let indexCache: Promise<SnapshotIndex> | undefined;

export function loadSnapshotIndex(fetchFn: Fetch): Promise<SnapshotIndex> {
	if (indexCache) return indexCache;
	const pending = (async () => {
		const resp = await fetchFn('/snapshot-data/index.json');
		if (!resp.ok) throw new Error(`index.json: HTTP ${resp.status}`);
		return (await resp.json()) as SnapshotIndex;
	})();
	// Nur erfolgreiche antworten cachen, sonst bleibt ein netzwerkfehler kleben.
	indexCache = pending.catch((err) => {
		indexCache = undefined;
		throw err;
	});
	return indexCache;
}

export async function loadSnapshotPost(fetchFn: Fetch, slug: string): Promise<PostJson | undefined> {
	try {
		const resp = await fetchFn(`/snapshot-data/posts/${encodeURIComponent(slug)}.json`);
		if (!resp.ok) return undefined;
		// Der SPA-fallback des webservers koennte fuer unbekannte pfade HTML mit
		// 200 liefern — dann scheitert json() und wir melden "nicht gefunden".
		return (await resp.json()) as PostJson;
	} catch {
		return undefined;
	}
}
