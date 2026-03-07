'use client';

import type { BackendChannel } from '@/lib/api';

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

export interface ChannelCardProps {
  channel: BackendChannel;
  isGenerating: boolean;
  showError: boolean;
  generateError: string | null;
  onGenerate: (channel: BackendChannel) => void;
}

export default function ChannelCard({
  channel,
  isGenerating,
  showError,
  generateError,
  onGenerate,
}: ChannelCardProps) {
  const displayName = channel.display_name ?? channel.username;
  return (
    <li
      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
            {displayName}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            @{channel.username}
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
          onClick={() => onGenerate(channel)}
          disabled={isGenerating}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isGenerating ? 'Generating…' : 'Generate'}
        </button>
      </div>
    </li>
  );
}
