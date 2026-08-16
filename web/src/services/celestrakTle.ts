export interface TleEntry {
    name: string;
    line1: string;
    line2: string;
}

export async function fetchCelestrakTLEs(group: string): Promise<TleEntry[]> {
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`CelesTrak TLE fetch failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);

    const entries: TleEntry[] = [];
    for (let i = 0; i + 2 < lines.length + 1; i += 3) {
        entries.push({
            name: lines[i],
            line1: lines[i + 1],
            line2: lines[i + 2]
        });
    }

    return entries;
}