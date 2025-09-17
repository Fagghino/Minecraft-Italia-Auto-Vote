# 🤖 Minecraft-Italia Auto-Vote

Bot/script Node.js per automatizzare l'invio di un voto "+1" su `minecraft-italia.net` usando `Puppeteer`.

**Versione:** 1.0.0

---

**Descrizione breve**

Script pensato per effettuare una singola esecuzione di voto sul sito `minecraft-italia.net`: effettua il login con le credenziali fornite, naviga alla pagina del server specificato e tenta di cliccare il pulsante "+1". Gestisce anche il banner GDPR quando presente.

**⚠️ Avvertenza importante**: usa questo strumento responsabilmente. L'automazione di voti può violare i termini di servizio del sito. Non committare mai il file `.env` con le tue credenziali.

---

**Funzionalità principali**
- **Login automatico**: effettua il login su `minecraft-italia.net` leggendo le credenziali da `.env`.
- **Invio voto "+1"**: naviga alla pagina del server e clicca il pulsante +1 se disponibile.
- **Gestione banner GDPR**: prova ad accettare il banner di consenso se presente.
- **Modalità headless opzionale**: puoi eseguire il browser visibile impostando `HEADLESS=false`.

---

**Requisiti**
- **Node.js** 12+ (consigliato Node.js 14+)
- **npm** per installare le dipendenze
- Connessione internet e credenziali valide per `minecraft-italia.net`

---

**Installazione**

1. Clona o scarica il repository nella tua macchina.
2. Apri una PowerShell nella cartella del progetto.
3. Installa le dipendenze:

```powershell
npm install puppeteer dotenv
```

---

**Configurazione `.env`**

Esempio minimo di file `.env` (crealo nella cartella del progetto, non committarlo):

```env
EMAIL=tuo@email.it
PASSWORD=tuapassword
SERVER_URL=https://minecraft-italia.net/server/slug-o-id
# Opzionale: impostalo a "false" (stringa) per avviare il browser visibile
HEADLESS=false
# Lo script include uno script PowerShell che passa anche KEEP_OPEN ma non è
# utilizzato dal codice principale al momento; puoi impostarlo se lo usi
KEEP_OPEN=false
```

Descrizione variabili:
- `EMAIL`: email/username per il login su `minecraft-italia.net`.
- `PASSWORD`: password per il login.
- `SERVER_URL`: URL della pagina del server da votare (es. `https://minecraft-italia.net/server/slug-o-id`).
- `HEADLESS`: stringa. Se `false` avvia il browser visibile; altrimenti headless.
- `KEEP_OPEN`: opzionale, non usata direttamente da `vota.js` (lasciata per compatibilità con gli script di esecuzione).

---

**Esecuzione**

- Eseguire direttamente con Node:

```powershell
node .\vota.js
```

- Usare lo script PowerShell incluso (`run-vota.ps1`) e passare le opzioni:

```powershell
# Modalità visibile
.\run-vota.ps1 -HEADLESS false

# Modalità headless (predefinita)
.\run-vota.ps1
```

- Usare lo script batch (`run-vota.bat`) da prompt o doppioclic (se presente).

---

**Comportamento e note tecniche**
- Lo script attende la comparsa di un elemento `div.button` contenente il testo `+1` e prova a cliccarlo.
- Sono presenti ritardi e wait per gestire caricamenti e banner; potresti dover aumentare i timeout su connessioni lente.
- Per debug visivo impostare `HEADLESS=false`.

---

**Limitazioni e sicurezza**
- Non salvare mai credenziali in repository pubblici.
- Usare con responsabilità: l'automazione delle interazioni sui siti può violare i termini del servizio e/o risultare in ban.
- Lo script è minimale e non implementa meccanismi avanzati di retry, proxy rotation o rate limiting.

---

**Suggerimenti e possibili miglioramenti**
- Aggiungere retry con backoff ed esponendo timeout configurabili.
- Aggiungere opzione per usare un profilo utente di Chrome (per cookie/persistence).
- Logging più dettagliato e salvataggio degli esiti in file.
- Scheduling (es. usare `node-cron`) per esecuzioni periodiche con pause casuali.

---

**Changelog (sintetico)**
- 1.0.0: README iniziale ampliato, script principale `vota.js` presente.

---

**Contributi e supporto**
- Segnala bug o richieste tramite issue.
- Per miglioramenti o PR, mantieni il file `.env` fuori dal commit e documenta le modifiche.

---

**Licenza**
- Questo progetto utilizza la licenza **ISC** (vedi `package.json`).

---

Realizzato per automatizzare un singolo voto su `minecraft-italia.net` — usa con cura.