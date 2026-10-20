// Local-only product validation signals. No analytics network calls or user identifiers.
import { storage } from './storage.js';
const KEY = 'progress';
const DAY = 86400000;
const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);
function read() {
  const value = storage.get(KEY, {});
  return value && typeof value === 'object' ? { visits: [], events: [], ...value } : { visits: [], events: [] };
}
export function trackSession(now = new Date()) {
  const p = read(), today = dayKey(now);
  if (!p.visits.includes(today)) p.visits.push(today);
  p.visits = p.visits.filter((d) => d >= dayKey(new Date(now.getTime() - 180 * DAY))).slice(-180);
  p.lastSeen = now.toISOString();
  storage.set(KEY, p);
  return p;
}
export function trackProgressEvent(type, detail = {}, now = new Date()) {
  const p = read(), date = dayKey(now);
  // Deduplicate lifecycle events by type + game/day; training attempts are intentionally counted individually.
  const dedupeKey = detail.gameId ? `${type}:${detail.gameId}` : `${type}:${date}`;
  if (type !== 'training_attempt' && p.events.some((e) => e.key === dedupeKey)) return p;
  p.events.push({ type, date, at: now.toISOString(), key: dedupeKey });
  p.events = p.events.slice(-500);
  storage.set(KEY, p);
  return p;
}
export function getProgressSummary(now = new Date()) {
  const p = read();
  const today = dayKey(now);
  const since7 = dayKey(new Date(now.getTime() - 6 * DAY));
  const since30 = dayKey(new Date(now.getTime() - 29 * DAY));
  const inRange = (start) => p.visits.filter((d) => d >= start && d <= today).length;
  const count = (type, start) => p.events.filter((e) => e.type === type && e.date >= start && e.date <= today).length;
  return {
    activeDays7: inRange(since7), activeDays30: inRange(since30),
    sessionsTracked: p.visits.length,
    gamesCompleted30: count('game_completed', since30),
    analysesCompleted30: count('analysis_completed', since30),
    trainingAttempts30: count('training_attempt', since30),
    lastSeen: p.lastSeen || null,
    privacy: 'Stored only in this browser; no analytics are sent to a server.'
  };
}
