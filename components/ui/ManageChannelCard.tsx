'use client';

/** Telegram channel shape from API (title, username may be missing). */
export interface TelegramChannelItem {
  id?: unknown;
  title?: string;
  username?: string;
  [key: string]: unknown;
}

function normalizedUsername(item: TelegramChannelItem): string | null {
  const u = item.username;
  if (typeof u !== 'string') return null;
  return u.trim().replace(/^@/, '') || null;
}

export interface ManageChannelCardProps {
  item: TelegramChannelItem;
  existingId: number | undefined;
  isAdding: boolean;
  isRemoving: boolean;
  onOpen: (item: TelegramChannelItem, existingId?: number) => void;
  onAdd: (item: TelegramChannelItem) => void;
  onRemove: (channelId: number, usernameLower: string) => void;
}

export default function ManageChannelCard({
  item,
  existingId,
  isAdding,
  isRemoving,
  onOpen,
  onAdd,
  onRemove,
}: ManageChannelCardProps) {
  const title = typeof item.title === 'string' ? item.title : 'Unknown';
  const username = normalizedUsername(item);
  const usernameLower = username?.toLowerCase() ?? '';
  const isAdded = existingId !== undefined;

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item, existingId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(item, existingId);
        }
      }}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700/50"
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
        <span
          className="shrink-0 text-xs text-zinc-400"
          title="Private or invite-only channels have no public @username and can't be added here."
        >
          No public username
        </span>
      ) : isAdded ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(existingId, usernameLower);
          }}
          disabled={isRemoving}
          className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30"
        >
          {isRemoving ? 'Removing…' : 'Remove'}
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
          disabled={isAdding}
          className="shrink-0 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isAdding ? 'Adding…' : 'Add'}
        </button>
      )}
    </li>
  );
}
