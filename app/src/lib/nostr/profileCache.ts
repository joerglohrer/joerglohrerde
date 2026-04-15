import type { Profile } from './loaders';
import { loadProfile } from './loaders';

/**
 * Sessionsweiter Cache für kind:0-Profile.
 * Jeder Pubkey wird maximal einmal angefragt; mehrfache parallele
 * Aufrufe teilen sich dieselbe Promise.
 */
const cache = new Map<string, Promise<Profile | null>>();

export function getProfile(pubkey: string): Promise<Profile | null> {
	const existing = cache.get(pubkey);
	if (existing) return existing;
	const pending = loadProfile(pubkey);
	cache.set(pubkey, pending);
	return pending;
}
