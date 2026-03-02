'use client';

import { useRef, useEffect } from 'react';
import { Play, Pause, X } from 'lucide-react';

// Это TypeScript-интерфейс. Мы говорим компоненту: "Ты ожидаешь получить такие данные о треке"
interface MiniPlayerProps {
    track: {
        id: string;
        title: string;
        channel_name: string;
        file_url?: string; // Убедись, что это поле есть
    } | null;
    isPlaying: boolean;
    onPlayPause: () => void;
    onClose: () => void;
}

export default function MiniPlayer({ track, isPlaying, onPlayPause, onClose }: MiniPlayerProps) {
    // 2. Создаем "указатель" на скрытый HTML-элемент <audio>
    const audioRef = useRef<HTMLAudioElement>(null);

    // 3. useEffect следит за переменной isPlaying.
    // Как только она меняется, мы дергаем стандартные методы браузера play() или pause()
    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                // браузеры иногда блокируют автоплей, поэтому play() возвращает Promise.
                // Добавляем .catch(), чтобы избежать ошибок в консоли.
                audioRef.current.play().catch(e => console.log("Audio play error:", e));
            } else {
                audioRef.current.pause();
            }
        }
    }, [isPlaying, track]); // Эффект срабатывает при смене статуса паузы ИЛИ при смене трека

    if (!track) return null;

    return (
        <div className="fixed bottom-[84px] left-0 right-0 z-50 mx-auto w-full max-w-md bg-white/90 border-t border-zinc-200 px-4 py-3 shadow-lg backdrop-blur-md dark:bg-zinc-900/90 dark:border-zinc-800">

            {/* 4. Невидимый HTML5 аудио элемент. Именно он издает звук! */}
            <audio ref={audioRef} src={track.file_url} />

            {/* Полоска прогресса (пока статичная) */}
            <div className="absolute top-0 left-0 h-[2px] w-1/3 bg-blue-500"></div>

            <div className="flex items-center justify-between">
                {/* ... левая часть с текстом (без изменений) ... */}
                <div className="flex flex-col overflow-hidden">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {track.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {track.channel_name}
                    </p>
                </div>

                {/* ... правая часть с кнопками (без изменений) ... */}
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