import type { AudioFile } from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_TELEDIGEST_API_URL ?? "http://localhost:8000";

/**
 * Track object as returned by GET /api/tracks (backend shape).
 */
export interface BackendTrack {
  id: number;
  title: string;
  channel_name: string;
  channel_id: number | null;
  status: string;
  file_url: string | null;
  created_at: string | null;
  messages_start_at: string | null;
  messages_end_at: string | null;
  digest_created_at: string | null;
  channels_used: unknown[] | null;
  transcript_url: string | null;
}

/**
 * Response shape of GET /api/tracks (cursor-based pagination).
 */
export interface TracksResponse {
  items: BackendTrack[];
  next_cursor: string | null;
  has_more: boolean;
}

/**
 * Resolves track file URL: prepends API base URL when path is relative.
 * Returns empty string when fileUrl is null (e.g. track still in progress).
 */
export function resolveTrackFileUrl(fileUrl: string | null): string {
  if (fileUrl == null || fileUrl === "") return "";
  if (fileUrl.startsWith("/")) {
    return `${API_BASE_URL}${fileUrl}`;
  }
  return fileUrl;
}

/**
 * Maps a backend track to the frontend AudioFile shape.
 * - id as string; status "done" -> "new", "progress" -> "progress"; "played" is client-only.
 * - file_url resolved to full URL; duration omitted (optional in AudioFile).
 */
export function mapBackendTrackToAudioFile(backendTrack: BackendTrack): AudioFile {
  const status =
    backendTrack.status === "done"
      ? "new"
      : backendTrack.status === "progress"
        ? "progress"
        : "new";
  return {
    id: String(backendTrack.id),
    title: backendTrack.title,
    channel_name: backendTrack.channel_name,
    file_url: resolveTrackFileUrl(backendTrack.file_url),
    status,
  };
}

/**
 * Fetches digest tracks from the backend (newest first, cursor-based pagination).
 */
export async function getTracks(
  limit: number = 20,
  cursor?: string | null
): Promise<TracksResponse> {
  const url = new URL(`${API_BASE_URL}/api/tracks`);
  url.searchParams.set("limit", String(Math.min(100, Math.max(1, limit))));
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Tracks request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<TracksResponse>;
}
