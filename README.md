# 🤖 Minecraft-Italia Auto-Vote

Bot/script Node.js per automatizzare l'invio di un voto "+1" su `minecraft-italia.net` usando `Puppeteer`.

**Versione Attuale:** 1.3.1

---

**Descrizione breve**

Script pensato per effettuare una singola esecuzione di voto sul sito `minecraft-italia.net`: effettua il login con le credenziali fornite, naviga alla pagina del server specificato, clicca il pulsante "+1" e poi conferma il voto cliccando "Vota" nel popup che appare. Gestisce anche il banner GDPR quando presente.

**⚠️ Avvertenza importante**: usa questo strumento responsabilmente. L'automazione di voti può violare i termini di servizio del sito. Non committare mai i file `.env` (credenziali) e `cookies.json` (sessione) nel repository.

---

**Funzionalità principali**
- **Login automatico**: effettua il login su `minecraft-italia.net` leggendo le credenziali da `.env`.
- **Persistenza della sessione**: salva i cookies dopo il primo login in `cookies.json` per evitare di rifare il login ad ogni esecuzione.
- **Verifica sessione**: controlla automaticamente se sei già loggato prima di effettuare un nuovo login.
- **Invio voto in due step**: 
  1. Clicca il pulsante "+1" sulla pagina del server
  2. Attende che appaia il popup di conferma
  3. Clicca il pulsante "Vota" nel popup
  4. Verifica la chiusura del popup (conferma voto registrato)
- **Verifica risultato voto**: dopo il completamento, lo script verifica e comunica se:
  - ✅ Il voto è stato registrato con successo (popup chiuso)
  - ⏰ Hai già votato oggi ("Per oggi hai già votato, riprova domani")
  - ❌ Si è verificato un errore
- **Statistiche voti**:
  - 📊 Voti totali del server (da API Minecraft-Italia)
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

Se preferisci installare tutte le dipendenze elencate in `package.json` (consigliato):

```powershell
npm install
```

---

**Configurazione `.env`**

Il bot cerca automaticamente il file `.env` prima nella directory corrente, poi nella cartella `config/` se non lo trova.

```env
# CREDENZIALI OBBLIGATORIE
EMAIL=tuo@email.it
PASSWORD=tuapassword
SERVER_URL=https://minecraft-italia.net/server/nomeserver/vota

# IMPOSTAZIONI VISUALIZZAZIONE
HEADLESS=true

# PERSONALIZZAZIONE NOMI (OPZIONALI / AUTOMATICO)
# PLAYER_NAME e SERVER_NAME sono opzionali: lo script tenterà di
# rilevare automaticamente il nickname del giocatore dalla sessione
# autenticata e il nome del server tramite API o dall'URL. Puoi
# comunque impostarli manualmente qui se lo desideri per scopi di log.
# Esempio (opzionale):
# PLAYER_NAME=TuoNickname
# SERVER_NAME=NomeDelTuoServer
```

Opzioni API (opzionali):

```env
# Abilita il pre-check via API per evitare click inutili (true|false)
USE_API_PRECHECK=false
# Endpoint API (di default non serve modificarlo)
# API_BASE=https://minecraft-italia.net/lista/api
```

Variabili avanzate per le API (opzionali):

```env
# Quante volte riprovare le chiamate API (retry)
API_RETRIES=3
# Base delay (ms) per exponential backoff
API_BACKOFF_BASE_MS=500
# Timeout per chiamata API (ms)
API_TIMEOUT_MS=7000
# Intervallo minimo (ms) fra chiamate API per evitare rate limit
API_MIN_INTERVAL_MS=200
# TTL cache serverInfo (secondi)
API_CACHE_TTL_SEC=60
```

**Descrizione variabili:**

**Obbligatorie:**
- `EMAIL`: email/username per il login su `minecraft-italia.net`
- `PASSWORD`: password per il login
- `SERVER_URL`: URL completo della pagina di voto del server

**Opzionali:**
- `HEADLESS`: `true` per browser nascosto, `false` per visibile (default: true)
- `PLAYER_NAME`: nome giocatore da mostrare nei log (default: "InserisciNick")
- `SERVER_NAME`: nome server da mostrare nei log (default: "ImpostaServer" o estratto da SERVER_URL)

Nota: se non impostati, lo script proverà a rilevarli automaticamente dalla sessione (player) e dalle API/URL (server).


Suggerimento rapido: copia l'esempio in un file `.env` e modifica i valori:

PowerShell:

```powershell
Copy-Item .env.example .env
```

CMD (Prompt dei comandi):

```cmd
copy .env.example .env
```

---

**Come funziona la persistenza della sessione**

Lo script ora salva automaticamente i cookies di sessione dopo il primo login:

**Prima esecuzione:**
```
🔐 Consenso GDPR accettato
✅ Login effettuato
💾 Cookies salvati in cookies.json
🔘 Pulsante '+1' cliccato, attendo popup...
✅ Pulsante 'Vota' nel popup cliccato!
✅ Voto registrato con successo (popup chiuso) - 18/10/2025, 14:30:15
```

