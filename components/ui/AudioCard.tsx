'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, MoreVertical } from 'lucide-react';
import { formatDigestTime } from '@/lib/utils';

interface AudioCardProps {
    file: {
        id: string;
        title: string;
        channel_name: string;
        duration?: number;
        status: string;
        file_url?: string;
        messages_start_at?: string | null;
        messages_end_at?: string | null;
    };
    isActiveTrack: boolean;
    isThisTrackPlaying: boolean;
    onPlayToggle: () => void;
    onMarkAsPlayed: () => void;
    onMarkAsNew: () => void;
}

export default function AudioCard({
    file,
    isActiveTrack,
    isThisTrackPlaying,
    onPlayToggle,
    onMarkAsPlayed,
    onMarkAsNew,
}: AudioCardProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    const isNew = file.status === 'new';
    const handleMenuAction = () => {
        if (isNew) {
            onMarkAsPlayed();
        } else {
            onMarkAsNew();
        }
        setMenuOpen(false);
    };

    return (
        <li
            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${isActiveTrack
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-900/20'
                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                }`}
        >

            {/* Left: channel name, time range, status badge */}
            <div className="flex-1 overflow-hidden pr-4">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {file.channel_name}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    From {formatDigestTime(file.messages_start_at)}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    To {formatDigestTime(file.messages_end_at)}
                </p>
                <div className="mt-1 flex items-center gap-2">
                    <span className="inline-block text-xs font-medium text-zinc-400 dark:text-zinc-500">
                        {file.status === 'new' ? 'New' : 'Played'}
                    </span>
                    {file.duration != null && (
                        <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {Math.floor(file.duration / 60)} min
                        </span>
                    )}
                </div>
            </div>

            {/* Правая часть: Кнопки */}
            <div className="flex shrink-0 items-center space-x-2">
                <button
                    onClick={onPlayToggle}
                    disabled={!file.file_url}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-900 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                    aria-label={file.file_url ? 'Play or Pause' : 'Track not ready'}
                >
                    {isThisTrackPlaying ? (
                        <Pause size={18} fill="currentColor" />
                    ) : (
                        <Play size={18} fill="currentColor" className="ml-0.5" />
                    )}
                </button>

                <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-700"></div>

                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((open) => !open)}
                        className="flex h-10 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
                        aria-label="More options"
                        aria-expanded={menuOpen}
                        aria-haspopup="true"
                    >
                        <MoreVertical size={20} />
                    </button>
                    {menuOpen && (
                        <div
                            className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
                            role="menu"
                        >
                            <button
                                type="button"
                                role="menuitem"
                                onClick={handleMenuAction}
                                className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                                {isNew ? 'Mark as played' : 'Mark as new'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
}