import { MOCK_AUDIO_FILES } from "@/lib/mockData";

export default function Home() {
  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Playlist
      </h1>
      <ul className="space-y-3" role="list">
        {MOCK_AUDIO_FILES.map((file) => (
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
    </div>
  );
}
