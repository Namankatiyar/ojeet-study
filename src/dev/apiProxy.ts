/**
 * Vite dev server plugin that proxies /api/youtube/* requests locally.
 * In production, Vercel Serverless Functions handle these routes.
 * During dev, this plugin reads YOUTUBE_API_KEY from .env.local
 * and makes the YouTube API calls directly.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Plugin } from 'vite';

function loadEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    try {
        const content = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex === -1) continue;
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            env[key] = value;
        }
    } catch {
        // .env.local may not exist
    }
    return env;
}

function parseDuration(iso: string): number {
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
    if (!match) return 0;
    const hours = parseInt(match[1] ?? '0', 10);
    const minutes = parseInt(match[2] ?? '0', 10);
    const seconds = parseInt(match[3] ?? '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
}

export function apiDevPlugin(): Plugin {
    let apiKey = '';

    return {
        name: 'api-dev-proxy',
        configureServer(server) {
            const env = loadEnv();
            apiKey = env['YOUTUBE_API_KEY'] ?? '';

            server.middlewares.use(async (req, res, next) => {
                const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`);

                if (!url.pathname.startsWith('/api/youtube/')) {
                    next();
                    return;
                }

                res.setHeader('Content-Type', 'application/json');

                if (!apiKey) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'YOUTUBE_API_KEY not set in .env.local' }));
                    return;
                }

                try {
                    if (url.pathname === '/api/youtube/video') {
                        await handleVideo(url, res, apiKey);
                    } else if (url.pathname === '/api/youtube/playlist') {
                        await handlePlaylist(url, res, apiKey);
                    } else if (url.pathname === '/api/youtube/sync') {
                        await handleSync(url, res, apiKey);
                    } else {
                        res.statusCode = 404;
                        res.end(JSON.stringify({ error: 'Not found' }));
                    }
                } catch (err) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: String(err) }));
                }
            });
        },
    };
}

async function handleVideo(
    url: URL,
    res: import('http').ServerResponse,
    apiKey: string,
): Promise<void> {
    const videoId = url.searchParams.get('id');
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid video ID format' }));
        return;
    }

    const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    apiUrl.searchParams.set('part', 'snippet,contentDetails');
    apiUrl.searchParams.set('id', videoId);
    apiUrl.searchParams.set('key', apiKey);

    const response = await fetch(apiUrl.toString());

    if (response.status === 403) {
        res.statusCode = 429;
        res.end(JSON.stringify({ error: 'YouTube API quota exceeded' }));
        return;
    }

    if (!response.ok) {
        res.statusCode = response.status;
        res.end(JSON.stringify({ error: 'YouTube API error' }));
        return;
    }

    const data = await response.json() as {
        items: {
            id: string;
            snippet: { title: string; channelTitle: string; thumbnails: { medium: { url: string } } };
            contentDetails: { duration: string };
        }[];
    };

    const item = data.items[0];
    if (!item) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Video not found' }));
        return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({
        id: item.id,
        title: item.snippet.title,
        channelName: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.medium.url,
        durationSeconds: parseDuration(item.contentDetails.duration),
    }));
}

async function handlePlaylist(
    url: URL,
    res: import('http').ServerResponse,
    apiKey: string,
): Promise<void> {
    const playlistId = url.searchParams.get('id');
    if (!playlistId || !/^PL[a-zA-Z0-9_-]{16,}$/.test(playlistId)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid playlist ID format' }));
        return;
    }

    // Fetch playlist meta
    const metaUrl = new URL('https://www.googleapis.com/youtube/v3/playlists');
    metaUrl.searchParams.set('part', 'snippet');
    metaUrl.searchParams.set('id', playlistId);
    metaUrl.searchParams.set('key', apiKey);

    const metaRes = await fetch(metaUrl.toString());
    if (!metaRes.ok) {
        res.statusCode = metaRes.status;
        res.end(JSON.stringify({ error: 'YouTube API error' }));
        return;
    }

    const metaData = await metaRes.json() as {
        items: { id: string; snippet: { title: string; channelTitle: string } }[];
    };

    const playlistMeta = metaData.items[0];
    if (!playlistMeta) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Playlist not found' }));
        return;
    }

    // Fetch all items
    const videos: { videoId: string; title: string; channelName: string; thumbnailUrl: string }[] = [];
    let pageToken: string | undefined;

    do {
        const itemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        itemsUrl.searchParams.set('part', 'snippet');
        itemsUrl.searchParams.set('playlistId', playlistId);
        itemsUrl.searchParams.set('maxResults', '50');
        itemsUrl.searchParams.set('key', apiKey);
        if (pageToken) itemsUrl.searchParams.set('pageToken', pageToken);

        const itemsRes = await fetch(itemsUrl.toString());
        if (!itemsRes.ok) break;

        const itemsData = await itemsRes.json() as {
            items: { snippet: { title: string; channelTitle: string; thumbnails: { medium: { url: string } }; resourceId: { videoId: string } } }[];
            nextPageToken?: string;
        };

        for (const item of itemsData.items) {
            videos.push({
                videoId: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                channelName: item.snippet.channelTitle,
                thumbnailUrl: item.snippet.thumbnails.medium.url,
            });
        }
        pageToken = itemsData.nextPageToken;
    } while (pageToken);

    res.statusCode = 200;
    res.end(JSON.stringify({
        id: playlistMeta.id,
        title: playlistMeta.snippet.title,
        channelName: playlistMeta.snippet.channelTitle,
        videos,
    }));
}

async function handleSync(
    url: URL,
    res: import('http').ServerResponse,
    apiKey: string,
): Promise<void> {
    const playlistId = url.searchParams.get('id');
    const since = url.searchParams.get('since');

    if (!playlistId || !/^PL[a-zA-Z0-9_-]{16,}$/.test(playlistId)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Invalid playlist ID format' }));
        return;
    }

    const apiUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    apiUrl.searchParams.set('part', 'snippet');
    apiUrl.searchParams.set('playlistId', playlistId);
    apiUrl.searchParams.set('maxResults', '10');
    apiUrl.searchParams.set('key', apiKey);

    const response = await fetch(apiUrl.toString());
    if (!response.ok) {
        res.statusCode = response.status;
        res.end(JSON.stringify({ error: 'YouTube API error' }));
        return;
    }

    const data = await response.json() as {
        items: { snippet: { publishedAt: string; resourceId: { videoId: string }; title: string } }[];
        etag: string;
    };

    const newItems = since
        ? data.items.filter((item) => item.snippet.publishedAt > since)
        : data.items;

    res.statusCode = 200;
    res.end(JSON.stringify({
        etag: data.etag,
        hasNewItems: newItems.length > 0,
        newVideos: newItems.map((item) => ({
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
        })),
    }));
}
