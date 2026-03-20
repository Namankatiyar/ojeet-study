import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Box, Flex, Text, Button } from '@chakra-ui/react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
                        onError?: (event: { data: number }) => void;
                    };
                },
            ) => YouTubePlayer;
            PlayerState: {
                UNSTARTED: number;
                ENDED: number;
                PLAYING: number;
                PAUSED: number;
                BUFFERING: number;
                CUED: number;
            };
        };
    }
}

interface YouTubePlayer {
    destroy(): void;
    getPlayerState(): number;
    getPlaybackRate(): number;
    getCurrentTime(): number;
    getDuration(): number;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
}

type PlayerError = 
    | 'api_load_failed'
    | 'video_not_found'
    | 'embed_not_allowed'
    | 'playback_error'
    | null;

const ERROR_MESSAGES: Record<NonNullable<PlayerError>, { title: string; description: string }> = {
    api_load_failed: {
        title: 'Failed to load player',
        description: 'Could not load the YouTube player. Check your internet connection and try again.',
    },
    video_not_found: {
        title: 'Video not found',
        description: 'This video may have been removed or made private.',
    },
    embed_not_allowed: {
        title: 'Playback restricted',
        description: 'This video cannot be played in embedded players. Try watching on YouTube directly.',
    },
    playback_error: {
        title: 'Playback error',
        description: 'An error occurred while playing the video. Please try again.',
    },
};

interface PlayerEmbedProps {
    videoId: string;
    onPlayerReady?: (player: YouTubePlayer) => void;
    onStateChange?: (state: number) => void;
    onPlaybackRateChange?: (rate: number) => void;
    onError?: (error: PlayerError) => void;
}

let ytApiLoaded = false;
let ytApiLoadPromise: Promise<void> | null = null;

function loadYTApi(): Promise<void> {
    if (ytApiLoaded && window.YT) return Promise.resolve();
    if (ytApiLoadPromise) return ytApiLoadPromise;

    ytApiLoadPromise = new Promise<void>((resolve, reject) => {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        
        const timeout = setTimeout(() => {
            reject(new Error('YouTube API load timeout'));
        }, 15000);

        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            clearTimeout(timeout);
            ytApiLoaded = true;
            prev?.();
            resolve();
        };

        tag.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load YouTube API'));
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
    onError,
}: PlayerEmbedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [error, setError] = useState<PlayerError>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Store callbacks in refs to avoid re-triggering effects
    const onPlayerReadyRef = useRef(onPlayerReady);
    const onStateChangeRef = useRef(onStateChange);
    const onPlaybackRateChangeRef = useRef(onPlaybackRateChange);
    const onErrorRef = useRef(onError);
    
    useLayoutEffect(() => {
        onPlayerReadyRef.current = onPlayerReady;
        onStateChangeRef.current = onStateChange;
        onPlaybackRateChangeRef.current = onPlaybackRateChange;
        onErrorRef.current = onError;
    });

    const [retryKey, setRetryKey] = useState(0);

    const handleRetry = () => {
        // Reset the API promise to allow retry
        ytApiLoadPromise = null;
        ytApiLoaded = false;
        // Trigger re-initialization
        setRetryKey(k => k + 1);
    };

    useEffect(() => {
        setError(null);
        setIsLoading(true);
        
        let cancelled = false;
        let player: YouTubePlayer | null = null;
        let playerContainer: HTMLDivElement | null = null;

        const handleError = (err: PlayerError) => {
            if (cancelled) return;
            setError(err);
            setIsLoading(false);
            onErrorRef.current?.(err);
        };

        const cleanup = () => {
            if (player) {
                try {
                    player.destroy();
                } catch {
                    // Ignore cleanup errors
                }
                player = null;
            }
            if (playerContainer && playerContainer.parentNode) {
                playerContainer.parentNode.removeChild(playerContainer);
                playerContainer = null;
            }
            playerRef.current = null;
        };

        void loadYTApi()
            .then(() => {
                if (cancelled || !containerRef.current || !window.YT) return;

                // Create container for player
                playerContainer = document.createElement('div');
                playerContainer.id = 'yt-player-' + videoId + '-' + Date.now();
                containerRef.current.appendChild(playerContainer);

                player = new window.YT.Player(playerContainer.id, {
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
                            if (cancelled) return;
                            playerRef.current = event.target;
                            setIsLoading(false);
                            setError(null);
                            onPlayerReadyRef.current?.(event.target);
                        },
                        onStateChange: (event) => {
                            onStateChangeRef.current?.(event.data);
                        },
                        onPlaybackRateChange: (event) => {
                            onPlaybackRateChangeRef.current?.(event.data);
                        },
                        onError: (event) => {
                            const code = event.data;
                            if (code === 100 || code === 2) {
                                handleError('video_not_found');
                            } else if (code === 101 || code === 150) {
                                handleError('embed_not_allowed');
                            } else {
                                handleError('playback_error');
                            }
                        },
                    },
                });
                
                playerRef.current = player;
            })
            .catch(() => {
                handleError('api_load_failed');
            });

        return () => {
            cancelled = true;
            cleanup();
        };
    }, [videoId, retryKey]);

    if (error) {
        const errorInfo = ERROR_MESSAGES[error];
        return (
            <Box
                w="100%"
                maxW="960px"
                mx="auto"
                css={{ aspectRatio: '16 / 9' }}
                bg="var(--bg-secondary)"
                borderRadius="lg"
                borderWidth="1px"
                borderColor="var(--border-color)"
            >
                <Flex
                    direction="column"
                    align="center"
                    justify="center"
                    h="100%"
                    p={6}
                    textAlign="center"
                >
                    <Box
                        p={3}
                        borderRadius="full"
                        bg="rgba(239, 68, 68, 0.1)"
                        mb={4}
                    >
                        <AlertTriangle size={32} color="#ef4444" />
                    </Box>
                    <Text fontSize="lg" fontWeight="600" color="var(--text-primary)" mb={2}>
                        {errorInfo.title}
                    </Text>
                    <Text fontSize="sm" color="var(--text-secondary)" mb={4} maxW="400px">
                        {errorInfo.description}
                    </Text>
                    <Button
                        size="sm"
                        bg="var(--bg-tertiary)"
                        color="var(--text-primary)"
                        borderWidth="1px"
                        borderColor="var(--border-color)"
                        _hover={{ bg: 'var(--bg-hover)', borderColor: 'var(--border-hover)' }}
                        onClick={handleRetry}
                        padding={4}
                    >
                        <RefreshCw size={14} />
                        {/* <Text ml={2} >Try Again</Text> */}
                    </Button>
                </Flex>
            </Box>
        );
    }

    return (
        <Box
            ref={containerRef}
            w="100%"
            maxW="960px"
            mx="auto"
            position="relative"
            css={{
                aspectRatio: '16 / 9',
                '& iframe': {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                },
            }}
        >
            {isLoading && (
                <Flex
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    align="center"
                    justify="center"
                    bg="var(--bg-secondary)"
                    borderRadius="lg"
                >
                    <Text color="var(--text-muted)" fontSize="sm">Loading player...</Text>
                </Flex>
            )}
        </Box>
    );
}

export type { YouTubePlayer };
