export type SubjectTag = 'physics' | 'chemistry' | 'maths';

export interface VideoWatchEntry {
    video_id: string;
    video_name: string;
    subject: SubjectTag;
    watched_seconds: number;
    watched_date: string; // YYYY-MM-DD
}

export function isSubjectTag(value: string | null | undefined): value is SubjectTag {
    return value === 'physics' || value === 'chemistry' || value === 'maths';
}

export function isValidVideoWatchEntry(entry: Partial<VideoWatchEntry>): entry is VideoWatchEntry {
    return (
        typeof entry.video_id === 'string' &&
        entry.video_id.length > 0 &&
        typeof entry.video_name === 'string' &&
        entry.video_name.length > 0 &&
        isSubjectTag(entry.subject) &&
        typeof entry.watched_seconds === 'number' &&
        Number.isFinite(entry.watched_seconds) &&
        entry.watched_seconds >= 0 &&
        typeof entry.watched_date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(entry.watched_date)
    );
}
