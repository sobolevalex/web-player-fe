'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import type { AudioFile } from '@/types';
import MiniPlayer from '@/components/layout/MiniPlayer';

type TrackEndedCallback = () => void;

interface PlayerContextValue {
  currentTrack: AudioFile | null;
  isPlaying: boolean;
  setCurrentTrack: (track: AudioFile | null) => void;
  setIsPlaying: (playing: boolean) => void;
  /** Register a callback to run when the current track ends (e.g. play next). Cleared when caller unmounts. */
  setTrackEndedCallback: (cb: TrackEndedCallback | null) => void;
  /** Called by Home to update playlist "played" status when user marks as played. */
  onMarkAsPlayedInPlaylist: (trackId: string) => void;
  setOnMarkAsPlayedInPlaylist: (fn: ((trackId: string) => void) | null) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return ctx;
}

/** Optional hook for components that only need to read/set track when present (e.g. layout). */
export function usePlayerOptional() {
  return useContext(PlayerContext);
}

interface PlayerProviderProps {
  children: ReactNode;
}

export function PlayerProvider({ children }: PlayerProviderProps) {
  const [currentTrack, setCurrentTrack] = useState<AudioFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const trackEndedCallbackRef = useRef<TrackEndedCallback | null>(null);
  const markAsPlayedInPlaylistRef = useRef<((trackId: string) => void) | null>(null);

  const setTrackEndedCallback = useCallback((cb: TrackEndedCallback | null) => {
    trackEndedCallbackRef.current = cb;
  }, []);

  const setOnMarkAsPlayedInPlaylist = useCallback((fn: ((trackId: string) => void) | null) => {
    markAsPlayedInPlaylistRef.current = fn;
  }, []);

  const onMarkAsPlayedInPlaylist = useCallback((trackId: string) => {
    markAsPlayedInPlaylistRef.current?.(trackId);
  }, []);

  const handleTrackEnded = useCallback(() => {
    if (trackEndedCallbackRef.current) {
      trackEndedCallbackRef.current();
    } else {
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setCurrentTrack(null);
    setIsPlaying(false);
  }, []);

  const value: PlayerContextValue = {
    currentTrack,
    isPlaying,
    setCurrentTrack,
    setIsPlaying,
    setTrackEndedCallback,
    onMarkAsPlayedInPlaylist,
    setOnMarkAsPlayedInPlaylist,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <MiniPlayer
        track={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying((p) => !p)}
        onClose={handleClose}
        onMarkAsPlayed={() => {
          if (currentTrack) onMarkAsPlayedInPlaylist(currentTrack.id);
        }}
        onTrackEnded={handleTrackEnded}
      />
    </PlayerContext.Provider>
  );
}
