'use client';

import { useState } from "react";
import { MOCK_AUDIO_FILES } from "@/lib/mockData";
import { Play, Pause, MoreVertical } from 'lucide-react';
import MiniPlayer from "@/components/layout/MiniPlayer";
import AudioCard from "@/components/ui/AudioCard";

export default function Home() {
  const [activeTab, setActiveTab] = useState('new');
  const filteredFiles = activeTab === 'all' ? MOCK_AUDIO_FILES : MOCK_AUDIO_FILES.filter((file) => file.status === activeTab);
  const [currentTrack, setCurrentTrack] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
      />
    </div>
  );
}
