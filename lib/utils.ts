/**
 * Format ISO 8601 datetime to DD.MM.YY HH:mm for digest time range display.
 * Returns "—" when input is null, undefined, or invalid.
 */
export function formatDigestTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yy} ${hh}:${min}`;
  } catch {
    return '—';
  }
}

/**
 * Format seconds as MM:SS (e.g. for audio duration display).
 */
export function formatDurationSeconds(time: number): string {
  if (Number.isNaN(time) || time < 0) return '00:00';
  const m = Math.floor(time / 60).toString().padStart(2, '0');
  const s = Math.floor(time % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Format ISO 8601 date for "last digest" display: time if today, "Yesterday", "N days ago", or date.
 * Returns "Never" when input is null or invalid.
 */
export function formatLastDigest(iso: string | null | undefined): string {
  if (iso == null) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Normalize username: trim and strip leading @. Returns null if empty after normalize.
 */
export function normalizeUsername(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null;
  const s = value.trim().replace(/^@/, '');
  return s || null;
}
