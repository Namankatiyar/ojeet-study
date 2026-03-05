import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Heading, Flex, Text, Input } from '@chakra-ui/react';
import { Library, Search } from 'lucide-react';
import { getVideos, getPlaylists, type Video, type Playlist } from '../db/db';
import { SortableLibraryList, type LibraryItem } from '../features/library/SortableLibraryList';
import { AddVideoForm } from '../features/library/AddVideoForm';

export function LibraryPage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        const [allVideos, allPlaylists] = await Promise.all([
            getVideos(),
            getPlaylists(),
        ]);
        setVideos(allVideos);
        setPlaylists(allPlaylists);
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const query = searchQuery.toLowerCase().trim();

    // Standalone videos (not in any playlist)
    const standaloneVideos = useMemo(
        () => videos.filter((v) => v.sourceType === 'manual' || !v.playlistId),
        [videos],
    );

    // Filter standalone videos by search
    const filteredStandalone = useMemo(
        () =>
            query
                ? standaloneVideos.filter(
                    (v) =>
                        v.title.toLowerCase().includes(query) ||
                        v.channelName.toLowerCase().includes(query),
                )
                : standaloneVideos,
        [standaloneVideos, query],
    );

    // Filter playlists by search (match playlist title/channel or any video inside)
    const filteredPlaylists = useMemo(
        () =>
            query
                ? playlists.filter((p) => {
                    if (p.title.toLowerCase().includes(query)) return true;
                    if (p.channelName.toLowerCase().includes(query)) return true;
                    // Also include playlist if any of its videos match
                    const hasMatchingVideo = videos.some(
                        (v) =>
                            v.playlistId === p.id &&
                            (v.title.toLowerCase().includes(query) ||
                                v.channelName.toLowerCase().includes(query)),
                    );
                    return hasMatchingVideo;
                })
                : playlists,
        [playlists, videos, query],
    );

    // Merge standalone videos and playlists into a single ordered list
    // Favorites pinned to top, then newest first (descending sortOrder)
    const orderedItems = useMemo(() => {
        const items: LibraryItem[] = [];
        for (const v of filteredStandalone) {
            items.push({ type: 'video', data: v, sortOrder: v.sortOrder });
        }
        for (const p of filteredPlaylists) {
            items.push({
                type: 'playlist',
                data: p,
                sortOrder: p.sortOrder,
                playlistVideos: videos.filter((v) => v.playlistId === p.id)
            });
        }
        items.sort((a, b) => {
            // Tier: 0 = watched (bottom), 1 = normal, 2 = favorite (top)
            const tier = (item: LibraryItem) => {
                if (item.data.watched) return 0;
                if (item.data.favorite) return 2;
                return 1;
            };
            const aTier = tier(a);
            const bTier = tier(b);
            if (aTier !== bTier) return bTier - aTier;
            // Within same tier, newest first (higher sortOrder = newer)
            return b.sortOrder - a.sortOrder;
        });
        return items;
    }, [filteredStandalone, filteredPlaylists, videos]);

    return (
        <Box maxW="800px" mx="auto" py={8} px={4}>
            <Flex align="center" gap={2} mb={6}>
                <Library size={24} color="var(--text-primary)" />
                <Heading size="lg" color="var(--text-primary)">Library</Heading>
            </Flex>

            <Text color="var(--text-secondary)" fontSize="sm" mb={4}>
                Add YouTube videos or playlists to study without distractions.
            </Text>

            {/* Add URL form */}
            <Box mb={4}>
                <AddVideoForm onAdded={() => void loadData()} />
            </Box>

            {/* Search bar */}
            <Box position="relative" mb={6}>
                <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                    <Search size={16} color="var(--text-muted)" />
                </Box>
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search videos by title or channel..."
                    pl={10}
                    size="sm"
                    bg="var(--bg-secondary)"
                    borderColor="var(--border-color)"
                    color="var(--text-primary)"
                    _placeholder={{ color: 'var(--text-muted)' }}
                    _focus={{ borderColor: 'var(--text-secondary)', boxShadow: '0 0 0 1px var(--text-secondary)' }}
                    _hover={{ borderColor: 'var(--border-hover)' }}
                    borderRadius="md"
                />
            </Box>

            {/* Unified sortable Library list */}
            <Box mt={2} mb={6}>
                <SortableLibraryList
                    items={orderedItems}
                    searchQuery={query}
                    onUpdate={() => void loadData()}
                />
            </Box>
        </Box>
    );
}
