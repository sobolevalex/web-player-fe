'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { AudioFile, AudioFileStatus } from '@/types';
import MiniPlayer from '@/components/layout/MiniPlayer';

type TrackEndedCallback = () => void;

/** Merge listen fields from server into playlist + current track (registered by Home). */
export type ApplyListenFromServerFn = (
  trackId: string,
  status: AudioFileStatus,
  playbackPositionSeconds: number | null
) => void;

interface PlayerContextValue {
  currentTrack: AudioFile | null;
  isPlaying: boolean;
  setCurrentTrack: Dispatch<SetStateAction<AudioFile | null>>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setTrackEndedCallback: (cb: TrackEndedCallback | null) => void;
  applyListenFromServer: ApplyListenFromServerFn;
  setApplyListenFromServer: (fn: ApplyListenFromServerFn | null) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return ctx;
}

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
  const applyListenFromServerRef = useRef<ApplyListenFromServerFn | null>(null);

  const setTrackEndedCallback = useCallback((cb: TrackEndedCallback | null) => {
    trackEndedCallbackRef.current = cb;
  }, []);

  const setApplyListenFromServer = useCallback((fn: ApplyListenFromServerFn | null) => {
    applyListenFromServerRef.current = fn;
  }, []);

  const applyListenFromServer = useCallback<ApplyListenFromServerFn>(
    (trackId, status, playbackPositionSeconds) => {
      applyListenFromServerRef.current?.(trackId, status, playbackPositionSeconds);
    },
    []
  );

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
    applyListenFromServer,
    setApplyListenFromServer,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <MiniPlayer
        track={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying((p) => !p)}
        onClose={handleClose}
        onTrackEnded={handleTrackEnded}
        applyListenFromServer={applyListenFromServer}
      />
    </PlayerContext.Provider>
  );
}
