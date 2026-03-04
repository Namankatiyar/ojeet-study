# OJEE Tracker: Analytics Import Implementation Plan

This guide outlines exactly how to implement the receiving end of the "Deep-Link Payload" analytics sync on the OJEE Tracker side.

## 1. Concept

OJEET-STUDY (the YouTube PWA) will send users to a specific URL on the tracker when they click "Sync to Tracker". 
The URL will look like:
`https://ojeet-tracker.vercel.app/import?payload=eyJzb3VyY2UiOiJvamVldC1zdHVkeS...`

The `payload` is a Base64 encoded JSON string.

## 2. Expected Data Contract

When decoded (`JSON.parse(atob(payload))`), the data will match this TypeScript interface:

```typescript
interface OjeetSyncPayload {
    source: "ojeet-study";
    timestamp: string; // ISO string of when it was exported
    sessions: Array<{
        title: string;           // The video/playlist title
        durationSeconds: number; // Actual time spent focused
        date: string;            // "YYYY-MM-DD"
    }>;
}
```

## 3. Implementation Steps for OJEE Tracker

### Step 3.1: Add the Integration Route

In `src/core/AppRoutes.tsx` (or wherever your routing is), add a new route:
```tsx
<Route path="/import" element={<ImportSyncPage />} />
```

### Step 3.2: Create the ImportSyncPage Component

Create a new file `src/features/sync/ImportSyncPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Heading, Text, Button, Spinner, Flex } from '@chakra-ui/react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
// Import your context here
// import { useUserProgress } from '../../core/context/UserProgressContext';

export function ImportSyncPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    // const { logExternalStudyTime } = useUserProgress();
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [importedMinutes, setImportedMinutes] = useState(0);

    useEffect(() => {
        const payload = searchParams.get('payload');
        
        if (!payload) {
            setStatus('error');
            setErrorMessage('No sync payload found in URL.');
            return;
        }

        try {
            // 1. Decode payload
            const decodedStr = decodeURIComponent(atob(payload));
            const data = JSON.parse(decodedStr);

            // 2. Validate contract
            if (data.source !== 'ojeet-study') {
                throw new Error('Invalid data source. Expected ojeet-study.');
            }

            // 3. Process sessions
            let totalSeconds = 0;
            data.sessions.forEach((session: any) => {
                totalSeconds += session.durationSeconds;
                
                // --- INTEGRATION POINT ---
                // Here you should call your UserProgressContext to add this time.
                // Depending on your Tracker's architecture, this could be:
                // logExternalStudyTime({ 
                //     date: session.date, 
                //     durationMinutes: Math.floor(session.durationSeconds / 60),
                //     note: `Ojeet-Study: ${session.title}`
                // });
            });

            setImportedMinutes(Math.floor(totalSeconds / 60));
            setStatus('success');

        } catch (err: any) {
            console.error('Import failed:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to parse sync data.');
        }
    }, [searchParams]);

    return (
        <Flex align="center" justify="center" minH="100vh" bg="var(--bg-primary)" p={4}>
            <Box bg="var(--bg-secondary)" p={8} borderRadius="lg" borderWidth="1px" borderColor="var(--border-color)" maxW="md" w="full" textAlign="center">
                
                {status === 'loading' && (
                    <Flex direction="column" align="center" gap={4}>
                        <Spinner size="xl" color="var(--accent)" />
                        <Heading size="md" color="var(--text-primary)">Syncing Tracker Data...</Heading>
                    </Flex>
                )}

                {status === 'success' && (
                    <Flex direction="column" align="center" gap={4}>
                        <CheckCircle2 size={48} color="var(--green)" />
                        <Heading size="md" color="var(--text-primary)">Sync Complete!</Heading>
                        <Text color="var(--text-secondary)">
                            Successfully imported <b>{importedMinutes} minutes</b> of study time from OJEET-STUDY.
                        </Text>
                        <Button mt={4} bg="var(--accent)" color="white" onClick={() => navigate('/')}>
                            Return to Dashboard
                        </Button>
                    </Flex>
                )}

                {status === 'error' && (
                    <Flex direction="column" align="center" gap={4}>
                        <AlertCircle size={48} color="var(--red)" />
                        <Heading size="md" color="var(--text-primary)">Sync Failed</Heading>
                        <Text color="var(--text-secondary)">{errorMessage}</Text>
                        <Button mt={4} variant="outline" onClick={() => navigate('/')}>
                            Return to Dashboard
                        </Button>
                    </Flex>
                )}

            </Box>
        </Flex>
    );
}

```

## 4. Architectural Notes for the Tracker

Because OJEE Tracker stores daily progress inside its `UserProgressContext` (likely in a `dailyLogs` or `studyHistory` array persisted to `localStorage`), the critical integration point is ensuring the imported time is added to those specific data structures. 

If OJEE Tracker's heatmap relies on the `StudyClock` history, you should format the incoming `session.durationSeconds` into the same log format that the Study Clock uses when a user marks a timer complete.
