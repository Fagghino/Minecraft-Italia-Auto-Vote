# 🤖 Minecraft-Italia Auto-Vote

Bot/script Node.js per automatizzare l'invio di un voto "+1" su `minecraft-italia.net` usando `Puppeteer`.

[![Versione](https://img.shields.io/badge/versione-1.4.0-blue.svg)]()

> 📝 **Changelog**: Vedi [CHANGELOG.md](Docs/Changelog.md) per la cronologia delle versioni.

## 📋 Descrizione

Script pensato per effettuare una singola esecuzione di voto sul sito `minecraft-italia.net`: effettua il login con le credenziali fornite, naviga alla pagina del server specificato, clicca il pulsante "+1" e poi conferma il voto cliccando "Vota" nel popup che appare. Gestisce anche il banner GDPR quando presente.

**⚠️ Avvertenza importante**: usa questo strumento responsabilmente. L'automazione di voti può violare i termini di servizio del sito. Non committare mai i file `.env` (credenziali) e `cookies.json` (sessione) nel repository.

## ✨ Funzionalità
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
  - ⏰ Orario esatto dell'ultimo voto (da API)
- **Gestione banner GDPR**: prova ad accettare il banner di consenso se presente.
- **Modalità headless opzionale**: puoi eseguire il browser visibile impostando `HEADLESS=false`.

## 📦 Requisiti
- **Node.js** 12+ (consigliato Node.js 14+)
- **npm** per installare le dipendenze
- Connessione internet e credenziali valide per `minecraft-italia.net`

## 🚀 Installazione

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

## ⚙️ Configurazione

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

## 💾 Gestione Sessione

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

## 🎮 Utilizzo

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

## 🔧 Dettagli Tecnici
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

## 🛡️ Sicurezza e Limitazioni
- Non salvare mai credenziali in repository pubblici.
- Il file `cookies.json` contiene i dati di sessione e non deve essere condiviso o committato (è già presente in `.gitignore`).
- I cookies di sessione possono scadere dopo un certo periodo (giorni/settimane); lo script rileverà la scadenza e effettuerà automaticamente un nuovo login.
- Usare con responsabilità: l'automazione delle interazioni sui siti può violare i termini del servizio e/o risultare in ban.
- Lo script è minimale e non implementa meccanismi avanzati di retry, proxy rotation o rate limiting.

## ❓ FAQ

**Q: Il bot mi restituisce il messaggio 'non rilevato' accanto al Giocatore, è un problema?**
A: Nessun problema! Se il bot non riesce a leggere il nome dalla pagina e tu non lo hai impostato nel `.env`, salterà semplicemente i controlli API per l'utente e procederà direttamente a votare, assicurandosi così di completare il suo lavoro.

## 🔧 Sviluppo

### Struttura del Progetto

```text
Minecraft-Italia Auto-Vote/
├── config/
│   ├── .env          (File di configurazione)
│   └── .env.example
├── Docs/
│   ├── CHANGELOG.md  (File aggiornamenti versione)
│   └── Commit.md     (Storico commit formattato)
├── src/              (Moduli interni del bot)
│   ├── config.js     (Caricamento .env ed esportazione costanti)
│   ├── utils.js      (Funzioni di supporto generiche)
│   ├── api.js        (Comunicazione con le API di Minecraft-Italia)
│   └── browser.js    (Automazione Puppeteer: login, sessione, voto)
├── node_modules/     (Dipendenze - autogenerato)
├── package.json      (Configurazione librerie Node.js)
├── run-vota.bat      (Script di avvio Windows CMD)
├── run-vota.ps1      (Script di avvio PowerShell)
└── vota.js           (Entry point - coordina i moduli src/)
```

## 🚀 Funzionalità Pianificate
- Aggiungere retry con backoff ed esponendo timeout configurabili.
- Logging più dettagliato e salvataggio degli esiti in file.
- Scheduling (es. usare `node-cron`) per esecuzioni periodiche con pause casuali.
- Notifiche (email, Telegram, Discord) quando il voto viene completato o se ci sono errori.

## 📄 Licenza

Questa mod è rilasciata sotto la [Licenza MIT](LICENSE).

## 👤 Autore

**Fagghino**
- [GitHub](https://github.com/Fagghino)
- [Telegram](https://t.me/Fagghino)
- [Discord](https://discord.gg/fagghino)

## 🤝 Contributi

Contributi, issue e richieste di funzionalità sono benvenuti!
- Apri una [Issue](../../issues) per segnalare bug o suggerire funzionalità
- Apri una [Pull Request](../../pulls) per contribuire al codice

## 💬 Supporto

Se riscontri problemi o bug, segnalali includendo:
- Descrizione dettagliata del problema
- Log
- Passaggi per riprodurre il problema
- [Apri una Issue](issues)

## 📝 Changelog

Vedi [CHANGELOG.md](Docs/CHANGELOG.md) per la cronologia completa delle versioni.

---

Realizzato per automatizzare un singolo voto su `minecraft-italia.net` — usa con cura.