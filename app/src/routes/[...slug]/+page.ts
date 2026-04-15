import { error, redirect } from '@sveltejs/kit';
import { parseLegacyUrl, canonicalPostPath } from '$lib/url/legacy';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const pathname = url.pathname;

	// Legacy-Form /YYYY/MM/DD/<dtag>.html/ → Redirect auf /<dtag>/
	const legacyDtag = parseLegacyUrl(pathname);
	if (legacyDtag) {
		throw redirect(301, canonicalPostPath(legacyDtag));
	}

	// Kanonisch: /<dtag>/ — erster Segment des Pfades.
	const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
	if (segments.length !== 1 || !segments[0]) {
		throw error(404, 'Seite nicht gefunden');
	}

	return { dtag: decodeURIComponent(segments[0]) };
};
