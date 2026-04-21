import { describe, it, expect } from 'vitest';
import { displayLanguage } from './languageNames';

describe('displayLanguage', () => {
  it('kennt deutsch', () => {
    expect(displayLanguage('de')).toBe('Deutsch');
  });
  it('kennt english', () => {
    expect(displayLanguage('en')).toBe('English');
  });
  it('fällt bei unbekanntem code auf uppercase-code zurück', () => {
    expect(displayLanguage('fr')).toBe('FR');
  });
  it('fällt bei leerer sprache auf ? zurück', () => {
    expect(displayLanguage('')).toBe('?');
  });
});
