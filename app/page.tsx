'use client';

import { useState } from 'react';
import { MOCK_AUDIO_FILES } from '@/lib/mockData';
import AudioCard from '@/components/ui/AudioCard';
import MiniPlayer from '@/components/layout/MiniPlayer';

export default function Home() {
  const [activeTab, setActiveTab] = useState('all');
  const [currentTrack, setCurrentTrack] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // 1. Кладем наши файлы в состояние, чтобы иметь возможность их изменять
  const [files, setFiles] = useState(MOCK_AUDIO_FILES);

  // 2. Фильтруем теперь массив `files`, а не MOCK_AUDIO_FILES
  const filteredFiles = activeTab === 'all'
    ? files
    : files.filter((file) => file.status === activeTab);

  // 3. Функция, которая будет менять статус трека на 'played'
  const handleMarkAsPlayed = (trackId: string) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === trackId ? { ...file, status: 'played' } : file
      )
    );
  };
  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Playlist
      </h1>
      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'new'
              ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          New
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'progress'
              ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          In Progress
        </button>
        <button
          onClick={() => setActiveTab('played')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'played'
              ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          Played
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${
            activeTab === 'all'
              ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          All
        </button>
      </div>
      <ul className="space-y-3 pb-24" role="list">
        {filteredFiles.map((file) => {
          const isActiveTrack = currentTrack?.id === file.id;
          const isThisTrackPlaying = isActiveTrack && isPlaying;

          return (
            <AudioCard
              key={file.id} // Ключ всегда нужен внутри map
              file={file}
              isActiveTrack={isActiveTrack}
              isThisTrackPlaying={isThisTrackPlaying}

              // Передаем логику переключения плеера
              onPlayToggle={() => {
                if (isThisTrackPlaying) {
                  setIsPlaying(false);
                } else {
                  setCurrentTrack(file);
                  setIsPlaying(true);
                }
              }}
              // Передаем логику для меню опций
              onOptionsClick={() => alert(`Опции для: ${file.title}`)}
            />
          );
        })}
      </ul>
      {/* If there are no files in the folder, show a message */}
      {filteredFiles.length === 0 && (
        <p className="text-center text-zinc-500 mt-8">No files in the folder</p>
      )}
      <MiniPlayer
        track={currentTrack}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        onClose={() => {
          setCurrentTrack(null);
          setIsPlaying(false);
        }}
        // Передаем функцию смены статуса в плеер
        onMarkAsPlayed={() => {
          if (currentTrack) handleMarkAsPlayed(currentTrack.id);
        }}
      />
    </div>
  );
}
