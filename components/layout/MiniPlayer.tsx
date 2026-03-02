'use client';

import { useRef, useEffect, useState } from 'react';
import { Play, Pause, X } from 'lucide-react';

interface MiniPlayerProps {
    track: {
        id: string;
        title: string;
        channel_name: string;
        status: string;
        file_url?: string;
    } | null;
    isPlaying: boolean;
    onPlayPause: () => void;
    onClose: () => void;
    onMarkAsPlayed: () => void; // Добавили новый проп
}

export default function MiniPlayer({ track, isPlaying, onPlayPause, onClose, onMarkAsPlayed }: MiniPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [progress, setProgress] = useState(0);

    // --- ЭФФЕКТ 1: Загрузка памяти трека при его смене ---
    useEffect(() => {
        if (audioRef.current && track) {
            // Ищем в памяти браузера запись для этого конкретного трека
            const savedTime = localStorage.getItem(`teledigest_time_${track.id}`);
            if (savedTime) {
                // Если нашли, отнимаем 5 секунд (но не уходим в минус)
                audioRef.current.currentTime = Math.max(0, parseFloat(savedTime) - 5);
            } else {
                // Если трек новый, начинаем с 0
                audioRef.current.currentTime = 0;
            }
        }
    }, [track?.id]); // Срабатывает только когда меняется ID трека

    // --- ЭФФЕКТ 2: Play / Pause ---
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play().catch(e => console.log("Play error:", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, track]);

    // --- ФУНКЦИЯ: Вызывается 4 раза в секунду, пока играет трек ---
    const handleTimeUpdate = () => {
        if (audioRef.current && track) {
            const current = audioRef.current.currentTime;
            const duration = audioRef.current.duration;

            if (duration > 0) {
                // 1. Двигаем полоску
                setProgress((current / duration) * 100);

                // 2. Сохраняем текущую секунду в память браузера
                localStorage.setItem(`teledigest_time_${track.id}`, current.toString());

                // 3. Проверяем: осталось ли меньше 10 секунд?
                // И проверяем, что статус еще не 'played', чтобы не спамить обновление
                if (duration - current <= 10 && track.status !== 'played') {
                    onMarkAsPlayed();
                }
            }
        }
    };

    // --- ФУНКЦИЯ: Перемотка (когда тянем ползунок) ---
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newProgress = Number(e.target.value);
        if (audioRef.current && audioRef.current.duration) {
            // Вычисляем новую секунду и прыгаем туда
            audioRef.current.currentTime = (audioRef.current.duration / 100) * newProgress;
            setProgress(newProgress);
        }
    };

    if (!track) return null;

    return (
        <div className="fixed bottom-[65px] left-0 right-0 z-50 mx-auto w-full max-w-md bg-white/90 border-t border-zinc-200 px-4 py-3 shadow-lg backdrop-blur-md dark:bg-zinc-900/90 dark:border-zinc-800">

            <audio
                ref={audioRef}
                src={track.file_url}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                    setProgress(0);
                    onPlayPause();
                    // Очищаем память, чтобы в следующий раз трек начался сначала
                    localStorage.removeItem(`teledigest_time_${track.id}`);
                }}
            />

            {/* ИНТЕРАКТИВНЫЙ ПРОГРЕСС-БАР */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-200 dark:bg-zinc-700">
                <div
                    className="h-full bg-blue-500 transition-all duration-75 ease-linear pointer-events-none"
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

            <div className="flex items-center justify-between mt-1">
                <div className="flex flex-col overflow-hidden">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {track.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {track.channel_name}
                    </p>
                </div>

                <div className="flex items-center space-x-3 ml-4 shrink-0">
                    <button
                        onClick={onPlayPause}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>

                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}