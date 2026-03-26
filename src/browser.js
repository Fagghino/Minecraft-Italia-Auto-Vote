// ========================================
// src/browser.js - Automazione Puppeteer (sessione, login, voto)
// ========================================

const fs = require('fs');
const {
  EMAIL,
  PASSWORD,
  SERVER_URL,
  COOKIES_PATH,
  USE_API_PRECHECK,
  gestisciInformazioni,
} = require('./config');
const {
  getServerInfoFromApi,
  getServerVotesToday,
  checkPlayerVotedToday,
} = require('./api');
const { extractSlugFromUrl } = require('./utils');

// ----------------------------------------
// Gestione sessione (cookies)
// ----------------------------------------

/**
 * Carica i cookies salvati nella pagina.
 * @param {import('puppeteer').Page} page
 * @returns {boolean}
 */
async function loadCookies(page) {
  if (fs.existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf8'));
    await page.setCookie(...cookies);
    console.log('🍪 Sessione precedente trovata');
    return true;
  }
  return false;
}

/**
 * Salva i cookies della pagina corrente su file.
 * @param {import('puppeteer').Page} page
 */
async function saveCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  console.log('💾 Sessione salvata');
}

/**
 * Verifica se la sessione è ancora attiva controllando elementi della pagina.
 * @param {import('puppeteer').Page} page
 * @returns {boolean}
 */
async function isLoggedIn(page) {
  try {
    await page.goto('https://minecraft-italia.net', { waitUntil: 'networkidle2' });
    return await page.evaluate(() =>
      document.querySelector('a[href*="/account/"]') !== null ||
      document.querySelector('.userLink') !== null ||
      document.querySelector('a[href*="/logout"]') !== null
    );
  } catch {
    return false;
  }
}

// ----------------------------------------
// Login
// ----------------------------------------

/**
 * Effettua il login su minecraft-italia.net.
 * @param {import('puppeteer').Page} page
 */
async function login(page) {
  await page.goto('https://minecraft-italia.net/login', { waitUntil: 'networkidle2' });

  // Gestione banner GDPR
  try {
    await new Promise(r => setTimeout(r, 5000));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.trim().includes('Acconsento'));
      if (btn) btn.click();
    });
  } catch {}

  // Compilazione form
  await page.waitForSelector('input[name="login"]');
  await page.type('input[name="login"]', EMAIL);
  await page.waitForSelector('input[name="password"]');
  await page.type('input[name="password"]', PASSWORD);
  await page.focus('input[name="password"]');
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  console.log('✅ Login completato con successo');
  await saveCookies(page);
}

// ----------------------------------------
// Rilevamento nome giocatore dalla pagina
// ----------------------------------------

/**
 * Prova a leggere il nickname del giocatore dalla pagina autenticata.
 * @param {import('puppeteer').Page} page
 * @returns {string|null}
 */
async function getPlayerNameFromPage(page) {
  if (!page) return null;
  const selectors = [
    'a[href*="/account/"]', '.user-name', '.username',
    '.account-name', '.logged-user', '.nav .dropdown-toggle',
  ];

  for (const sel of selectors) {
    try {
      const exists = await page.$(sel);
      if (exists) {
        const txt = await page.$eval(sel, el => el.innerText && el.innerText.trim());
        // Ignora link civetta lunghi o testi che contengono "aggiungi"
        if (txt && txt.length > 1 && txt.length <= 20 && !txt.toLowerCase().includes('aggiungi')) {
          return txt;
        }
      }
    } catch {}
  }

  // Fallback: tenta la lettura da window.App o meta tag
  try {
    const fromWindow = await page.evaluate(() => {
      try {
        if (window.App?.user?.username) return window.App.user.username;
        const m = document.querySelector('meta[name="user"]');
        if (m) return m.getAttribute('content');
        for (const s of Array.from(document.scripts).map(s => s.textContent).filter(Boolean)) {
          if (s.includes('"username"')) {
            const match = s.match(/"username"\s*:\s*"([^\"]+)"/);
            if (match) return match[1];
          }
        }
      } catch {}
      return null;
    });
    if (fromWindow && fromWindow.length > 1) return fromWindow;
  } catch {}

  return null;
}

// ----------------------------------------
// Voto
// ----------------------------------------

/**
 * Naviga alla pagina del server, esegue il pre-check API e il voto.
 * @param {import('puppeteer').Page} page
 */
