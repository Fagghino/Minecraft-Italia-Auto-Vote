// ========================================
// src/utils.js - Funzioni di supporto generiche
// ========================================

/**
 * Attende un numero di millisecondi prima di procedere.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Normalizza una stringa per confronti case-insensitive e senza caratteri speciali.
 * @param {string} s
 */
function normalizeName(s) {
  if (!s) return '';
  try {
    return s.toString().normalize('NFKD').replace(/[^\w]/g, '').toLowerCase();
  } catch (e) {
    return String(s).toLowerCase().replace(/[^\w]/g, '');
  }
}

/**
 * Estrae lo slug del server dall'URL (es. "waraccademy" da /lista/server/waraccademy).
 * @param {string} url
 * @returns {string|null}
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
    const m = url.match(/\/server\/([^\/\?]+)/);
    return m ? m[1] : null;
  }
}

module.exports = { sleep, normalizeName, extractSlugFromUrl };
