import { MAX_LOCKS } from './bracketModel';
import type { Lock } from './bracketModel';

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** [{round 1, game 3, duke}] -> "1-3:duke". Several are joined with commas. */
export function encodeLocks(locks: readonly Lock[]): string {
    return locks.map((l) => `${l.round}-${l.game}:${l.winner}`).join(',');
}

/**
 * Read locks back from a link. Anything that does not parse is ignored (a link can be edited by hand), a game
 * appears once (the first entry wins), and the list is capped at one tournament's worth of games.
 */
export function decodeLocks(text: string | null | undefined): Lock[] {
    if (!text) return [];
    const seen = new Set<string>();
    const out: Lock[] = [];
    for (const part of text.split(',')) {
        const m = /^(\d)-(\d{1,2}):(.+)$/.exec(part.trim());
        if (!m) continue;
        const round = Number(m[1]);
        const game = Number(m[2]);
        const winner = m[3];
        const slots = round === 0 ? 64 : 64 >> round;
        if (round > 6 || game >= slots || !SLUG.test(winner)) continue;
        const key = `${round}-${game}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ round, game, winner });
        if (out.length >= MAX_LOCKS) break;
    }
    return out;
}
