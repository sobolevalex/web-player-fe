'use client';

import { useEffect, useRef } from 'react';
import type { AudioFile } from '@/types';
import { getTrackPlaybackWebSocketUrl } from '@/lib/api';

export interface TrackListenWsPayload {
  type: 'track_listen';
  track_id: number;
  play_status: AudioFile['status'];
  playback_position_seconds: number | null;
}

function parseListenMessage(data: unknown): TrackListenWsPayload | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (o.type !== 'track_listen') return null;
  const id = o.track_id;
  const ps = o.play_status;
  if (typeof id !== 'number' || (ps !== 'new' && ps !== 'started' && ps !== 'played')) {
    return null;
  }
  const pos = o.playback_position_seconds;
  return {
    type: 'track_listen',
    track_id: id,
    play_status: ps,
    playback_position_seconds: typeof pos === 'number' ? pos : pos == null ? null : Number(pos),
  };
}

/**
 * Subscribes to backend listen-state broadcasts when a WebSocket URL is configured.
 */
export function useTrackPlaybackWebSocket(
  onListenPatch: (payload: TrackListenWsPayload) => void
): void {
  const handlerRef = useRef(onListenPatch);
  handlerRef.current = onListenPatch;

  useEffect(() => {
    const url = getTrackPlaybackWebSocketUrl();
    if (!url) return;

    const ws = new WebSocket(url);

    ws.onmessage = (event) => {
      try {
        const parsed = parseListenMessage(JSON.parse(event.data as string));
        if (parsed) handlerRef.current(parsed);
      } catch {
        /* ignore malformed */
      }
    };

    return () => {
      ws.close();
    };
  }, []);
}
