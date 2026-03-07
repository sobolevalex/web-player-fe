'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getChannels, generateDigest, getTracks } from '@/lib/api';
import type { BackendChannel } from '@/lib/api';
import ChannelCard from '@/components/ui/ChannelCard';

/** Poll interval while waiting for a track to finish generating (ms). */
const GENERATING_POLL_MS = 5000;

export default function ChannelsPage() {
  const [channels, setChannels] = useState<BackendChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingChannelId, setGeneratingChannelId] = useState<number | null>(null);
  const [generatingTrackId, setGeneratingTrackId] = useState<number | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [errorChannelId, setErrorChannelId] = useState<number | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchChannels = useCallback((silent = false) => {
    if (!silent) {
      setError(null);
      setLoading(true);
    }
    getChannels()
      .then(setChannels)
      .catch((err) => {
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Failed to load channels');
        }
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Poll track status until generation completes; then clear generating state.
  useEffect(() => {
    if (generatingTrackId == null) return;
    const checkTrack = () => {
      getTracks(50)
        .then((res) => {
          const track = res.items.find((t) => t.id === generatingTrackId);
          if (track && track.status !== 'progress') {
            setGeneratingChannelId(null);
            setGeneratingTrackId(null);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        })
        .catch(() => {});
    };
    pollIntervalRef.current = setInterval(checkTrack, GENERATING_POLL_MS);
    checkTrack();
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [generatingTrackId]);

  const handleGenerate = (channel: BackendChannel) => {
    setGeneratingChannelId(channel.id);
    setGenerateError(null);
    setErrorChannelId(null);
    generateDigest(channel.id)
      .then((res) => {
        setGeneratingTrackId(res.track_id);
      })
      .catch((err) => {
        setGenerateError(err instanceof Error ? err.message : 'Generate failed');
        setErrorChannelId(channel.id);
        setGeneratingChannelId(null);
      });
  };

  return (
    <div className="px-4 py-6 pb-32">
      <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Channels
      </h1>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => fetchChannels()}
            className="mt-2 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}
      {loading && !error && (
        <p className="mb-4 text-sm text-zinc-500">Loading channels…</p>
      )}
      {!loading && !error && channels.length === 0 && (
        <p className="mb-4 text-zinc-500">
          No channels yet. <Link href="/channels/add" className="font-medium underline">Manage channels</Link>
        </p>
      )}
      {!loading && channels.length > 0 && (
        <ul className="space-y-3" role="list">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              isGenerating={generatingChannelId === channel.id}
              showError={!!(generateError && errorChannelId === channel.id)}
              generateError={generateError}
              onGenerate={handleGenerate}
            />
          ))}
        </ul>
      )}

      {/* Manage channels bar: fixed above bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 z-30 mx-auto max-w-md px-4">
        <Link
          href="/channels/add"
          className="block w-full rounded-lg border border-zinc-200 bg-white py-3 text-center text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
        >
          Manage channels
        </Link>
      </div>
    </div>
  );
}
