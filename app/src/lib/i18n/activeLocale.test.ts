import { describe, it, expect, beforeEach } from 'vitest';
import { detectInitialLocale } from './activeLocale';

describe('detectInitialLocale', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear?.();
  });

  it('nimmt wert aus localStorage, wenn vorhanden und gültig', () => {
    const storage = new Map<string, string>([['locale', 'en']]);
    expect(detectInitialLocale({
      storage: {
        getItem: (k) => storage.get(k) ?? null,
        setItem: () => {}
      },
      navigatorLanguage: 'de-DE',
      supported: ['de', 'en']
    })).toBe('en');
  });

  it('fällt auf navigator.language zurück, wenn storage leer', () => {
    expect(detectInitialLocale({
      storage: {
        getItem: () => null,
        setItem: () => {}
      },
      navigatorLanguage: 'en-US',
      supported: ['de', 'en']
    })).toBe('en');
  });

  it('normalisiert navigator.language (de-AT → de)', () => {
    expect(detectInitialLocale({
      storage: {
        getItem: () => null,
        setItem: () => {}
      },
      navigatorLanguage: 'de-AT',
      supported: ['de', 'en']
    })).toBe('de');
  });

  it('fällt auf ersten supported eintrag, wenn navigator unbekannt', () => {
    expect(detectInitialLocale({
      storage: {
        getItem: () => null,
        setItem: () => {}
      },
      navigatorLanguage: 'fr-FR',
      supported: ['de', 'en']
    })).toBe('de');
  });

  it('ignoriert ungültige werte im storage', () => {
    const storage = new Map<string, string>([['locale', 'fr']]);
    expect(detectInitialLocale({
      storage: {
        getItem: (k) => storage.get(k) ?? null,
        setItem: () => {}
      },
      navigatorLanguage: 'en-US',
      supported: ['de', 'en']
    })).toBe('en');
  });
});
