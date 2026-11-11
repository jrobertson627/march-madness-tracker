import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { clearListCache } from '../services/v1/client';

afterEach(() => {
    cleanup();
    clearListCache();
    vi.useRealTimers();
    vi.unstubAllGlobals();
});
