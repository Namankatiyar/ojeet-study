import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Heading, Text, Flex, Badge } from '@chakra-ui/react';
import { ArrowLeft, Clock } from 'lucide-react';
import { getVideoById, type Video } from '../db/db';
import { PlayerEmbed, type YouTubePlayer } from '../features/player/PlayerEmbed';
import { useSessionTracker } from '../hooks/useSessionTracker';
import { formatDuration } from '../utils/duration';

export function PlayerPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [displaySeconds, setDisplaySeconds] = useState(0);
    const playerRef = useRef<YouTubePlayer | null>(null);

    const { onPlaybackRateChange, getFocusedSeconds, isActive } = useSessionTracker(
        videoId ?? null,
        playerRef,
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setDisplaySeconds(Math.round(getFocusedSeconds()));
        }, 1000);
        return () => clearInterval(interval);
    }, [getFocusedSeconds]);

    useEffect(() => {
        if (!videoId) return;
        void getVideoById(videoId).then((v) => {
            setVideo(v ?? null);
            setLoading(false);
        });
    }, [videoId]);

    const handlePlayerReady = useCallback((player: YouTubePlayer) => {
        playerRef.current = player;
    }, []);

    const handlePlaybackRateChange = useCallback(
        (rate: number) => {
            onPlaybackRateChange(rate);
        },
        [onPlaybackRateChange],
    );

    if (!videoId) {
        return (
            <Box maxW="960px" mx="auto" py={8} px={4}>
                <Text color="var(--text-muted)">No video selected.</Text>
            </Box>
        );
    }

    return (
        <Box maxW="960px" mx="auto" py={4} px={4}>
            <Flex align="center" gap={2} mb={4}>
                <RouterLink to="/">
                    <Flex
                        align="center"
                        gap={1}
                        color="var(--text-secondary)"
                        _hover={{ color: 'var(--text-primary)' }}
                    >
                        <ArrowLeft size={16} />
                        <Text fontSize="sm">Library</Text>
                    </Flex>
                </RouterLink>
            </Flex>

            <PlayerEmbed
                videoId={videoId}
                onPlayerReady={handlePlayerReady}
                onPlaybackRateChange={handlePlaybackRateChange}
            />

            <Flex justify="space-between" align="center" mt={4}>
                <Box>
                    {loading ? (
                        <Text color="var(--text-muted)">Loading...</Text>
                    ) : video ? (
                        <>
                            <Heading size="md" color="var(--text-primary)">{video.title}</Heading>
                            <Text fontSize="sm" color="var(--text-secondary)" mt={1}>
                                {video.channelName}
                            </Text>
                        </>
                    ) : (
                        <Text color="var(--text-muted)">Video not in library</Text>
                    )}
                </Box>

                <Flex align="center" gap={2}>
                    <Badge
                        bg={isActive() ? 'rgba(34,197,94,0.15)' : 'var(--bg-tertiary)'}
                        color={isActive() ? 'var(--green)' : 'var(--text-muted)'}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={0.5}
                        borderRadius="md"
                    >
                        {isActive() ? 'Tracking' : 'Paused'}
                    </Badge>
                    <Flex align="center" gap={1} color="var(--text-secondary)">
                        <Clock size={14} />
                        <Text fontSize="sm" fontFamily="mono">
                            {formatDuration(displaySeconds)}
                        </Text>
                    </Flex>
                </Flex>
            </Flex>
        </Box>
    );
}
