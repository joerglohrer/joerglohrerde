import { nip19 } from 'nostr-tools';
import { HABLA_BASE } from './config';

export interface NaddrArgs {
  pubkey: string;
  kind: number;
  identifier: string;
  relays?: string[];
}

export function buildNaddr(args: NaddrArgs): string {
  return nip19.naddrEncode({
    pubkey: args.pubkey,
    kind: args.kind,
    identifier: args.identifier,
    relays: args.relays ?? [],
  });
}

export function buildHablaLink(args: NaddrArgs): string {
  return `${HABLA_BASE}${buildNaddr(args)}`;
}
