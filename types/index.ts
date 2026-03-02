/**
 * Playback status for an audio file in the digest.
 */
export type AudioFileStatus = "new" | "progress" | "played";

/**
 * Represents a single audio file in a TeleDigest playlist.
 */
export interface AudioFile {
  id: string;
  title: string;
  channel_name: string;
  duration: number;
  file_url: string;
  status: AudioFileStatus;
}
