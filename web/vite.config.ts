import { defineConfig } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
    base: '/space-orbit-collision-tracker/',
    plugins: [
        cesium()
    ],
    build: {
        target: 'esnext',
        cssMinify: false,
        rollupOptions: {
            external: [
                /satellite\.js\/wasm-build\/.*/
            ]
        }
    },
    optimizeDeps: {
        exclude: ['satellite.js']
    }
});