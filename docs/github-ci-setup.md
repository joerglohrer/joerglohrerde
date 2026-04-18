# GitHub-CI-Setup für die Publish-Pipeline

**Kontext:** Das primäre Repo liegt in **Forgejo** (self-hosted). Für CI nutzen
wir GitHub als **Push-Mirror-Ziel**, weil Forgejo keine Woodpecker-Integration
hat. GitHub Actions triggert automatisch bei Push auf `main` mit Änderungen
unter `content/posts/**`.

## Setup-Schritte

### 1. Forgejo → GitHub Push-Mirror

In Forgejo:
- Repo → **Settings → Mirrors → Push Mirror hinzufügen**
- Ziel-URL: das entsprechende GitHub-Repo (z. B. `https://github.com/<user>/joerglohrerde.git`)
- Authentifizierung: GitHub-Personal-Access-Token (`repo`-Scope)
- Intervall: nach Belieben (z. B. alle 8 Stunden, oder „bei jedem Push")

### 2. GitHub-Repository-Secrets

In GitHub, Repo → **Settings → Secrets and variables → Actions**:

Vier Repository-Secrets anlegen (nicht Environment-Secrets — wir haben keine Environments):

| Name | Wert | Quelle |
|---|---|---|
| `BUNKER_URL` | `bunker://<hex>?relay=wss://...&secret=...` | aus `.env.local` |
| `AUTHOR_PUBKEY_HEX` | `4fa5d1c413e2b45e10d40bf3562ab701a5331206e359c90baae0e99bfd6c6e41` | aus `.env.local` |
| `BOOTSTRAP_RELAY` | `wss://relay.primal.net` | aus `.env.local` |
| `CLIENT_SECRET_HEX` | `929f0cd946fd5266e63ccdb066ce7a0cc93391133bfce6098fe633fc72e03e96` | aus `.env.local` |

**Wichtig:**
- Alle vier **müssen** gesetzt sein, sonst schlägt der Workflow fehl.
- Der `CLIENT_SECRET_HEX` ist **identisch** mit dem in `.env.local` — damit sich
  CI-Runner und lokaler Rechner bei Amber mit **derselben Client-Identität**
  anmelden. Die Permissions in Amber gelten dann für beide.

### 3. Workflow-Datei

Liegt in `.github/workflows/publish.yml`. Triggert auf:
- `push` auf `main` mit Änderungen unter `content/posts/**`
- `workflow_dispatch` (manuelles Triggern über das GitHub-UI, optional mit `force_all=true`)

### 4. Secrets rotieren

Wenn der Bunker-Pairing-Secret mal kompromittiert wird oder Amber neu
eingerichtet wird:

1. In Amber neue Bunker-URL erzeugen
2. Lokale `.env.local` aktualisieren
3. GitHub-Secret `BUNKER_URL` ebenfalls aktualisieren (Settings → Secrets → edit)
4. In Amber für die neue App wieder "Allow + Always" für
   `get_public_key` + `sign_event` setzen

Der `CLIENT_SECRET_HEX` muss in der Regel **nicht** rotiert werden — nur wenn
du die App in Amber komplett neu pairen willst. Wenn du ihn doch änderst, muss
Amber die App neu registrieren (siehe Setup).

## Monitoring

- **Workflow-Runs:** GitHub → Actions → "Publish Nostr Events"
- **Logs pro Run:** pro Run ein Artefakt `publish-log` mit der `publish-*.json`,
  30 Tage Aufbewahrung
- **Lokal laufen bleibt möglich** via `cd publish && deno task publish …` —
  CI ist eine zusätzliche Automatisierung, kein Zwang.

## Bekannte Einschränkungen

- **Amber muss online sein** während CI-Runs, sonst scheitert die Bunker-
  Signatur. Wenn das Handy tot ist: Workflow failed → einfach neu triggern,
  sobald Amber wieder erreichbar.
- **`relay.damus.io`** antwortet gelegentlich nicht mit OK; das ist
  ein bekanntes Damus-Verhalten und wird von `MIN_RELAY_ACKS=2` toleriert.
- **Staging-Subdomain (`staging.joerg-lohrer.de`)** hat nichts mit dieser
  Pipeline zu tun — sie gehört zum SPA-Deploy. Die Publish-Pipeline nutzt
  ausschließlich Blossom für Bild-Hosting.

## Migration weg von GitHub (später)

Wenn Woodpecker oder ein anderer self-hosted Runner aufgesetzt wird, bleibt
der Deno-Workflow derselbe — nur die CI-Konfiguration ändert sich:

- `.github/workflows/publish.yml` → `.woodpecker.yaml` (oder `.gitea/workflows/`)
- Secrets in Woodpecker statt GitHub
- Trigger-Bedingungen analog (push main + path filter)

Der Pipeline-Code selbst (`publish/src/**`) ist CI-agnostisch und braucht keine
Änderung.