async function vota(page) {
  await page.goto(SERVER_URL, { waitUntil: 'networkidle2' });

  let { playerName, serverName } = gestisciInformazioni();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 AVVIO PROCESSO DI VOTO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Tenta rilevamento automatico del nome giocatore se non impostato
  if (!playerName || playerName === 'InserisciNick') {
    try {
      const detected = await getPlayerNameFromPage(page);
      if (detected) playerName = detected.substring(0, 30);
    } catch {}
  }

  let serverInfo = null;
  let voteCheck = null;
  const slug = extractSlugFromUrl(SERVER_URL);

  // Pre-check API (se abilitato)
  if (USE_API_PRECHECK) {
    try {
      if (slug) {
        serverInfo = await getServerInfoFromApi(slug);
        if (serverInfo?.name) serverName = serverInfo.name;
      }
      if (slug && playerName && playerName !== 'InserisciNick') {
        voteCheck = await checkPlayerVotedToday(slug, playerName);
      }
    } catch {}
  }

  // ━━━━━━━━ INFO ━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('    INFO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(playerName && playerName !== 'InserisciNick' ? `👤 Giocatore: ${playerName}` : '👤 Giocatore: non rilevato');
  console.log(`🏰 Server: ${serverName}`);

  if (serverInfo) {
    const online = serverInfo.online || serverInfo.online_players;
    console.log(typeof online === 'number' ? `👥 Giocatori online: ${online}` : '👥 Giocatori online: non disponibile');
  } else {
    console.log('👥 Giocatori online: non disponibile');
  }

  if (voteCheck?.serverTotalVotes) console.log(`📊 Voti server oggi: ${voteCheck.serverTotalVotes}`);
  else if (serverInfo?.votes) console.log(`📊 Voti server oggi: ${serverInfo.votes}`);
  else console.log('📊 Voti server oggi: non disponibile');

  if (serverInfo && typeof serverInfo.position === 'number') console.log(`🏆 Posizione in classifica: ${serverInfo.position}°`);
  else console.log('🏆 Posizione in classifica: non disponibile');

  // ━━━━━━━━ CONTROLLO VOTO ━━━━━━━━
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 Controllo voto tramite API...\n');

  if (voteCheck?.alreadyVoted) {
    console.log('⏰ Hai già votato oggi per questo server!');
    if (voteCheck.lastVoteTime instanceof Date) {
      const h = String(voteCheck.lastVoteTime.getHours()).padStart(2, '0');
      const m = String(voteCheck.lastVoteTime.getMinutes()).padStart(2, '0');
      console.log(`   Ultimo voto: oggi alle ${h}:${m}`);
    } else {
      console.log('   Ultimo voto: oggi');
    }
    console.log('   Riprova domani per votare di nuovo');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return;
  } else if (USE_API_PRECHECK && playerName && playerName !== 'InserisciNick') {
    console.log('✅ Nessun voto trovato oggi - procedo con il voto');
  } else {
    console.log('⚠️  Controllo API disabilitato - procedo con il voto');
  }

  console.log('');
  await page.waitForSelector('div.button', { visible: true });

  try {
    // Step 1: Click +1
    const plusOneCliccato = await page.evaluate(() => {
      const votaDiv = Array.from(document.querySelectorAll('div.button'))
        .find(div => div.textContent.trim().includes('+1'));
      if (votaDiv) { votaDiv.click(); return true; }
      return false;
    });

    if (!plusOneCliccato) {
      console.log('❌ Errore: pulsante di voto non trovato sulla pagina');
      return;
    }

    console.log('⏳ Invio voto in corso...');
    await new Promise(r => setTimeout(r, 1500));

    // Step 2: Gestione popup
    const risultatoPopup = await page.evaluate(() => {
      const popupText = document.body.innerText.toLowerCase();
      if (popupText.includes('gia fatto') || popupText.includes('già fatto') ||
          popupText.includes('già votato') || popupText.includes('gia votato')) {
        return { tipo: 'gia_votato' };
      }
      const votaButton = Array.from(document.querySelectorAll('button, div.button, a.button, input[type="submit"], div[role="button"]'))
        .find(btn => btn.textContent?.trim().toLowerCase().includes('vota'));
      if (votaButton) { votaButton.click(); return { tipo: 'voto_cliccato' }; }
      return { tipo: 'popup_sconosciuto' };
    });

    // Step 3: Risposta al popup
    if (risultatoPopup.tipo === 'gia_votato') {
      console.log('\n⏰ Hai già votato oggi per questo server!');
      console.log('   Riprova domani per votare di nuovo\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    } else if (risultatoPopup.tipo === 'voto_cliccato') {
      await new Promise(r => setTimeout(r, 2500));
    } else {
      console.log('⚠️  Risposta del server non riconosciuta');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    // Step 4: Conferma successo
    const ora = new Date().toLocaleTimeString('it-IT');
    const data = new Date().toLocaleDateString('it-IT');
    console.log('\n✅ VOTO REGISTRATO CON SUCCESSO!');
    console.log(`   🎉 Grazie per aver supportato ${serverName}`);
    console.log(`   🕐 Data e ora: ${data} alle ${ora}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ ERRORE DURANTE IL VOTO');
    console.error(`   Dettagli: ${error.message || error}`);
    console.error('   Riprova più tardi o controlla la configurazione\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

module.exports = { loadCookies, saveCookies, isLoggedIn, login, getPlayerNameFromPage, vota };
