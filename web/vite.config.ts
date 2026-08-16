import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
    base: '/space-orbit-collision-tracker/',
    plugins: [cesium()]
});