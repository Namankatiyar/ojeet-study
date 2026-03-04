import { db, type Video, type Playlist } from '../db/db';

// ─── URL Parsing ─────────────────────────────────────────────────────

const YOUTUBE_URL_PATTERNS: { regex: RegExp; type: 'video' | 'playlist' }[] = [
    { regex: /(?:youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/, type: 'video' },
    { regex: /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/, type: 'video' },
    { regex: /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, type: 'video' },
    { regex: /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/, type: 'video' },
    { regex: /youtube\.com\/.*[?&]list=(PL[a-zA-Z0-9_-]{16,})/, type: 'playlist' },
];

export interface ParsedYouTubeUrl {
    type: 'video' | 'playlist';
    id: string;
}

export function parseYouTubeUrl(url: string): ParsedYouTubeUrl | null {
    for (const { regex, type } of YOUTUBE_URL_PATTERNS) {
        const match = regex.exec(url);
        if (match?.[1]) {
            return { type, id: match[1] };
        }
    }
    // Check if it's a bare video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
        return { type: 'video', id: url.trim() };
    }
    return null;
}

// ─── API Client ──────────────────────────────────────────────────────

interface VideoResponse {
    id: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    durationSeconds: number;
}

interface PlaylistResponse {
    id: string;
    title: string;
    channelName: string;
    videos: {
        videoId: string;
        title: string;
        channelName: string;
        thumbnailUrl: string;
    }[];
}

interface SyncResponse {
    etag: string;
    hasNewItems: boolean;
    newVideos: {
        videoId: string;
        title: string;
        publishedAt: string;
    }[];
}

export async function fetchVideoMetadata(videoId: string): Promise<VideoResponse> {
    // Check cache first
    const cached = await db.videos.get(videoId);
    if (cached) {
        return {
            id: cached.id,
            title: cached.title,
            channelName: cached.channelName,
            thumbnailUrl: cached.thumbnailUrl,
            durationSeconds: cached.durationSeconds,
        };
    }

    const res = await fetch(`/api/youtube/video?id=${encodeURIComponent(videoId)}`);
    if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error);
    }
    return (await res.json()) as VideoResponse;
}

export async function fetchPlaylistData(playlistId: string): Promise<PlaylistResponse> {
    const res = await fetch(`/api/youtube/playlist?id=${encodeURIComponent(playlistId)}`);
    if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error);
    }
    return (await res.json()) as PlaylistResponse;
}

export async function checkPlaylistSync(
    playlistId: string,
    since: string,
): Promise<SyncResponse> {
    const res = await fetch(
        `/api/youtube/sync?id=${encodeURIComponent(playlistId)}&since=${encodeURIComponent(since)}`,
    );
    if (!res.ok) {
        const err = (await res.json()) as { error: string };
        throw new Error(err.error);
    }
    return (await res.json()) as SyncResponse;
}

// ─── High-Level Operations ───────────────────────────────────────────

export async function addVideoByUrl(url: string): Promise<Video> {
    const parsed = parseYouTubeUrl(url);
    if (!parsed || parsed.type !== 'video') {
        throw new Error('Invalid YouTube video URL');
    }

    const metadata = await fetchVideoMetadata(parsed.id);
    const existingVideos = await db.videos.orderBy('sortOrder').reverse().first();
    const nextSort = (existingVideos?.sortOrder ?? 0) + 1;

    const video: Video = {
        id: metadata.id,
        title: metadata.title,
        channelName: metadata.channelName,
        thumbnailUrl: metadata.thumbnailUrl,
        durationSeconds: metadata.durationSeconds,
        addedAt: new Date().toISOString(),
        sourceType: 'manual',
        playlistId: null,
        sortOrder: nextSort,
    };

    await db.videos.put(video);
    return video;
}

export async function importPlaylist(url: string): Promise<Playlist> {
    const parsed = parseYouTubeUrl(url);
    if (!parsed || parsed.type !== 'playlist') {
        throw new Error('Invalid YouTube playlist URL');
    }

    const data = await fetchPlaylistData(parsed.id);

    // Get sortOrder for playlist (global ordering alongside standalone videos)
    const lastVideo = await db.videos.orderBy('sortOrder').reverse().first();
    const lastPlaylist = await db.playlists.orderBy('sortOrder').reverse().first();
    const maxSort = Math.max(lastVideo?.sortOrder ?? 0, lastPlaylist?.sortOrder ?? 0);
    let nextSort = maxSort + 1;

    const thumbnail = data.videos[0]?.thumbnailUrl ?? '';

    const playlist: Playlist = {
        id: data.id,
        title: data.title,
        channelName: data.channelName,
        thumbnailUrl: thumbnail,
        lastSyncedAt: new Date().toISOString(),
        autoSync: false,
        syncIntervalMinutes: 60,
        sortOrder: nextSort++,
    };

    await db.playlists.put(playlist);

    for (const v of data.videos) {
        const exists = await db.videos.get(v.videoId);
        if (!exists) {
            await db.videos.put({
                id: v.videoId,
                title: v.title,
                channelName: v.channelName,
                thumbnailUrl: v.thumbnailUrl,
                durationSeconds: 0, // Duration fetched on play
                addedAt: new Date().toISOString(),
                sourceType: 'playlist',
                playlistId: data.id,
                sortOrder: nextSort++,
            });
        }
    }

    return playlist;
}
