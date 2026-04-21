import { addMessages, init, locale, _ } from 'svelte-i18n';
import de from './messages/de.json';
import en from './messages/en.json';
import { activeLocale, SUPPORTED_LOCALES } from './activeLocale';

let initialized = false;

export function initI18n(): void {
  if (initialized) return;
  initialized = true;
  addMessages('de', de);
  addMessages('en', en);
  init({
    fallbackLocale: 'de',
    initialLocale: 'de'
  });
  activeLocale.bootstrap();
  activeLocale.subscribe((l) => {
    locale.set(l);
  });
}

export { _ as t, locale, activeLocale, SUPPORTED_LOCALES };
