import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync } from "fs";
import manifest from './manifest.json';

// Configuration for legacy mode (index-legacy.html)
// This serves the main entry point directly without the test environment
export default ({ mode }: { mode: string }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

    const key = manifest.key;

    return defineConfig({
        // Use relative path for legacy mode so it works regardless of the CT path
        base: './',
        build: {
            lib: {
                entry: resolve(__dirname, 'src/index.ts'),
                name: `ChurchToolsExtension_${key}`,
                formats: ['es'],
                fileName: () => 'extension.es.js',
            },
            rollupOptions: {
                output: {
                    // Inline all dynamic imports to create a single bundle
                    inlineDynamicImports: true,
                },
            },
        },
        plugins: [
            vue(),
            // Copy manifest.json to dist after build
            {
                name: 'copy-manifest',
                closeBundle() {
                    const manifestSource = resolve(__dirname, 'manifest.json');
                    const manifestDest = resolve(__dirname, 'dist/manifest.json');
                    try {
                        copyFileSync(manifestSource, manifestDest);
                        console.log('✓ Copied manifest.json to dist/');
                    } catch (error) {
                        console.error('Failed to copy manifest.json:', error);
                    }
                },
            },
        ],
    });
};
