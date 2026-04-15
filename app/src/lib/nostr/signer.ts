/**
 * NIP-07-Wrapper für Browser-Extension-Signer (Alby, nos2x, Flamingo).
 *
 * `window.nostr` ist optional — wenn die Extension fehlt, liefern die Helper
 * null zurück und der Aufrufer zeigt einen Hinweis an.
 */

declare global {
	interface Window {
		nostr?: {
			getPublicKey(): Promise<string>;
			signEvent(event: UnsignedEvent): Promise<SignedEvent>;
		};
	}
}

export interface UnsignedEvent {
	kind: number;
	tags: string[][];
	content: string;
	created_at: number;
	pubkey: string;
}

export interface SignedEvent extends UnsignedEvent {
	id: string;
	sig: string;
}

export function hasNip07(): boolean {
	return typeof window !== 'undefined' && !!window.nostr;
}

export async function getPublicKey(): Promise<string | null> {
	if (!hasNip07()) return null;
	try {
		return await window.nostr!.getPublicKey();
	} catch {
		return null;
	}
}

export async function signEvent(event: UnsignedEvent): Promise<SignedEvent | null> {
	if (!hasNip07()) return null;
	try {
		return await window.nostr!.signEvent(event);
	} catch {
		return null;
	}
}
