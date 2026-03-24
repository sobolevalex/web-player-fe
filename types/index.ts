/**
 * Listen state from backend (SSOT). Separate from digest generation status.
 */
export type AudioFileStatus = "new" | "started" | "played";

/**
 * Represents a single audio file in a TeleDigest player.
 */
export interface AudioFile {
  id: string;
  title: string;
  channel_name: string;
  /** Duration in seconds; optional when not provided by API (e.g. backend track). */
  duration?: number;
  file_url: string;
  status: AudioFileStatus;
  /** Last known in-track position (seconds); from backend when started/played. */
  playback_position_seconds?: number | null;
  /** ISO 8601 datetime of oldest message in the digest; for "From" display. */
  messages_start_at?: string | null;
  /** ISO 8601 datetime of newest message in the digest; for "To" display. */
  messages_end_at?: string | null;
}
