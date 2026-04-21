<script lang="ts">
  import type { NostrEvent, TranslationInfo } from '$lib/nostr/loaders';
  import { loadTranslations } from '$lib/nostr/loaders';
  import { displayLanguage } from '$lib/nostr/languageNames';

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
</script>

{#if !loading && translations.length > 0}
  <p class="availability">
    Auch verfügbar in:
    {#each translations as t, i}
      <a href="/{t.slug}/" title={t.title}>{displayLanguage(t.lang)}</a>{#if i < translations.length - 1}, {/if}
    {/each}
  </p>
{/if}

<style>
  .availability {
    font-size: 0.88rem;
    color: var(--muted);
    margin: 0.25rem 0 1rem;
  }
  .availability a {
    color: var(--accent);
    text-decoration: none;
  }
  .availability a:hover {
    text-decoration: underline;
  }
</style>
