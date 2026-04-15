import { describe, expect, it } from 'vitest';
import { buildHablaLink } from '$lib/nostr/naddr';

describe('buildHablaLink', () => {
  it('erzeugt einen habla.news/a/-Link mit naddr1-Bech32', () => {
    const link = buildHablaLink({
      pubkey: '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41',
      kind: 30023,
      identifier: 'dezentrale-oep-oer',
      relays: ['wss://relay.damus.io'],
    });
    expect(link).toMatch(/^https:\/\/habla\.news\/a\/naddr1[a-z0-9]+$/);
  });

  it('ist deterministisch für gleiche Inputs', () => {
    const args = {
      pubkey: '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41',
      kind: 30023,
      identifier: 'foo',
      relays: ['wss://relay.damus.io'],
    };
    expect(buildHablaLink(args)).toBe(buildHablaLink(args));
  });

  it('funktioniert ohne relays (optional)', () => {
    const link = buildHablaLink({
      pubkey: '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41',
      kind: 30023,
      identifier: 'foo',
    });
    expect(link).toMatch(/^https:\/\/habla\.news\/a\/naddr1[a-z0-9]+$/);
  });

  it('erzeugt unterschiedliche Links für unterschiedliche Inputs', () => {
    const base = {
      pubkey: '4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41',
      kind: 30023,
      relays: [],
    };
    const a = buildHablaLink({ ...base, identifier: 'foo' });
    const b = buildHablaLink({ ...base, identifier: 'bar' });
    expect(a).not.toBe(b);
  });
});
