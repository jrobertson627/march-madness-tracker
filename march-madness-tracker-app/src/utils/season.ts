/** The season to show: the one in the link if it has predictions, otherwise the newest. Null until the list is known. */
export function pickSeason(param: string | null | undefined, available: readonly number[], latest: number | null): number | null {
    const wanted = param ? Number(param) : NaN;
    if (Number.isInteger(wanted) && available.includes(wanted)) return wanted;
    return latest;
}
