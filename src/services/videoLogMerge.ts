import type { VideoWatchEntry } from './videoLogTypes';

function keyOf(entry: Pick<VideoWatchEntry, 'video_id' | 'watched_date'>): string {
    return `${entry.video_id}::${entry.watched_date}`;
}

function normalize(entry: VideoWatchEntry): VideoWatchEntry {
    return {
        ...entry,
        watched_seconds: Math.max(0, Math.floor(entry.watched_seconds)),
    };
}

export function mergeVideoLogs(base: VideoWatchEntry[], incoming: VideoWatchEntry[]): VideoWatchEntry[] {
    const map = new Map<string, VideoWatchEntry>();

    for (const entry of base) {
        map.set(keyOf(entry), normalize(entry));
    }

    for (const entry of incoming) {
        const next = normalize(entry);
        const key = keyOf(next);
        const previous = map.get(key);
        if (!previous) {
            map.set(key, next);
            continue;
        }

        map.set(key, {
            ...previous,
            video_name: next.video_name || previous.video_name,
            subject: next.subject || previous.subject,
            watched_seconds: Math.max(previous.watched_seconds, next.watched_seconds),
        });
    }

    return Array.from(map.values()).sort((a, b) => {
        if (a.watched_date === b.watched_date) {
            return a.video_id.localeCompare(b.video_id);
        }
        return a.watched_date.localeCompare(b.watched_date);
    });
}

export function makeVideoLogKey(entry: Pick<VideoWatchEntry, 'video_id' | 'watched_date'>): string {
    return keyOf(entry);
}
