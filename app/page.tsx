'use client';

import { useState } from "react";
import { MOCK_AUDIO_FILES } from "@/lib/mockData";

export default function Home() {
  const [activeTab, setActiveTab] = useState('new');
  const filteredFiles = activeTab === 'all' ? MOCK_AUDIO_FILES : MOCK_AUDIO_FILES.filter((file) => file.status === activeTab);
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
      <ul className="space-y-3" role="list">
        {filteredFiles.map((file) => (
          <li
            key={file.id}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="font-medium text-zinc-900 dark:text-zinc-50">
              {file.title}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {file.channel_name} · {Math.floor(file.duration / 60)} min
            </p>
            <span
              className="mt-1 inline-block text-xs capitalize text-zinc-400 dark:text-zinc-500"
              aria-label={`Status: ${file.status}`}
            >
              {file.status}
            </span>
          </li>
        ))}
      </ul>
      {/* If there are no files in the folder, show a message */}
      {filteredFiles.length === 0 && (
        <p className="text-center text-zinc-500 mt-8">No files in the folder</p>
      )}
    </div>
  );
}
