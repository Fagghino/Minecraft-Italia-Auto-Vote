require("dotenv").config();
const puppeteer = require("puppeteer");

/*
  Script di voto automatico (singola esecuzione)
  - Scopo: effettuare il login su minecraft-italia.net e inviare un voto "+1"
  - Esecuzione: lanciare lo script quando vuoi eseguire un singolo voto
  - Sicurezza: le credenziali sono lette da `.env`; non committare mai `.env`
*/

// Variabili lette da file .env
// EMAIL e PASSWORD: credenziali per il login
// SERVER_URL: URL della pagina del server da votare
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const SERVER_URL = process.env.SERVER_URL;

async function login(page) {
  // Vai alla pagina di login e aspetta che le risorse siano caricate
  await page.goto("https://minecraft-italia.net/login", { waitUntil: "networkidle2" });
  
    // Gestione banner GDPR "Acconsento"
    try {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Aspetta comparsa
    
        await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const accept = buttons.find(btn => btn.textContent.trim().includes('Acconsento'));
        if (accept) accept.click();
        });
  
        console.log("🔐 Consenso GDPR accettato (con querySelector)");
    } catch (err) {
        console.log("⚠️ Errore nella gestione del consenso GDPR:", err.message);
    }
  
  // Compila i campi del form di login con le credenziali fornite
    await page.waitForSelector('input[name="login"]');
    await page.type('input[name="login"]', EMAIL);
    
    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', PASSWORD);
    
    await page.focus('input[name="password"]');
    await page.keyboard.press('Enter');
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log("✅ Login effettuato");
}  

async function vota(page) {
    await page.goto(SERVER_URL, { waitUntil: "networkidle2" });
  
  // Aspetta che il div con il testo "+1" sia visibile
    await page.waitForSelector('div.button', { visible: true });
  
    try {
  // Esegui la ricerca e il click sul pulsante +1 nella pagina
  const votoEseguito = await page.evaluate(() => {
        // Cerca il div che contiene "+1" nel testo
        const divs = Array.from(document.querySelectorAll('div.button'));
        const votaDiv = divs.find(div => div.textContent.trim().includes("+1"));
        if (votaDiv) {
          votaDiv.click();
          return true;
        }
        return false;
      });
  
      if (votoEseguito) {
        // Log di successo con timestamp locale
        console.log(`🗳️ Voto inviato con successo: ${new Date().toLocaleString()}`);
      } else {
        console.log("⚠️ Nessun div '+1' trovato o già votato.");
      }
    } catch (error) {
      console.error("❌ Errore durante il voto:", error);
    }
}

async function main() {
  // HEADLESS: impostalo a "false" in .env per vedere il browser (modalità visibile)
  // Valori accettati: "false" => browser visibile, qualsiasi altro valore => headless
  const headless = process.env.HEADLESS === "false" ? false : true;
  // Avvia Puppeteer (puoi togliere slowMo o regolarlo per vedere l'esecuzione)
  const browser = await puppeteer.launch({ headless, slowMo: 50 });
  const page = await browser.newPage();

  try {
    await login(page);
    await vota(page);
  } catch (err) {
    console.error('Errore nel flusso principale:', err);
  } finally {
    await browser.close();
    console.log('Browser chiuso, script terminato.');
  }
}

main().catch(err => {
  console.error('Errore non gestito in main:', err);
});
