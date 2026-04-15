# Scripts

- **`deploy-svelte.sh`** — deployed den SvelteKit-Build aus `app/build/` nach
  `svelte.joerg-lohrer.de` via FTPS. Benötigt `.env.local` im Repo-Root mit
  den Variablen `SVELTE_FTP_HOST`, `SVELTE_FTP_USER`, `SVELTE_FTP_PASS`,
  `SVELTE_FTP_REMOTE_PATH`. Aufruf:

  ```sh
  cd app && npm run build && cd .. && ./scripts/deploy-svelte.sh
  ```
