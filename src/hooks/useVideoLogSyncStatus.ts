import { useEffect, useState } from 'react';
import {
    getVideoLogSyncStatus,
    subscribeVideoLogSyncStatus,
} from '../services/videoLogSync';

export function useVideoLogSyncStatus() {
    const [status, setStatus] = useState(getVideoLogSyncStatus);

    useEffect(() => {
        return subscribeVideoLogSyncStatus(setStatus);
    }, []);

    return status;
}
