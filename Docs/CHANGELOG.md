# Changelog - Minecraft-Italia Auto-Vote

Tutte le modifiche rilevanti a Minecraft-Italia Auto-Vote verranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e questo progetto aderisce al [Versionamento Semantico](https://semver.org/spec/v2.0.0.html).

---

## [Non Rilasciato]

### Pianificato
- //

---

## [1.3.3] - 2026-03-25

### Modificato
- Riformattato `.env.example` per rispecchiare fedelmente `.env`, aggiungendo commenti esplicativi dettagliati.
- Semplificata la descrizione nel `package.json` per maggiore chiarezza.
- Allineata l'intera documentazione del progetto allo stile organizzativo standard dei repository dell'autore.

### Tecnico
- File `.gitignore` aggiornato e potenziato con direttive standard moderne di Node.js (build files, logs, caches, system files).

### Corretto
- Bug in `vota.js` dove il sistema di rilevamento del giocatore pescava testi civetta (es. "Aggiungi il tuo server...") ingannando l'API. Il bot ora ignora stringhe sopra i 20 caratteri o testi irrilevanti.

---

## [1.3.2] - 2025-11-06

### Aggiunto
- Visualizzazione voti totali del server sfruttando le API di Minecraft-Italia.
- Visualizzazione dell'orario esatto dell'ultimo voto (recuperato tramite check API).

### Modificato
- Interfaccia terminale arricchita con separatori puliti ed emoji.
- Messaggi più parlanti e user-friendly durante il caricamento e il voto.
- Il rilevamento automatico del giocatore dalla sessione e del server dalle API sono diventati la via principale.

### Tecnico
- Pulizia profonda degli script di esecuzione `run-vota.bat` e `run-vota.ps1`.
- Rimosso il tracciamento locale ridondante dei voti (lo script si affida nativamente ed esclusivamente alle statistiche API ufficiali).

---

## [1.3.1] - 2025-10-27

### Aggiunto
- Supporto ufficiale per le variabili in `.env` e identificazione automatica della cartella `config/`.
- Flag opzionale `USE_API_PRECHECK` per integrare l'API di Minecraft-Italia ed evitare click inutili.

---

## [1.3.0] - 2025-10-23

### Modificato
- Nuova gestione semplificata e diretta del `PLAYER_NAME` e `SERVER_NAME` interamente tramite configurazione in `.env`.

---

## [1.2.0] - 2025-10-18

### Aggiunto
- Gestione migliorata dei popup di minecraft-italia con il nuovo flusso asincrono a due step (click "+1" e successiva attesa del click su "Vota" nel popup javascript).
- Logica di verifica automatica dell'effettiva chiusura e conferma del voto dal suddetto popup.

---

## [1.1.0] - 2025-10-17

### Aggiunto
- Archiviazione sicura dei `cookies.json` locali per garantire la persistenza della sessione, eludendo totalmente la necessità di effettuare pesanti login ripetuti ad ogni avvio.

---

## [1.0.0] - 2025-09-17

### Aggiunto
- Prima iterazione operativa base del bot di Auto-Vote progettata quasi interamente in Puppeteer headless.

---

**Guida al Versionamento**:
- **MAJOR** (X.0.0) - Riscritture importanti
- **MINOR** (1.X.0) - Nuove funzionalità, aggiunte retrocompatibili
- **PATCH** (1.1.X) - Correzioni di bug, miglioramenti minori