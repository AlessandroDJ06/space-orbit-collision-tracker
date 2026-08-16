import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import * as satellite from 'satellite.js';
import type { TleEntry } from '../services/celestrakTle';
import { processOrbits } from '../wasm/orbitEngine';
import type { DetectedPair } from '../wasm/orbitEngine';

export class OrbitGlobe {
    viewer!: Cesium.Viewer;
    private readyPromise: Promise<void>;
    private lastCollisionCheck = 0;
    private readonly COLLISION_CHECK_INTERVAL_SEC = 5;
    private activeRisks: Map<number, string> = new Map();
    private tooltipElement!: HTMLDivElement;

    constructor(containerId: string) {
        this.readyPromise = this.initializeViewer(containerId);
        this.initTooltipDOM(containerId);
    }

    private async initializeViewer(containerId: string) {
        const terrain = await Cesium.createWorldTerrainAsync();

        this.viewer = new Cesium.Viewer(containerId, {
            animation: false,
            timeline: false,
            baseLayerPicker: false,
            geocoder: false,
            infoBox: false,
            selectionIndicator: false,
            terrainProvider: terrain
        });

        // Optimaliseer resolutie voor mobiele schermen (PixelRatio)
        this.viewer.resolutionScale = window.devicePixelRatio > 1 ? window.devicePixelRatio : 1;

        const logo = document.querySelector('.cesium-viewer-bottom') as HTMLElement;
        if (logo) logo.style.display = 'none';

        this.initClickHandler();
    }

    private initTooltipDOM(containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.tooltipElement = document.createElement('div');
        this.tooltipElement.style.position = 'absolute';
        this.tooltipElement.style.zIndex = '1000';
        this.tooltipElement.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.tooltipElement.style.color = 'white';

        // Mobiel-vriendelijke styling (responsief & flexibel)
        this.tooltipElement.style.padding = '14px 18px';
        this.tooltipElement.style.borderRadius = '8px';
        this.tooltipElement.style.fontSize = '14px';
        this.tooltipElement.style.minWidth = '240px';
        this.tooltipElement.style.maxWidth = '90vw'; // Voorkom dat hij breder wordt dan het scherm op mobiel
        this.tooltipElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        this.tooltipElement.style.border = '1px solid #777';

        this.tooltipElement.style.pointerEvents = 'auto';
        this.tooltipElement.style.display = 'none';

        container.appendChild(this.tooltipElement);
    }

    private initClickHandler() {
        const handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);

        handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
            if (!movement || !movement.position) return;

            const pickedObject = this.viewer.scene.pick(movement.position);

