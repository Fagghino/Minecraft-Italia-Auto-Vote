// ========================================
// vota.js - Controller principale
// Minecraft-Italia Auto-Vote v1.4.0
// ========================================

const puppeteer = require('puppeteer');
const { HEADLESS } = require('./src/config');
const { loadCookies, isLoggedIn, login, vota } = require('./src/browser');

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   🤖 MINECRAFT-ITALIA AUTO-VOTE BOT      ║');
  console.log('║   Versione 1.4.0                          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  if (!HEADLESS) console.log('👁️  Modalità visibile attiva (debug)\n');

  console.log('🚀 Avvio browser...');
  const browser = await puppeteer.launch({ headless: HEADLESS, slowMo: 50 });
  const page = await browser.newPage();

  try {
    const cookiesLoaded = await loadCookies(page);
    let loggedIn = false;

    if (cookiesLoaded) {
      console.log('🔐 Verifica sessione...');
      loggedIn = await isLoggedIn(page);
      console.log(loggedIn ? '✅ Sessione valida - accesso automatico\n' : '⚠️  Sessione scaduta\n');
    }

    if (!loggedIn) {
      console.log('🔐 Esecuzione login...');
      await login(page);
      console.log('');
    }

    await vota(page);

  } catch (err) {
    console.error('\n❌ ERRORE CRITICO');
    console.error(`   ${err.message || err}`);
    console.error('   Controlla la tua connessione e configurazione\n');
  } finally {
    await browser.close();
    console.log('🚀 Script terminato.\n');
  }
}

main().catch(err => {
  console.error('\n❌ ERRORE CRITICO NON GESTITO');
  console.error(`   ${err.message || err}\n`);
  process.exit(1);
});
