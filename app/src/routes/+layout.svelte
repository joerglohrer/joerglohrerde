<script lang="ts">
	import { page } from '$app/state';
	import { initI18n, t } from '$lib/i18n';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import CcZeroBadge from '$lib/components/CcZeroBadge.svelte';

	initI18n();

	let { children } = $props();

	// Normalisierter pfad ohne trailing slash für aktiv-erkennung ("/" bleibt "/")
	const currentPath = $derived((page.url?.pathname ?? '/').replace(/\/$/, '') || '/');

	function isActive(path: string): boolean {
		const normalized = path.replace(/\/$/, '') || '/';
		return currentPath === normalized;
	}
</script>

<!-- favicon-Tags liegen in src/app.html — hier nichts nötig. -->

<header class="site-header">
	<div class="header-inner">
		<a href="/" class="brand" aria-label={$t('nav.brand_aria')}>Jörg Lohrer</a>
		<nav aria-label={$t('nav.main_aria')}>
			<a href="/" class:active={isActive('/')} aria-current={isActive('/') ? 'page' : undefined}>{$t('nav.home')}</a>
			<a href="/archiv/" class:active={isActive('/archiv/')} aria-current={isActive('/archiv/') ? 'page' : undefined}>{$t('nav.archive')}</a>
			<a href="/impressum/" class:active={isActive('/impressum/')} aria-current={isActive('/impressum/') ? 'page' : undefined}>{$t('nav.imprint')}</a>
			<LanguageSwitcher />
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer class="site-footer">
	<div class="footer-inner">
		<span class="footer-license">
			<a
				href="https://creativecommons.org/publicdomain/zero/1.0/deed.de"
				target="_blank"
				rel="license noopener"
				aria-label="CC0 1.0 Universal Public Domain Dedication"
				title="CC0 1.0 Universal"
			>
				<CcZeroBadge />
				<span class="cc-label">CC0</span>
			</a>
			Jörg Lohrer
		</span>
		<span class="footer-sep">·</span>
		<a href="/impressum/">{$t('nav.imprint')}</a>
		<span class="footer-sep">·</span>
		<a
			href="https://github.com/joerglohrer/joerglohrerde"
			target="_blank"
			rel="noopener"
			title="Quellcode, Making-of und Nostr-Publish-Pipeline"
		>Nostr-basiert – Making-of im Repo</a>
	</div>
</footer>

<style>
	.site-header {
		border-bottom: 1px solid var(--border);
		background: color-mix(in srgb, var(--bg) 84%, transparent);
		position: sticky;
		top: 0;
		z-index: 10;
		-webkit-backdrop-filter: saturate(160%) blur(10px);
		backdrop-filter: saturate(160%) blur(10px);
	}
	.header-inner {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.brand {
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: -0.01em;
		color: var(--fg);
		text-decoration: none;
		white-space: nowrap;
	}
	nav {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		flex-wrap: wrap;
	}
	@media (max-width: 479px) {
		nav {
			gap: 0.75rem;
		}
		nav a {
			font-size: 0.9rem;
		}
	}
	nav a {
		color: var(--muted);
		text-decoration: none;
		font-size: 0.95rem;
		padding: 0.25rem 0;
		border-bottom: 2px solid transparent;
		transition:
			color 120ms,
			border-color 120ms;
	}
	nav a:hover {
		color: var(--fg);
	}
	nav a.active {
		color: var(--fg);
		border-bottom-color: var(--accent);
	}

	main {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 1.75rem 1rem;
		min-height: calc(100vh - 200px);
	}
	@media (min-width: 640px) {
		main {
			padding: 2.25rem 1.5rem;
		}
	}

	.site-footer {
		border-top: 1px solid var(--border);
		margin-top: 3rem;
	}
	.footer-inner {
		max-width: var(--measure);
		margin: 0 auto;
		padding: 1.25rem 1rem;
		color: var(--muted);
		font-size: 0.85rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		align-items: center;
	}
	.footer-inner a {
		color: var(--muted);
		text-decoration: none;
	}
	.footer-inner a:hover {
		color: var(--accent);
		text-decoration: underline;
	}
	.footer-sep {
		opacity: 0.5;
	}
	.footer-license a {
		color: var(--accent);
		display: inline-flex;
		align-items: center;
		gap: 0.25em;
		text-decoration: none;
	}
	.footer-license a:hover .cc-label {
		text-decoration: underline;
	}
	.cc-label {
		font-weight: 600;
	}
</style>