            if (Cesium.defined(pickedObject) && pickedObject.id instanceof Cesium.Entity) {
                const entity = pickedObject.id;
                const satName = entity.name || 'Onbekend';

                // @ts-ignore
                const satId = entity.satId;

                const riskStatus = (satId !== undefined && this.activeRisks.has(satId))
                    ? this.activeRisks.get(satId)
                    : 'Safe / Low Risk';

                this.tooltipElement.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="font-size: 15px;">${satName}</strong>
                        <span id="closeTooltip" style="cursor: pointer; font-size: 18px; font-weight: bold; padding: 0 6px;">&times;</span>
                    </div>
                    ID: ${satId ?? 'N/A'}<br/>
                    Status: <span style="color: ${riskStatus?.includes('Safe') ? '#0ff' : '#ff4444'}; font-weight: bold;">${riskStatus}</span>
                `;

                this.tooltipElement.style.display = 'block';

                // Slimme positie bepaling: voorkom dat de box buiten het scherm valt op mobiel
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;

                let left = movement.position.x + 15;
                let top = movement.position.y + 15;

                // Als de box te ver naar rechts valt, zet hem links van de muis/touch
                if (left + 260 > screenWidth) {
                    left = screenWidth - 270;
                }
                // Als de box te ver naar onder valt, zet hem erboven
                if (top + 120 > screenHeight) {
                    top = movement.position.y - 130;
                }

                this.tooltipElement.style.left = `${Math.max(10, left)}px`;
                this.tooltipElement.style.top = `${Math.max(10, top)}px`;

                const closeBtn = document.getElementById('closeTooltip');
                if (closeBtn) {
                    closeBtn.onclick = () => {
                        this.tooltipElement.style.display = 'none';
                    };
                }
            } else {
                this.tooltipElement.style.display = 'none';
            }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    async whenReady() {
        return this.readyPromise;
    }

    addSatellitesFromTLE(tles: TleEntry[], sampleCount = 90) {
        if (!this.viewer) return;

        const now = new Date();
        const nowJulian = Cesium.JulianDate.fromDate(now);
        let maxPeriodSeconds = 0;

        // Detecteer of het om een mobiel apparaat gaat om de puntgrootte aan te passen
        const isMobile = window.innerWidth < 768;
        const pointPixelSize = isMobile ? 22 : 16; // Grotere bolletjes op mobiel voor betere touch-doelen

        for (let index = 0; index < tles.length; index++) {
            const tle = tles[index];
            let satrec;

            try {
                satrec = satellite.twoline2satrec(tle.line1, tle.line2);
                if (!satrec || satrec.error !== 0) continue;
            } catch (e) {
                continue;
            }

            const meanMotion = satrec.no;
            if (!meanMotion || meanMotion <= 0) continue;

            const periodSeconds = (2 * Math.PI / meanMotion) * 60;
            if (periodSeconds > maxPeriodSeconds) {
                maxPeriodSeconds = periodSeconds;
            }

            const positionProperty = new Cesium.SampledPositionProperty();
            let validSampleCount = 0;

            for (let i = 0; i <= sampleCount; i++) {
                const fraction = i / sampleCount;
                const offsetSeconds = fraction * periodSeconds;
                const sampleDate = new Date(now.getTime() + offsetSeconds * 1000);

                const posVel = satellite.propagate(satrec, sampleDate);
                if (!posVel || !posVel.position || typeof posVel.position === 'boolean') continue;

                const gmst = satellite.gstime(sampleDate);
                const ecf = satellite.eciToEcf(posVel.position, gmst);
                if (!ecf || isNaN(ecf.x) || isNaN(ecf.y) || isNaN(ecf.z)) continue;

                const cartesian = new Cesium.Cartesian3(
                    ecf.x * 1000,
                    ecf.y * 1000,
                    ecf.z * 1000
                );

                const sampleTime = Cesium.JulianDate.addSeconds(
                    nowJulian,
                    offsetSeconds,
                    new Cesium.JulianDate()
                );

                positionProperty.addSample(sampleTime, cartesian);
                validSampleCount++;
            }

            if (validSampleCount < 3) continue;

            positionProperty.setInterpolationOptions({
                interpolationDegree: 2,
                interpolationAlgorithm: Cesium.HermitePolynomialApproximation
            });

            const customSatId = index + 1;

            const satEntity = this.viewer.entities.add({
                name: tle.name,
                position: positionProperty,
                point: {
                    pixelSize: pointPixelSize, // Dynamisch aangepast voor mobiel/desktop
                    color: Cesium.Color.YELLOW,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2
                },
                path: {
                    resolution: 60,
                    material: new Cesium.PolylineGlowMaterialProperty({
                        glowPower: 0.15,
                        color: Cesium.Color.GREEN
                    }),
                    width: 1.5,
                    leadTime: periodSeconds / 2,
                    trailTime: periodSeconds / 2
                }
            });

            // @ts-ignore
            satEntity.satId = customSatId;

            if (index === 0) {
                this.viewer.trackedEntity = satEntity;
            }
        }

        this.viewer.clock.startTime = nowJulian.clone();
        this.viewer.clock.currentTime = nowJulian.clone();
        this.viewer.clock.stopTime = Cesium.JulianDate.addSeconds(nowJulian, maxPeriodSeconds > 0 ? maxPeriodSeconds : 3600, new Cesium.JulianDate());
        this.viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        this.viewer.clock.multiplier = 1;
        this.viewer.clock.shouldAnimate = true;
    }

    enableCollisionTracking(onCollisionDetected: (pairs: DetectedPair[]) => void) {
        if (!this.viewer) return;

        this.viewer.clock.onTick.addEventListener((clock) => {
            const simSeconds = Cesium.JulianDate.secondsDifference(
                clock.currentTime,
                clock.startTime
            );

            if (simSeconds - this.lastCollisionCheck < this.COLLISION_CHECK_INTERVAL_SEC) return;
            this.lastCollisionCheck = simSeconds;

            const pairs = processOrbits(simSeconds);

            if (pairs.length > 0) {
                onCollisionDetected(pairs);
            }
        });
    }

    public setRiskData(riskMap: Map<number, string>) {
        this.activeRisks = riskMap;
    }
}