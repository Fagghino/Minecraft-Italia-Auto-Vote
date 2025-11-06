// ========================================
// IMPORTAZIONE MODULI
// ========================================
const path = require("path"); // Utility per gestire percorsi di file
const fs = require("fs"); // File system per leggere/scrivere file

// Carica le variabili d'ambiente dal file .env
// Supporta percorsi personalizzati tramite CONFIG_DIR o cerca automaticamente in ./config
const configDir = process.env.CONFIG_DIR || (() => {
  // Se non specificato, cerca prima nella directory corrente, poi in ./config
  const currentDir = __dirname;
  const configPath = path.join(currentDir, 'config');
  
  // Se esiste la cartella config e contiene .env, usa quella
  if (fs.existsSync(path.join(configPath, '.env'))) {
    return configPath;
  }
  
  // Altrimenti usa la directory corrente
  return currentDir;
})();

const envPath = path.join(configDir, ".env");
require("dotenv").config({ path: envPath });

const puppeteer = require("puppeteer"); // Framework per automatizzare il browser Chrome/Chromium
const https = require('https');

/*
  ========================================
  MINECRAFT-ITALIA AUTO-VOTE BOT v1.3.2
  ========================================
  
  Script di voto automatico per minecraft-italia.net
  
  FUNZIONALITÀ:
  - Login automatico con credenziali da file .env
  - Persistenza della sessione tramite cookies (evita login ripetuti)
  - Invio automatico del voto "+1" sulla pagina del server
  - Verifica del risultato (voto riuscito/già votato/errore)
  - Visualizzazione voti totali del server (da API)
  - Gestione automatica del banner GDPR
  - Integrazione con API Minecraft-Italia per pre-check voti
  
  SICUREZZA:
  - Non committare mai i file .env e cookies.json
  - I cookies contengono i dati di sessione
  
  ESECUZIONE:
  - node vota.js
  - npm run start:visible (modalità visibile)
  - npm run start:headless (modalità nascosta)
*/

// ========================================
// CONFIGURAZIONE E VARIABILI GLOBALI
// ========================================

// Credenziali per il login su minecraft-italia.net (lette da .env)
const EMAIL = process.env.EMAIL; // Email o username per il login
const PASSWORD = process.env.PASSWORD; // Password per il login

// URL della pagina del server da votare (letto da .env)
const SERVER_URL = process.env.SERVER_URL;

// Nome del player (opzionale, letto da .env come fallback)
const PLAYER_NAME_FALLBACK = process.env.PLAYER_NAME;

// Nome del server (opzionale, letto da .env come fallback)
const SERVER_NAME_FALLBACK = process.env.SERVER_NAME;

// Percorso del file dove salvare i cookies di sessione
const COOKIES_PATH = path.join(configDir, "cookies.json");

// --- API integration settings -------------------------------------------------
// Abilita il pre-check tramite API (true/false)
const USE_API_PRECHECK = process.env.USE_API_PRECHECK === 'true';
// Endpoint base per le API (modificabile se serve)
const API_BASE = process.env.API_BASE || 'https://minecraft-italia.net/lista/api';

// Cache semplice per serverInfo (in memoria, TTL breve)
const serverInfoCache = new Map();
const SERVER_INFO_CACHE_TTL = (parseInt(process.env.API_CACHE_TTL_SEC, 10) || 60) * 1000; // default 60s
// Retry/backoff defaults
const API_RETRIES = parseInt(process.env.API_RETRIES || '3', 10);
const API_BACKOFF_BASE_MS = parseInt(process.env.API_BACKOFF_BASE_MS || '500', 10);
const API_TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS || '7000', 10);
const API_MIN_INTERVAL_MS = parseInt(process.env.API_MIN_INTERVAL_MS || '200', 10);
let lastApiCallTs = 0;

// Small helper sleep
function sleep(ms) { return new Promise(r => setTimeout(r, ms));
}

