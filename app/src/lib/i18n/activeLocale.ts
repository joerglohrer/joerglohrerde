import { writable, type Writable } from 'svelte/store';

export type SupportedLocale = 'de' | 'en';
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['de', 'en'] as const;
const STORAGE_KEY = 'locale';

interface Storage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface DetectArgs {
  storage: Storage;
  navigatorLanguage: string | undefined;
  supported: readonly string[];
}

export function detectInitialLocale(args: DetectArgs): SupportedLocale {
  const stored = args.storage.getItem(STORAGE_KEY);
  if (stored && (args.supported as readonly string[]).includes(stored)) {
    return stored as SupportedLocale;
  }
  const nav = (args.navigatorLanguage ?? '').slice(0, 2).toLowerCase();
  if ((args.supported as readonly string[]).includes(nav)) {
    return nav as SupportedLocale;
  }
  return args.supported[0] as SupportedLocale;
}

function createActiveLocale(): Writable<SupportedLocale> & { bootstrap: () => void } {
  const store = writable<SupportedLocale>('de');
  let bootstrapped = false;

  function bootstrap() {
    if (bootstrapped) return;
    bootstrapped = true;
    if (typeof window === 'undefined') return;
    const initial = detectInitialLocale({
      storage: window.localStorage,
      navigatorLanguage: window.navigator.language,
      supported: SUPPORTED_LOCALES
    });
    store.set(initial);
    store.subscribe((v) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, v);
      } catch {
        // private-mode / quota — ignorieren
      }
    });
  }

  return {
    subscribe: store.subscribe,
    set: store.set,
    update: store.update,
    bootstrap
  };
}

export const activeLocale = createActiveLocale();
