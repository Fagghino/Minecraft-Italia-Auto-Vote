// ========================================
// IMPORTAZIONE MODULI
// ========================================
require("dotenv").config(); // Carica le variabili d'ambiente dal file .env
const puppeteer = require("puppeteer"); // Framework per automatizzare il browser Chrome/Chromium
const fs = require("fs"); // File system per leggere/scrivere file
const path = require("path"); // Utility per gestire percorsi di file

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

// Percorso del file dove salvare i cookies di sessione
const COOKIES_PATH = path.join(__dirname, "cookies.json");

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
  
  // Aspetta che i pulsanti di voto siano visibili nella pagina
  await page.waitForSelector('div.button', { visible: true });
  
  try {
    // ----------------------------------------
    // Ricerca e click sul pulsante "+1"
    // ----------------------------------------
    
    // Esegue codice JavaScript nella pagina per trovare e cliccare il pulsante di voto
    const votoEseguito = await page.evaluate(() => {
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
    
    // ----------------------------------------
    // Verifica del risultato del voto
    // ----------------------------------------
    
    if (votoEseguito) {
      // Aspetta 2 secondi per dare tempo al sito di mostrare il messaggio di risposta
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Analizza il contenuto della pagina per determinare il risultato del voto
      const risultatoVoto = await page.evaluate(() => {
        // Ottiene tutto il testo visibile nella pagina
        const body = document.body.innerText;
        const bodyLower = body.toLowerCase(); // Versione minuscola per confronti case-insensitive
        
        // ----------------------------------------
        // Controlla se hai già votato oggi
        // ----------------------------------------
        // Cerca il messaggio esatto del sito o varianti
        if (body.includes('Per oggi hai gia votato, riprova domani.') ||
            body.includes('Per oggi hai già votato, riprova domani.') ||
            bodyLower.includes('già votato') || 
            bodyLower.includes('gia votato') ||
            bodyLower.includes('riprova domani')) {
          return { status: 'gia_votato', message: 'Per oggi hai già votato, riprova domani' };
        }
        
        // ----------------------------------------
        // Controlla se il voto è andato a buon fine
        // ----------------------------------------
        // Cerca parole chiave che indicano successo
        if (body.includes('grazie') ||
            body.includes('voto registrato') ||
            body.includes('voto inviato') ||
            body.includes('successo') ||
            body.includes('thank')) {
          return { status: 'successo', message: 'Voto registrato con successo' };
        }
        
        // ----------------------------------------
        // Controlla messaggi di errore
        // ----------------------------------------
        if (body.includes('errore') || body.includes('error')) {
          return { status: 'errore', message: 'Si è verificato un errore' };
        }
        
        // Se non rientra in nessuna categoria, lo stato è indeterminato
        return { status: 'indeterminato', message: 'Voto cliccato, stato non determinato' };
      });
      
      // ----------------------------------------
      // Mostra il risultato con emoji appropriato e timestamp
      // ----------------------------------------
      if (risultatoVoto.status === 'successo') {
        console.log(`✅ ${risultatoVoto.message} - ${new Date().toLocaleString()}`);
      } else if (risultatoVoto.status === 'gia_votato') {
        console.log(`⏰ ${risultatoVoto.message} - ${new Date().toLocaleString()}`);
      } else if (risultatoVoto.status === 'errore') {
        console.log(`❌ ${risultatoVoto.message} - ${new Date().toLocaleString()}`);
      } else {
        console.log(`🗳️ ${risultatoVoto.message} - ${new Date().toLocaleString()}`);
      }
    } else {
      // Il pulsante "+1" non è stato trovato nella pagina
      console.log("⚠️ Nessun div '+1' trovato sulla pagina.");
    }
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
