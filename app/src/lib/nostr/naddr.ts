import { nip19 } from 'nostr-tools';
import { HABLA_BASE } from './config';

/**
 * Argumente für NIP-19 addressable-event-Pointer.
 * Validierung (hex-Länge etc.) wird an `nip19.naddrEncode` delegiert.
 */
export interface NaddrArgs {
	pubkey: string;
	kind: number;
	identifier: string;
	relays?: string[];
}

/**
 * Baut einen `naddr1…`-Bech32-String (NIP-19) für ein addressable Event.
 * Wird u. a. für Habla.news-Deep-Links genutzt.
 */
export function buildNaddr(args: NaddrArgs): string {
	return nip19.naddrEncode({
		pubkey: args.pubkey,
		kind: args.kind,
		identifier: args.identifier,
		relays: args.relays ?? []
	});
}

/**
 * Habla.news-Deep-Link auf ein addressable Event.
 * Fallback für „Post nicht gefunden" / JS-lose Clients.
 */
export function buildHablaLink(args: NaddrArgs): string {
	return `${HABLA_BASE}${buildNaddr(args)}`;
}
