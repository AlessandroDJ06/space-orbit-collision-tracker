import { getFallbackCelestrakData } from './celestrakFallback';

export interface CelestrakTLE {
    OBJECT_NAME: string;
    NORAD_CAT_ID: number;
    EPOCH: string;
    INCLINATION: number;
    RA_OF_ASC_NODE: number;
    ECCENTRICITY: number;
    ARG_OF_PERICENTER: number;
    MEAN_ANOMALY: number;
    MEAN_MOTION: number;
}

export async function fetchCelestrakGroup(group: string): Promise<CelestrakTLE[]> {
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`CelesTrak fetch failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

const CACHE_PREFIX = 'celestrak-cache-';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;

function safeCacheWrite(cacheKey: string, data: CelestrakTLE[]) {
    try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data }));
    } catch (e) {
        console.warn(`could not write cache '${cacheKey}':`, e);
    }
}

export async function fetchCelestrakGroupCached(group: string): Promise<CelestrakTLE[]> {
    const cacheKey = CACHE_PREFIX + group;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
        try {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL_MS) {
                return data;
            }
        } catch {
        }
    }

    try {
        const data = await fetchCelestrakGroup(group);
        safeCacheWrite(cacheKey, data);
        return data;
    } catch (e) {
        console.warn(`Live CelesTrak fetch mislukt voor groep '${group}', gebruik lokale fallback-dataset.`, e);
        return getFallbackCelestrakData();
    }
}