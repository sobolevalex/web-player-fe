'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import {
  getTelegramChannels,
  createChannel,
  getChannels,
  getChannel,
  updateChannel,
  deleteChannel,
} from '@/lib/api';
import type { BackendChannel } from '@/lib/api';
import ManageChannelCard, { type TelegramChannelItem } from '@/components/ui/ManageChannelCard';

/** Cache TTL for Telegram channels list (30 minutes). */
const TELEGRAM_CHANNELS_CACHE_MS = 30 * 60 * 1000;

/** Module-level cache to avoid Telegram API request on every page entry. */
let telegramChannelsCache: {
  channels: TelegramChannelItem[];
  fetchedAt: number;
} | null = null;

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
  const [channelFilter, setChannelFilter] = useState<'all' | 'added' | 'not_added'>('added');
  const [popupState, setPopupState] = useState<{
    item: TelegramChannelItem;
    existingId?: number;
  } | null>(null);
  const [popupBackendChannel, setPopupBackendChannel] = useState<BackendChannel | null>(null);
  const [popupChannelLoading, setPopupChannelLoading] = useState(false);
  const [popupSaving, setPopupSaving] = useState(false);
  const [editMessageLimit, setEditMessageLimit] = useState('');
  const [editMode, setEditMode] = useState<'last_n' | 'since_last_digest'>('last_n');

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

  useEffect(() => {
    if (!popupState?.existingId) {
      setPopupBackendChannel(null);
      setPopupChannelLoading(false);
      return;
    }
    setPopupChannelLoading(true);
    getChannel(popupState.existingId)
      .then(setPopupBackendChannel)
      .catch(() => setPopupBackendChannel(null))
      .finally(() => setPopupChannelLoading(false));
  }, [popupState?.existingId]);

  useEffect(() => {
    if (popupBackendChannel) {
      setEditMessageLimit(
        popupBackendChannel.message_limit != null
          ? String(popupBackendChannel.message_limit)
          : ''
      );
      setEditMode(popupBackendChannel.message_selection_mode);
    }
  }, [popupBackendChannel]);

  const openPopup = (item: TelegramChannelItem, existingId?: number) => {
    setPopupState({ item, existingId });
    setAddError(null);
  };

  const closePopup = () => {
    setPopupState(null);
    setPopupBackendChannel(null);
  };

  const handleSaveEdit = () => {
    if (!popupBackendChannel) return;
    setPopupSaving(true);
    const message_limit =
      editMessageLimit.trim() === ''
        ? null
        : Math.max(1, parseInt(editMessageLimit, 10) || 1);
    updateChannel(popupBackendChannel.id, {
      message_limit,
      message_selection_mode: editMode,
    })
      .then(() => {
        closePopup();
      })
      .catch((err) => {
        setAddError(err instanceof Error ? err.message : 'Failed to update channel');
      })
      .finally(() => setPopupSaving(false));
  };

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

  const filteredChannels = telegramChannels.filter((item) => {
    const username = normalizedUsername(item);
    const usernameLower = username?.toLowerCase() ?? '';
    const isAdded = username ? existingByUsername.has(usernameLower) : false;
    if (channelFilter === 'all') return true;
    if (channelFilter === 'added') return isAdded;
    return !isAdded;
  });

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
      {!loading && !error && telegramChannels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {(['added', 'not_added', 'all'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setChannelFilter(filter)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                channelFilter === filter
                  ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {filter === 'all' ? 'All channels' : filter === 'added' ? 'Added' : 'Not added'}
            </button>
          ))}
        </div>
      )}
      {!loading && !error && (
        <ul className="space-y-2" role="list">
          {filteredChannels.map((item, index) => {
            const username = normalizedUsername(item);
            const usernameLower = username?.toLowerCase() ?? '';
            const existingId = username ? existingByUsername.get(usernameLower) : undefined;
            return (
              <ManageChannelCard
                key={username ?? `item-${index}`}
                item={item}
                existingId={existingId}
                isAdding={addingUsername === username}
                isRemoving={removingId === existingId}
                onOpen={openPopup}
                onAdd={handleAdd}
                onRemove={handleRemove}
              />
            );
          })}
        </ul>
      )}
      {!loading && !error && telegramChannels.length === 0 && (
        <p className="text-zinc-500">No Telegram channels found or Telegram is not configured.</p>
      )}
      {!loading && !error && telegramChannels.length > 0 && filteredChannels.length === 0 && (
        <p className="text-zinc-500">No channels match this filter.</p>
      )}

      {/* Channel detail popup */}
      {popupState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closePopup}
          role="dialog"
          aria-modal="true"
          aria-labelledby="channel-popup-title"
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-auto rounded-xl bg-white shadow-xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <h2 id="channel-popup-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {typeof popupState.item.title === 'string' ? popupState.item.title : 'Channel'}
              </h2>
              <button
                type="button"
                onClick={closePopup}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                aria-label="Close"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>
            <div className="p-4">
              {!normalizedUsername(popupState.item) ? (
                <>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    We currently don&apos;t support adding or configuring this channel.
                  </p>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Private or invite-only channels don&apos;t have a public username, which is required to add them here.
                  </p>
                </>
              ) : !popupState.existingId ? (
                <>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    You need to add this channel first before you can change its settings.
                  </p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        handleAdd(popupState.item);
                        closePopup();
                      }}
                      disabled={addingUsername === normalizedUsername(popupState.item)}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {addingUsername === normalizedUsername(popupState.item) ? 'Adding…' : 'Add channel'}
                    </button>
                  </div>
                </>
              ) : popupChannelLoading ? (
                <p className="text-zinc-500">Loading channel…</p>
              ) : popupBackendChannel ? (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Change the number of messages and the selection mode for this channel.
                  </p>
                  <div>
                    <label htmlFor="popup-message-limit" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Number of messages
                    </label>
                    <input
                      id="popup-message-limit"
                      type="number"
                      min={1}
                      placeholder="No limit"
                      value={editMessageLimit}
                      onChange={(e) => setEditMessageLimit(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
                    />
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Leave empty for no limit.
                    </p>
                  </div>
                  <div>
                    <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Message selection mode
                    </span>
                    <label className="mb-2 flex items-center gap-2">
                      <input
                        type="radio"
                        name="popup-mode"
                        checked={editMode === 'last_n'}
                        onChange={() => setEditMode('last_n')}
                        className="rounded-full"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Last N messages</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="popup-mode"
                        checked={editMode === 'since_last_digest'}
                        onChange={() => setEditMode('since_last_digest')}
                        className="rounded-full"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">Since last digest</span>
                    </label>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={popupSaving}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      {popupSaving ? 'Saving…' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      onClick={closePopup}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500">Could not load channel. Try again later.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
