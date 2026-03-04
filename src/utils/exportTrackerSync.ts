import { getStudySessions, getVideos } from '../db/db';

export interface OjeetSyncPayload {
    source: "ojeet-study";
    timestamp: string;
    sessions: Array<{
        title: string;
        durationSeconds: number;
        date: string;
    }>;
}

// In local dev, point to the local tracker instance; in production, use the deployed URL.
const TRACKER_IMPORT_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5174/import'
    : 'https://pcm-tracker.vercel.app/import';

export async function performTrackerSync() {
    const [allSessions, allVideos] = await Promise.all([
        getStudySessions(),
        getVideos(),
    ]);

    const lastSyncTime = localStorage.getItem('ojeet_last_sync_time') || '0';

    // Filter sessions strictly newer than the last sync time
    const newSessions = allSessions.filter(s => s.endTime > lastSyncTime);

    if (newSessions.length === 0) {
        return false;
    }

    const videoMap = new Map();
    for (const v of allVideos) videoMap.set(v.id, v.title);

    const syncData = newSessions.map((s) => ({
        title: videoMap.get(s.videoId) || s.videoId,
        durationSeconds: s.focusedDurationSeconds,
        date: s.startTime.slice(0, 10)
    }));

    const payload: OjeetSyncPayload = {
        source: 'ojeet-study',
        timestamp: new Date().toISOString(),
        sessions: syncData,
    };

    const jsonStr = JSON.stringify(payload);

    // Safely encode to Base64 by encoding URI components first so all chars are ASCII.
    // The receiver should decode using decodeURIComponent(atob(payload)).
    const base64Str = btoa(encodeURIComponent(jsonStr));

    const url = `${TRACKER_IMPORT_URL}?payload=${base64Str}`;

    // Record the latest endTime from the synced sessions
    const latestEndTime = newSessions.reduce((max, s) => s.endTime > max ? s.endTime : max, lastSyncTime);
    localStorage.setItem('ojeet_last_sync_time', latestEndTime);

    window.open(url, '_blank');
    return true;
}
