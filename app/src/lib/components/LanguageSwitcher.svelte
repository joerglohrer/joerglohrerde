<script lang="ts">
  import { t, activeLocale, SUPPORTED_LOCALES } from '$lib/i18n';
  import type { SupportedLocale } from '$lib/i18n/activeLocale';

  function select(lang: SupportedLocale) {
    activeLocale.set(lang);
  }
</script>

<div class="switcher" role="group" aria-label={$t('lang.switch_aria')}>
  {#each SUPPORTED_LOCALES as code (code)}
    <button
      type="button"
      class="btn"
      class:active={$activeLocale === code}
      aria-pressed={$activeLocale === code}
      onclick={() => select(code)}
    >{code.toUpperCase()}</button>
  {/each}
</div>

<style>
  .switcher {
    display: inline-flex;
    gap: 0.25rem;
    margin-left: 0.25rem;
  }
  .btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 999px;
    padding: 0 0.55em;
    font-size: 0.75rem;
    line-height: 1.6;
    letter-spacing: 0.04em;
    cursor: pointer;
    font-family: inherit;
    transition:
      color 120ms,
      border-color 120ms;
  }
  .btn:hover {
    color: var(--fg);
    border-color: var(--muted);
  }
  .btn.active {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
