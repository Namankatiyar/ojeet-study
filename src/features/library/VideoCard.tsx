import { Box, Text, Image, IconButton, Flex } from '@chakra-ui/react';
import { Trash2, Play, Star, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Video } from '../../db/db';
import { deleteVideo, toggleVideoFavorite, toggleVideoWatched } from '../../db/db';
import { formatDuration } from '../../utils/duration';

interface VideoCardProps {
    video: Video;
    onUpdate: () => void;
}

export function VideoCard({ video, onUpdate }: VideoCardProps) {
    const navigate = useNavigate();

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await deleteVideo(video.id);
        onUpdate();
    };

    const handleToggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleVideoFavorite(video.id);
        onUpdate();
    };

    const handleToggleWatched = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleVideoWatched(video.id);
        onUpdate();
    };

    const handlePlay = () => {
        navigate(`/watch/${video.id}`);
    };

    return (
        <Box
            bg="var(--bg-secondary)"
            borderRadius="lg"
            overflow="hidden"
            cursor="pointer"
            opacity={video.watched ? 0.5 : 1}
            transition="all 0.2s"
            _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'lg',
                '& .card-overlay': { opacity: 1 },
            }}
            onClick={handlePlay}
            role="article"
            aria-label={video.title}
        >
            {/* Thumbnail container */}
            <Box position="relative" paddingTop="56.25%">
                <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    position="absolute"
                    top={0}
                    left={0}
                    w="100%"
                    h="100%"
                    objectFit="cover"
                />

                {/* Duration badge */}
                {video.durationSeconds > 0 && (
                    <Box
                        position="absolute"
                        bottom={2}
                        right={2}
                        bg="blackAlpha.800"
                        color="white"
                        fontSize="xs"
                        fontWeight="600"
                        px={1.5}
                        py={0.5}
                        borderRadius="sm"
                    >
                        {formatDuration(video.durationSeconds)}
                    </Box>
                )}

                {/* Hover overlay with play button */}
                <Flex
                    className="card-overlay"
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    bg="blackAlpha.500"
                    opacity={0}
                    transition="opacity 0.2s"
                    align="center"
                    justify="center"
                >
                    <Box
                        bg="whiteAlpha.900"
                        borderRadius="full"
                        p={3}
                    >
                        <Play size={24} color="#000" fill="#000" />
                    </Box>
                </Flex>

                {/* Favorite indicator */}
                {video.favorite && (
                    <Box position="absolute" top={2} left={2}>
                        <Star size={18} color="#facc15" fill="#facc15" />
                    </Box>
                )}

                {/* Watched indicator */}
                {video.watched && (
                    <Box position="absolute" top={2} right={2}>
                        <CheckCircle size={18} color="#22c55e" fill="#22c55e" />
                    </Box>
                )}
            </Box>

            {/* Card content */}
            <Box p={3}>
                <Text
                    fontSize="sm"
                    fontWeight="600"
                    color="var(--text-primary)"
                    lineClamp={2}
                    minH="2.5em"
                >
                    {video.title}
                </Text>
                <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
                    {video.channelName}
                </Text>

                {/* Action buttons */}
                <Flex mt={2} gap={1} justify="flex-end">
                    <IconButton
                        aria-label={video.favorite ? 'Unpin from favorites' : 'Pin to favorites'}
                        size="xs"
                        variant="ghost"
                        color={video.favorite ? '#facc15' : 'var(--text-muted)'}
                        _hover={{ bg: 'rgba(250,204,21,0.15)', color: '#facc15' }}
                        onClick={handleToggleFavorite}
                    >
                        <Star size={14} fill={video.favorite ? '#facc15' : 'none'} />
                    </IconButton>
                    <IconButton
                        aria-label={video.watched ? 'Mark as unwatched' : 'Mark as watched'}
                        size="xs"
                        variant="ghost"
                        color={video.watched ? '#22c55e' : 'var(--text-muted)'}
                        _hover={{ bg: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                        onClick={handleToggleWatched}
                    >
                        <CheckCircle size={14} fill={video.watched ? '#22c55e' : 'none'} stroke={video.watched ? 'var(--bg-secondary)' : 'currentColor'} />
                    </IconButton>
                    <IconButton
                        aria-label="Delete video"
                        size="xs"
                        variant="ghost"
                        color="var(--text-muted)"
                        _hover={{ bg: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
                        onClick={handleDelete}
                    >
                        <Trash2 size={14} />
                    </IconButton>
                </Flex>
            </Box>
        </Box>
    );
}
