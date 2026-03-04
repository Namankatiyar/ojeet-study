import { useMemo } from 'react';
import { Box, Text } from '@chakra-ui/react';
import { toDateString, dateRange, daysAgo, monthName, dayName } from '../../utils/date';
import { formatDurationHuman } from '../../utils/duration';

interface StudyDay {
    date: string;
    totalMinutes: number;
}

interface StudyHeatmapProps {
    data: StudyDay[];
}

function getIntensity(minutes: number): number {
    if (minutes === 0) return 0;
    if (minutes <= 30) return 1;
    if (minutes <= 90) return 2;
    if (minutes <= 180) return 3;
    return 4;
}

const INTENSITY_COLORS = [
    'rgba(255, 255, 255, 0.04)', // 0: no activity
    'rgba(255, 255, 255, 0.10)', // 1: 1-30 min
    'rgba(255, 255, 255, 0.22)', // 2: 31-90 min
    'rgba(255, 255, 255, 0.40)', // 3: 91-180 min
    'rgba(255, 255, 255, 0.65)', // 4: 180+ min
] as const;

export function StudyHeatmap({ data }: StudyHeatmapProps) {
    const { cells, monthLabels } = useMemo(() => {
        const end = new Date();
        const start = daysAgo(364);
        start.setDate(start.getDate() - start.getDay());

        const dayMap = new Map<string, number>();
        for (const d of data) {
            dayMap.set(d.date, d.totalMinutes);
        }

        const dates = dateRange(start, end);
        const cellData = dates.map((d) => {
            const dateStr = toDateString(d);
            const minutes = dayMap.get(dateStr) ?? 0;
            return {
                date: dateStr,
                dayOfWeek: d.getDay(),
                weekIndex: Math.floor(
                    (d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000),
                ),
                minutes,
                intensity: getIntensity(minutes),
                month: d.getMonth(),
            };
        });

        const labels: { month: string; weekIndex: number }[] = [];
        let lastMonth = -1;
        for (const cell of cellData) {
            if (cell.month !== lastMonth && cell.dayOfWeek === 0) {
                labels.push({ month: monthName(cell.month), weekIndex: cell.weekIndex });
                lastMonth = cell.month;
            }
        }

        return { cells: cellData, monthLabels: labels };
    }, [data]);

    const totalWeeks = (cells[cells.length - 1]?.weekIndex ?? 0) + 1;

    return (
        <Box>
            {/* Month labels */}
            <Box
                display="grid"
                gridTemplateColumns={`repeat(${totalWeeks}, 14px)`}
                gap="2px"
                mb={1}
                ml="32px"
            >
                {monthLabels.map((label) => (
                    <Text
                        key={`${label.month}-${label.weekIndex}`}
                        fontSize="10px"
                        color="var(--text-muted)"
                        gridColumn={label.weekIndex + 1}
                        whiteSpace="nowrap"
                    >
                        {label.month}
                    </Text>
                ))}
            </Box>

            <Box display="flex" gap="2px">
                {/* Day labels */}
                <Box
                    display="grid"
                    gridTemplateRows="repeat(7, 14px)"
                    gap="2px"
                    w="28px"
                    flexShrink={0}
                >
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <Text
                            key={day}
                            fontSize="10px"
                            color="var(--text-muted)"
                            lineHeight="14px"
                            textAlign="right"
                            pr="4px"
                        >
                            {day % 2 === 1 ? dayName(day) : ''}
                        </Text>
                    ))}
                </Box>

                {/* Grid */}
                <Box
                    display="grid"
                    gridTemplateColumns={`repeat(${totalWeeks}, 14px)`}
                    gridTemplateRows="repeat(7, 14px)"
                    gap="2px"
                    gridAutoFlow="column"
                >
                    {cells.map((cell) => (
                        <Box
                            key={cell.date}
                            title={`${cell.date}: ${cell.minutes > 0 ? formatDurationHuman(cell.minutes * 60) : 'No study'}`}
                            w="12px"
                            h="12px"
                            borderRadius="2px"
                            bg={INTENSITY_COLORS[cell.intensity]}
                            gridRow={cell.dayOfWeek + 1}
                            gridColumn={cell.weekIndex + 1}
                            cursor="pointer"
                            _hover={{ outline: '1px solid var(--text-muted)' }}
                        />
                    ))}
                </Box>
            </Box>

            {/* Legend */}
            <Box display="flex" alignItems="center" gap="4px" mt={3} justifyContent="flex-end">
                <Text fontSize="10px" color="var(--text-muted)">Less</Text>
                {INTENSITY_COLORS.map((color, i) => (
                    <Box key={i} w="12px" h="12px" borderRadius="2px" bg={color} />
                ))}
                <Text fontSize="10px" color="var(--text-muted)">More</Text>
            </Box>
        </Box>
    );
}
