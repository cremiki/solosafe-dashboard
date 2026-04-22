# WORKLOG.md — Diario di bordo

**Regole di scrittura (vincolanti per Claude Code)**:
- Le voci si aggiungono **in cima** al file (la più recente è la prima sotto questa intestazione).
- Una voce per sessione, massimo 10 righe.
- **Mai** modificare voci esistenti. **Mai** riorganizzare l'ordine.
- Rispettare il template sotto, esattamente.

**Template di una voce**:
```
## YYYY-MM-DD HHMM — <titolo breve della sessione>

- **Obiettivo**: <una frase>
- **File toccati**: <elenco file e cartelle, non "vari">
- **Verificato con**: <ID smoke test o comando eseguito, con output sintetico>
- **Esito**: <completato | parziale | bloccato>
- **Snapshot pre-sessione**: <hash corto 7 caratteri del commit di inizio>
- **Git push eseguito?**: <sì, su branch X | no, solo commit locali>
- **Note**: <solo se necessarie, max 2 righe>
```

---

## 2026-04-22 2121 — Primo test metodo: SMOKE-DASH-01 verde

- **Obiettivo**: verificare che il nuovo protocollo Claude Code funzioni e che la dashboard compili localmente.
- **File toccati**: WORKLOG.md (questo aggiornamento). Nota: `node_modules/` popolato nel worktree ma non tracciato da git.
- **Verificato con**: SMOKE-DASH-01 — `npm install` ok (1403 pacchetti), `npm run build` exit code 0, cartella `build/` generata (main.js 287.42 kB gzip).
- **Esito**: completato
- **Snapshot pre-sessione**: b0221d4
- **Git push eseguito?**: no, solo commit locali (2 sul repo principale non ancora pushati)
- **Note**: scoperto e risolto peccato originale del repo: cartella `public/` non era mai stata committata, recuperata dal VPS e committata su main (commit 5e30115).

## 2026-04-22 — Setup guardrails iniziali

- **Obiettivo**: introdurre i 6 file di protocollo (`CLAUDE.md`, `CONTEXT.md`, `SMOKE_TESTS.md`, `WORKLOG.md`, `START_HERE.md`, `DEPLOY.md`) in ogni repo SoloSafe, per vincolare le sessioni future a un metodo disciplinato.
- **File toccati**: aggiunti i 6 file nella root del repo.
- **Verificato con**: —
- **Esito**: completato (setup infrastrutturale, non modifiche al codice del prodotto).
- **Snapshot pre-sessione**: —
- **Git push eseguito?**: no, solo commit locale.
- **Note**: prima voce del log. Da qui in avanti ogni sessione di Claude Code aggiunge una voce.
