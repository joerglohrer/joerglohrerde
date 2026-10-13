import type { PostSummary } from '$lib/snapshot/types';
import type { NostrEvent } from './loaders';

/**
 * Live-abgleich der listen mit den relays: der snapshot ist seit dem letzten
 * deploy evtl. veraltet (neuer post via publish-pipeline, deploy ist manuell).
 * Der relay-code (applesauce, rxjs) wird erst hier dynamisch nachgeladen,
 * damit er nicht im initialen bundle der seite haengt.
 */

function tagValue(ev: NostrEvent, name: string): string | undefined {
	return ev.tags.find((t) => t[0] === name)?.[1];
}

export function summaryFromEvent(ev: NostrEvent): PostSummary | null {
	const slug = tagValue(ev, 'd');
	if (!slug) return null;
	const image = tagValue(ev, 'image');
	const title = tagValue(ev, 'title') ?? '';
	return {
		slug,
		lang: ev.tags.find((t) => t[0] === 'l' && t[2] === 'ISO-639-1')?.[1] ?? 'de',
		created_at: ev.created_at,
		published_at: parseInt(tagValue(ev, 'published_at') ?? `${ev.created_at}`, 10) || ev.created_at,
		title,
		summary: tagValue(ev, 'summary') ?? '',
		cover_image: image ? { url: image, alt: title || undefined } : null,
		tags: ev.tags.filter((t) => t[0] === 't' && typeof t[1] === 'string').map((t) => t[1])
	};
}

/**
 * Vereinigt snapshot und live-liste per slug; bei konflikt gewinnt die
 * neuere event-version (created_at). Liefert `null`, wenn sich gegenueber
 * dem snapshot nichts geaendert hat — dann muss nicht neu gerendert werden.
 */
export function mergePosts(snapshot: PostSummary[], live: PostSummary[]): PostSummary[] | null {
	const bySlug = new Map<string, PostSummary>();
	for (const p of snapshot) bySlug.set(p.slug, p);
	let changed = false;
	for (const p of live) {
		const existing = bySlug.get(p.slug);
		if (!existing || p.created_at > existing.created_at) {
			bySlug.set(p.slug, p);
			changed = true;
		}
	}
	if (!changed) return null;
	return [...bySlug.values()].sort((a, b) => b.published_at - a.published_at);
}

/** Holt die post-liste von den relays; bei fehler leer (snapshot bleibt). */
export async function fetchLivePosts(): Promise<PostSummary[]> {
	try {
		const { loadPostList } = await import('./loaders');
		const events = await loadPostList();
		return events.map(summaryFromEvent).filter((p): p is PostSummary => p !== null);
	} catch {
		return [];
	}
}
