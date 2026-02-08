import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync, existsSync, renameSync } from 'fs';
import manifest from './manifest.json';

// Configuration for legacy mode (Standard Vite Build for ChurchTools extension)
// Matches the structure of Michi's working build:
// - index.html in root (of dist)
// - assets/ folder with hashes
// - Base path: /ccm/baptizotaufmanager/
export default ({ mode }: { mode: string }) => {
    // Load env files
    const env = loadEnv(mode, process.cwd(), '');
    process.env = { ...process.env, ...env };

    const key = manifest.key;

    return defineConfig({
        envDir: process.cwd(),
        define: {
            'import.meta.env.VITE_BASE_URL': JSON.stringify(env.VITE_BASE_URL || 'https://baptizo.church.tools/'),
        },
        // CRITICAL: This matches the working build from Michi
        base: `/ccm/${key}/`,
        build: {
            // Standard build output (dist/assets/...)
            outDir: 'dist',
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index-legacy.html'),
                },
            },
            minify: true,
        },
        plugins: [
            vue(),

            // Serve index-legacy.html as the root index.html in dev mode
            {
                name: 'serve-legacy-as-index',
                configureServer(server) {
                    server.middlewares.use((req, res, next) => {
                        if (req.url) {
                            const url = new URL(req.url, `http://${req.headers.host}`);
                            if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
                                req.url = `/ccm/${key}/` + 'index-legacy.html' + url.search;
                            }
                        }
                        next();
                    });
                },
            },

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

            // Rename index-legacy.html to index.html
            {
                name: 'rename-legacy-index',
                closeBundle() {
                    const distIndexLegacy = resolve(__dirname, 'dist/index-legacy.html');
                    const distIndex = resolve(__dirname, 'dist/index.html');
                    if (existsSync(distIndexLegacy)) {
                        renameSync(distIndexLegacy, distIndex);
                        console.log('✓ Renamed index-legacy.html to index.html');
                    }
                },
            },
        ],
    });
};
