<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { bootstrapReadRelays } from '$lib/stores/readRelays';

	let { children } = $props();

	// Normalisierter pfad ohne trailing slash für aktiv-erkennung ("/" bleibt "/")
	const currentPath = $derived((page.url?.pathname ?? '/').replace(/\/$/, '') || '/');

	function isActive(path: string): boolean {
		const normalized = path.replace(/\/$/, '') || '/';
		return currentPath === normalized;
	}

	onMount(() => {
		bootstrapReadRelays();
	});
</script>

<!-- favicon-Tags liegen in src/app.html — hier nichts nötig. -->

<header class="site-header">
	<div class="header-inner">
		<a href="/" class="brand" aria-label="Zur Startseite">Jörg Lohrer</a>
		<nav aria-label="Hauptnavigation">
			<a href="/" class:active={isActive('/')}>Home</a>
			<a href="/archiv/" class:active={isActive('/archiv/')}>Archiv</a>
			<a href="/impressum/" class:active={isActive('/impressum/')}>Impressum</a>
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer class="site-footer">
	<div class="footer-inner">
		<span class="footer-copy">© Jörg Lohrer</span>
		<span class="footer-sep">·</span>
		<a href="/impressum/">Impressum</a>
		<span class="footer-sep">·</span>
		<span class="footer-meta">Nostr-basiert</span>
	</div>
</footer>

<style>
	.site-header {
		border-bottom: 1px solid var(--border);
		background: var(--bg);
		position: sticky;
		top: 0;
		z-index: 10;
		backdrop-filter: blur(8px);
	}
	.header-inner {
		max-width: 720px;
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
		color: var(--fg);
		text-decoration: none;
		white-space: nowrap;
	}
	nav {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}
	nav a {
		color: var(--muted);
		text-decoration: none;
		font-size: 0.95rem;
		padding: 0.25rem 0;
		border-bottom: 2px solid transparent;
		transition: color 120ms, border-color 120ms;
	}
	nav a:hover {
		color: var(--fg);
	}
	nav a.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		min-height: calc(100vh - 200px);
	}
	@media (min-width: 640px) {
		main {
			padding: 1.5rem;
		}
	}

	.site-footer {
		border-top: 1px solid var(--border);
		margin-top: 3rem;
	}
	.footer-inner {
		max-width: 720px;
		margin: 0 auto;
		padding: 1rem;
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
	.footer-meta {
		opacity: 0.7;
	}
</style>
