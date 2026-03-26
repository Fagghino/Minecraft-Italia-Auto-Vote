// ========================================
// src/config.js - Configurazione e variabili d'ambiente
// ========================================

const path = require('path');
const fs = require('fs');

// Carica automaticamente il .env dalla cartella config/ o dalla root
const configDir = process.env.CONFIG_DIR || (() => {
  const currentDir = path.resolve(__dirname, '..');
  const configPath = path.join(currentDir, 'config');
  if (fs.existsSync(path.join(configPath, '.env'))) return configPath;
  return currentDir;
})();

require('dotenv').config({ path: path.join(configDir, '.env') });

// --- Credenziali (Obbligatorie) ---
const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const SERVER_URL = process.env.SERVER_URL;

// --- Nomi manuali (Opzionali) ---
const PLAYER_NAME_FALLBACK = process.env.PLAYER_NAME;
const SERVER_NAME_FALLBACK = process.env.SERVER_NAME;

// --- Percorso cookies ---
const COOKIES_PATH = path.join(configDir, 'cookies.json');

// --- Impostazioni browser ---
const HEADLESS = process.env.HEADLESS === 'false' ? false : true;

// --- Impostazioni API ---
const USE_API_PRECHECK = process.env.USE_API_PRECHECK === 'true';
const API_BASE = process.env.API_BASE || 'https://minecraft-italia.net/lista/api';
const API_RETRIES = parseInt(process.env.API_RETRIES || '3', 10);
const API_BACKOFF_BASE_MS = parseInt(process.env.API_BACKOFF_BASE_MS || '500', 10);
const API_TIMEOUT_MS = parseInt(process.env.API_TIMEOUT_MS || '7000', 10);
const API_MIN_INTERVAL_MS = parseInt(process.env.API_MIN_INTERVAL_MS || '200', 10);
const SERVER_INFO_CACHE_TTL = (parseInt(process.env.API_CACHE_TTL_SEC, 10) || 60) * 1000;

/**
 * Calcola i nomi di player e server da usare nei log.
 * Usa le variabili .env come fonte primaria. Se assenti, usa fallback leggibili.
 */
function gestisciInformazioni() {
  let playerName = 'InserisciNick';
  if (PLAYER_NAME_FALLBACK && PLAYER_NAME_FALLBACK.trim()) {
    playerName = PLAYER_NAME_FALLBACK.trim().substring(0, 30);
  }

  let serverName = 'ImpostaServer';
  if (SERVER_NAME_FALLBACK && SERVER_NAME_FALLBACK.trim()) {
    serverName = SERVER_NAME_FALLBACK.trim().substring(0, 50);
  } else if (SERVER_URL) {
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

module.exports = {
  EMAIL,
  PASSWORD,
  SERVER_URL,
  COOKIES_PATH,
  HEADLESS,
  USE_API_PRECHECK,
  API_BASE,
  API_RETRIES,
  API_BACKOFF_BASE_MS,
  API_TIMEOUT_MS,
  API_MIN_INTERVAL_MS,
  SERVER_INFO_CACHE_TTL,
  gestisciInformazioni,
};
