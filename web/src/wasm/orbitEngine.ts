// @ts-ignore
import createOrbitModule from './orbit_engine.js';

export interface SatelliteInput {
    id: number;
    inclination: number;
    raan: number;
    eccentricity: number;
    argPerigee: number;
    meanAnomaly: number;
    meanMotion: number;
}

export interface DetectedPair {
    sat1Id: number;
    sat2Id: number;
    missDistance: number;
    relativeVelocity: number;
    radialVelocity: number;
    altitudeSat1: number;
    altitudeSat2: number;
    relativeIncline: number;
    sat1Sma: number;
    sat2Sma: number;
    sat1Ecc: number;
    sat2Ecc: number;
    timeToTca: number;
}

const SATELLITE_FIELD_COUNT = 7;
const PAIR_STRUCT_SIZE = 96;

let module: any = null;
let fns: {
    allocateSatellites: (count: number) => number;
    freeSatellites: () => void;
    processOrbits: (deltaTime: number) => void;
    getDetectedPairs: () => number;
    getDetectedPairCount: () => number;
} | null = null;

export async function initOrbitEngine() {
    module = await createOrbitModule();

    fns = {
        allocateSatellites: module.cwrap('allocate_satellites', 'number', ['number']),
        freeSatellites: module.cwrap('free_satellites', null, []),
        processOrbits: module.cwrap('process_orbits', null, ['number']),
        getDetectedPairs: module.cwrap('get_detected_pairs', 'number', []),
        getDetectedPairCount: module.cwrap('get_detected_pair_count', 'number', [])
    };

    return fns;
}

export function loadSatellites(satellites: SatelliteInput[]): number {
    if (!module || !fns) throw new Error('Orbit engine not found');

    const ptr = fns.allocateSatellites(satellites.length);
    const baseIndex = ptr / 8;

    satellites.forEach((sat, i) => {
        const offset = baseIndex + i * SATELLITE_FIELD_COUNT;
        module.HEAPF64[offset + 0] = sat.id;
        module.HEAPF64[offset + 1] = sat.inclination;
        module.HEAPF64[offset + 2] = sat.raan;
        module.HEAPF64[offset + 3] = sat.eccentricity;
        module.HEAPF64[offset + 4] = sat.argPerigee;
        module.HEAPF64[offset + 5] = sat.meanAnomaly;
        module.HEAPF64[offset + 6] = sat.meanMotion;
    });

    return ptr;
}

export function processOrbits(deltaTimeSec: number): DetectedPair[] {
    if (!module || !fns) throw new Error('Orbit engine not initialised');

    fns.processOrbits(deltaTimeSec);

    const pairsPtr = fns.getDetectedPairs();
    const pairCount = fns.getDetectedPairCount();

    const view = new DataView(module.HEAPU8.buffer);
    const results: DetectedPair[] = [];

    for (let i = 0; i < pairCount; i++) {
        const base = pairsPtr + i * PAIR_STRUCT_SIZE;
        results.push({
            sat1Id: view.getInt32(base + 0, true),
            sat2Id: view.getInt32(base + 4, true),
            missDistance: view.getFloat64(base + 8, true),
            relativeVelocity: view.getFloat64(base + 16, true),
            radialVelocity: view.getFloat64(base + 24, true),
            altitudeSat1: view.getFloat64(base + 32, true),
            altitudeSat2: view.getFloat64(base + 40, true),
            relativeIncline: view.getFloat64(base + 48, true),
            sat1Sma: view.getFloat64(base + 56, true),
            sat2Sma: view.getFloat64(base + 64, true),
            sat1Ecc: view.getFloat64(base + 72, true),
            sat2Ecc: view.getFloat64(base + 80, true),
            timeToTca: view.getFloat64(base + 88, true)
        });
    }

    return results;
}

export function cleanup() {
    fns?.freeSatellites();
}