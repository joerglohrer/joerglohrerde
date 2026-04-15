import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	return { tagName: decodeURIComponent(params.name) };
};