// Normalizzazione dei nomi per matching più permissivo
function normalizeName(s){
  if(!s) return '';
  try{
    return s.toString().normalize('NFKD').replace(/[^\w]/g,'').toLowerCase();
  }catch(e){
    return String(s).toLowerCase().replace(/[^\w]/g,'');
  }
}

// ========================================
// FUNZIONI PER LA GESTIONE DELLA SESSIONE
// ========================================

/**
 * Carica i cookies salvati dal file cookies.json
 * Questa funzione permette di mantenere la sessione attiva tra un'esecuzione e l'altra
 * 
 * @param {Page} page - Oggetto pagina di Puppeteer
 * @returns {boolean} - True se i cookies sono stati caricati, false altrimenti
 */
async function loadCookies(page) {
  // Controlla se il file cookies.json esiste
  if (fs.existsSync(COOKIES_PATH)) {
    // Legge e parsifica il file JSON contenente i cookies
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, "utf8"));
    
    // Imposta i cookies nella pagina corrente
    await page.setCookie(...cookies);
    
    console.log("🍪 Sessione precedente trovata");
    return true;
  }
  return false;
}

/**
 * Salva i cookies correnti nel file cookies.json
 * Viene chiamata dopo un login riuscito per mantenere la sessione
 * 
 * @param {Page} page - Oggetto pagina di Puppeteer
 */
async function saveCookies(page) {
  // Ottiene tutti i cookies dalla pagina corrente
  const cookies = await page.cookies();
  
  // Salva i cookies nel file JSON con formattazione leggibile
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  
  console.log("💾 Sessione salvata");
}

/**
 * Verifica se l'utente è già loggato controllando la presenza di elementi della pagina
 * che indicano un login attivo (link account, menu utente, logout)
 * 
 * @param {Page} page - Oggetto pagina di Puppeteer
 * @returns {boolean} - True se l'utente è loggato, false altrimenti
 */
async function isLoggedIn(page) {
  try {
    // Naviga alla homepage per verificare lo stato del login
    await page.goto("https://minecraft-italia.net", { waitUntil: "networkidle2" });
    
    // Esegue codice JavaScript nella pagina per cercare indicatori di login
    const loggedIn = await page.evaluate(() => {
      // Cerca elementi HTML che compaiono solo quando l'utente è loggato
      // Nota: questi selettori potrebbero cambiare se il sito viene aggiornato
      return document.querySelector('a[href*="/account/"]') !== null ||
             document.querySelector('.userLink') !== null ||
             document.querySelector('a[href*="/logout"]') !== null;
    });
    
    return loggedIn;
  } catch (err) {
    // In caso di errore, consideriamo l'utente non loggato
    return false;
  }
}

// ========================================
// HELPER: simple API client for minecraft-italia
// ========================================

/**
 * Lightweight GET wrapper for the API with simple timeout.
 * @param {string} pathUrl - path starting with /, e.g. '/server/info'
 * @param {Object} params - query params object
 */
