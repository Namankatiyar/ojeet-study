import { getCurrentUser } from './auth';
import { getStudySessions, getVideos } from '../db/db';
import { getSupabaseClient } from './supabaseClient';
import { makeVideoLogKey, mergeVideoLogs } from './videoLogMerge';
import { isValidVideoWatchEntry, type VideoWatchEntry } from './videoLogTypes';

type SyncState = 'idle' | 'queued' | 'syncing' | 'error';

interface SyncStatus {
    state: SyncState;
    queuedCount: number;
    lastSyncedAt: string | null;
    lastError: string | null;
}

export interface FlushResult {
    ok: boolean;
    reason: 'synced' | 'noop' | 'no_user' | 'not_configured' | 'error';
}

const TABLE_NAME = 'user_study_aggregate';
const COLUMN_NAME = 'video_watch_45d_json';
const FLUSH_INTERVAL_MS = 300_000;
const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 300_000;
const HISTORY_WINDOW_DAYS = 45;

const dirtyMap = new Map<string, VideoWatchEntry>();
const listeners = new Set<(status: SyncStatus) => void>();

let status: SyncStatus = {
    state: 'idle',
    queuedCount: 0,
    lastSyncedAt: null,
    lastError: null,
};
let isInitialized = false;
let isFlushing = false;
let flushIntervalId: number | null = null;
let retryTimerId: number | null = null;
let retryDelayMs = RETRY_MIN_MS;

function emitStatus(): void {
    const nextStatus: SyncStatus = {
        ...status,
        queuedCount: dirtyMap.size,
    };
    status = nextStatus;
    for (const listener of listeners) {
        listener(nextStatus);
    }
}

function setState(next: SyncState, error?: string): void {
    status = {
        ...status,
        state: next,
        lastError: error ?? (next === 'error' ? status.lastError : null),
    };
    emitStatus();
}

function schedulePeriodicFlush(): void {
    if (flushIntervalId !== null || dirtyMap.size === 0) return;
    flushIntervalId = window.setInterval(() => {
        void flushVideoLogsNow();
    }, FLUSH_INTERVAL_MS);
}

function clearPeriodicFlush(): void {
    if (flushIntervalId === null) return;
    window.clearInterval(flushIntervalId);
    flushIntervalId = null;
}

function clearRetryTimer(): void {
    if (retryTimerId === null) return;
    window.clearTimeout(retryTimerId);
    retryTimerId = null;
}

function scheduleRetry(): void {
    if (retryTimerId !== null || dirtyMap.size === 0) return;
    retryTimerId = window.setTimeout(() => {
        retryTimerId = null;
        void flushVideoLogsNow();
    }, retryDelayMs);
    retryDelayMs = Math.min(retryDelayMs * 2, RETRY_MAX_MS);
}

function removeFlushedEntries(flushed: VideoWatchEntry[]): void {
    for (const sent of flushed) {
        const key = makeVideoLogKey(sent);
        const current = dirtyMap.get(key);
        if (!current) continue;
        if (current.watched_seconds <= sent.watched_seconds) {
            dirtyMap.delete(key);
        }
    }
}

function normalizeRemoteLogs(raw: unknown): VideoWatchEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((entry): entry is VideoWatchEntry =>
        isValidVideoWatchEntry(entry as Partial<VideoWatchEntry>),
    );
}

function normalizeEntry(entry: VideoWatchEntry): VideoWatchEntry {
    return {
        ...entry,
        watched_seconds: Math.max(0, Math.floor(entry.watched_seconds)),
    };
}

function formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getHistoryCutoffDate(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (HISTORY_WINDOW_DAYS - 1));
    return formatLocalDate(d);
}

export function initializeVideoLogSync(): () => void {
    if (isInitialized) {
        return () => undefined;
    }
    isInitialized = true;

    const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            void flushVideoLogsNow();
        }
    };
    const onBeforeUnload = () => {
        void flushVideoLogsNow();
    };
    const onOnline = () => {
        void flushVideoLogsNow();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('online', onOnline);

    return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('beforeunload', onBeforeUnload);
        window.removeEventListener('online', onOnline);
        clearPeriodicFlush();
        clearRetryTimer();
        isInitialized = false;
    };
}

