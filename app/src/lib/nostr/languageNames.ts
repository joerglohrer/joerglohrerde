const NAMES: Record<string, string> = {
  de: 'Deutsch',
  en: 'English'
};

export function displayLanguage(code: string): string {
  if (!code) return '?';
  return NAMES[code] ?? code.toUpperCase();
}
