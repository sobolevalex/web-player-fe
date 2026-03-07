'use client';

import type { BackendChannel } from '@/lib/api';
import type { TelegramChannelItem } from '@/components/ui/ManageChannelCard';

export interface ChannelDetailPopupState {
  item: TelegramChannelItem;
  existingId?: number;
}

export interface ChannelDetailPopupProps {
  popupState: ChannelDetailPopupState | null;
  backendChannel: BackendChannel | null;
  channelLoading: boolean;
  saving: boolean;
  editMessageLimit: string;
  editMode: 'last_n' | 'since_last_digest';
  /** Whether the current channel has a public username (can be added). */
  hasUsername: boolean;
  /** Whether we're currently adding the channel shown in the popup. */
  isAddingCurrent: boolean;
  onClose: () => void;
  onAdd: (item: TelegramChannelItem) => void;
  onSaveEdit: () => void;
  onEditMessageLimitChange: (value: string) => void;
  onEditModeChange: (mode: 'last_n' | 'since_last_digest') => void;
}

export default function ChannelDetailPopup({
  popupState,
  backendChannel,
  channelLoading,
  saving,
  editMessageLimit,
  editMode,
  hasUsername,
  isAddingCurrent,
  onClose,
  onAdd,
  onSaveEdit,
  onEditMessageLimitChange,
  onEditModeChange,
}: ChannelDetailPopupProps) {
  if (!popupState) return null;

  const { item, existingId } = popupState;
  const title = typeof item.title === 'string' ? item.title : 'Channel';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
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
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="p-4">
          {!hasUsername ? (
            <>
              <p className="text-zinc-600 dark:text-zinc-400">
                We currently don&apos;t support adding or configuring this channel.
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Private or invite-only channels don&apos;t have a public username, which is required to add them here.
              </p>
            </>
          ) : !existingId ? (
            <>
              <p className="text-zinc-600 dark:text-zinc-400">
                You need to add this channel first before you can change its settings.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    onAdd(item);
                    onClose();
                  }}
                  disabled={isAddingCurrent}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isAddingCurrent ? 'Adding…' : 'Add channel'}
                </button>
              </div>
            </>
          ) : channelLoading ? (
            <p className="text-zinc-500">Loading channel…</p>
          ) : backendChannel ? (
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
                  onChange={(e) => onEditMessageLimitChange(e.target.value)}
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
                    onChange={() => onEditModeChange('last_n')}
                    className="rounded-full"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Last N messages</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="popup-mode"
                    checked={editMode === 'since_last_digest'}
                    onChange={() => onEditModeChange('since_last_digest')}
                    className="rounded-full"
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Since last digest</span>
                </label>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onSaveEdit}
                  disabled={saving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
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
  );
}
