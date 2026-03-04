import { db, type StudySession, type Video } from '../db/db';
import { today } from './date';

export async function exportSessionsToCSV(): Promise<void> {
    const sessions = await db.studySessions.orderBy('startTime').toArray();
    const videos = await db.videos.toArray();
    const videoMap = new Map<string, Video>();
    for (const v of videos) {
        videoMap.set(v.id, v);
    }

    const headers = [
        'date',
        'videoId',
        'videoTitle',
        'channelName',
        'startTime',
        'endTime',
        'focusedMinutes',
        'playbackRate',
    ];

    const rows = sessions.map((s: StudySession) => {
        const video = videoMap.get(s.videoId);
        return [
            s.startTime.slice(0, 10),
            s.videoId,
            video?.title ?? '',
            video?.channelName ?? '',
            s.startTime,
            s.endTime,
            (s.focusedDurationSeconds / 60).toFixed(1),
            s.playbackRate.toString(),
        ];
    });

    const csvContent = [headers, ...rows]
        .map((row) => row.map(escapeCSV).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `focustube-sessions-${today()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}

/** Escape a CSV field per RFC 4180 */
function escapeCSV(field: string): string {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
}
