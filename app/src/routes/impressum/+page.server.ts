import { renderMarkdown } from '$lib/render/markdown';
import impressumRaw from '../../../../content/impressum.md?raw';
import type { PageServerLoad } from './$types';

/**
 * Server-load: markdown → HTML passiert zur build-zeit, der client bekommt
 * nur das fertige HTML (kein marked/DOMPurify im bundle).
 * Frontmatter abtrennen, nur body rendern; toleriert trailing spaces auf
 * den ---/--- trenner-zeilen.
 */
export const load: PageServerLoad = () => {
	const match = impressumRaw.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n([\s\S]*)$/);
	const body = match ? match[1] : impressumRaw;
	return { html: renderMarkdown(body) };
};
