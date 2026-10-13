import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { renderMarkdown } from '$lib/render/markdown';
import { stripLeadingTitle } from '$lib/render/stripTitle';
import type { PostJson, PostSummary, ProfileJson, SnapshotIndex } from './types';

/**
 * Liest `snapshot/output/` zur build-zeit (prerender). Nur server-seitig
 * importierbar (`.server.ts`), damit markdown/highlight.js/DOMPurify nie
 * im client-bundle landen.
 */
const OUT_DIR = resolve('../snapshot/output');

interface RawIndex {
	generated_at: string;
	profile?: ProfileJson | null;
	posts: PostSummary[];
}

interface RawPost extends PostSummary {
	event_id: string;
	content_markdown: string;
	naddr: string;
	habla_url: string;
	translations: PostJson['translations'];
}

let indexPromise: Promise<SnapshotIndex> | undefined;

export function readSnapshotIndex(): Promise<SnapshotIndex> {
	indexPromise ??= (async () => {
		const raw = JSON.parse(await readFile(join(OUT_DIR, 'index.json'), 'utf-8')) as RawIndex;
		const posts = [...raw.posts].sort((a, b) => b.published_at - a.published_at);
		return { generated_at: raw.generated_at, profile: raw.profile ?? null, posts };
	})();
	return indexPromise;
}

export async function readSnapshotPost(slug: string): Promise<PostJson | undefined> {
	if (!/^[\w.-]+$/.test(slug)) return undefined;
	let raw: RawPost;
	try {
		raw = JSON.parse(await readFile(join(OUT_DIR, 'posts', `${slug}.json`), 'utf-8')) as RawPost;
	} catch {
		return undefined;
	}
	const { content_markdown, ...rest } = raw;
	return { ...rest, content_html: renderMarkdown(stripLeadingTitle(content_markdown, raw.title)) };
}
