// ========================================
// src/api.js - Comunicazione con le API di Minecraft-Italia
// ========================================

const https = require('https');
const {
  API_BASE,
  API_RETRIES,
  API_BACKOFF_BASE_MS,
  API_TIMEOUT_MS,
  API_MIN_INTERVAL_MS,
  SERVER_INFO_CACHE_TTL,
} = require('./config');
const { sleep, normalizeName } = require('./utils');

// Cache in memoria per le info server
const serverInfoCache = new Map();
let lastApiCallTs = 0;

/**
 * Esegue una richiesta GET alle API con timeout.
 * @param {string} pathUrl - Es. '/server/info'
 * @param {Object} params - Query params
 */
function apiGet(pathUrl, params = {}) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(API_BASE + pathUrl);
      Object.keys(params).forEach(k => {
        if (params[k] !== undefined && params[k] !== null)
          urlObj.searchParams.append(k, String(params[k]));
      });

      const req = https.get(urlObj.toString(), { timeout: API_TIMEOUT_MS }, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
            lastApiCallTs = Date.now();
          } catch (e) {
            reject(new Error('Parsing error from API: ' + e.message));
          }
        });
      });

      req.on('error', err => reject(err));
      req.on('timeout', () => { req.destroy(); reject(new Error('API request timeout')); });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Esegue apiGet con retry e exponential backoff.
 */
async function apiGetWithRetry(pathUrl, params = {}) {
  let lastErr = null;
  for (let attempt = 1; attempt <= API_RETRIES; attempt++) {
    try {
      const since = Date.now() - lastApiCallTs;
      if (since < API_MIN_INTERVAL_MS) await sleep(API_MIN_INTERVAL_MS - since);
      return await apiGet(pathUrl, params);
    } catch (err) {
      lastErr = err;
      if (attempt === API_RETRIES) break;
      const delay = API_BACKOFF_BASE_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Recupera info del server tramite slug (con cache).
 * @param {string} slug
 */
async function getServerInfoFromApi(slug) {
  if (!slug) return null;
  const key = `server:${slug}`;
  const cached = serverInfoCache.get(key);
  if (cached && Date.now() - cached._ts < SERVER_INFO_CACHE_TTL) return cached.data;
  try {
    const info = await apiGetWithRetry('/server/info', { name: slug });
    if (info) serverInfoCache.set(key, { data: info, _ts: Date.now() });
    return info;
  } catch {
    return null;
  }
}

/**
 * Recupera i voti di oggi per un server (per ID).
 * @param {string|number} serverId
 */
async function getServerVotesToday(serverId) {
  if (!serverId) return null;
  try {
    return await apiGetWithRetry('/vote/server', { serverId }) || null;
  } catch {
    return null;
  }
}

/**
 * Controlla se un giocatore ha già votato oggi per un server.
 * @param {string} serverSlug
 * @param {string} playerName
 * @returns {{ alreadyVoted: boolean, playerVotesOnServer?: number, serverTotalVotes?: number, lastVoteTime?: Date }}
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

    const target = normalizeName(playerName);
    const match = votes.find(v => {
      if (!v.username) return false;
      const a = normalizeName(v.username);
      return a === target || a.includes(target) || target.includes(a);
    });

    const playerVotesOnServer = votes.filter(v => {
      if (!v.username) return false;
      const a = normalizeName(v.username);
      return a === target || a.includes(target) || target.includes(a);
    }).length;

    let lastVoteTime = null;
    if (match) {
      const ts = match.timestamp || match.date || match.voted_at;
      if (ts) try { lastVoteTime = new Date(ts); } catch {}
    }

    return { alreadyVoted: !!match, playerVotesOnServer, serverTotalVotes, lastVoteTime };
  } catch {
    return { alreadyVoted: false };
  }
}

module.exports = {
  getServerInfoFromApi,
  getServerVotesToday,
  checkPlayerVotedToday,
};
