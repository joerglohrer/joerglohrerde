import { describe, it, expect } from 'vitest';
import { parseTranslationRefs } from './translations';
import type { NostrEvent } from './loaders';

function ev(tags: string[][]): NostrEvent {
  return {
    id: 'x',
    pubkey: 'p',
    created_at: 0,
    kind: 30023,
    tags,
    content: '',
    sig: 's'
  } as unknown as NostrEvent;
}

describe('parseTranslationRefs', () => {
  it('extrahiert a-tags mit marker "translation"', () => {
    const e = ev([
      ['d', 'x'],
      ['a', '30023:abc:other-slug', '', 'translation'],
      ['a', '30023:abc:third-slug', '', 'translation']
    ]);
    expect(parseTranslationRefs(e)).toEqual([
      { kind: 30023, pubkey: 'abc', dtag: 'other-slug' },
      { kind: 30023, pubkey: 'abc', dtag: 'third-slug' }
    ]);
  });

  it('ignoriert a-tags ohne marker "translation"', () => {
    const e = ev([
      ['a', '30023:abc:root-thread', '', 'root'],
      ['a', '30023:abc:x', '', 'reply']
    ]);
    expect(parseTranslationRefs(e)).toEqual([]);
  });

  it('ignoriert a-tags mit malformed coordinate', () => {
    const e = ev([
      ['a', 'not-a-coord', '', 'translation'],
      ['a', '30023:abc:ok', '', 'translation']
    ]);
    expect(parseTranslationRefs(e)).toEqual([
      { kind: 30023, pubkey: 'abc', dtag: 'ok' }
    ]);
  });

  it('leeres tag-array → leere liste', () => {
    expect(parseTranslationRefs(ev([]))).toEqual([]);
  });
});
