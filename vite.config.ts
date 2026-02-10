import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync, renameSync, existsSync } from 'fs';
import manifest from './manifest.json';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    // Load env files properly
    const env = loadEnv(mode, process.cwd(), '');
    process.env = { ...process.env, ...env };

    const isDevelopment = mode === 'development';
    const key = manifest.key;

    const targetUrl = env.VITE_BASE_URL || 'https://baptizo.church.tools/';

    return defineConfig({
        // server for development mode
        server: {
            proxy: {
                '/api': {
                    target: targetUrl,
                    changeOrigin: true,
                    secure: false,
                }
            }
        },
        envDir: process.cwd(),
        define: {
            'import.meta.env.VITE_BASE_URL': JSON.stringify(env.VITE_BASE_URL || 'https://baptizo.church.tools/'),
            'import.meta.env.VITE_USERNAME': JSON.stringify(env.VITE_USERNAME || ''),
            'import.meta.env.VITE_PASSWORD': JSON.stringify(env.VITE_PASSWORD || ''),
            'import.meta.env.VITE_LOGIN_TOKEN': JSON.stringify(env.VITE_LOGIN_TOKEN || ''),
        },
        // Windows Build Guide: absolute base path for CT resource loading
        base: isDevelopment ? './' : `/ccm/${key}/`,
        build: {
            outDir: 'dist',
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index-legacy.html'),
                },
            },
            // Force inline of all assets to avoid 404s
            assetsInlineLimit: 100000000,
        },
        plugins: [
            vue(),
            // Copy manifest.json to dist after build
            {
                name: 'ct-post-build',
                closeBundle() {
                    try {
                        // 1. Copy manifest
                        const manifestSource = resolve(__dirname, 'manifest.json');
                        const manifestDest = resolve(__dirname, 'dist/manifest.json');
                        copyFileSync(manifestSource, manifestDest);
                        console.log('✓ Copied manifest.json to dist/');

                        // 2. Rename index-legacy.html → index.html (CT expects index.html)
                        const legacyHtml = resolve(__dirname, 'dist/index-legacy.html');
                        const indexHtml = resolve(__dirname, 'dist/index.html');
                        if (existsSync(legacyHtml)) {
                            renameSync(legacyHtml, indexHtml);
                            console.log('✓ Renamed index-legacy.html → index.html');
                        }
                    } catch (error) {
                        console.error('Failed to copy manifest.json:', error);
                    }
                },
            },
        ],
    });
};
