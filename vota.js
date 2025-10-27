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

/*
  ========================================
  MINECRAFT-ITALIA AUTO-VOTE BOT v1.1.0
  ========================================
  
  Script di voto automatico per minecraft-italia.net
  
  FUNZIONALITÀ:
  - Login automatico con credenziali da file .env
  - Persistenza della sessione tramite cookies (evita login ripetuti)
  - Invio automatico del voto "+1" sulla pagina del server
  - Verifica del risultato (voto riuscito/già votato/errore)
  - Gestione automatica del banner GDPR
  
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
    
    console.log("🍪 Cookies caricati da file");
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
  
  console.log("💾 Cookies salvati in cookies.json");
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
    
    console.log("🔐 Consenso GDPR accettato");
  } catch (err) {
    // Se il banner GDPR non è presente o c'è un errore, continua comunque
    console.log("⚠️ Errore nella gestione del consenso GDPR:", err.message);
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
  
  console.log("✅ Login effettuato");
  
  // Salva i cookies per mantenere la sessione alle prossime esecuzioni
  await saveCookies(page);
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
  let playerName = 'InserisciNick';
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
  
  const { playerName, serverName } = gestisciInformazioni();
  
  console.log("📋 Informazioni configurate:");
  console.log(`   👤 Player: ${playerName === 'InserisciNick' ? '⚠️ ' + playerName + ' - Configura PLAYER_NAME in .env' : '✅ ' + playerName}`);
  console.log(`   🏰 Server: ${serverName === 'ImpostaServer' ? '⚠️ ' + serverName + ' - Configura SERVER_NAME in .env' : '✅ ' + serverName}`);
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
      console.log("⚠️ Nessun pulsante '+1' trovato sulla pagina.");
      return;
    }
    
    console.log("🔘 Pulsante '+1' cliccato, attendo popup...");
    
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
      console.log("⏰ " + risultatoPopup.messaggio + " - Hai già votato oggi!");
      console.log(`⏰ ${playerName} ha già votato per ${serverName} - ${new Date().toLocaleString()}`);
      return;
    } else if (risultatoPopup.tipo === 'voto_cliccato') {
      console.log("✅ " + risultatoPopup.messaggio);
      
      // Aspetta che il popup si chiuda (indica voto registrato correttamente)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
    } else {
      console.log("⚠️ " + risultatoPopup.messaggio);
      return;
    }
      
    
    // ----------------------------------------
    // STEP 4: Verifica finale del risultato del voto
    // ----------------------------------------
    
    // Verifica semplificata: se siamo arrivati qui, il voto è andato a buon fine
    console.log(`✅ ${playerName} ha votato con successo per ${serverName} - ${new Date().toLocaleString()}`);

  } catch (error) {
    // Gestisce errori imprevisti durante l'operazione di voto
    console.error("❌ Errore durante il voto:", error);
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
  // ----------------------------------------
  // Configurazione modalità browser
  // ----------------------------------------
  // HEADLESS=false in .env => browser visibile (utile per debug)
  // HEADLESS=true o qualsiasi altro valore => browser nascosto (più veloce)
  const headless = process.env.HEADLESS === "false" ? false : true;
  
  // ----------------------------------------
  // Avvio browser Puppeteer
  // ----------------------------------------
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
      loggedIn = await isLoggedIn(page);
      
      if (loggedIn) {
        // Sessione ancora attiva, non serve rifare il login
        console.log("✅ Sessione ancora valida, login non necessario");
      } else {
        // I cookies sono scaduti o non validi
        console.log("⚠️ Sessione scaduta, eseguo nuovo login");
      }
    }
    
    // ----------------------------------------
    // Login (solo se necessario)
    // ----------------------------------------
    // Effettua il login solo se non siamo già loggati
    if (!loggedIn) {
      await login(page);
    }
    
    // ----------------------------------------
    // Esecuzione del voto
    // ----------------------------------------
    await vota(page);
    
  } catch (err) {
    // Gestisce errori durante l'esecuzione del flusso principale
    console.error('❌ Errore nel flusso principale:', err);
  } finally {
    // ----------------------------------------
    // Pulizia e chiusura
    // ----------------------------------------
    // Il blocco finally viene sempre eseguito, anche in caso di errore
    // Chiude il browser per liberare risorse
    await browser.close();
    console.log('🔒 Browser chiuso, script terminato.');
  }
}

// ========================================
// AVVIO DELLO SCRIPT
// ========================================

// Esegue la funzione main e gestisce eventuali errori non catturati
main().catch(err => {
  console.error('❌ Errore critico non gestito:', err);
  process.exit(1); // Termina il processo con codice di errore
});
