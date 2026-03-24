'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getTracks,
  mapBackendTrackToAudioFile,
  patchTrackListen,
  listenStateFromBackendTrack,
} from '@/lib/api';
import { useTrackPlaybackWebSocket } from '@/lib/track-playback-ws';
import type { AudioFile, AudioFileStatus } from '@/types';
import AudioCard from '@/components/ui/AudioCard';
import { usePlayer } from '@/contexts/PlayerContext';

/** How often to refresh the track list in the background (ms). */
const PLAYLIST_REFRESH_INTERVAL_MS = 15_000;

/** Timeout for initial tracks request so we don't hang if backend is unreachable (ms). */
const TRACKS_REQUEST_TIMEOUT_MS = 15_000;

const ALL_CHANNELS_VALUE = '';

export default function Home() {
  const {
    currentTrack,
    isPlaying,
    setCurrentTrack,
    setIsPlaying,
    setTrackEndedCallback,
    setApplyListenFromServer,
  } = usePlayer();
  const [activeTab, setActiveTab] = useState<'new' | 'started' | 'played' | 'all'>('new');
  const [selectedChannel, setSelectedChannel] = useState(ALL_CHANNELS_VALUE);
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mergeListen = useCallback(
    (trackId: string, status: AudioFileStatus, playbackPositionSeconds: number | null) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === trackId
            ? { ...f, status, playback_position_seconds: playbackPositionSeconds }
            : f
        )
      );
      setCurrentTrack((prev) =>
        prev?.id === trackId
          ? { ...prev, status, playback_position_seconds: playbackPositionSeconds }
          : prev
      );
    },
    [setCurrentTrack]
  );

  useTrackPlaybackWebSocket(
    useCallback(
      (msg) => {
        mergeListen(String(msg.track_id), msg.play_status, msg.playback_position_seconds);
      },
      [mergeListen]
    )
  );

  useEffect(() => {
    setApplyListenFromServer(mergeListen);
    return () => setApplyListenFromServer(null);
  }, [mergeListen, setApplyListenFromServer]);

  const refreshPlaylist = useCallback((silent: boolean) => {
    if (!silent) {
      setError(null);
      setLoading(true);
    }
    getTracks()
      .then((res) => {
        const newItems = res.items
          .filter((t) => t.status === 'done')
          .map(mapBackendTrackToAudioFile);
        setFiles(newItems);
      })
      .catch((err) => {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Failed to load tracks');
        }
      })
      .finally(() => {
        if (!silent) {
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    setLoading(true);
    setError(null);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Request timed out. Is the backend running?')),
        TRACKS_REQUEST_TIMEOUT_MS
      );
    });
    Promise.race([getTracks(), timeoutPromise])
      .then((res) => {
        if (cancelled) return;
        const mapped = res.items
          .filter((t) => t.status === 'done')
          .map(mapBackendTrackToAudioFile);
        setFiles(mapped);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load tracks');
      })
      .finally(() => {
        if (timeoutId != null) clearTimeout(timeoutId);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshPlaylist(true);
    }, PLAYLIST_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [refreshPlaylist]);

  const statusFilteredFiles =
    activeTab === 'all'
      ? files
      : files.filter((file) => file.status === activeTab);

  const filteredFiles =
    selectedChannel === ALL_CHANNELS_VALUE
      ? statusFilteredFiles
      : statusFilteredFiles.filter((file) => file.channel_name === selectedChannel);

  const filesToShow = [...filteredFiles].reverse();

  /** Channel-only ordering for auto-advance (track may disappear from New tab when marked played). */
  const advancePlaylist =
    selectedChannel === ALL_CHANNELS_VALUE
      ? [...files].reverse()
      : [...files.filter((f) => f.channel_name === selectedChannel)].reverse();

  const channelNames = [...new Set(files.map((f) => f.channel_name))].sort();

  const handleMarkAsPlayed = useCallback(
    async (trackId: string) => {
      try {
        const updated = await patchTrackListen(Number(trackId), { action: 'mark_played' });
        const { status, playback_position_seconds } = listenStateFromBackendTrack(updated);
        mergeListen(trackId, status, playback_position_seconds ?? null);
      } catch (e) {
        console.error(e);
      }
    },
    [mergeListen]
  );

  const handleMarkAsNew = useCallback(
    async (trackId: string) => {
      try {
        const updated = await patchTrackListen(Number(trackId), { action: 'mark_new' });
        const { status, playback_position_seconds } = listenStateFromBackendTrack(updated);
        mergeListen(trackId, status, playback_position_seconds ?? null);
      } catch (e) {
        console.error(e);
      }
    },
    [mergeListen]
  );

  const handleTrackEnded = useCallback(() => {
    if (!currentTrack) return;
    const currentIndex = advancePlaylist.findIndex((f) => f.id === currentTrack.id);
    const nextFile =
      currentIndex >= 0 && currentIndex < advancePlaylist.length - 1
        ? advancePlaylist[currentIndex + 1]
        : null;
    if (nextFile?.file_url) {
      setCurrentTrack(nextFile);
      setIsPlaying(true);
    } else {
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  }, [currentTrack, advancePlaylist, setCurrentTrack, setIsPlaying]);

  useEffect(() => {
    setTrackEndedCallback(handleTrackEnded);
    return () => setTrackEndedCallback(null);
  }, [handleTrackEnded, setTrackEndedCallback]);

  const fetchTracks = () => refreshPlaylist(false);

  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Player
      </h1>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchTracks}
            className="mt-2 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}
      {loading && !error && (
        <p className="mb-4 text-sm text-zinc-500">Loading tracks…</p>
      )}
      <div className="mb-3">
        <label htmlFor="channel-filter" className="sr-only">
          Filter by channel
        </label>
        <select
          id="channel-filter"
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
          aria-label="Filter by channel"
        >
          <option value={ALL_CHANNELS_VALUE}>All channels</option>
          {channelNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'new'
              ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          New
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('started')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'started'
              ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          In progress
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('played')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'played'
              ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          Played
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'all'
              ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          All
        </button>
      </div>
      <ul className="space-y-3 pb-24" role="list">
        {filesToShow.map((file) => {
          const isActiveTrack = currentTrack?.id === file.id;
          const isThisTrackPlaying = isActiveTrack && isPlaying;

          return (
            <AudioCard
              key={file.id}
              file={file}
              isActiveTrack={isActiveTrack}
              isThisTrackPlaying={isThisTrackPlaying}
              onPlayToggle={async () => {
                if (isThisTrackPlaying) {
                  setIsPlaying(false);
                } else if (file.file_url) {
                  setCurrentTrack(file);
                  setIsPlaying(true);
                  try {
                    const updated = await patchTrackListen(Number(file.id), {
                      action: 'progress',
                      position_seconds: file.playback_position_seconds ?? 0,
                    });
                    const { status, playback_position_seconds } =
                      listenStateFromBackendTrack(updated);
                    mergeListen(file.id, status, playback_position_seconds ?? null);
                  } catch (e) {
                    console.error(e);
                  }
                }
              }}
              onMarkAsPlayed={() => handleMarkAsPlayed(file.id)}
              onMarkAsNew={() => handleMarkAsNew(file.id)}
            />
          );
        })}
      </ul>
      {!loading && filesToShow.length === 0 && (
        <p className="text-center text-zinc-500 mt-8">No tracks yet</p>
      )}
    </div>
  );
}
