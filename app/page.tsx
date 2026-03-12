'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTracks, mapBackendTrackToAudioFile } from '@/lib/api';
import type { AudioFile } from '@/types';
import AudioCard from '@/components/ui/AudioCard';
import { usePlayer } from '@/contexts/PlayerContext';

/** How often to refresh the track list in the background (ms). */
const PLAYLIST_REFRESH_INTERVAL_MS = 15_000;

/** Timeout for initial tracks request so we don't hang if backend is unreachable (ms). */
const TRACKS_REQUEST_TIMEOUT_MS = 15_000;

const ALL_CHANNELS_VALUE = "";

export default function Home() {
  const {
    currentTrack,
    isPlaying,
    setCurrentTrack,
    setIsPlaying,
    setTrackEndedCallback,
    setOnMarkAsPlayedInPlaylist,
  } = usePlayer();
  const [activeTab, setActiveTab] = useState('new');
  const [selectedChannel, setSelectedChannel] = useState(ALL_CHANNELS_VALUE);
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setFiles((prevFiles) => {
          const playedIds = new Set(
            prevFiles.filter((f) => f.status === 'played').map((f) => f.id)
          );
          return newItems.map((file) =>
            playedIds.has(file.id) ? { ...file, status: 'played' as const } : file
          );
        });
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
        setFiles(
          res.items
            .filter((t) => t.status === 'done')
            .map(mapBackendTrackToAudioFile)
        );
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

  // Refresh track list periodically in the background (no loading spinner).
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

  // Presentation order: oldest to newest (backend returns newest first, so we reverse for display).
  const filesToShow = [...filteredFiles].reverse();

  /** Same order as display but only filtered by channel (not by status). Used for auto-advance so we can find next track even after current is marked played and drops out of filesToShow. */
  const advancePlaylist =
    selectedChannel === ALL_CHANNELS_VALUE
      ? [...files].reverse()
      : [...files.filter((f) => f.channel_name === selectedChannel)].reverse();

  const channelNames = [...new Set(files.map((f) => f.channel_name))].sort();

  const handleMarkAsPlayed = useCallback((trackId: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === trackId ? { ...file, status: 'played' } : file
      )
    );
  }, []);

  /** Auto-advance to next track. Uses advancePlaylist (channel-only) so current track is still findable after it is marked played. */
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

  // Register track-ended and mark-as-played so MiniPlayer (in layout) can advance playlist and update files while on this page.
  useEffect(() => {
    setTrackEndedCallback(handleTrackEnded);
    setOnMarkAsPlayedInPlaylist(handleMarkAsPlayed);
    return () => {
      setTrackEndedCallback(null);
      setOnMarkAsPlayedInPlaylist(null);
    };
  }, [handleTrackEnded, handleMarkAsPlayed, setTrackEndedCallback, setOnMarkAsPlayedInPlaylist]);

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
      <div className="mb-6 flex space-x-2">
        <button
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
              key={file.id} // Ключ всегда нужен внутри map
              file={file}
              isActiveTrack={isActiveTrack}
              isThisTrackPlaying={isThisTrackPlaying}

              // Передаем логику переключения плеера
              onPlayToggle={() => {
                if (isThisTrackPlaying) {
                  setIsPlaying(false);
                } else if (file.file_url) {
                  setCurrentTrack(file);
                  setIsPlaying(true);
                }
              }}
              // Передаем логику для меню опций
              onOptionsClick={() => alert(`Опции для: ${file.title}`)}
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
