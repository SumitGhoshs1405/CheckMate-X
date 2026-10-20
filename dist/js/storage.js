// Local persistence (localStorage with an in-memory fallback). Nothing leaves the browser.
const PREFIX = 'cmx.';
const VERSION = 'v1';
const memory = new Map();
let usable = null;

function ls() {
  if (usable !== null) return usable ? window.localStorage : null;
  try {
    const k = PREFIX + 'probe';
    window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k);
    usable = true;
  } catch (e) { usable = false; }
  return usable ? window.localStorage : null;
}

export const storage = {
  get persistent() { return !!(typeof window !== 'undefined' && ls()); },
  get(key, fallback = null) {
    const k = `${PREFIX}${key}.${VERSION}`;
    try {
      const store = typeof window !== 'undefined' ? ls() : null;
      const raw = store ? store.getItem(k) : memory.get(k);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  /** @returns {boolean} whether the value was stored durably */
  set(key, value) {
    const k = `${PREFIX}${key}.${VERSION}`;
    const raw = JSON.stringify(value);
    try {
      const store = typeof window !== 'undefined' ? ls() : null;
      if (!store) { memory.set(k, raw); return false; }
      store.setItem(k, raw);
      return true;
    } catch (e) { memory.set(k, raw); return false; }
  },
  remove(key) {
    const k = `${PREFIX}${key}.${VERSION}`;
    memory.delete(k);
    try { const s = typeof window !== 'undefined' ? ls() : null; if (s) s.removeItem(k); } catch (e) { /* ignore */ }
  },
};

export const MAX_GAMES = 200;

export function loadGames() {
  const g = storage.get('games', []);
  return Array.isArray(g) ? g.filter((r) => r && r.id && Array.isArray(r.moves)) : [];
}

/** Insert or replace a game record. Returns false if the browser refused to store it. */
export function saveGame(record) {
  const games = loadGames();
  const i = games.findIndex((g) => g.id === record.id);
  if (i >= 0) games[i] = record; else games.push(record);
  while (games.length > MAX_GAMES) {
    const idx = games.findIndex((g) => !g.analysis);
    games.splice(idx >= 0 ? idx : 0, 1);
  }
  return storage.set('games', games);
}

export function deleteGame(id) {
  const games = loadGames().filter((g) => g.id !== id);
  const srs = storage.get('srs', {});
  for (const k of Object.keys(srs)) if (k.startsWith(id + ':')) delete srs[k];
  storage.set('srs', srs);
  return storage.set('games', games);
}

export function clearAllData() {
  for (const k of ['games', 'current', 'srs', 'settings', 'progress']) storage.remove(k);
}

export function newId() {
  const rnd = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('') : Math.random().toString(16).slice(2, 14);
  return Date.now().toString(36) + rnd;
}
