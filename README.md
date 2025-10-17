# 🤖 Minecraft-Italia Auto-Vote

Bot/script Node.js per automatizzare l'invio di un voto "+1" su `minecraft-italia.net` usando `Puppeteer`.

**Versione Attuale:** 1.1.0

---

**Descrizione breve**

Script pensato per effettuare una singola esecuzione di voto sul sito `minecraft-italia.net`: effettua il login con le credenziali fornite, naviga alla pagina del server specificato e tenta di cliccare il pulsante "+1". Gestisce anche il banner GDPR quando presente.

**⚠️ Avvertenza importante**: usa questo strumento responsabilmente. L'automazione di voti può violare i termini di servizio del sito. Non committare mai i file `.env` (credenziali) e `cookies.json` (sessione) nel repository.

---

**Funzionalità principali**
- **Login automatico**: effettua il login su `minecraft-italia.net` leggendo le credenziali da `.env`.
- **Persistenza della sessione**: salva i cookies dopo il primo login in `cookies.json` per evitare di rifare il login ad ogni esecuzione.
- **Verifica sessione**: controlla automaticamente se sei già loggato prima di effettuare un nuovo login.
- **Invio voto "+1"**: naviga alla pagina del server e clicca il pulsante +1 se disponibile.
- **Verifica risultato voto**: dopo aver cliccato il pulsante +1, lo script verifica e comunica se:
  - ✅ Il voto è stato registrato con successo
  - ⏰ Hai già votato oggi ("Per oggi hai già votato, riprova domani")
  - ❌ Si è verificato un errore
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
✅ Voto registrato con successo - 17/10/2025, 14:30:15
```

**Esecuzioni successive:**
```
🍪 Cookies caricati da file
✅ Sessione ancora valida, login non necessario
✅ Voto registrato con successo - 17/10/2025, 14:35:22
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
- Lo script attende la comparsa di un elemento `div.button` contenente il testo `+1` e prova a cliccarlo.
- **Gestione sessione**: i cookies vengono salvati in `cookies.json` dopo il primo login. Agli avvii successivi, lo script carica questi cookies e verifica se la sessione è ancora valida, saltando il login se non necessario.
- **Feedback sul voto**: dopo aver cliccato il pulsante +1, lo script aspetta 2 secondi e controlla il contenuto della pagina per determinare se il voto è andato a buon fine o se hai già votato oggi.
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