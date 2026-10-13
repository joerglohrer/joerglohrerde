import { error, redirect } from '@sveltejs/kit';
import { parseLegacyUrl, canonicalPostPath } from '$lib/url/legacy';
import { loadSnapshotPost } from '$lib/snapshot/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, fetch }) => {
	const pathname = url.pathname;

	const legacyDtag = parseLegacyUrl(pathname);
	if (legacyDtag) {
		throw redirect(301, canonicalPostPath(legacyDtag));
	}

	const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
	if (segments.length !== 1 || !segments[0]) {
		throw error(404, 'Seite nicht gefunden');
	}
	let dtag: string;
	try {
		dtag = decodeURIComponent(segments[0]);
	} catch {
		throw error(404, 'Seite nicht gefunden');
	}

	// Zur build-zeit beantwortet SvelteKit den fetch intern ueber
	// snapshot-data/posts/[slug].json/+server.ts; im browser (clientseitige
	// navigation) kommt das JSON vom webserver.
	const snapshot = await loadSnapshotPost(fetch, dtag);
	if (!snapshot) throw error(404, 'Post nicht gefunden');
	return { dtag, snapshot };
};
