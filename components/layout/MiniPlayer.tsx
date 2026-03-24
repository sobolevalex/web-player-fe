'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { formatDigestTime, formatDurationSeconds } from '@/lib/utils';
import { patchTrackListen, listenStateFromBackendTrack } from '@/lib/api';
import type { ApplyListenFromServerFn } from '@/contexts/PlayerContext';

const PROGRESS_PATCH_INTERVAL_MS = 8_000;
const NEAR_END_SECONDS = 10;
const RESUME_BACK_SECONDS = 5;
const SEEK_PATCH_DEBOUNCE_MS = 450;

interface MiniPlayerProps {
    track: {
        id: string;
        title: string;
        channel_name: string;
        status: string;
        file_url?: string;
        messages_start_at?: string | null;
        messages_end_at?: string | null;
        playback_position_seconds?: number | null;
    } | null;
    isPlaying: boolean;
    onPlayPause: () => void;
    onClose: () => void;
    /** When the track finishes. If set, auto-continue is handled by parent (e.g. play next). */
    onTrackEnded?: () => void;
    applyListenFromServer: ApplyListenFromServerFn;
}

export default function MiniPlayer({
    track,
    isPlaying,
    onPlayPause,
    onClose,
    onTrackEnded,
    applyListenFromServer,
}: MiniPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);

    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);

    const lastProgressPatchAtRef = useRef(0);
    const nearEndHandledRef = useRef(false);
    const wasPlayingRef = useRef(false);
    const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFromBackendResponse = useCallback(
        (trackId: string, t: { play_status: string; playback_position_seconds: number | null }) => {
            const { status, playback_position_seconds } = listenStateFromBackendTrack(t);
            applyListenFromServer(trackId, status, playback_position_seconds ?? null);
        },
        [applyListenFromServer]
    );

    const sendProgress = useCallback(
        async (trackId: string, positionSeconds: number, force: boolean) => {
            const now = Date.now();
            if (!force && now - lastProgressPatchAtRef.current < PROGRESS_PATCH_INTERVAL_MS) {
                return;
            }
            lastProgressPatchAtRef.current = now;
            try {
                const updated = await patchTrackListen(Number(trackId), {
                    action: 'progress',
                    position_seconds: positionSeconds,
                });
                applyFromBackendResponse(trackId, updated);
            } catch (e) {
                console.error('Listen progress sync failed:', e);
            }
        },
        [applyFromBackendResponse]
    );

    const sendMarkPlayed = useCallback(
        async (trackId: string) => {
            try {
                const updated = await patchTrackListen(Number(trackId), { action: 'mark_played' });
                applyFromBackendResponse(trackId, updated);
            } catch (e) {
                console.error('Mark played sync failed:', e);
            }
        },
        [applyFromBackendResponse]
    );

    // Reset per-track guards when switching tracks; seek from server position (with small rewind).
    useEffect(() => {
        nearEndHandledRef.current = false;
        lastProgressPatchAtRef.current = 0;
        if (seekDebounceRef.current) {
            clearTimeout(seekDebounceRef.current);
            seekDebounceRef.current = null;
        }
        if (audioRef.current && track) {
            const pos = track.playback_position_seconds ?? 0;
            audioRef.current.currentTime = Math.max(0, pos - RESUME_BACK_SECONDS);
        }
    }, [track?.id]);

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch((e) => console.log('Play error:', e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, track]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    }, [speed]);

    // Flush in-track position when user pauses (was playing).
    useEffect(() => {
        if (wasPlayingRef.current && !isPlaying && track && audioRef.current) {
            const dur = audioRef.current.duration;
            if (dur > 0 && track.status !== 'played') {
                void sendProgress(track.id, audioRef.current.currentTime, true);
            }
        }
        wasPlayingRef.current = isPlaying;
    }, [isPlaying, track, sendProgress]);

    const handleTimeUpdate = () => {
        if (!audioRef.current || !track) return;
        const current = audioRef.current.currentTime;
        const dur = audioRef.current.duration;

        if (dur > 0) {
            setProgress((current / dur) * 100);
            setCurrentTime(current);
            setDuration(dur);

            if (isPlaying && track.status !== 'played' && !nearEndHandledRef.current) {
                void sendProgress(track.id, current, false);
            }

            if (
                dur - current <= NEAR_END_SECONDS &&
                track.status !== 'played' &&
                !nearEndHandledRef.current
            ) {
                nearEndHandledRef.current = true;
                void sendMarkPlayed(track.id);
            }
        }
    };

    const scheduleSeekPatch = (positionSeconds: number) => {
        if (!track || track.status === 'played') return;
        if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
        seekDebounceRef.current = setTimeout(() => {
            seekDebounceRef.current = null;
            void sendProgress(track.id, positionSeconds, true);
        }, SEEK_PATCH_DEBOUNCE_MS);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newProgress = Number(e.target.value);
        if (audioRef.current && audioRef.current.duration) {
            const nextTime = (audioRef.current.duration / 100) * newProgress;
            audioRef.current.currentTime = nextTime;
            setProgress(newProgress);
            if (track) scheduleSeekPatch(nextTime);
        }
    };

    const toggleSpeed = () => {
        setSpeed((prev) => (prev === 1 ? 1.25 : prev === 1.25 ? 1.5 : prev === 1.5 ? 2 : 1));
    };

    if (!track) return null;

    return (
        <div className="fixed bottom-[65px] left-0 right-0 z-50 mx-auto w-full max-w-md bg-white/95 border-t border-zinc-200 px-4 py-2 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:bg-zinc-900/95 dark:border-zinc-800">

            <audio
                ref={audioRef}
                src={track.file_url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onEnded={() => {
                    setProgress(0);
                    if (track && track.status !== 'played' && !nearEndHandledRef.current) {
                        void sendMarkPlayed(track.id);
                    }
                    nearEndHandledRef.current = true;
                    if (onTrackEnded) {
                        onTrackEnded();
                    } else {
                        onPlayPause();
                    }
                }}
            />

            <div className="relative w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full mt-1 mb-1">
                <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-75 ease-linear pointer-events-none"
                    style={{ width: `${progress}%` }}
                ></div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={isNaN(progress) ? 0 : progress}
                    onChange={handleSeek}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>

            <div className="flex justify-between text-[10px] text-zinc-500 font-medium px-1 mb-2">
                <span>{formatDurationSeconds(currentTime)}</span>
                <span>-{formatDurationSeconds(duration - currentTime)}</span>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex flex-col overflow-hidden pr-4 w-1/2">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {track.channel_name}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        From {formatDigestTime(track.messages_start_at)} · To {formatDigestTime(track.messages_end_at)}
                    </p>
                </div>

                <div className="flex items-center space-x-4 shrink-0">

                    <button
                        onClick={toggleSpeed}
                        className="text-xs font-bold text-zinc-600 w-8 text-center transition-colors hover:text-blue-500 dark:text-zinc-300 dark:hover:text-blue-400"
                    >
                        {speed}x
                    </button>

                    <button
                        onClick={onPlayPause}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-md transition-all active:scale-95"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-red-500 transition-colors dark:hover:text-red-400"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
