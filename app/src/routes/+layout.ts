// Alle seiten werden zur build-zeit aus dem snapshot vorgerendert; der
// client hydriert und holt sich live-daten (relays) danach nach.
export const prerender = true;
export const ssr = true;
export const trailingSlash = 'always';