**Esecuzioni successive:**
```
🍪 Cookies caricati da file
✅ Sessione ancora valida, login non necessario
🔘 Pulsante '+1' cliccato, attendo popup...
✅ Pulsante 'Vota' nel popup cliccato!
✅ Voto registrato con successo (popup chiuso) - 18/10/2025, 14:35:22
```

Se la sessione è scaduta, lo script effettuerà automaticamente un nuovo login e aggiornerà i cookies.

Per forzare un nuovo login, è sufficiente eliminare il file `cookies.json`.

---

**Esecuzione**

- Eseguire direttamente con Node:

```powershell
node .\vota.js
```

Oppure usa gli script npm aggiunti:

```powershell
# Modalità headless (predefinita)
npm run start:headless

# Modalità visibile
npm run start:visible
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
- **Flusso di voto in due step**:
  1. Lo script clicca il pulsante `+1` sulla pagina del server
  2. Attende 1.5 secondi per la comparsa del popup di conferma
  3. Cerca e clicca il pulsante "Vota" nel popup
  4. Attende 2.5 secondi per verificare la chiusura del popup (conferma voto registrato)
- **Gestione sessione**: i cookies vengono salvati in `cookies.json` dopo il primo login. Agli avvii successivi, lo script carica questi cookies e verifica se la sessione è ancora valida, saltando il login se non necessario.
- **Feedback sul voto**: dopo aver completato i due click, lo script verifica il contenuto della pagina per determinare se il voto è andato a buon fine o se hai già votato oggi.
- Sono presenti ritardi e wait per gestire caricamenti e banner; potresti dover aumentare i timeout su connessioni lente.
- Per debug visivo impostare `HEADLESS=false`.
- Il file `cookies.json` è escluso dal versioning Git per sicurezza (vedi `.gitignore`).

Nota su Puppeteer: durante `npm install` Puppeteer scarica una build di Chromium (~100+ MB). Se vuoi evitare il download automatico, consulta la documentazione di Puppeteer su come collegare una versione di Chrome/Chromium già presente (opzione `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` o impostazioni `puppeteer` nel `package.json`).

---

**Limitazioni e sicurezza**
- Non salvare mai credenziali in repository pubblici.
- Il file `cookies.json` contiene i dati di sessione e non deve essere condiviso o committato (è già presente in `.gitignore`).
- I cookies di sessione possono scadere dopo un certo periodo (giorni/settimane); lo script rileverà la scadenza e effettuerà automaticamente un nuovo login.
- Usare con responsabilità: l'automazione delle interazioni sui siti può violare i termini del servizio e/o risultare in ban.
- Lo script è minimale e non implementa meccanismi avanzati di retry, proxy rotation o rate limiting.

---

**Suggerimenti e possibili miglioramenti**
- Aggiungere retry con backoff ed esponendo timeout configurabili.
- Logging più dettagliato e salvataggio degli esiti in file.
- Scheduling (es. usare `node-cron`) per esecuzioni periodiche con pause casuali.
- Notifiche (email, Telegram, Discord) quando il voto viene completato o se ci sono errori.

---

**Changelog (sintetico)**
- 1.3.2:
  - 📊 Visualizzazione voti totali del server (da API Minecraft-Italia)
  - 🎨 Interfaccia console migliorata con separatori e emoji
  - ✨ Messaggi più chiari e user-friendly
  - 🔧 Rimosso tracciamento locale voti (solo statistiche API)
- 1.3.1:
  - 🔧 Rilevamento automatico della cartella config/ per file di configurazione
  - ✨ Rimossa necessità di impostare CONFIG_DIR manualmente
  - 📁 Supporto nativo per file .env e cookies.json in config/
  - 📝 Semplificata configurazione senza percorsi da scrivere
  - 🧩 Integrazione opzionale con le API di Minecraft-Italia per pre-check voti (USE_API_PRECHECK)
    - Se abilitato, lo script verifica via API se l'utente ha già votato oggi e può saltare il click
    - Il comportamento è sicuro: in caso di errore API il flusso web normale è eseguito come fallback
- 1.3.0:
  - 🔧 Semplificata gestione nomi player e server tramite variabili .env dirette
  - ✨ Aggiunta configurazione PLAYER_NAME e SERVER_NAME in .env per controllo diretto
  - 🗑️ Rimossa logica complessa di estrazione automatica nomi dalla pagina
  - 📝 Messaggi informativi quando nomi non sono configurati ("InserisciNick", "ImpostaServer")
  - 📋 Aggiornato .env.example con nuove variabili opzionali
- 1.2.0: 
  - ✨ Aggiunto supporto per il popup di conferma voto (click "+1" → popup → click "Vota")
  - ✨ Verifica automatica della chiusura del popup come conferma del voto registrato
  - 🔧 Migliorato il logging con step dettagliati del processo di voto
  - 📝 Aggiornata documentazione con il nuovo flusso a due step
- 1.1.0: 
  - ✨ Aggiunta persistenza della sessione tramite salvataggio cookies in `cookies.json`
  - ✨ Verifica automatica dello stato della sessione (evita login ripetuti)
  - ✨ Rilevamento del risultato del voto (successo/già votato/errore)
  - 📝 Aggiornato `.gitignore` per escludere `cookies.json`
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