import type { CelestrakTLE } from './celestrak';
import type { SatelliteInput } from '../wasm/orbitEngine';

export function celestrakToSatelliteInput(tle: CelestrakTLE): SatelliteInput {
    return {
        id: tle.NORAD_CAT_ID,
        inclination: tle.INCLINATION,
        raan: tle.RA_OF_ASC_NODE,
        eccentricity: tle.ECCENTRICITY,
        argPerigee: tle.ARG_OF_PERICENTER,
        meanAnomaly: tle.MEAN_ANOMALY,
        meanMotion: tle.MEAN_MOTION
    };
}