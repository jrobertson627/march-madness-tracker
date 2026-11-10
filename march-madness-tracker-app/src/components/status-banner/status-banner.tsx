import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';

import type { ApiStatus } from '../../hooks/useApi';
import { describeError } from '../../services/v1/client';
import type { ApiError } from '../../services/v1/client';

interface StatusBannerProps {
    status: ApiStatus;
    error: ApiError | null;
    onRetry?: () => void;
}

/** "The server is starting" while a request is slow, and a plain error with a Retry button when it fails. */
export default function StatusBanner({ status, error, onRetry }: StatusBannerProps) {
    if (status === 'loading') return <LinearProgress aria-label="Loading" />;
    if (status === 'waking') {
        return (
            <>
                <Alert severity="info" role="status">
                    The server is starting up. It sleeps when nobody has used it for a while, so the first request can take up to a minute.
                </Alert>
                <LinearProgress aria-label="Loading" />
            </>
        );
    }
    if (status === 'error' && error) {
        return (
            <Alert
                severity="error"
                action={
                    onRetry && error.retryable ? (
                        <Button color="inherit" size="small" onClick={onRetry}>
                            Retry
                        </Button>
                    ) : undefined
                }
            >
                {describeError(error)}
            </Alert>
        );
    }
    return null;
}
