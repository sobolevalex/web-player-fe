'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getChannels, generateDigest, getTracks } from '@/lib/api';
import type { BackendChannel } from '@/lib/api';

/** Poll interval while waiting for a track to finish generating (ms). */
const GENERATING_POLL_MS = 5000;

/** Format ISO 8601 date as relative time (e.g. "2 days ago") or short absolute date. */
function formatLastDigest(iso: string | null): string {
  if (iso == null) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Mode label and message count for display. */
function modeLabel(channel: BackendChannel): string {
  const limit = channel.message_limit ?? 'no limit';
  if (channel.message_selection_mode === 'since_last_digest') {
    return `Since last digest · ${limit} messages`;
  }
  return `Last N messages · ${limit}`;
}

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
          {channels.map((channel) => {
            const name = channel.display_name ?? channel.username;
            const isGenerating = generatingChannelId === channel.id;
            const showError = generateError && errorChannelId === channel.id;
            return (
              <li
                key={channel.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Last digest: {formatLastDigest(channel.last_digest_message_at)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {modeLabel(channel)}
                    </p>
                    {isGenerating && (
                      <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        Generating digest… Check Player for the new track when ready.
                      </p>
                    )}
                    {showError && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {generateError}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerate(channel)}
                    disabled={isGenerating}
                    className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {isGenerating ? 'Generating…' : 'Generate'}
                  </button>
                </div>
              </li>
            );
          })}
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
