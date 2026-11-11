import { useEffect } from 'react';

import { warmUp } from '../services/v1/client';

/** Ask the server to wake up as soon as the app opens, so it is usually ready by the time someone picks a team. */
export function useWarmUp(): void {
    useEffect(() => {
        void warmUp();
    }, []);
}
