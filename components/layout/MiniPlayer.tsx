'use client';

import { useRef, useEffect, useState } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { formatDigestTime, formatDurationSeconds } from '@/lib/utils';

interface MiniPlayerProps {
    track: {
        id: string;
        title: string;
        channel_name: string;
        status: string;
        file_url?: string;
        messages_start_at?: string | null;
        messages_end_at?: string | null;
    } | null;
    isPlaying: boolean;
    onPlayPause: () => void;
    onClose: () => void;
    onMarkAsPlayed: () => void;
    /** When the track finishes. If set, auto-continue is handled by parent (e.g. play next). */
    onTrackEnded?: () => void;
}

export default function MiniPlayer({ track, isPlaying, onPlayPause, onClose, onMarkAsPlayed, onTrackEnded }: MiniPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);

    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [speed, setSpeed] = useState(1);   // 1x, 1.25x, 1.5x, 2x

    // Эффект 1: Загрузка памяти трека (localStorage)
    useEffect(() => {
        if (audioRef.current && track) {
            const savedTime = localStorage.getItem(`teledigest_time_${track.id}`);
            if (savedTime) {
                audioRef.current.currentTime = Math.max(0, parseFloat(savedTime) - 5);
            } else {
                audioRef.current.currentTime = 0;
            }
        }
    }, [track?.id]);

    // Эффект 2: Управление Play / Pause
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.log("Play error:", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, track]);

    // Эффект 3: Применение скорости воспроизведения
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = speed;
        }
    }, [speed]);

    // Обновление прогресса и времени при проигрывании
    const handleTimeUpdate = () => {
        if (audioRef.current && track) {
            const current = audioRef.current.currentTime;
            const dur = audioRef.current.duration;

            if (dur > 0) {
                setProgress((current / dur) * 100);
                setCurrentTime(current);
                setDuration(dur);

                // Сохраняем позицию каждые доли секунды
                localStorage.setItem(`teledigest_time_${track.id}`, current.toString());

                // Если осталось меньше 10 секунд — меняем статус на "Прослушано"
                if (dur - current <= 10 && track.status !== 'played') {
                    onMarkAsPlayed();
                }
            }
        }
    };

    // Перемотка трека ползунком
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newProgress = Number(e.target.value);
        if (audioRef.current && audioRef.current.duration) {
            audioRef.current.currentTime = (audioRef.current.duration / 100) * newProgress;
            setProgress(newProgress);
        }
    };

    // Переключение скорости по кругу
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
                    localStorage.removeItem(`teledigest_time_${track.id}`);
                    if (onTrackEnded) {
                        onTrackEnded();
                    } else {
                        onPlayPause();
                    }
                }}
            />

            {/* ИНТЕРАКТИВНЫЙ ПРОГРЕСС-БАР */}
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

            {/* Таймеры под полоской */}
            <div className="flex justify-between text-[10px] text-zinc-500 font-medium px-1 mb-2">
                <span>{formatDurationSeconds(currentTime)}</span>
                <span>-{formatDurationSeconds(duration - currentTime)}</span>
            </div>

            <div className="flex items-center justify-between">
                {/* Инфо о треке */}
                <div className="flex flex-col overflow-hidden pr-4 w-1/2">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {track.channel_name}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        From {formatDigestTime(track.messages_start_at)} · To {formatDigestTime(track.messages_end_at)}
                    </p>
                </div>

                {/* Панель контроллеров */}
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