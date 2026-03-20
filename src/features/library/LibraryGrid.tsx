import { SimpleGrid, Box, Text, Flex } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import type { Video, Playlist } from '../../db/db';
import { VideoCard } from './VideoCard';
import { PlaylistCard } from './PlaylistCard';
import { SkeletonCard } from './SkeletonCard';

export type LibraryGridItem =
    | { type: 'video'; data: Video }
    | { type: 'playlist'; data: Playlist; videos: Video[] };

interface LibraryGridProps {
    items: LibraryGridItem[];
    searchQuery: string;
    onUpdate: () => void;
}

const MIN_CARDS_TO_SHOW = 8;

export function LibraryGrid({ items, searchQuery, onUpdate }: LibraryGridProps) {
    // When searching, don't show skeletons
    if (searchQuery && items.length === 0) {
        return (
            <Box py={12} textAlign="center">
                <Text color="var(--text-muted)" fontSize="sm">
                    No videos or playlists match "{searchQuery}".
                </Text>
            </Box>
        );
    }

    // Calculate how many skeleton cards to show
    const skeletonCount = Math.max(0, MIN_CARDS_TO_SHOW - items.length);

    return (
        <SimpleGrid
            columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
            gap={{ base: 3, md: 4 }}
            role="list"
            aria-label="Video library"
        >
            {items.map((item) => (
                <Box key={`${item.type}-${item.data.id}`} role="listitem">
                    {item.type === 'video' ? (
                        <VideoCard video={item.data} onUpdate={onUpdate} />
                    ) : (
                        <PlaylistCard
                            playlist={item.data}
                            videos={item.videos}
                            onUpdate={onUpdate}
                        />
                    )}
                </Box>
            ))}
            
            {/* Show skeleton placeholders when there are few items */}
            {skeletonCount > 0 && !searchQuery && (
                <>
                    {/* First skeleton has an "Add video" hint */}
                    {items.length === 0 && (
                        <Box role="listitem">
                            <Box
                                bg="var(--bg-secondary)"
                                borderRadius="lg"
                                overflow="hidden"
                                borderWidth="2px"
                                borderStyle="dashed"
                                borderColor="var(--border-color)"
                                opacity={0.7}
                                transition="all 0.2s"
                                _hover={{ borderColor: 'var(--text-muted)', opacity: 0.9 }}
                            >
                                <Box position="relative" paddingTop="56.25%" bg="var(--bg-tertiary)">
                                    <Flex
                                        position="absolute"
                                        top={0}
                                        left={0}
                                        right={0}
                                        bottom={0}
                                        align="center"
                                        justify="center"
                                        direction="column"
                                        gap={2}
                                    >
                                        <Box
                                            p={3}
                                            borderRadius="full"
                                            bg="var(--bg-secondary)"
                                            borderWidth="1px"
                                            borderColor="var(--border-color)"
                                        >
                                            <Plus size={24} color="var(--text-muted)" />
                                        </Box>
                                        <Text fontSize="xs" color="var(--text-muted)">
                                            Add your first video
                                        </Text>
                                    </Flex>
                                </Box>
                                <Box p={3}>
                                    <Box h="14px" w="70%" bg="var(--bg-tertiary)" borderRadius="sm" mb={2} />
                                    <Box h="12px" w="40%" bg="var(--bg-tertiary)" borderRadius="sm" />
                                </Box>
                            </Box>
                        </Box>
                    )}
                    
                    {/* Remaining skeleton cards */}
                    {Array.from({ length: items.length === 0 ? skeletonCount - 1 : skeletonCount }).map((_, i) => (
                        <Box key={`skeleton-${i}`} role="listitem" aria-hidden="true">
                            <SkeletonCard />
                        </Box>
                    ))}
                </>
            )}
        </SimpleGrid>
    );
}
