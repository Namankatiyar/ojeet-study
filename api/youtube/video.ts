import type { VercelRequest, VercelResponse } from '@vercel/node';

const YOUTUBE_API_KEY = process.env['YOUTUBE_API_KEY'];
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

interface YouTubeVideoSnippet {
    title: string;
    channelTitle: string;
    thumbnails: {
        medium: { url: string };
    };
}

interface YouTubeVideoContentDetails {
    duration: string; // ISO 8601
}

interface YouTubeVideoItem {
    id: string;
    snippet: YouTubeVideoSnippet;
    contentDetails: YouTubeVideoContentDetails;
}

interface YouTubeVideoListResponse {
    items: YouTubeVideoItem[];
}

function parseDuration(iso: string): number {
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
    if (!match) return 0;
    const hours = parseInt(match[1] ?? '0', 10);
    const minutes = parseInt(match[2] ?? '0', 10);
    const seconds = parseInt(match[3] ?? '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
): Promise<void> {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const videoId = req.query['id'];
    if (typeof videoId !== 'string' || !VIDEO_ID_REGEX.test(videoId)) {
        res.status(400).json({ error: 'Invalid video ID format' });
        return;
    }

    if (!YOUTUBE_API_KEY) {
        res.status(500).json({ error: 'YouTube API key not configured' });
        return;
    }

    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'snippet,contentDetails');
        url.searchParams.set('id', videoId);
        url.searchParams.set('key', YOUTUBE_API_KEY);

        const response = await fetch(url.toString());

        if (response.status === 403) {
            res.status(429).json({ error: 'YouTube API quota exceeded. Try again later.' });
            return;
        }

        if (!response.ok) {
            res.status(response.status).json({ error: 'YouTube API error' });
            return;
        }

        const data = (await response.json()) as YouTubeVideoListResponse;
        const item = data.items[0];

        if (!item) {
            res.status(404).json({ error: 'Video not found' });
            return;
        }

        res.status(200).json({
            id: item.id,
            title: item.snippet.title,
            channelName: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.medium.url,
            durationSeconds: parseDuration(item.contentDetails.duration),
        });
    } catch {
        res.status(500).json({ error: 'Failed to fetch video data' });
    }
}
