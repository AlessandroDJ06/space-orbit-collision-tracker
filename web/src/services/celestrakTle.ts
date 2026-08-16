import { getFallbackTleEntries } from './celestrakFallback';

export interface TleEntry {
    name: string;
    line1: string;
    line2: string;
}

function parseTleText(text: string): TleEntry[] {
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

export async function fetchCelestrakTLEs(group: string): Promise<TleEntry[]> {
    const staticUrl = `${import.meta.env.BASE_URL}data/celestrak-${group}.tle`;

    try {
        const response = await fetch(staticUrl);
        if (!response.ok) {
            throw new Error(`TLE-file not found: ${response.status}`);
        }
        const text = await response.text();
        return parseTleText(text);
    } catch (e) {
        return getFallbackTleEntries();
    }
}