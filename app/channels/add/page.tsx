'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import { getTelegramChannels, createChannel, getChannels, deleteChannel } from '@/lib/api';

/** Cache TTL for Telegram channels list (30 minutes). */
const TELEGRAM_CHANNELS_CACHE_MS = 30 * 60 * 1000;

/** Module-level cache to avoid Telegram API request on every page entry. */
let telegramChannelsCache: {
  channels: TelegramChannelItem[];
  fetchedAt: number;
} | null = null;

/** Telegram channel shape from API (title, username may be missing). */
interface TelegramChannelItem {
  id?: unknown;
  title?: string;
  username?: string;
  [key: string]: unknown;
}

/** Returns cached Telegram channels if still valid; otherwise null. */
function getCachedTelegramChannels(): TelegramChannelItem[] | null {
  if (!telegramChannelsCache) return null;
  if (Date.now() - telegramChannelsCache.fetchedAt > TELEGRAM_CHANNELS_CACHE_MS) {
    telegramChannelsCache = null;
    return null;
  }
  return telegramChannelsCache.channels;
}

/** Map: lowercase username -> backend channel id (for remove). */
function usernameToIdMap(channels: { username: string; id: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of channels) {
    map.set(c.username.toLowerCase(), c.id);
  }
  return map;
}

export default function ManageChannelsPage() {
  const [telegramChannels, setTelegramChannels] = useState<TelegramChannelItem[]>([]);
  const [existingByUsername, setExistingByUsername] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingUsername, setAddingUsername] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback((forceRefresh = false) => {
    setError(null);
    const cached = getCachedTelegramChannels();
    const useCache = !forceRefresh && cached;
    if (useCache) {
      setTelegramChannels(cached);
      setLoading(true);
      getChannels()
        .then((channelsRes) => {
          setExistingByUsername(usernameToIdMap(channelsRes));
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load channels');
        })
        .finally(() => setLoading(false));
      return;
    }
    setLoading(true);
    if (forceRefresh) setRefreshing(true);
    Promise.all([getTelegramChannels(), getChannels()])
      .then(([tgRes, channelsRes]) => {
        const channels = tgRes.channels ?? [];
        telegramChannelsCache = { channels, fetchedAt: Date.now() };
        setTelegramChannels(channels);
        setExistingByUsername(usernameToIdMap(channelsRes));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load channels');
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = (item: TelegramChannelItem) => {
    const username = typeof item.username === 'string' ? item.username.trim() : null;
    if (!username) return;
    setAddingUsername(username);
    setAddError(null);
    createChannel({
      username: username.replace(/^@/, ''),
      display_name: typeof item.title === 'string' ? item.title : null,
    })
      .then((created) => {
        setExistingByUsername((prev) => {
          const next = new Map(prev);
          next.set(created.username.toLowerCase(), created.id);
          return next;
        });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Add failed';
        if (msg.includes('already exists') || msg.includes('409')) {
          fetchData(false);
        } else {
          setAddError(msg);
        }
      })
      .finally(() => setAddingUsername(null));
  };

  const handleRemove = (channelId: number, usernameLower: string) => {
    setRemovingId(channelId);
    setAddError(null);
    deleteChannel(channelId)
      .then(() => {
        setExistingByUsername((prev) => {
          const next = new Map(prev);
          next.delete(usernameLower);
          return next;
        });
      })
      .catch((err) => {
        setAddError(err instanceof Error ? err.message : 'Remove failed');
      })
      .finally(() => setRemovingId(null));
  };

  const normalizedUsername = (item: TelegramChannelItem): string | null => {
    const u = item.username;
    if (typeof u !== 'string') return null;
    return u.trim().replace(/^@/, '') || null;
  };

  return (
    <div className="px-4 py-6 pb-24">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/channels"
          className="text-sm font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Channels
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Manage channels
        </h1>
        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing || loading}
          className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          {refreshing ? 'Refreshing…' : 'Refresh list now'}
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => fetchData(false)}
            className="mt-2 font-medium underline"
          >
            Retry
          </button>
        </div>
      )}
      {addError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {addError}
        </div>
      )}
      {loading && !error && (
        <p className="text-sm text-zinc-500">Loading Telegram channels…</p>
      )}
      {!loading && !error && (
        <ul className="space-y-2" role="list">
          {telegramChannels.map((item, index) => {
            const title = typeof item.title === 'string' ? item.title : 'Unknown';
            const username = normalizedUsername(item);
            const usernameLower = username?.toLowerCase() ?? '';
            const existingId = username ? existingByUsername.get(usernameLower) : undefined;
            const isAdded = existingId !== undefined;
            const isAdding = addingUsername === username;
            const isRemoving = removingId === existingId;

            return (
              <li
                key={username ?? `item-${index}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                    {title}
                  </p>
                  {username && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      @{username}
                    </p>
                  )}
                </div>
                {!username ? (
                  <span className="shrink-0 text-xs text-zinc-400" title="Private or invite-only channels have no public @username and can't be added here.">
                    No public username
                  </span>
                ) : isAdded ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(existingId, usernameLower)}
                    disabled={isRemoving}
                    className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    {isRemoving ? 'Removing…' : 'Remove'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAdd(item)}
                    disabled={isAdding}
                    className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {isAdding ? 'Adding…' : 'Add'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!loading && !error && telegramChannels.length === 0 && (
        <p className="text-zinc-500">No Telegram channels found or Telegram is not configured.</p>
      )}
    </div>
  );
}
