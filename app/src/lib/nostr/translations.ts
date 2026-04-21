import type { NostrEvent } from './loaders';

export interface TranslationRef {
  kind: number;
  pubkey: string;
  dtag: string;
}

const COORD_RE = /^(\d+):([0-9a-f]+):([a-z0-9][a-z0-9-]*)$/;

export function parseTranslationRefs(event: NostrEvent): TranslationRef[] {
  const refs: TranslationRef[] = [];
  for (const tag of event.tags) {
    if (tag[0] !== 'a') continue;
    if (tag[3] !== 'translation') continue;
    const coord = tag[1];
    if (typeof coord !== 'string') continue;
    const m = coord.match(COORD_RE);
    if (!m) continue;
    refs.push({
      kind: parseInt(m[1], 10),
      pubkey: m[2],
      dtag: m[3]
    });
  }
  return refs;
}
