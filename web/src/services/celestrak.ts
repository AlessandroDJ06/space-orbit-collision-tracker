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

    const staticUrl = `${import.meta.env.BASE_URL}data/celestrak-${group}.json`;

    try {
        const response = await fetch(staticUrl);
        if (!response.ok) {
            throw new Error(`Statisch JSON-bestand niet gevonden: ${response.status}`);
        }
        const data: CelestrakTLE[] = await response.json();
        safeCacheWrite(cacheKey, data);
        return data;
    } catch (e) {
        return getFallbackCelestrakData();
    }
}