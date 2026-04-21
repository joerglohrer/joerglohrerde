<script lang="ts">
  import { t, activeLocale, SUPPORTED_LOCALES } from '$lib/i18n';
  import type { SupportedLocale } from '$lib/i18n/activeLocale';

  let current = $state<SupportedLocale>('de');
  activeLocale.subscribe((v) => (current = v));

  function select(lang: SupportedLocale) {
    activeLocale.set(lang);
  }
</script>

<div class="switcher" role="group" aria-label={$t('lang.switch_aria')}>
  {#each SUPPORTED_LOCALES as code}
    <button
      type="button"
      class="btn"
      class:active={current === code}
      aria-pressed={current === code}
      onclick={() => select(code)}
    >{code.toUpperCase()}</button>
  {/each}
</div>

<style>
  .switcher {
    display: inline-flex;
    gap: 0.25rem;
    margin-left: 0.5rem;
  }
  .btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 3px;
    padding: 1px 7px;
    font-size: 0.8rem;
    cursor: pointer;
    font-family: inherit;
  }
  .btn:hover {
    color: var(--fg);
  }
  .btn.active {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
