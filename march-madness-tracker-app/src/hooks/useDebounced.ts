import { useEffect, useState } from 'react';

/** The value, but only after it has stayed the same for `ms`. Used so a run of clicks sends one request. */
export function useDebounced<T>(value: T, ms: number): T {
    const [settled, setSettled] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setSettled(value), ms);
        return () => clearTimeout(timer);
    }, [value, ms]);
    return settled;
}
