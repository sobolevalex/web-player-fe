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
  channels_used: string[] | null;
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
 * Channel object as returned by GET/POST/PATCH /api/channels.
 */
export interface BackendChannel {
  id: number;
  username: string;
  display_name: string | null;
  message_limit: number | null;
  sort_order: number;
  message_selection_mode: "last_n" | "since_last_digest";
  /** ISO 8601 UTC datetime of last message in a digest for this channel; null if never digested. */
  last_digest_message_at: string | null;
}

/**
 * Payload for POST /api/channels (only username required).
 */
export interface CreateChannelPayload {
  username: string;
  display_name?: string | null;
  message_limit?: number | null;
  sort_order?: number;
  message_selection_mode?: "last_n" | "since_last_digest" | null;
}

/**
 * Payload for PATCH /api/channels/{channel_id} (all fields optional).
 */
export interface UpdateChannelPayload {
  username?: string | null;
  display_name?: string | null;
  message_limit?: number | null;
  sort_order?: number | null;
  message_selection_mode?: "last_n" | "since_last_digest" | null;
}

/**
 * Response shape of POST /api/generate.
 */
export interface GenerateResponse {
  track_id: number;
}

/**
 * Response shape of GET /api/telegram/channels.
 */
export interface TelegramChannelsResponse {
  channels: Array<{ id?: unknown; title?: string; username?: string; [key: string]: unknown }>;
}

/**
 * Resolves track file URL: prepends API base URL when path is relative.
 * Returns empty string when fileUrl is null (e.g. track still processing).
 */
export function resolveTrackFileUrl(fileUrl: string | null): string {
  if (fileUrl == null || fileUrl === "") return "";
  if (fileUrl.startsWith("/")) {
    return `${API_BASE_URL}${fileUrl}`;
  }
  return fileUrl;
}

/**
 * Resolves transcript URL: prepends API base URL when path is relative.
 * Returns empty string when transcriptUrl is null.
 */
export function resolveTranscriptUrl(transcriptUrl: string | null): string {
  if (transcriptUrl == null || transcriptUrl === "") return "";
  if (transcriptUrl.startsWith("/")) {
    return `${API_BASE_URL}${transcriptUrl}`;
  }
  return transcriptUrl;
}

/**
 * Maps a backend track to the frontend AudioFile shape.
 * - id as string; status "done" or "progress" -> "new"; "played" is client-only.
 * - file_url resolved to full URL; duration omitted (optional in AudioFile).
 */
export function mapBackendTrackToAudioFile(backendTrack: BackendTrack): AudioFile {
  // Backend "done" and "progress" both map to "new"; "played" is client-only.
  const status: AudioFile["status"] = "new";
  return {
    id: String(backendTrack.id),
    title: backendTrack.title,
    channel_name: backendTrack.channel_name ?? "Unknown channel",
    file_url: resolveTrackFileUrl(backendTrack.file_url),
    status,
    messages_start_at: backendTrack.messages_start_at ?? null,
    messages_end_at: backendTrack.messages_end_at ?? null,
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

// --- Channels ---

/**
 * Fetches all channels (ordered by sort_order then id).
 * Uses no-store so newly added channels appear immediately (no browser cache).
 */
export async function getChannels(): Promise<BackendChannel[]> {
  const response = await fetch(`${API_BASE_URL}/api/channels`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Channels request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<BackendChannel[]>;
}

/**
 * Fetches a single channel by ID. Throws if 404.
 */
export async function getChannel(channelId: number): Promise<BackendChannel> {
  const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error("Channel not found");
    throw new Error(`Channel request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<BackendChannel>;
}

/**
 * Creates a new channel. 400 if username missing/empty; 409 if username already exists.
 */
export async function createChannel(payload: CreateChannelPayload): Promise<BackendChannel> {
  const response = await fetch(`${API_BASE_URL}/api/channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(msg || `Create channel failed: ${response.status}`);
  }
  return response.json() as Promise<BackendChannel>;
}

/**
 * Updates a channel by ID. Only provided fields are updated. 404 if not found; 409 if username conflict.
 */
export async function updateChannel(
  channelId: number,
  payload: UpdateChannelPayload
): Promise<BackendChannel> {
  const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Channel not found");
    const msg = await response.text();
    throw new Error(msg || `Update channel failed: ${response.status}`);
  }
  return response.json() as Promise<BackendChannel>;
}

/**
 * Deletes a channel by ID. 404 if not found.
 */
export async function deleteChannel(channelId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Channel not found");
    throw new Error(`Delete channel failed: ${response.status} ${response.statusText}`);
  }
}

// --- Telegram ---

/**
 * Returns Telegram channels the configured account has access to. 502 on Telegram error; 503 if not configured.
 */
export async function getTelegramChannels(): Promise<TelegramChannelsResponse> {
  const response = await fetch(`${API_BASE_URL}/api/telegram/channels`);
  if (!response.ok) {
    throw new Error(`Telegram channels request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<TelegramChannelsResponse>;
}

// --- Generate ---

/**
 * Starts digest generation (background). Optional channel_id for single-channel digest; omit for full digest.
 * Returns track_id; poll GET /api/tracks or track resource for status and file_url.
 * 400 if no channels / digest not possible; 404 if channel_id given but not found.
 */
export async function generateDigest(channelId?: number | null): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(channelId != null ? { channel_id: channelId } : {}),
  });
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(msg || `Generate failed: ${response.status}`);
  }
  return response.json() as Promise<GenerateResponse>;
}