export function queueVideoWatchEntry(entry: VideoWatchEntry): void {
    if (!isValidVideoWatchEntry(entry)) return;

    const normalized = normalizeEntry(entry);
    const key = makeVideoLogKey(normalized);
    const current = dirtyMap.get(key);
    let changed = false;

    if (!current) {
        dirtyMap.set(key, normalized);
        changed = true;
    } else {
        const merged: VideoWatchEntry = {
            ...current,
            video_name: normalized.video_name || current.video_name,
            subject: normalized.subject,
            watched_seconds: Math.max(current.watched_seconds, normalized.watched_seconds),
        };

        changed =
            merged.video_name !== current.video_name ||
            merged.subject !== current.subject ||
            merged.watched_seconds !== current.watched_seconds;

        if (changed) {
            dirtyMap.set(key, merged);
        }
    }

    if (!changed) return;

    setState('queued');
    schedulePeriodicFlush();
}

export async function queueVideoLogsFromStudyHistory(): Promise<number> {
    const [sessions, videos] = await Promise.all([getStudySessions(), getVideos()]);
    const cutoff = getHistoryCutoffDate();

    const videoMap = new Map(videos.map((video) => [video.id, video] as const));
    const aggregate = new Map<string, VideoWatchEntry>();

    for (const session of sessions) {
        const watchedDate = session.startTime.slice(0, 10);
        if (watchedDate < cutoff) continue;

        const video = videoMap.get(session.videoId);
        if (!video || !video.tag) continue;
        if (video.tag !== 'physics' && video.tag !== 'chemistry' && video.tag !== 'maths') continue;

        const key = `${session.videoId}::${watchedDate}`;
        const current = aggregate.get(key);
        if (!current) {
            aggregate.set(key, {
                video_id: session.videoId,
                video_name: video.title,
                subject: video.tag,
                watched_seconds: Math.max(0, Math.floor(session.focusedDurationSeconds)),
                watched_date: watchedDate,
            });
            continue;
        }

        current.watched_seconds = Math.max(
            0,
            Math.floor(current.watched_seconds + session.focusedDurationSeconds),
        );
        current.video_name = video.title || current.video_name;
    }

    for (const entry of aggregate.values()) {
        queueVideoWatchEntry(entry);
    }

    return aggregate.size;
}

export function getVideoLogSyncStatus(): SyncStatus {
    return {
        ...status,
        queuedCount: dirtyMap.size,
    };
}

export function subscribeVideoLogSyncStatus(listener: (status: SyncStatus) => void): () => void {
    listeners.add(listener);
    listener(getVideoLogSyncStatus());
    return () => {
        listeners.delete(listener);
    };
}

export async function flushVideoLogsNow(): Promise<FlushResult> {
    if (isFlushing) {
        return { ok: false, reason: 'error' };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
        return { ok: false, reason: 'not_configured' };
    }

    if (dirtyMap.size === 0) {
        setState('idle');
        clearPeriodicFlush();
        clearRetryTimer();
        return { ok: true, reason: 'noop' };
    }

    const user = await getCurrentUser();
    if (!user) {
        setState('queued');
        schedulePeriodicFlush();
        return { ok: false, reason: 'no_user' };
    }

    isFlushing = true;
    setState('syncing');

    const pendingEntries = Array.from(dirtyMap.values());

    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(COLUMN_NAME)
            .eq('user_id', user.id)
            .maybeSingle<{ video_watch_45d_json: unknown }>();

        if (error) throw error;

        const existingLogs = normalizeRemoteLogs(data?.video_watch_45d_json);
        const mergedLogs = mergeVideoLogs(existingLogs, pendingEntries);

        if (data) {
            const { error: updateError } = await supabase
                .from(TABLE_NAME)
                .update({ [COLUMN_NAME]: mergedLogs })
                .eq('user_id', user.id);
            if (updateError) throw updateError;
        } else {
            const { error: insertError } = await supabase
                .from(TABLE_NAME)
                .insert({
                    user_id: user.id,
                    [COLUMN_NAME]: mergedLogs,
                });
            if (insertError) throw insertError;
        }

        removeFlushedEntries(pendingEntries);

        status = {
            ...status,
            state: dirtyMap.size > 0 ? 'queued' : 'idle',
            lastSyncedAt: new Date().toISOString(),
            lastError: null,
        };
        emitStatus();

        clearRetryTimer();
        retryDelayMs = RETRY_MIN_MS;

        if (dirtyMap.size === 0) {
            clearPeriodicFlush();
        } else {
            schedulePeriodicFlush();
        }

        return { ok: true, reason: 'synced' };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown sync error';
        setState('error', message);
        schedulePeriodicFlush();
        scheduleRetry();
        return { ok: false, reason: 'error' };
    } finally {
        isFlushing = false;
    }
}
