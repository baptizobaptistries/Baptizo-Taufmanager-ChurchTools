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
        // Use absolute path to ensure assets load correctly regardless of document <base> tag
        base: `/ccm/${key}/`,
        build: {
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index-legacy.html'),
                },
                output: {
                    // Inline all dynamic imports to create a single bundle
                    inlineDynamicImports: true,
                    // Force a consistent filename without hash to simplify debugging (optional, but helpful)
                    entryFileNames: 'main.js',
                    assetFileNames: '[name].[ext]',
                    format: 'iife',
                    name: 'BaptizoTaufmanager', // Global variable name for IIFE
                },
            },
            // Output assets to root, not assets/ subdirectory
            assetsDir: '',
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
        ],
    });
};
