/**
 * Persists "played" track IDs in localStorage so they survive page refresh.
 * Backend does not store played status; this is the only persistence for it.
 */

const STORAGE_KEY = 'web-player_played_track_ids';

function readPlayedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

function writePlayedIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignore quota or other storage errors
  }
}

/** Returns the set of track IDs currently stored as played. */
export function getPlayedTrackIds(): Set<string> {
  return readPlayedIds();
}

/** Marks a track as played in persistence. */
export function addPlayedTrackId(trackId: string): void {
  const ids = readPlayedIds();
  ids.add(trackId);
  writePlayedIds(ids);
}

/** Marks a track as new (removes from played) in persistence. */
export function removePlayedTrackId(trackId: string): void {
  const ids = readPlayedIds();
  ids.delete(trackId);
  writePlayedIds(ids);
}
