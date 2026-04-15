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

/**
 * `npub1…`-Bech32-String für einen Pubkey — für Profil-Links außerhalb
 * der SPA (z. B. njump.me).
 */
export function buildNpub(pubkeyHex: string): string {
	return nip19.npubEncode(pubkeyHex);
}

/**
 * njump.me-Profil-URL. Öffnet das Nostr-native Profil-Browser mit
 * vollständiger Event-Historie.
 */
export function buildNjumpProfileUrl(pubkeyHex: string): string {
	return `https://njump.me/${buildNpub(pubkeyHex)}`;
}

/**
 * Liste externer Nostr-Clients für „Post öffnen in …"-Links.
 * Nutzt naddr, damit jeder Client das addressable Event adressieren kann.
 */
export function externalClientLinks(
	args: NaddrArgs
): { label: string; url: string }[] {
	const naddr = buildNaddr(args);
	return [
		{ label: 'Habla', url: `https://habla.news/a/${naddr}` },
		{ label: 'Yakihonne', url: `https://yakihonne.com/article/${naddr}` },
		{ label: 'njump', url: `https://njump.me/${naddr}` }
	];
}
