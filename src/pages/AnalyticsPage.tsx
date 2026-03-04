import { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Heading, Flex, Text, Button, Separator } from '@chakra-ui/react';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
} from '../components/ui/dialog';
import { BarChart3, Download, Clock, SendToBack, AlertCircle } from 'lucide-react';
import { getDailyStudyMinutes, getStudySessions, getVideos, type StudySession, type Video } from '../db/db';
import { StudyHeatmap } from '../features/analytics/StudyHeatmap';
import { exportSessionsToCSV } from '../utils/exportCsv';
import { performTrackerSync } from '../utils/exportTrackerSync';
import { formatDurationHuman } from '../utils/duration';

export function AnalyticsPage() {
    const [dailyData, setDailyData] = useState<{ date: string; totalMinutes: number }[]>([]);
    const [sessions, setSessions] = useState<StudySession[]>([]);
    const [videoMap, setVideoMap] = useState<Map<string, Video>>(new Map());
    const [exporting, setExporting] = useState(false);
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

    const refreshData = useCallback(async () => {
        const [daily, allSessions, allVideos] = await Promise.all([
            getDailyStudyMinutes(),
            getStudySessions(),
            getVideos(),
        ]);
        setDailyData(daily);
        setSessions(allSessions);
        const map = new Map<string, Video>();
        for (const v of allVideos) map.set(v.id, v);
        setVideoMap(map);
    }, []);

    useEffect(() => {
        void refreshData();
    }, [refreshData]);

    const stats = useMemo(() => {
        const totalSeconds = sessions.reduce((sum, s) => sum + s.focusedDurationSeconds, 0);
        const totalDays = new Set(sessions.map((s) => s.startTime.slice(0, 10))).size;
        const totalSessions = sessions.length;
        return { totalSeconds, totalDays, totalSessions };
    }, [sessions]);

    const handleExport = useCallback(async () => {
        setExporting(true);
        try {
            await exportSessionsToCSV();
        } finally {
            setExporting(false);
        }
    }, []);

    return (
        <Box maxW="900px" mx="auto" py={8} px={4}>
            <Flex align="center" justify="space-between" mb={6}>
                <Flex align="center" gap={2}>
                    <BarChart3 size={24} color="var(--text-primary)" />
                    <Heading size="lg" color="var(--text-primary)">Analytics</Heading>
                </Flex>
                <Flex gap={2}>
                    <Button
                        size="sm"
                        backgroundColor="var(--accent)"
                        color="var(--bg-primary)"
                        _hover={{ bg: 'var(--accent-hover)' }}
                        onClick={async () => {
                            const hasData = await performTrackerSync();
                            if (!hasData) {
                                setIsSyncDialogOpen(true);
                            }
                        }}
                        px={4}
                        gap={1.5}
                    >
                        <SendToBack size={16} />
                        Sync to Tracker
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        borderColor="var(--border-color)"
                        color="var(--text-primary)"
                        _hover={{ bg: 'var(--bg-hover)', borderColor: 'var(--border-hover)' }}
                        onClick={() => void handleExport()}
                        loading={exporting}
                        loadingText="Exporting..."
                        px={4}
                        gap={1.5}
                    >
                        <Download size={16} />
                        Export CSV
                    </Button>
                </Flex>
            </Flex>

            <DialogRoot open={isSyncDialogOpen} onOpenChange={(e) => setIsSyncDialogOpen(e.open)} placement="center">
                <DialogContent
                    bg="var(--bg-secondary)"
                    borderColor="var(--border-color)"
                    borderWidth="1px"
                    borderRadius="lg"
                    p={6}
                    maxW="sm"
                >
                    <DialogHeader pb={3}>
                        <DialogTitle>
                            <Flex align="center" gap={2} color="var(--text-primary)">
                                <AlertCircle size={20} color="var(--text-secondary)" />
                                <Text fontWeight="600" fontSize="lg">No New Data</Text>
                            </Flex>
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody pb={6}>
                        <Text color="var(--text-secondary)" fontSize="sm" lineHeight="1.6">
                            All your recent study sessions have already been synced. There is no new data to export to the Tracker since your last sync!
                        </Text>
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            size="sm"
                            px={4}
                            bg="var(--accent)"
                            color="var(--bg-primary)"
                            _hover={{ bg: 'var(--accent-hover)' }}
                            onClick={() => setIsSyncDialogOpen(false)}
                        >
                            Understood
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>

            {/* Stats */}
            <Flex gap={8} mb={8}>
                <Box>
                    <Text fontSize="2xl" fontWeight="700" color="var(--text-primary)">
                        {formatDurationHuman(stats.totalSeconds)}
                    </Text>
                    <Text fontSize="xs" color="var(--text-muted)">Total Study Time</Text>
                </Box>
                <Box>
                    <Text fontSize="2xl" fontWeight="700" color="var(--text-primary)">
                        {stats.totalDays}
                    </Text>
                    <Text fontSize="xs" color="var(--text-muted)">Active Days</Text>
                </Box>
                <Box>
                    <Text fontSize="2xl" fontWeight="700" color="var(--text-primary)">
                        {stats.totalSessions}
                    </Text>
                    <Text fontSize="xs" color="var(--text-muted)">Sessions</Text>
                </Box>
            </Flex>

            {/* Heatmap */}
            <Box mb={8}>
                <Heading size="sm" mb={4} color="var(--text-primary)">Study Activity</Heading>
                <Box overflowX="auto" pb={2}>
                    <StudyHeatmap data={dailyData} />
                </Box>
            </Box>

            <Separator borderColor="var(--border-color)" mb={6} />

            {/* Recent Sessions */}
            <Box>
                <Heading size="sm" mb={4} color="var(--text-primary)">Recent Sessions</Heading>
                {sessions.length === 0 ? (
                    <Text color="var(--text-muted)" textAlign="center" py={4}>
                        No study sessions yet. Watch a video to start tracking.
                    </Text>
                ) : (
                    <Box display="flex" flexDirection="column" gap={2}>
                        {sessions
                            .slice()
                            .reverse()
                            .slice(0, 20)
                            .map((session) => (
                                <Flex
                                    key={session.id}
                                    align="center"
                                    justify="space-between"
                                    borderWidth="1px"
                                    borderColor="var(--border-color)"
                                    bg="var(--bg-secondary)"
                                    p={3}
                                    borderRadius="md"
                                    _hover={{ bg: 'var(--bg-tertiary)' }}
                                    transition="background 0.15s"
                                >
                                    <Box>
                                        <Text fontSize="sm" fontWeight="500" color="var(--text-primary)">
                                            {videoMap.get(session.videoId)?.title ?? session.videoId}
                                        </Text>
                                        <Text fontSize="xs" color="var(--text-muted)">
                                            {new Date(session.startTime).toLocaleDateString()} at{' '}
                                            {new Date(session.startTime).toLocaleTimeString()}
                                        </Text>
                                    </Box>
                                    <Flex align="center" gap={1} color="var(--text-secondary)">
                                        <Clock size={12} />
                                        <Text fontSize="sm" fontFamily="mono">
                                            {formatDurationHuman(session.focusedDurationSeconds)}
                                        </Text>
                                    </Flex>
                                </Flex>
                            ))}
                    </Box>
                )}
            </Box>
        </Box>
    );
}
