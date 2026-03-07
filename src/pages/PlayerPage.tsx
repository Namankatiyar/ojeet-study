import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Box, Heading, Text, Flex, Badge } from '@chakra-ui/react';
import { ArrowLeft, Clock, FlaskConical, Atom, Pi, Tag } from 'lucide-react';
import {
    getVideoById,
    getSessionsByVideoId,
    updateVideoLastPosition,
    updateVideoTag,
    type Video,
    type VideoTag,
} from '../db/db';
import { PlayerEmbed, type YouTubePlayer } from '../features/player/PlayerEmbed';
import { useSessionTracker } from '../hooks/useSessionTracker';
import { queueVideoWatchEntry } from '../services/videoLogSync';
import { isSubjectTag } from '../services/videoLogTypes';
import { today } from '../utils/date';
import { formatDuration } from '../utils/duration';

const TAG_OPTIONS: { value: NonNullable<VideoTag>; label: string; icon: typeof Atom }[] = [
    { value: 'physics', label: 'Physics', icon: Atom },
    { value: 'chemistry', label: 'Chemistry', icon: FlaskConical },
    { value: 'maths', label: 'Mathematics', icon: Pi },
    { value: 'custom', label: 'Custom', icon: Tag },
];

const TAG_COLORS: Record<string, string> = {
    physics: '#6366f1',
    chemistry: '#10b981',
    maths: '#f59e0b',
    custom: '#8b5cf6',
};

const PLAYER_STATE_ENDED = 0;
const RESUME_SAVE_INTERVAL_MS = 5000;
const VIDEO_END_RESET_THRESHOLD_SECONDS = 2;

export function PlayerPage() {
    const { videoId } = useParams<{ videoId: string }>();
    const [video, setVideo] = useState<Video | null>(null);
    const [loading, setLoading] = useState(true);
    const [displaySeconds, setDisplaySeconds] = useState(0);
    const [todayBaselineSeconds, setTodayBaselineSeconds] = useState(0);
    const [activeTag, setActiveTag] = useState<VideoTag>(null);
    const playerRef = useRef<YouTubePlayer | null>(null);
    const lastSavedPositionRef = useRef(0);

    const { onPlaybackRateChange, getFocusedSeconds, isActive } = useSessionTracker(
        videoId ?? null,
        playerRef,
    );

    const getSafeResumePosition = useCallback((position: number | undefined, duration?: number) => {
        const resume = Math.max(0, Math.floor(position ?? 0));
        if (!duration || duration <= 0) return resume;
        if (resume >= duration - VIDEO_END_RESET_THRESHOLD_SECONDS) return 0;
        return resume;
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setDisplaySeconds(Math.round(getFocusedSeconds()));
        }, 1000);
        return () => clearInterval(interval);
    }, [getFocusedSeconds]);

    useEffect(() => {
        lastSavedPositionRef.current = 0;
    }, [videoId]);

    useEffect(() => {
        if (!videoId) return;
        void Promise.all([getVideoById(videoId), getSessionsByVideoId(videoId)]).then(
            ([v, sessions]) => {
                const todayKey = today();
                const baseline = sessions
                    .filter((session) => session.startTime.slice(0, 10) === todayKey)
                    .reduce((sum, session) => sum + session.focusedDurationSeconds, 0);

                setVideo(v ?? null);
                setActiveTag(v?.tag ?? null);
                setTodayBaselineSeconds(Math.max(0, Math.floor(baseline)));
                setLoading(false);
            },
        );
    }, [videoId]);

    const saveCurrentPosition = useCallback(async () => {
        const player = playerRef.current;
        if (!videoId || !player) return;

        const currentTime = Math.floor(player.getCurrentTime?.() ?? 0);
        const duration = Math.floor(player.getDuration?.() ?? 0);
        const resumeTime = getSafeResumePosition(currentTime, duration);

        if (resumeTime === lastSavedPositionRef.current) return;
        lastSavedPositionRef.current = resumeTime;
        await updateVideoLastPosition(videoId, resumeTime);
    }, [videoId, getSafeResumePosition]);

    const handleTagClick = useCallback(async (tag: NonNullable<VideoTag>) => {
        if (!videoId) return;
        const newTag = activeTag === tag ? null : tag;
        setActiveTag(newTag);
        await updateVideoTag(videoId, newTag);
    }, [videoId, activeTag]);

    const handlePlayerReady = useCallback((player: YouTubePlayer) => {
        playerRef.current = player;

        const duration = Math.floor(player.getDuration?.() ?? 0);
        const resumeTime = getSafeResumePosition(video?.lastPositionSeconds, duration);
        if (resumeTime > 0) {
            player.seekTo(resumeTime, true);
        }
        lastSavedPositionRef.current = resumeTime;
    }, [video?.lastPositionSeconds, getSafeResumePosition]);

    const handleStateChange = useCallback((state: number) => {
        if (!videoId) return;
        if (state === PLAYER_STATE_ENDED) {
            void updateVideoLastPosition(videoId, 0);
            lastSavedPositionRef.current = 0;
            return;
        }
        void saveCurrentPosition();
    }, [saveCurrentPosition, videoId]);

    const handlePlaybackRateChange = useCallback(
        (rate: number) => {
            onPlaybackRateChange(rate);
        },
        [onPlaybackRateChange],
    );

    useEffect(() => {
        if (!videoId) return;

        const intervalId = window.setInterval(() => {
            void saveCurrentPosition();
        }, RESUME_SAVE_INTERVAL_MS);

        const handleBeforeUnload = () => {
            void saveCurrentPosition();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            void saveCurrentPosition();
        };
    }, [videoId, saveCurrentPosition]);

    useEffect(() => {
        if (!videoId || !video || !isSubjectTag(activeTag)) return;

        const pushLog = () => {
            const focusedSeconds = Math.round(getFocusedSeconds());
            const watchedSeconds = Math.max(0, todayBaselineSeconds + focusedSeconds);
            queueVideoWatchEntry({
                video_id: videoId,
                video_name: video.title,
                subject: activeTag,
                watched_seconds: watchedSeconds,
                watched_date: today(),
            });
        };

        const intervalId = window.setInterval(pushLog, 5000);
        pushLog();

        return () => {
            clearInterval(intervalId);
            pushLog();
        };
    }, [videoId, video, activeTag, todayBaselineSeconds, getFocusedSeconds]);

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
                onStateChange={handleStateChange}
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

            {/* Tag Picker */}
            {video && (
                <Flex gap={2} mt={3} flexWrap="wrap">
                    {TAG_OPTIONS.map(({ value, label, icon: Icon }) => {
                        const isSelected = activeTag === value;
                        const tagColor = TAG_COLORS[value];
                        return (
                            <Flex
                                key={value}
                                as="button"
                                align="center"
                                gap={1.5}
                                px={3}
                                py={1}
                                borderRadius="full"
                                borderWidth="1px"
                                borderColor={isSelected ? tagColor : 'var(--border-color)'}
                                bg={isSelected ? tagColor : 'transparent'}
                                color={isSelected ? 'white' : 'var(--text-secondary)'}
                                cursor="pointer"
                                transition="all 0.15s"
                                _hover={{
                                    borderColor: tagColor,
                                    color: isSelected ? 'white' : tagColor,
                                }}
                                onClick={() => void handleTagClick(value)}
                                fontSize="xs"
                                fontWeight="500"
                            >
                                <Icon size={13} />
                                {label}
                            </Flex>
                        );
                    })}
                </Flex>
            )}
        </Box>
    );
}

