/**
 * Playback status for an audio file in the digest.
 */
export type AudioFileStatus = "new" | "progress" | "played";

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
}
