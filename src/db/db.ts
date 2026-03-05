import Dexie, { type Table } from 'dexie';

// ─── Type Definitions ────────────────────────────────────────────────

export type VideoTag = 'physics' | 'chemistry' | 'maths' | 'custom' | null;

export interface Video {
    id: string; // YouTube video ID (primary key)
    title: string;
    channelName: string;
    thumbnailUrl: string;
    durationSeconds: number;
    addedAt: string; // ISO timestamp
    sourceType: 'manual' | 'playlist';
    playlistId: string | null;
    sortOrder: number;
    tag: VideoTag;
}

export interface Playlist {
    id: string; // YouTube playlist ID (primary key)
    title: string;
    channelName: string;
    thumbnailUrl: string;
    lastSyncedAt: string; // ISO timestamp
    autoSync: boolean;
    syncIntervalMinutes: number;
    sortOrder: number;
}

export interface StudySession {
    id: string; // uuid
    videoId: string;
    startTime: string; // ISO timestamp
    endTime: string; // ISO timestamp
    focusedDurationSeconds: number;
    playbackRate: number;
}

export type SessionEventType =
    | 'play'
    | 'pause'
    | 'focus_lost'
    | 'focus_gained'
    | 'rate_change';

export interface SessionEvent {
    id?: number; // auto-increment
    sessionId: string;
    eventType: SessionEventType;
    timestamp: string; // ISO timestamp
    playbackRate: number;
}

// ─── Database ────────────────────────────────────────────────────────

class OjeetStudyDB extends Dexie {
    videos!: Table<Video, string>;
    playlists!: Table<Playlist, string>;
    studySessions!: Table<StudySession, string>;
    sessionEvents!: Table<SessionEvent, number>;

    constructor() {
        super('ojeet-study');

        this.version(1).stores({
            videos: 'id, playlistId, sortOrder, addedAt',
            playlists: 'id',
            studySessions: 'id, videoId, startTime',
            sessionEvents: '++id, sessionId, eventType, timestamp',
        });

        this.version(2).stores({
            videos: 'id, playlistId, sortOrder, addedAt',
            playlists: 'id, sortOrder',
            studySessions: 'id, videoId, startTime',
            sessionEvents: '++id, sessionId, eventType, timestamp',
        });

        this.version(3).stores({
            videos: 'id, playlistId, sortOrder, addedAt',
            playlists: 'id, sortOrder',
            studySessions: 'id, videoId, startTime',
            sessionEvents: '++id, sessionId, eventType, timestamp',
        }).upgrade(tx => {
            return tx.table('videos').toCollection().modify(video => {
                if (video.tag === undefined) {
                    video.tag = null;
                }
            });
        });
    }
}

export const db = new OjeetStudyDB();

// ─── Repository Helpers ──────────────────────────────────────────────

export async function addVideo(video: Video): Promise<void> {
    await db.videos.put(video);
}

export async function getVideos(): Promise<Video[]> {
    return db.videos.orderBy('sortOrder').toArray();
}

export async function getVideoById(id: string): Promise<Video | undefined> {
    return db.videos.get(id);
}

export async function updateVideoTag(id: string, tag: VideoTag): Promise<void> {
    await db.videos.update(id, { tag });
}

export async function deleteVideo(id: string): Promise<void> {
    await db.transaction('rw', [db.videos, db.studySessions, db.sessionEvents], async () => {
        const sessions = await db.studySessions.where('videoId').equals(id).toArray();
        const sessionIds = sessions.map((s) => s.id);
        await db.sessionEvents.where('sessionId').anyOf(sessionIds).delete();
        await db.studySessions.where('videoId').equals(id).delete();
        await db.videos.delete(id);
    });
}

export async function updateVideoSortOrders(
    updates: { id: string; sortOrder: number }[],
): Promise<void> {
    await db.transaction('rw', db.videos, async () => {
        for (const { id, sortOrder } of updates) {
            await db.videos.update(id, { sortOrder });
        }
    });
}

export async function updatePlaylistSortOrders(
    updates: { id: string; sortOrder: number }[],
): Promise<void> {
    await db.transaction('rw', db.playlists, async () => {
        for (const { id, sortOrder } of updates) {
            await db.playlists.update(id, { sortOrder });
        }
    });
}

export async function getVideosByPlaylist(playlistId: string): Promise<Video[]> {
    return db.videos.where('playlistId').equals(playlistId).sortBy('sortOrder');
}

export async function addPlaylist(playlist: Playlist): Promise<void> {
    await db.playlists.put(playlist);
}

export async function getPlaylists(): Promise<Playlist[]> {
    return db.playlists.orderBy('sortOrder').toArray();
}

export async function getPlaylistById(id: string): Promise<Playlist | undefined> {
    return db.playlists.get(id);
}

export async function deletePlaylist(id: string): Promise<void> {
    await db.playlists.delete(id);
}

export async function deletePlaylistWithVideos(id: string): Promise<void> {
    await db.transaction('rw', [db.playlists, db.videos, db.studySessions, db.sessionEvents], async () => {
        const videos = await db.videos.where('playlistId').equals(id).toArray();
        for (const v of videos) {
            const sessions = await db.studySessions.where('videoId').equals(v.id).toArray();
            const sessionIds = sessions.map((s) => s.id);
            if (sessionIds.length > 0) {
                await db.sessionEvents.where('sessionId').anyOf(sessionIds).delete();
            }
            await db.studySessions.where('videoId').equals(v.id).delete();
        }
        await db.videos.where('playlistId').equals(id).delete();
        await db.playlists.delete(id);
    });
}

export async function addStudySession(session: StudySession): Promise<void> {
    await db.studySessions.put(session);
}

export async function getStudySessions(): Promise<StudySession[]> {
    return db.studySessions.orderBy('startTime').toArray();
}

export async function getSessionsByVideoId(videoId: string): Promise<StudySession[]> {
    return db.studySessions.where('videoId').equals(videoId).toArray();
}

export async function addSessionEvent(event: SessionEvent): Promise<void> {
    await db.sessionEvents.add(event);
}

export async function addSessionEvents(events: SessionEvent[]): Promise<void> {
    await db.sessionEvents.bulkAdd(events);
}

export async function getSessionEvents(sessionId: string): Promise<SessionEvent[]> {
    return db.sessionEvents.where('sessionId').equals(sessionId).sortBy('timestamp');
}

/** Aggregate study minutes per day for heatmap */
export async function getDailyStudyMinutes(): Promise<{ date: string; totalMinutes: number }[]> {
    const sessions = await db.studySessions.toArray();
    const dayMap = new Map<string, number>();

    for (const session of sessions) {
        const date = session.startTime.slice(0, 10); // YYYY-MM-DD
        const current = dayMap.get(date) ?? 0;
        dayMap.set(date, current + session.focusedDurationSeconds / 60);
    }

    return Array.from(dayMap.entries())
        .map(([date, totalMinutes]) => ({ date, totalMinutes: Math.round(totalMinutes) }))
        .sort((a, b) => a.date.localeCompare(b.date));
}
