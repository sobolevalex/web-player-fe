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
import ChannelDetailPopup from '@/components/ui/ChannelDetailPopup';

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

      <ChannelDetailPopup
        popupState={popupState}
        backendChannel={popupBackendChannel}
        channelLoading={popupChannelLoading}
        saving={popupSaving}
        editMessageLimit={editMessageLimit}
        editMode={editMode}
        hasUsername={!!(popupState && normalizedUsername(popupState.item))}
        isAddingCurrent={!!(popupState && addingUsername === normalizedUsername(popupState.item))}
        onClose={closePopup}
        onAdd={handleAdd}
        onSaveEdit={handleSaveEdit}
        onEditMessageLimitChange={setEditMessageLimit}
        onEditModeChange={setEditMode}
      />
    </div>
  );
}
