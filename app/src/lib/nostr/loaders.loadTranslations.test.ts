import { describe, it, expect } from 'vitest';
import { resolveTranslationsFromRefs } from './loaders';
import type { NostrEvent } from './loaders';
import type { TranslationRef } from './translations';

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

describe('resolveTranslationsFromRefs', () => {
  it('liefert lang/slug/title für jeden aufgelösten ref', async () => {
    const refs: TranslationRef[] = [
      { kind: 30023, pubkey: 'p1', dtag: 'hello' }
    ];
    const fetcher = async () => [
      ev([
        ['d', 'hello'],
        ['title', 'Hello World'],
        ['L', 'ISO-639-1'],
        ['l', 'en', 'ISO-639-1']
      ])
    ];
    const result = await resolveTranslationsFromRefs(refs, fetcher);
    expect(result).toEqual([
      { lang: 'en', slug: 'hello', title: 'Hello World' }
    ]);
  });

  it('ignoriert refs, zu denen kein event gefunden wird', async () => {
    const refs: TranslationRef[] = [
      { kind: 30023, pubkey: 'p1', dtag: 'hello' },
      { kind: 30023, pubkey: 'p1', dtag: 'missing' }
    ];
    const fetcher = async (r: TranslationRef) =>
      r.dtag === 'hello'
        ? [ev([
            ['d', 'hello'],
            ['title', 'Hi'],
            ['l', 'en', 'ISO-639-1']
          ])]
        : [];
    const result = await resolveTranslationsFromRefs(refs, fetcher);
    expect(result).toEqual([{ lang: 'en', slug: 'hello', title: 'Hi' }]);
  });

  it('ignoriert events ohne l-tag (sprache unklar)', async () => {
    const refs: TranslationRef[] = [
      { kind: 30023, pubkey: 'p', dtag: 'x' }
    ];
    const fetcher = async () => [
      ev([
        ['d', 'x'],
        ['title', 'kein lang-tag']
      ])
    ];
    const result = await resolveTranslationsFromRefs(refs, fetcher);
    expect(result).toEqual([]);
  });

  it('leere ref-liste → leere ergebnis-liste', async () => {
    const fetcher = async () => {
      throw new Error('should not be called');
    };
    expect(await resolveTranslationsFromRefs([], fetcher)).toEqual([]);
  });
});