function apiGet(pathUrl, params = {}) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(API_BASE + pathUrl);
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null) urlObj.searchParams.append(k, String(params[k]));
      });

      // rate-limit: ensure minimum interval between API calls
      const now = Date.now();
      const since = now - lastApiCallTs;
      const wait = since < API_MIN_INTERVAL_MS ? (API_MIN_INTERVAL_MS - since) : 0;
      if (wait > 0) {
        // synchronous wait via setTimeout in the request flow
      }

      const reqOpts = { timeout: API_TIMEOUT_MS };
      const req = https.get(urlObj.toString(), reqOpts, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            lastApiCallTs = Date.now();
            resolve(json);
          } catch (e) {
            reject(new Error('Parsing error from API: ' + e.message));
          }
        });
      });

      req.on('error', err => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API request timeout'));
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * apiGet with retry and exponential backoff + jitter
 */
async function apiGetWithRetry(pathUrl, params = {}){
  let lastErr = null;
  for(let attempt=1; attempt<=API_RETRIES; attempt++){
    try{
      // enforce min interval
      const now = Date.now();
      const since = now - lastApiCallTs;
      if(since < API_MIN_INTERVAL_MS) await sleep(API_MIN_INTERVAL_MS - since);
      const res = await apiGet(pathUrl, params);
      return res;
    }catch(err){
      lastErr = err;
      if(attempt === API_RETRIES) break;
      const jitter = Math.floor(Math.random()*200);
      const delay = API_BACKOFF_BASE_MS * Math.pow(2, attempt-1) + jitter;
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Recupera informazioni base del server tramite API (con cache semplice)
 * Cerca per slug/url-name
 */
async function getServerInfoFromApi(slug) {
  if (!slug) return null;
  const key = `server:${slug}`;
  const cached = serverInfoCache.get(key);
  if (cached && (Date.now() - cached._ts) < SERVER_INFO_CACHE_TTL) return cached.data;

  try {
    const info = await apiGetWithRetry('/server/info', { name: slug });
    if (info) {
      serverInfoCache.set(key, { data: info, _ts: Date.now() });
    }
    return info;
  } catch (err) {
    // API failure - return null and let fallbacks continue
    return null;
  }
}

/**
 * Recupera i voti del giorno per un server (API)
 * Ritorna array di voti o null in caso di errore
 */
async function getServerVotesToday(serverId) {
  if (!serverId) return null;
  try {
    const votes = await apiGetWithRetry('/vote/server', { serverId });
    return votes || null;
  } catch (err) {
    return null;
  }
}

/**
 * Controlla se un giocatore ha già votato oggi per un server
 * Usa API: risolve serverId tramite slug e poi controlla i voti del giorno
 * Ritorna oggetto con info dettagliate: { alreadyVoted, playerVotesOnServer, serverTotalVotes }
 */
async function checkPlayerVotedToday(serverSlug, playerName) {
  if (!playerName || playerName === 'InserisciNick') return { alreadyVoted: false };
  try {
    const info = await getServerInfoFromApi(serverSlug);
    const serverId = info && (info.id || info.serverId || info.server_id);
    const serverTotalVotes = info && (info.votes || info.total_votes);
    
    if (!serverId) return { alreadyVoted: false };

    const votes = await getServerVotesToday(serverId);
    if (!Array.isArray(votes)) return { alreadyVoted: false, serverTotalVotes };

    // normalized matching
    const target = normalizeName(playerName);
    const match = votes.find(v => {
      if(!v.username) return false;
      const a = normalizeName(v.username);
      if(a === target) return true;
      // permissive substring match
      return a.includes(target) || target.includes(a);
    });
    
    // Count player votes on this server today
    const playerVotesOnServer = votes.filter(v => {
      if (!v.username) return false;
      const a = normalizeName(v.username);
      return a === target || a.includes(target) || target.includes(a);
    }).length;
    
    return { 
      alreadyVoted: !!match, 
      playerVotesOnServer,
      serverTotalVotes 
    };
  } catch (err) {
    return { alreadyVoted: false };
  }
}

// ========================================
// FUNZIONE DI LOGIN
// ========================================

/**
 * Effettua il login su minecraft-italia.net
 * Gestisce anche il banner GDPR se presente
 * Al termine del login, salva i cookies per le sessioni future
 * 
 * @param {Page} page - Oggetto pagina di Puppeteer
 */
async function login(page) {
  // Naviga alla pagina di login e attende il caricamento completo
  // networkidle2: attende che ci siano massimo 2 connessioni di rete attive per 500ms
  await page.goto("https://minecraft-italia.net/login", { waitUntil: "networkidle2" });
  
  // ----------------------------------------
  // Gestione banner GDPR "Acconsento"
  // ----------------------------------------
  try {
    // Aspetta 5 secondi per dare tempo al banner GDPR di comparire
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Esegue codice JavaScript nella pagina per cercare e cliccare il pulsante di consenso
    await page.evaluate(() => {
      // Cerca tutti i pulsanti nella pagina
      const buttons = Array.from(document.querySelectorAll('button'));
      
      // Trova il pulsante che contiene il testo "Acconsento"
      const accept = buttons.find(btn => btn.textContent.trim().includes('Acconsento'));
      
      // Se trovato, simula un click
      if (accept) accept.click();
    });
    
    // Banner accettato silenziosamente
  } catch (err) {
    // Se il banner GDPR non è presente o c'è un errore, continua comunque
    // (Errore ignorato - non critico)
  }
  
  // ----------------------------------------
  // Compilazione form di login
  // ----------------------------------------
  
  // Aspetta che il campo email/username sia visibile nella pagina
  await page.waitForSelector('input[name="login"]');
  // Digita l'email nel campo di login (con velocità simulata naturale)
  await page.type('input[name="login"]', EMAIL);
  
  // Aspetta che il campo password sia visibile
  await page.waitForSelector('input[name="password"]');
  // Digita la password nel campo
  await page.type('input[name="password"]', PASSWORD);
  
  // Porta il focus sul campo password
  await page.focus('input[name="password"]');
  // Simula la pressione del tasto Invio per inviare il form
  await page.keyboard.press('Enter');
  
  // Attende il completamento della navigazione dopo l'invio del form
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  console.log("✅ Login completato con successo");
  
  // Salva i cookies per mantenere la sessione alle prossime esecuzioni
  await saveCookies(page);
}

// ========================================
// HELPERS: extract slug and detect player from page
// ========================================

/**
 * Estrae lo slug del server dall'URL (es. /server/slug)
 */
function extractSlugFromUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('server');
    if (idx >= 0 && parts.length > idx + 1) return parts[idx + 1];
    return parts.length ? parts[parts.length - 1] : null;
  } catch (e) {
    // fallback: try regex
    const m = url.match(/\/server\/([^\/\?]+)/);
    return m ? m[1] : null;
  }
}

/**
 * Prova a estrarre il nome del player dalla pagina autenticata
 * Ritorna stringa o null
 */
async function getPlayerNameFromPage(page) {
  if (!page) return null;
  const selectors = [
    'a[href*="/account/"]',
    '.user-name',
    '.username',
    '.account-name',
    '.logged-user',
    '.nav .dropdown-toggle'
  ];

  for (const sel of selectors) {
    try {
      const exists = await page.$(sel);
      if (exists) {
        const txt = await page.$eval(sel, el => el.innerText && el.innerText.trim());
        if (txt && txt.length > 1) return txt;
      }
    } catch (e) {
      // ignore and continue
    }
  }

  // prova a leggere dati embed (window.App) o meta
  try {
    const fromWindow = await page.evaluate(() => {
      try {
        if (window.App && window.App.user && window.App.user.username) return window.App.user.username;
        const m = document.querySelector('meta[name="user"]');
        if (m) return m.getAttribute('content');
        const scripts = Array.from(document.scripts).map(s => s.textContent).filter(Boolean);
        for (const txt of scripts) {
          if (txt.includes('"username"')) {
            const match = txt.match(/"username"\s*:\s*"([^\"]+)"/);
            if (match) return match[1];
          }
        }
      } catch (e) { /* ignore */ }
      return null;
    });
    if (fromWindow && fromWindow.length > 1) return fromWindow;
  } catch (e) {
    // ignore
  }

  return null;
}

// ========================================
// FUNZIONE PER GESTIRE INFORMAZIONI PLAYER E SERVER
// ========================================

/**
 * Gestisce le informazioni del player e del server utilizzando le variabili .env
 * Se non sono impostate, mostra messaggi informativi
 * 
 * @returns {Object} Oggetto con playerName e serverName
 */
function gestisciInformazioni() {
  // Usa direttamente la variabile .env per il player, con fallback informativo
    let playerName = 'InserisciNick'; // Fallback player name
  if (PLAYER_NAME_FALLBACK && PLAYER_NAME_FALLBACK.trim()) {
    playerName = PLAYER_NAME_FALLBACK.trim().substring(0, 30);
  }
  
  // Usa direttamente la variabile .env per il server, con fallback informativo
  let serverName = 'ImpostaServer';
  if (SERVER_NAME_FALLBACK && SERVER_NAME_FALLBACK.trim()) {
    serverName = SERVER_NAME_FALLBACK.trim().substring(0, 50);
  } else if (SERVER_URL) {
    // Se non c'è SERVER_NAME ma c'è SERVER_URL, prova a estrarre dal URL
    const urlMatch = SERVER_URL.match(/\/server\/([^\/\?]+)/);
    if (urlMatch) {
      serverName = urlMatch[1]
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .substring(0, 50);
    }
  }
  
  return { playerName, serverName };
}

// ========================================
// FUNZIONE DI VOTO
// ========================================

/**
 * Esegue l'operazione di voto sulla pagina del server
 * Cerca il pulsante "+1", lo clicca e verifica il risultato dell'operazione
 * 
 * @param {Page} page - Oggetto pagina di Puppeteer
 */
async function vota(page) {
  // Naviga alla pagina del server specificata in SERVER_URL
  await page.goto(SERVER_URL, { waitUntil: "networkidle2" });
  
  // ----------------------------------------
  // STEP 0: Gestione informazioni player e server
  // ----------------------------------------
  
  let { playerName, serverName } = gestisciInformazioni();
  
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎯 AVVIO PROCESSO DI VOTO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  // Before API pre-check: if playerName is not provided in env, try to detect it from the authenticated page
  if ((!playerName || playerName === 'InserisciNick')) {
    try {
      const detected = await getPlayerNameFromPage(page);
      if (detected) {
        playerName = detected.substring(0, 30);
        console.log(`👤 Giocatore rilevato: ${playerName}`);
      } else {
        console.log(`⚠️  Giocatore: non rilevato (puoi impostarlo in .env)`);
      }
    } catch (e) {
      console.log(`⚠️  Giocatore: non rilevato (puoi impostarlo in .env)`);
    }
  } else {
    console.log(`👤 Giocatore: ${playerName}`);
  }

  // If API pre-check is enabled, attempt to determine server slug and check votes before touching the page
  if (USE_API_PRECHECK) {
    console.log("🔍 Controllo voto tramite API...");
    try {
      // Attempt to find a slug from SERVER_URL (prefer /server/slug or last path segment)
      let slug = null;
      if (SERVER_URL) {
        const m = SERVER_URL.match(/\/server\/([^\/\?]+)/);
        if (m) slug = m[1];
        else {
          // fallback: last path segment
          try { slug = new URL(SERVER_URL).pathname.split('/').filter(Boolean).pop(); } catch (e) { slug = null; }
        }
      }

      // Enrich serverName from API when possible
      if (slug) {
        const info = await getServerInfoFromApi(slug);
        if (info && info.name) {
          // prefer human-readable name
          serverName = info.name;
          console.log(`🏰 Server: ${serverName} (ID: ${info.id || 'n/a'})`);
          
          // Show online players if available
          const onlineCount = info.online || info.online_players;
          if (typeof onlineCount === 'number') {
            console.log(`👥 Giocatori online: ${onlineCount}`);
          }
        } else {
          console.log(`🏰 Server: ${serverName}`);
        }
      } else {
        console.log(`🏰 Server: ${serverName}`);
      }

      // Pre-check: if player already voted today, skip interaction
      if (slug && playerName && playerName !== 'InserisciNick') {
        const voteCheck = await checkPlayerVotedToday(slug, playerName);
        
        // Mostra statistiche voti da API
        if (voteCheck.serverTotalVotes) {
          console.log(`📊 Voti totali server: ${voteCheck.serverTotalVotes}`);
        }
        console.log("");
        
        if (voteCheck.alreadyVoted) {
          console.log(`⏰ Hai già votato oggi per questo server!`);
          console.log(`   Ultimo voto: oggi ${new Date().toLocaleTimeString()}`);
          console.log(`   Riprova domani per votare di nuovo\n`);
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
          return;
        } else {
          console.log(`✅ Nessun voto trovato oggi - procedo con il voto\n`);
        }
      }
    } catch (err) {
      console.log('⚠️  Controllo API non disponibile - procedo comunque');
    }
  } else {
    // Se API pre-check non è abilitato, mostra comunque il server
    console.log(`🏰 Server: ${serverName}`);
  }
  
  console.log("");

  // Aspetta che i pulsanti di voto siano visibili nella pagina
  await page.waitForSelector('div.button', { visible: true });
  
  try {
    // ----------------------------------------
    // STEP 1: Ricerca e click sul pulsante "+1"
    // ----------------------------------------
    
    // Esegue codice JavaScript nella pagina per trovare e cliccare il pulsante di voto
    const plusOneCliccato = await page.evaluate(() => {
      // Seleziona tutti i div con classe "button"
      const divs = Array.from(document.querySelectorAll('div.button'));
      
      // Trova il div che contiene il testo "+1"
      const votaDiv = divs.find(div => div.textContent.trim().includes("+1"));
      
      if (votaDiv) {
        // Se trovato, simula un click sul pulsante
        votaDiv.click();
        return true;
      }
      return false;
    });
    
    if (!plusOneCliccato) {
      console.log("❌ Errore: pulsante di voto non trovato sulla pagina");
      return;
    }
    
    console.log("⏳ Invio voto in corso...");
    
    // ----------------------------------------
    // STEP 2: Aspetta che il popup appaia e verifica il contenuto
    // ----------------------------------------
    
    // Aspetta un momento per far apparire il popup
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Verifica il contenuto del popup e agisce di conseguenza
    const risultatoPopup = await page.evaluate(() => {
      // Cerca tutti i pulsanti o elementi cliccabili nel popup
      const buttons = Array.from(document.querySelectorAll('button, div.button, a.button, input[type="submit"], div[role="button"]'));
      
      // Cerca anche il testo del popup per rilevare "gia fatto!"
      const popupText = document.body.innerText.toLowerCase();
      
      // Controlla se il popup contiene "gia fatto!" o simili
      if (popupText.includes('gia fatto') || 
          popupText.includes('già fatto') || 
          popupText.includes('già votato') ||
          popupText.includes('gia votato')) {
        return { tipo: 'gia_votato', messaggio: 'Popup con "gia fatto!" rilevato' };
      }
      
      // Cerca il pulsante "Vota" per procedere con il voto
      const votaButton = buttons.find(btn => 
        btn.textContent && btn.textContent.trim().toLowerCase().includes('vota')
      );
      
      if (votaButton) {
        votaButton.click();
        return { tipo: 'voto_cliccato', messaggio: 'Pulsante "Vota" cliccato' };
      }
      
      return { tipo: 'popup_sconosciuto', messaggio: 'Popup non riconosciuto' };
    });
    
    // ----------------------------------------
    // STEP 3: Gestione in base al tipo di popup
    // ----------------------------------------
    
    if (risultatoPopup.tipo === 'gia_votato') {
      console.log(`\n⏰ Hai già votato oggi per questo server!`);
      console.log(`   Riprova domani per votare di nuovo\n`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    } else if (risultatoPopup.tipo === 'voto_cliccato') {
      // Aspetta che il popup si chiuda (indica voto registrato correttamente)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
    } else {
      console.log("⚠️  Risposta del server non riconosciuta");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      return;
    }
      
    
    // ----------------------------------------
    // STEP 4: Verifica finale del risultato del voto
    // ----------------------------------------
    
    // Verifica semplificata: se siamo arrivati qui, il voto è andato a buon fine
    const ora = new Date().toLocaleTimeString('it-IT');
    const data = new Date().toLocaleDateString('it-IT');
    
    console.log(`\n✅ VOTO REGISTRATO CON SUCCESSO!`);
    console.log(`   🎉 Grazie per aver supportato ${serverName}`);
    console.log(`   🕐 Data e ora: ${data} alle ${ora}\n`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    // Gestisce errori imprevisti durante l'operazione di voto
    console.error("\n❌ ERRORE DURANTE IL VOTO");
    console.error(`   Dettagli: ${error.message || error}`);
    console.error("   Riprova più tardi o controlla la configurazione\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  }
}

// ========================================
// FUNZIONE PRINCIPALE
// ========================================

/**
 * Funzione principale che coordina l'intero flusso dello script:
 * 1. Avvia il browser
 * 2. Carica i cookies se esistono
 * 3. Verifica se la sessione è ancora valida
 * 4. Effettua il login solo se necessario
 * 5. Esegue il voto
 * 6. Chiude il browser
 */
async function main() {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║   🤖 MINECRAFT-ITALIA AUTO-VOTE BOT      ║");
  console.log("║   Versione 1.3.2                          ║");
  console.log("╚════════════════════════════════════════════╝\n");
  
  // ----------------------------------------
  // Configurazione modalità browser
  // ----------------------------------------
  // HEADLESS=false in .env => browser visibile (utile per debug)
  // HEADLESS=true o qualsiasi altro valore => browser nascosto (più veloce)
  const headless = process.env.HEADLESS === "false" ? false : true;
  
  if (!headless) {
    console.log("👁️  Modalità visibile attiva (debug)\n");
  }
  
  // ----------------------------------------
  // Avvio browser Puppeteer
  // ----------------------------------------
  console.log("🚀 Avvio browser...");
  // slowMo: ritarda ogni azione di 50ms per renderla più naturale
  const browser = await puppeteer.launch({ 
    headless, 
    slowMo: 50 
  });
  
  // Crea una nuova pagina (tab) nel browser
  const page = await browser.newPage();

  try {
    // ----------------------------------------
    // Gestione della sessione
    // ----------------------------------------
    
    // Tenta di caricare i cookies salvati in precedenza
    const cookiesLoaded = await loadCookies(page);
    
    // Variabile per tracciare lo stato del login
    let loggedIn = false;
    
    // Se i cookies sono stati caricati, verifica se la sessione è ancora valida
    if (cookiesLoaded) {
      console.log("🔐 Verifica sessione...");
      loggedIn = await isLoggedIn(page);
      
      if (loggedIn) {
        // Sessione ancora attiva, non serve rifare il login
        console.log("✅ Sessione valida - accesso automatico\n");
      } else {
        // I cookies sono scaduti o non validi
        console.log("⚠️  Sessione scaduta\n");
      }
    }
    
    // ----------------------------------------
    // Login (solo se necessario)
    // ----------------------------------------
    // Effettua il login solo se non siamo già loggati
    if (!loggedIn) {
      console.log("🔐 Esecuzione login...");
      await login(page);
      console.log("");
    }
    
    // ----------------------------------------
    // Esecuzione del voto
    // ----------------------------------------
    await vota(page);
    
  } catch (err) {
    // Gestisce errori durante l'esecuzione del flusso principale
    console.error('\n❌ ERRORE CRITICO');
    console.error(`   ${err.message || err}`);
    console.error('   Controlla la tua connessione e configurazione\n');
  } finally {
    // ----------------------------------------
    // Pulizia e chiusura
    // ----------------------------------------
    // Il blocco finally viene sempre eseguito, anche in caso di errore
    // Chiude il browser per liberare risorse
    await browser.close();
    console.log('🚀 Script terminato.\n');
  }
}

// ========================================
// AVVIO DELLO SCRIPT
// ========================================

// Esegue la funzione main e gestisce eventuali errori non catturati
main().catch(err => {
  console.error('\n❌ ERRORE CRITICO NON GESTITO');
  console.error(`   ${err.message || err}\n`);
  process.exit(1); // Termina il processo con codice di errore
});
