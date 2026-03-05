import { useEffect, useRef, useCallback } from 'react';
import { Box } from '@chakra-ui/react';

declare global {
    interface Window {
        onYouTubeIframeAPIReady?: () => void;
        YT?: {
            Player: new (
                elementId: string,
                config: {
                    host?: string;
                    videoId: string;
                    width: string;
                    height: string;
                    playerVars: Record<string, number>;
                    events: {
                        onReady?: (event: { target: YouTubePlayer }) => void;
                        onStateChange?: (event: { data: number }) => void;
                        onPlaybackRateChange?: (event: { data: number }) => void;
                    };
                },
            ) => YouTubePlayer;
        };
    }
}

interface YouTubePlayer {
    destroy(): void;
    getPlayerState(): number;
    getPlaybackRate(): number;
}

interface PlayerEmbedProps {
    videoId: string;
    onPlayerReady?: (player: YouTubePlayer) => void;
    onStateChange?: (state: number) => void;
    onPlaybackRateChange?: (rate: number) => void;
}

let ytApiLoaded = false;
let ytApiLoadPromise: Promise<void> | null = null;

function loadYTApi(): Promise<void> {
    if (ytApiLoaded && window.YT) return Promise.resolve();
    if (ytApiLoadPromise) return ytApiLoadPromise;

    ytApiLoadPromise = new Promise<void>((resolve) => {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            ytApiLoaded = true;
            prev?.();
            resolve();
        };
        document.head.appendChild(tag);
    });

    return ytApiLoadPromise;
}

export function PlayerEmbed({
    videoId,
    onPlayerReady,
    onStateChange,
    onPlaybackRateChange,
}: PlayerEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YouTubePlayer | null>(null);

    const destroyPlayer = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.destroy();
            playerRef.current = null;
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        void loadYTApi().then(() => {
            if (cancelled || !containerRef.current || !window.YT) return;

            const el = document.createElement('div');
            el.id = 'yt-player-' + videoId;
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(el);

            playerRef.current = new window.YT.Player(el.id, {
                host: 'https://www.youtube-nocookie.com',
                videoId,
                width: '100%',
                height: '100%',
                playerVars: {
                    autoplay: 0,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    iv_load_policy: 3,
                    cc_load_policy: 0,
                    disablekb: 0,
                    fs: 1,
                    playsinline: 1,
                },
                events: {
                    onReady: (event) => {
                        onPlayerReady?.(event.target);
                    },
                    onStateChange: (event) => {
                        onStateChange?.(event.data);
                    },
                    onPlaybackRateChange: (event) => {
                        onPlaybackRateChange?.(event.data);
                    },
                },
            });
        });

        return () => {
            cancelled = true;
            destroyPlayer();
        };
    }, [videoId, onPlayerReady, onStateChange, onPlaybackRateChange, destroyPlayer]);

    return (
        <Box
            ref={containerRef}
            w="100%"
            maxW="960px"
            mx="auto"
            css={{
                aspectRatio: '16 / 9',
                '& iframe': {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                },
            }}
        />
    );
}

export type { YouTubePlayer };
