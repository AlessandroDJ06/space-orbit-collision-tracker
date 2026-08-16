import type { CelestrakTLE } from './celestrak';
import type { TleEntry } from './celestrakTle';

const FALLBACK_URL = `${import.meta.env.BASE_URL}data/starlink-fallback.tle`;

let fallbackTextPromise: Promise<string> | null = null;

function loadFallbackText(): Promise<string> {
    if (!fallbackTextPromise) {
        fallbackTextPromise = fetch(FALLBACK_URL).then(res => {
            if (!res.ok) {
                throw new Error(`Fallback TLE not found: ${res.status}`);
            }
            return res.text();
        });
    }
    return fallbackTextPromise;
}

function splitIntoTleGroups(text: string): TleEntry[] {
    const lines = text.trim().split('\n').map(l => l.trimEnd()).filter(l => l.length > 0);
    const entries: TleEntry[] = [];

    for (let i = 0; i + 2 < lines.length + 1; i += 3) {
        entries.push({
            name: lines[i].trim(),
            line1: lines[i + 1],
            line2: lines[i + 2]
        });
    }

    return entries;
}

function parseEpochToISOString(line1: string): string {
    const epochField = line1.substring(18, 32).trim();
    const yy = parseInt(epochField.substring(0, 2), 10);
    const dayOfYear = parseFloat(epochField.substring(2));
    const year = yy < 57 ? 2000 + yy : 1900 + yy;

    const startOfYear = Date.UTC(year, 0, 1);
    const msIntoYear = (dayOfYear - 1) * 86400000;
    return new Date(startOfYear + msIntoYear).toISOString();
}

export function tleEntryToCelestrakTLE(entry: TleEntry): CelestrakTLE | null {
    const { line1, line2 } = entry;
    if (line1.length < 63 || line2.length < 63) return null;

    const noradId = parseInt(line1.substring(2, 7).trim(), 10);
    const inclination = parseFloat(line2.substring(8, 16));
    const raOfAscNode = parseFloat(line2.substring(17, 25));
    const eccentricity = parseFloat('0.' + line2.substring(26, 33).trim());
    const argOfPericenter = parseFloat(line2.substring(34, 42));
    const meanAnomaly = parseFloat(line2.substring(43, 51));
    const meanMotion = parseFloat(line2.substring(52, 63));

    if ([noradId, inclination, raOfAscNode, eccentricity, argOfPericenter, meanAnomaly, meanMotion]
        .some(v => Number.isNaN(v))) {
        return null;
    }

    return {
        OBJECT_NAME: entry.name,
        NORAD_CAT_ID: noradId,
        EPOCH: parseEpochToISOString(line1),
        INCLINATION: inclination,
        RA_OF_ASC_NODE: raOfAscNode,
        ECCENTRICITY: eccentricity,
        ARG_OF_PERICENTER: argOfPericenter,
        MEAN_ANOMALY: meanAnomaly,
        MEAN_MOTION: meanMotion
    };
}

export async function getFallbackTleEntries(): Promise<TleEntry[]> {
    const text = await loadFallbackText();
    return splitIntoTleGroups(text);
}

export async function getFallbackCelestrakData(): Promise<CelestrakTLE[]> {
    const entries = await getFallbackTleEntries();
    return entries
        .map(tleEntryToCelestrakTLE)
        .filter((tle): tle is CelestrakTLE => tle !== null);
}