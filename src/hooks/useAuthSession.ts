import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser, onAuthStateChange } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabaseClient';

export function useAuthSession() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(() => hasSupabaseConfig());

    useEffect(() => {
        let isMounted = true;

        if (!hasSupabaseConfig()) {
            return () => undefined;
        }

        void getCurrentUser()
            .then((currentUser) => {
                if (!isMounted) return;
                setUser(currentUser);
            })
            .catch((error) => {
                console.error('Failed to load Supabase user:', error);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        const unsubscribe = onAuthStateChange((nextUser) => {
            if (!isMounted) return;
            setUser(nextUser);
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    return {
        user,
        isLoading,
        isConfigured: hasSupabaseConfig(),
    };
}
