import { useState, useEffect, useCallback, useRef } from 'react';
import { parseYouTubeUrl, fetchVideoMetadata, fetchPlaylistData } from '../services/youtube';
import { db } from '../db/db';

export interface ClipboardVideoData {
    type: 'video';
    id: string;
    url: string;
    title: string;
    channelName: string;
    thumbnailUrl: string;
    durationSeconds: number;
}

export interface ClipboardPlaylistData {
    type: 'playlist';
    id: string;
    url: string;
    title: string;
    channelName: string;
    thumbnailUrl: string | null;
    videoCount: number;
}

export type ClipboardYouTubeData = ClipboardVideoData | ClipboardPlaylistData;

interface UseClipboardYouTubeDetectionReturn {
    detectedContent: ClipboardYouTubeData | null;
    isLoading: boolean;
    error: string | null;
    dismiss: () => void;
    clearError: () => void;
}

export function useClipboardYouTubeDetection(): UseClipboardYouTubeDetectionReturn {
    const [detectedContent, setDetectedContent] = useState<ClipboardYouTubeData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Track URLs we've already processed or dismissed
    const processedUrls = useRef<Set<string>>(new Set());
    // Track if we're currently fetching/showing content
    const isBusy = useRef(false);
    // Last successfully read clipboard text
    const lastClipboardText = useRef<string>('');

    const checkClipboard = useCallback(async () => {
        // Don't check if busy (fetching or showing dialog)
        if (isBusy.current) {
            return;
        }

        // Check if clipboard API is available
        if (!navigator.clipboard?.readText) {
            return;
        }

        let clipboardText: string;
        try {
            clipboardText = (await navigator.clipboard.readText()).trim();
        } catch {
            // Clipboard read failed (permission denied, etc.)
            return;
        }

        // Skip if empty, same as last check, or already processed
        if (!clipboardText) {
            return;
        }
        
        if (clipboardText === lastClipboardText.current) {
            return;
        }
        
        // Update last clipboard text
        lastClipboardText.current = clipboardText;
        
        if (processedUrls.current.has(clipboardText)) {
            return;
        }

        // Try to parse as YouTube URL
        const parsed = parseYouTubeUrl(clipboardText);
        if (!parsed) {
            return;
        }

        // Check if already in library
        try {
            if (parsed.type === 'video') {
                const existing = await db.videos.get(parsed.id);
                if (existing) {
                    processedUrls.current.add(clipboardText);
                    return;
                }
            } else {
                const existing = await db.playlists.get(parsed.id);
                if (existing) {
                    processedUrls.current.add(clipboardText);
                    return;
                }
            }
        } catch {
            return;
        }

        // Start fetching metadata
        isBusy.current = true;
        setIsLoading(true);
        setError(null);

        try {
            if (parsed.type === 'video') {
                const metadata = await fetchVideoMetadata(parsed.id);
                setDetectedContent({
                    type: 'video',
                    id: metadata.id,
                    url: clipboardText,
                    title: metadata.title,
                    channelName: metadata.channelName,
                    thumbnailUrl: metadata.thumbnailUrl,
                    durationSeconds: metadata.durationSeconds,
                });
            } else {
                const playlistData = await fetchPlaylistData(parsed.id);
                setDetectedContent({
                    type: 'playlist',
                    id: playlistData.id,
                    url: clipboardText,
                    title: playlistData.title,
                    channelName: playlistData.channelName,
                    thumbnailUrl: playlistData.videos[0]?.thumbnailUrl ?? null,
                    videoCount: playlistData.videos.length,
                });
            }
            setIsLoading(false);
            // Keep isBusy true while showing dialog
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch video details');
            setIsLoading(false);
            isBusy.current = false;
        }
    }, []);

    const dismiss = useCallback(() => {
        // Mark current clipboard content as processed
        if (lastClipboardText.current) {
            processedUrls.current.add(lastClipboardText.current);
        }
        setDetectedContent(null);
        setError(null);
        isBusy.current = false;
    }, []);

    const clearError = useCallback(() => {
        setError(null);
        isBusy.current = false;
    }, []);

    useEffect(() => {
        // Check clipboard immediately and on focus/visibility
        const doCheck = () => {
            void checkClipboard();
        };

        // Also check with delays for reliability
        const doCheckWithDelays = () => {
            doCheck();
            // Additional checks with delays to handle browser timing issues
            setTimeout(doCheck, 100);
            setTimeout(doCheck, 500);
        };

        const handleFocus = () => {
            doCheckWithDelays();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                doCheckWithDelays();
            }
        };

        // Add event listeners
        window.addEventListener('focus', handleFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial check
        doCheck();

        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkClipboard]);

    return {
        detectedContent,
        isLoading,
        error,
        dismiss,
        clearError,
    };
}
