import { useState, useCallback, type FormEvent } from 'react';
import {
    Box,
    Input,
    Button,
    Text,
    Flex,
} from '@chakra-ui/react';
import { Plus, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { parseYouTubeUrl, addVideoByUrl, importPlaylist } from '../../services/youtube';

interface AddVideoFormProps {
    onAdded: () => void;
}

export function AddVideoForm({ onAdded }: AddVideoFormProps) {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            setError('');

            const trimmed = url.trim();
            if (!trimmed) return;

            const parsed = parseYouTubeUrl(trimmed);
            if (!parsed) {
                setError('Invalid YouTube URL. Supports: video links, playlist links, or video IDs.');
                return;
            }

            setLoading(true);
            try {
                if (parsed.type === 'playlist') {
                    await importPlaylist(trimmed);
                } else {
                    await addVideoByUrl(trimmed);
                }
                setUrl('');
                onAdded();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to add video');
            } finally {
                setLoading(false);
            }
        },
        [url, onAdded],
    );

    return (
        <Box>
            <form onSubmit={(e) => void handleSubmit(e)}>
                <Flex gap={2} direction={{ base: 'column', sm: 'row' }}>
                    <Box position="relative" flex={1}>
                        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" zIndex={1}>
                            <LinkIcon size={16} color="var(--text-muted)" />
                        </Box>
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Paste YouTube URL or video ID..."
                            pl={10}
                            size="md"
                            bg="var(--bg-secondary)"
                            borderColor="var(--border-color)"
                            color="var(--text-primary)"
                            _placeholder={{ color: 'var(--text-muted)' }}
                            _focus={{ borderColor: 'var(--accent)', boxShadow: '0 0 0 1px var(--accent)' }}
                            _hover={{ borderColor: 'var(--border-hover)' }}
                            disabled={loading}
                        />
                    </Box>
                    <Button
                        type="submit"
                        bg="white"
                        color="black"
                        _hover={{ bg: 'var(--accent-hover)' }}
                        loading={loading}
                        loadingText="Adding..."
                        size="md"
                        px={4}
                        gap={1.5}
                        fontWeight="600"
                        w={{ base: '100%', sm: 'auto' }}
                    >
                        <Plus size={16} />
                        Add
                    </Button>
                </Flex>
            </form>
            {error && (
                <Flex align="center" gap={1} mt={2} color="var(--red)">
                    <AlertCircle size={14} />
                    <Text fontSize="sm">{error}</Text>
                </Flex>
            )}
        </Box>
    );
}
