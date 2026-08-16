declare module 'vite-plugin-cesium-next' {
    import type { Plugin } from 'vite';

    interface CesiumPluginOptions {
        cesiumBuildPath?: string;
        cesiumBaseUrl?: string;
        viteBase?: string;
        rebuildCesium?: boolean;
    }

    export default function cesium(options?: CesiumPluginOptions): Plugin;
}