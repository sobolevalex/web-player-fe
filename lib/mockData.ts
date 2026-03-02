import type { AudioFile } from "@/types";

/**
 * Sample audio files for development and layout verification.
 * Represents a TeleDigest playlist with mixed statuses.
 */
export const MOCK_AUDIO_FILES: AudioFile[] = [
  {
    id: "1",
    title: "Weekly tech roundup: AI and open source",
    channel_name: "Tech Digest",
    duration: 1245,
    file_url: "/audio/sample-1.mp3",
    status: "new",
  },
  {
    id: "2",
    title: "Morning briefing — March 1",
    channel_name: "Daily Digest",
    duration: 892,
    file_url: "/audio/sample-2.mp3",
    status: "progress",
  },
  {
    id: "3",
    title: "Deep dive: React Server Components",
    channel_name: "Frontend Weekly",
    duration: 2103,
    file_url: "https://example.com/audio/episode-42.mp3",
    status: "played",
  },
  {
    id: "4",
    title: "News in 5 minutes",
    channel_name: "Quick News",
    duration: 312,
    file_url: "/audio/sample-4.mp3",
    status: "new",
  },
  {
    id: "5",
    title: "Productivity tips and tools",
    channel_name: "Productivity Channel",
    duration: 1567,
    file_url: "/audio/sample-5.mp3",
    status: "played",
  },
];
