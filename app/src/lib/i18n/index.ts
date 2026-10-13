import { derived, type Readable } from 'svelte/store';
import de from './messages/de.json';
import en from './messages/en.json';
import { activeLocale, SUPPORTED_LOCALES, type SupportedLocale } from './activeLocale';

/**
 * Minimale UI-Lokalisierung ohne externe bibliothek: zwei JSON-dateien,
 * punkt-notation fuer keys ("nav.home") und `{name}`-platzhalter.
 * Ersetzt svelte-i18n (~50 KB im client-bundle fuer ~20 strings).
 */
type Messages = { [key: string]: string | Messages };
const MESSAGES: Record<SupportedLocale, Messages> = { de, en };

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

function lookup(messages: Messages, key: string): string | undefined {
	let node: string | Messages | undefined = messages;
	for (const part of key.split('.')) {
		if (typeof node !== 'object' || node === null) return undefined;
		node = node[part];
	}
	return typeof node === 'string' ? node : undefined;
}

export function translate(locale: SupportedLocale, key: string, vars?: Record<string, string | number>): string {
	const text = lookup(MESSAGES[locale], key) ?? lookup(MESSAGES.de, key) ?? key;
	if (!vars) return text;
	return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

/** Store-variante: `$t('nav.home')` in komponenten, `get(t)('…')` in skripten. */
export const t: Readable<Translate> = derived(
	activeLocale,
	(l): Translate => (key, vars) => translate(l, key, vars)
);

let initialized = false;
/** Einmal pro app-start: locale aus localStorage/navigator uebernehmen. */
export function initI18n(): void {
	if (initialized) return;
	initialized = true;
	activeLocale.bootstrap();
}

export { activeLocale, SUPPORTED_LOCALES };
export type { SupportedLocale };
