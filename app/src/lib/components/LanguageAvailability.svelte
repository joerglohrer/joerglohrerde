<script lang="ts">
  import type { NostrEvent, TranslationInfo } from '$lib/nostr/loaders';
  import { loadTranslations } from '$lib/nostr/loaders';
  import { activeLocale } from '$lib/i18n';
  import type { SupportedLocale } from '$lib/i18n/activeLocale';

  interface Props {
    event: NostrEvent;
  }
  let { event }: Props = $props();

  let translations: TranslationInfo[] = $state([]);
  let loading = $state(true);

  $effect(() => {
    const currentId = event.id;
    loading = true;
    translations = [];
    loadTranslations(event)
      .then((infos) => {
        if (event.id !== currentId) return;
        translations = infos;
      })
      .finally(() => {
        if (event.id === currentId) loading = false;
      });
  });

  function currentLang(): string {
    return event.tags.find((tag) => tag[0] === 'l')?.[1] ?? 'de';
  }

  interface Option {
    code: string;
    href: string | null; // null = aktueller post, kein klick-ziel
  }

  const options = $derived.by<Option[]>(() => {
    const self: Option = { code: currentLang(), href: null };
    const others: Option[] = translations.map((t) => ({
      code: t.lang,
      href: `/${t.slug}/`
    }));
    // aktuelle sprache zuerst, dann rest sortiert nach code
    return [self, ...others.sort((a, b) => a.code.localeCompare(b.code))];
  });

  function selectOther(code: string, href: string) {
    activeLocale.set(code as SupportedLocale);
    // hartes location-setzen, damit svelte-kit-router den post-load triggert
    window.location.href = href;
  }
</script>

{#if !loading && translations.length > 0}
  <p class="lang-switch" role="group" aria-label="Article language">
    <span class="icon" aria-hidden="true">📖</span>
    {#each options as opt, i}
      {#if opt.href === null}
        <span class="btn active" aria-current="true">{opt.code.toUpperCase()}</span>
      {:else}
        <button
          type="button"
          class="btn"
          onclick={() => selectOther(opt.code, opt.href!)}
        >{opt.code.toUpperCase()}</button>
      {/if}
      {#if i < options.length - 1}<span class="sep" aria-hidden="true">|</span>{/if}
    {/each}
  </p>
{/if}

<style>
  .lang-switch {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.88rem;
    color: var(--muted);
    margin: 0.25rem 0 1rem;
  }
  .icon {
    font-size: 1rem;
    line-height: 1;
  }
  .btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: 3px;
    padding: 1px 7px;
    font-size: 0.8rem;
    font-family: inherit;
    cursor: pointer;
  }
  .btn:hover:not(.active) {
    color: var(--fg);
  }
  .btn.active {
    color: var(--accent);
    border-color: var(--accent);
    cursor: default;
  }
  .sep {
    opacity: 0.4;
  }
</style>
