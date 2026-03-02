import { Play, Pause, MoreVertical } from 'lucide-react';

// Описываем интерфейс: какие данные (Props) ожидает получить наша карточка от родителя
interface AudioCardProps {
    file: {
        id: string;
        title: string;
        channel_name: string;
        duration: number;
        status: string;
    };
    isActiveTrack: boolean;
    isThisTrackPlaying: boolean;
    onPlayToggle: () => void;
    onOptionsClick: () => void;
}

export default function AudioCard({
    file,
    isActiveTrack,
    isThisTrackPlaying,
    onPlayToggle,
    onOptionsClick,
}: AudioCardProps) {
    return (
        <li
            className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${isActiveTrack
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-500/50 dark:bg-blue-900/20' // Цвета для активного трека
                    : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'         // Обычные цвета
                }`}
        >

            {/* Левая часть: Текст */}
            <div className="flex-1 overflow-hidden pr-4">
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {file.title}
                </p>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                    {file.channel_name} · {Math.floor(file.duration / 60)} min
                </p>
                <span className="mt-1 inline-block text-xs capitalize text-zinc-400 dark:text-zinc-500">
                    {file.status}
                </span>
            </div>

            {/* Правая часть: Кнопки */}
            <div className="flex shrink-0 items-center space-x-2">
                <button
                    onClick={onPlayToggle} // Вызываем функцию, которую нам передал родитель
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                    aria-label="Play or Pause"
                >
                    {isThisTrackPlaying ? (
                        <Pause size={18} fill="currentColor" />
                    ) : (
                        <Play size={18} fill="currentColor" className="ml-0.5" />
                    )}
                </button>

                <div className="h-8 w-[1px] bg-zinc-200 dark:bg-zinc-700"></div>

                <button
                    onClick={onOptionsClick} // Вызываем вторую переданную функцию
                    className="flex h-10 w-8 items-center justify-center text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
                    aria-label="More options"
                >
                    <MoreVertical size={20} />
                </button>
            </div>
        </li>
    );
}