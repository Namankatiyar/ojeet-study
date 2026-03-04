import type { VercelRequest, VercelResponse } from '@vercel/node';

const YOUTUBE_API_KEY = process.env['YOUTUBE_API_KEY'];
const PLAYLIST_ID_REGEX = /^PL[a-zA-Z0-9_-]{16,}$/;

interface PlaylistItemSnippet {
    title: string;
    channelTitle: string;
    thumbnails: {
        medium: { url: string };
    };
    resourceId: {
        videoId: string;
    };
}

interface PlaylistItem {
    snippet: PlaylistItemSnippet;
}

interface PlaylistItemsResponse {
    items: PlaylistItem[];
    nextPageToken?: string;
    pageInfo: { totalResults: number };
}

interface PlaylistSnippet {
    title: string;
    channelTitle: string;
}

interface PlaylistListItem {
    id: string;
    snippet: PlaylistSnippet;
}

interface PlaylistListResponse {
    items: PlaylistListItem[];
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
    if (typeof playlistId !== 'string' || !PLAYLIST_ID_REGEX.test(playlistId)) {
        res.status(400).json({ error: 'Invalid playlist ID format' });
        return;
    }

    if (!YOUTUBE_API_KEY) {
        res.status(500).json({ error: 'YouTube API key not configured' });
        return;
    }

    try {
        // Fetch playlist metadata
        const metaUrl = new URL('https://www.googleapis.com/youtube/v3/playlists');
        metaUrl.searchParams.set('part', 'snippet');
        metaUrl.searchParams.set('id', playlistId);
        metaUrl.searchParams.set('key', YOUTUBE_API_KEY);

        const metaRes = await fetch(metaUrl.toString());
        if (!metaRes.ok) {
            res.status(metaRes.status).json({ error: 'YouTube API error' });
            return;
        }

        const metaData = (await metaRes.json()) as PlaylistListResponse;
        const playlistMeta = metaData.items[0];

        if (!playlistMeta) {
            res.status(404).json({ error: 'Playlist not found' });
            return;
        }

        // Fetch all playlist items with pagination
        const videos: {
            videoId: string;
            title: string;
            channelName: string;
            thumbnailUrl: string;
        }[] = [];

        let pageToken: string | undefined;

        do {
            const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
            url.searchParams.set('part', 'snippet');
            url.searchParams.set('playlistId', playlistId);
            url.searchParams.set('maxResults', '50');
            url.searchParams.set('key', YOUTUBE_API_KEY);
            if (pageToken) url.searchParams.set('pageToken', pageToken);

            const response = await fetch(url.toString());

            if (response.status === 403) {
                res.status(429).json({ error: 'YouTube API quota exceeded' });
                return;
            }

            if (!response.ok) {
                res.status(response.status).json({ error: 'YouTube API error' });
                return;
            }

            const data = (await response.json()) as PlaylistItemsResponse;

            for (const item of data.items) {
                videos.push({
                    videoId: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    channelName: item.snippet.channelTitle,
                    thumbnailUrl: item.snippet.thumbnails.medium.url,
                });
            }

            pageToken = data.nextPageToken;
        } while (pageToken);

        res.status(200).json({
            id: playlistMeta.id,
            title: playlistMeta.snippet.title,
            channelName: playlistMeta.snippet.channelTitle,
            videos,
        });
    } catch {
        res.status(500).json({ error: 'Failed to fetch playlist data' });
    }
}
