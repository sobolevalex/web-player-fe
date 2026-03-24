import type { AudioFile } from "@/types";

// Empty = same-origin (API/media proxied by Next.js rewrites; use when only one hostname, e.g. app.sobolevfamily.com).
// Non-empty = direct API URL (e.g. https://api.sobolevfamily.com when API has its own hostname in the tunnel).
const API_BASE_URL =
  process.env.NEXT_PUBLIC_TELEDIGEST_API_URL ?? "";

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
  /** Listen SSOT: new | started | played */
  play_status: string;
  playback_position_seconds: number | null;
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
    return API_BASE_URL ? `${API_BASE_URL}${fileUrl}` : fileUrl;
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
    return API_BASE_URL ? `${API_BASE_URL}${transcriptUrl}` : transcriptUrl;
  }
  return transcriptUrl;
}

/** Normalize API play_status to frontend listen state. */
export function normalizePlayStatus(raw: string | undefined | null): AudioFile["status"] {
  if (raw === "started" || raw === "played") return raw;
  return "new";
}

/** Fields to merge after PATCH / WebSocket listen updates. */
export function listenStateFromBackendTrack(t: Pick<BackendTrack, "play_status" | "playback_position_seconds">): Pick<
  AudioFile,
  "status" | "playback_position_seconds"
> {
  return {
    status: normalizePlayStatus(t.play_status),
    playback_position_seconds: t.playback_position_seconds ?? null,
  };
}

/**
 * Maps a backend track to the frontend AudioFile shape.
 * Digest `status` (done/progress) filters which rows are listed; listen state comes from play_status.
 */
export function mapBackendTrackToAudioFile(backendTrack: BackendTrack): AudioFile {
  const listen = listenStateFromBackendTrack(backendTrack);
  return {
    id: String(backendTrack.id),
    title: backendTrack.title,
    channel_name: backendTrack.channel_name ?? "Unknown channel",
    file_url: resolveTrackFileUrl(backendTrack.file_url),
    status: listen.status,
    playback_position_seconds: listen.playback_position_seconds,
    messages_start_at: backendTrack.messages_start_at ?? null,
    messages_end_at: backendTrack.messages_end_at ?? null,
  };
}

export type ListenPatchAction = "mark_new" | "mark_played" | "progress";

export interface ListenPatchPayload {
  action: ListenPatchAction;
  /** Required when action is progress (in-track seconds). */
  position_seconds?: number | null;
}

/**
 * PATCH listen metadata; returns full track item (same shape as list items).
 */
export async function patchTrackListen(
  trackId: number,
  payload: ListenPatchPayload
): Promise<BackendTrack> {
  const url = API_BASE_URL
    ? `${API_BASE_URL}/api/tracks/${trackId}/listen`
    : `/api/tracks/${trackId}/listen`;
  const body: Record<string, unknown> = { action: payload.action };
  if (payload.action === "progress") {
    body.position_seconds = payload.position_seconds ?? 0;
  }
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(msg || `Listen patch failed: ${response.status}`);
  }
  return response.json() as Promise<BackendTrack>;
}

/**
 * WebSocket URL for listen sync. Next.js HTTP rewrites do not proxy WS — set env when API is on another origin.
 * - NEXT_PUBLIC_TELEDIGEST_WS_URL: full ws(s) URL, e.g. ws://localhost:8000/ws/track-playback
 * - Or NEXT_PUBLIC_TELEDIGEST_API_URL: derives ws(s)://host/ws/track-playback
 */
export function getTrackPlaybackWebSocketUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_TELEDIGEST_WS_URL?.trim();
  if (explicit) return explicit;
  const api = process.env.NEXT_PUBLIC_TELEDIGEST_API_URL?.trim();
  if (!api) return null;
  const wsBase = api.replace(/^http/, "ws").replace(/\/$/, "");
  return `${wsBase}/ws/track-playback`;
}

/**
 * Fetches digest tracks from the backend (newest first, cursor-based pagination).
 */
export async function getTracks(
  limit: number = 20,
  cursor?: string | null
): Promise<TracksResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(Math.min(100, Math.max(1, limit))));
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  const url = API_BASE_URL
    ? `${API_BASE_URL}/api/tracks?${query}`
    : `/api/tracks${query ? `?${query}` : ""}`;
  const response = await fetch(url);
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
  const url = API_BASE_URL ? `${API_BASE_URL}/api/channels` : "/api/channels";
  const response = await fetch(url, {
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
  const url = API_BASE_URL ? `${API_BASE_URL}/api/channels/${channelId}` : `/api/channels/${channelId}`;
  const response = await fetch(url);
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
  const url = API_BASE_URL ? `${API_BASE_URL}/api/channels` : "/api/channels";
  const response = await fetch(url, {
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
  const url = API_BASE_URL ? `${API_BASE_URL}/api/channels/${channelId}` : `/api/channels/${channelId}`;
  const response = await fetch(url, {
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
  const url = API_BASE_URL ? `${API_BASE_URL}/api/channels/${channelId}` : `/api/channels/${channelId}`;
  const response = await fetch(url, {
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
  const url = API_BASE_URL ? `${API_BASE_URL}/api/telegram/channels` : "/api/telegram/channels";
  const response = await fetch(url);
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
  const url = API_BASE_URL ? `${API_BASE_URL}/api/generate` : "/api/generate";
  const response = await fetch(url, {
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
