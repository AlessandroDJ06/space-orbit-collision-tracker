import './style.css';
import { OrbitGlobe } from './components/Globe';
import { fetchCelestrakTLEs } from './services/celestrakTle';
import { tleEntryToCelestrakTLE } from './services/celestrakFallback';
import { celestrakToSatelliteInput } from './services/celestrakMapper';
import { initOrbitEngine, loadSatellites } from './wasm/orbitEngine';
import type { DetectedPair } from './wasm/orbitEngine';
import { OnnxPredictor } from './services/modelRunner.ts';

const SATELLITE_GROUP = 'active';
const MAX_SATELLITES = 500;

const analysedPairs = new Map<number, string>();
const predictor = new OnnxPredictor();

async function loadRealSatellites(globe: OrbitGlobe) {
    const tleEntries = (await fetchCelestrakTLEs(SATELLITE_GROUP)).slice(0, MAX_SATELLITES);

    const satelliteInputs = tleEntries
        .map(tleEntryToCelestrakTLE)
        .filter((tle): tle is NonNullable<typeof tle> => tle !== null)
        .map(celestrakToSatelliteInput);

    await initOrbitEngine();
    loadSatellites(satelliteInputs);
    await predictor.loadModel('./model/collision_risk_classifier.onnx');

    globe.addSatellitesFromTLE(tleEntries);
}

async function handleDetectedPairs(pairs: DetectedPair[]) {
    for (const pair of pairs) {
        const input = new Float32Array([
            pair.missDistance,
            pair.relativeVelocity,
            pair.radialVelocity,
            pair.altitudeSat1,
            pair.altitudeSat2,
            pair.relativeIncline,
            pair.sat1Sma,
            pair.sat2Sma,
            pair.sat1Ecc,
            pair.sat2Ecc,
            pair.timeToTca
        ]);

        const prediction = await predictor.runInference(input, [1, 11]);
        const klassenNamen = ["Low Risk", "Medium Risk", "High Risk", "Critical"];
        const classIndex = prediction && prediction.length > 0 ? Math.round(Number(prediction[0])) : 0;
        const statusTekst = klassenNamen[classIndex] || "Onbekend";
        analysedPairs.set(pair.sat1Id, statusTekst);
        analysedPairs.set(pair.sat2Id, statusTekst);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const globe = new OrbitGlobe('cesiumContainer');
    await globe.whenReady();
    await loadRealSatellites(globe);
    globe.setRiskData(analysedPairs);

    globe.enableCollisionTracking(handleDetectedPairs);
});