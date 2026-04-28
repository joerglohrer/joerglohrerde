import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: false
		}),
		alias: {
			$lib: 'src/lib'
		},
		prerender: {
			// Der Crawler folgt zur Build-Zeit href/src-attributen im HTML. Zwei
			// faelle, in denen 404er kein echter fehler sind:
			//
			// 1. canonical/hreflang enthalten den `__SITE_URL__`-platzhalter, der
			//    erst beim deploy per sed durch die echte SITE_URL ersetzt wird.
			//    Pfade wie `/<slug>/__SITE_URL__/` sind also pseudo-pfade.
			// 2. Bild-references mit relativen pfaden (z.B. `h01-json-import.png`)
			//    in alten posts, die nicht zu Blossom-URLs migriert wurden — die
			//    sind im post-body als <img src="..."> und vom crawler verfolgte
			//    pseudo-routes. Die SPA selbst rendert die <img>-tags zwar, aber
			//    eine 404-route gibt es dafuer nicht.
			handleHttpError: ({ path, message }) => {
				if (path.includes('__SITE_URL__')) return;
				if (/\.(png|jpe?g|gif|webp|svg|avif)\/?$/i.test(path)) return;
				throw new Error(message);
			},
			// Markdown-headings bekommen ohne slugify-plugin keine id-attribute.
			// Anchor-links in alten posts (z.B. [link](#ACF-JSON-Export)) sind
			// damit zur build-zeit unauffindbar. Kein render-fehler — die SPA
			// scrollt im browser entweder zum element oder garnicht.
			handleMissingId: 'ignore'
		}
	}
};

export default config;
