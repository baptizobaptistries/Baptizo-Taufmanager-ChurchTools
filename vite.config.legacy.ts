import { defineConfig, loadEnv, type LibraryFormats } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync, unlinkSync } from 'fs';
import manifest from './manifest.json';

// Configuration for legacy mode (index-legacy.html)
// This serves the main entry point directly without the test environment
export default ({ mode }: { mode: string }) => {
    // Load env files properly
    const env = loadEnv(mode, process.cwd(), '');
    process.env = { ...process.env, ...env };

    const key = manifest.key;

    return defineConfig({
        // Explicitly set envDir to project root
        envDir: process.cwd(),
        // Explicitly define env vars for client
        define: {
            'import.meta.env.VITE_BASE_URL': JSON.stringify(env.VITE_BASE_URL || 'https://baptizo.church.tools/'),
            'import.meta.env.VITE_USERNAME': JSON.stringify(env.VITE_USERNAME || ''),
            'import.meta.env.VITE_PASSWORD': JSON.stringify(env.VITE_PASSWORD || ''),
            'import.meta.env.VITE_LOGIN_TOKEN': JSON.stringify(env.VITE_LOGIN_TOKEN || ''),
        },
        // Use root path for legacy mode
        base: `/ccm/${key}/`,
        build: {
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index-legacy.html'),
                },
                output: {
                    // Inline all dynamic imports to create a single bundle
                    inlineDynamicImports: true,
                },
            },
        },
        plugins: [
            vue(),
            // Serve index-legacy.html as the root index.html in dev mode
            {
                name: 'serve-legacy-as-index',
                configureServer(server) {
                    server.middlewares.use((req, res, next) => {
                        // Rewrite requests to serve index-legacy.html
                        // get the path from the request. If it ends on / or /index.html, rewrite to index-legacy.html
                        // query parameters should be preserved
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
            // rename index-legacy.html to index.html in the dist folder after build
            {
                name: 'rename-legacy-index',
                closeBundle() {
                    const distIndexLegacy = resolve(__dirname, 'dist/index-legacy.html');
                    const distIndex = resolve(__dirname, 'dist/index.html');
                    try {
                        copyFileSync(distIndexLegacy, distIndex);
                        // remove the index-legacy.html file
                        try {
                            unlinkSync(distIndexLegacy);
                        } catch (e) {
                            console.error('Failed to unlink index-legacy.html:', e);
                        }
                        console.log('✓ Renamed index-legacy.html to index.html in dist/');
                    } catch (error) {
                        console.error('Failed to rename index-legacy.html:', error);
                    }
                },
            },
        ],
    });
};
