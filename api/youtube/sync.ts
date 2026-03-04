import type { VercelRequest, VercelResponse } from '@vercel/node';

const YOUTUBE_API_KEY = process.env['YOUTUBE_API_KEY'];
const PLAYLIST_ID_REGEX = /^PL[a-zA-Z0-9_-]{16,}$/;

interface PlaylistItemSnippet {
    publishedAt: string;
    resourceId: { videoId: string };
    title: string;
}

interface PlaylistSyncResponse {
    items: { snippet: PlaylistItemSnippet }[];
    etag: string;
    nextPageToken?: string;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse,
): Promise<void> {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const playlistId = req.query['id'];
    const sinceParam = req.query['since']; // ISO timestamp of last sync

    if (typeof playlistId !== 'string' || !PLAYLIST_ID_REGEX.test(playlistId)) {
        res.status(400).json({ error: 'Invalid playlist ID format' });
        return;
    }

    if (!YOUTUBE_API_KEY) {
        res.status(500).json({ error: 'YouTube API key not configured' });
        return;
    }

    try {
        const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('playlistId', playlistId);
        url.searchParams.set('maxResults', '10');
        url.searchParams.set('key', YOUTUBE_API_KEY);

        const response = await fetch(url.toString());

        if (response.status === 403) {
            res.status(429).json({ error: 'YouTube API quota exceeded' });
            return;
        }

        if (!response.ok) {
            res.status(response.status).json({ error: 'YouTube API error' });
            return;
        }

        const data = (await response.json()) as PlaylistSyncResponse;
        const since = typeof sinceParam === 'string' ? sinceParam : null;

        const newItems = since
            ? data.items.filter((item) => item.snippet.publishedAt > since)
            : data.items;

        res.status(200).json({
            etag: data.etag,
            hasNewItems: newItems.length > 0,
            newVideos: newItems.map((item) => ({
                videoId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                publishedAt: item.snippet.publishedAt,
            })),
        });
    } catch {
        res.status(500).json({ error: 'Failed to sync playlist' });
    }
}
