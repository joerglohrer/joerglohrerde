import { describe, expect, it } from 'vitest';
import { mergePosts, summaryFromEvent } from './live';
import type { PostSummary } from '$lib/snapshot/types';
import type { NostrEvent } from './loaders';

function post(slug: string, created_at: number, published_at = created_at): PostSummary {
	return { slug, lang: 'de', created_at, published_at, title: slug, summary: '', cover_image: null, tags: [] };
}

describe('mergePosts', () => {
	it('liefert null, wenn live nichts neues bringt', () => {
		expect(mergePosts([post('a', 10)], [post('a', 10)])).toBeNull();
		expect(mergePosts([post('a', 10)], [post('a', 5)])).toBeNull();
		expect(mergePosts([post('a', 10)], [])).toBeNull();
	});

	it('ergaenzt neue posts und ersetzt neuere versionen, sortiert nach published_at', () => {
		const merged = mergePosts([post('a', 10, 100), post('b', 10, 50)], [post('c', 20, 70), post('b', 30, 50)]);
		expect(merged?.map((p) => p.slug)).toEqual(['a', 'c', 'b']);
		expect(merged?.find((p) => p.slug === 'b')?.created_at).toBe(30);
	});
});

describe('summaryFromEvent', () => {
	it('bildet listen-eintrag aus kind:30023-tags', () => {
		const ev = {
			id: 'x', pubkey: 'p', kind: 30023, sig: '', created_at: 200, content: '',
			tags: [['d', 'slug'], ['title', 'T'], ['summary', 'S'], ['image', 'https://i/x.png'],
				['published_at', '100'], ['l', 'en', 'ISO-639-1'], ['t', 'oer'], ['t', 'nostr']]
		} as unknown as NostrEvent;
		expect(summaryFromEvent(ev)).toEqual({
			slug: 'slug', lang: 'en', created_at: 200, published_at: 100, title: 'T', summary: 'S',
			cover_image: { url: 'https://i/x.png', alt: 'T' }, tags: ['oer', 'nostr']
		});
	});

	it('ignoriert events ohne d-tag', () => {
		expect(summaryFromEvent({ tags: [], created_at: 1 } as unknown as NostrEvent)).toBeNull();
	});
});
