import { defineConfig, loadEnv, type LibraryFormats } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync } from 'fs';
import manifest from './manifest.json';

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
    // Load env files properly
    const env = loadEnv(mode, process.cwd(), '');
    process.env = { ...process.env, ...env };


    const isDevelopment = mode === 'development';
    const key = manifest.key;
    const buildMode = env.VITE_BUILD_MODE || 'simple';

    // Create a unique global name for UMD based on the extension key
    // This prevents namespace collisions when multiple extensions are loaded
    const globalName = `ChurchToolsExtension_${key}`;

    console.log(`Building in ${buildMode} mode for key: ${key}`);

    // Simple mode: Single bundle with all entry points
    // Disable code splitting to bundle everything together
    const simpleBuildConfig = {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: globalName,
            formats: ['es'] as LibraryFormats[],
            fileName: (format: string) => `extension.${format}.js`,
        },
        rollupOptions: {
            output: {
                // Inline all dynamic imports to create a single bundle
                inlineDynamicImports: true,
            },
        },
    };

    // Advanced mode: Code splitting with dynamic imports
    const advancedBuildConfig = {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: globalName,
            formats: ['es'] as LibraryFormats[],
            fileName: (format: string) => `extension.${format}.js`,
        },
        rollupOptions: {
            output: {
                // Enable manual chunks for better code splitting
                manualChunks: undefined,
            },
        },
        // Enable code splitting for dynamic imports
        modulePreload: false,
        // Smaller chunk size threshold for better splitting
        chunkSizeWarningLimit: 100,
    };

    const targetUrl = env.VITE_BASE_URL || 'https://baptizo.church.tools/';

    return defineConfig({
        // server for development mode
        server: {
            proxy: {
                '/api': {
                    target: targetUrl,
                    changeOrigin: true,
                    secure: false, // In case of self-signed certs in dev
                }
            }
        },
        // Explicitly set envDir to project root to ensure .env is loaded
        envDir: process.cwd(),
        // Explicitly define env vars for client (ensures injection into the bundle)
        define: {
            'import.meta.env.VITE_BASE_URL': JSON.stringify(env.VITE_BASE_URL || 'https://baptizo.church.tools/'),
            'import.meta.env.VITE_USERNAME': JSON.stringify(env.VITE_USERNAME || ''),
            'import.meta.env.VITE_PASSWORD': JSON.stringify(env.VITE_PASSWORD || ''),
            'import.meta.env.VITE_LOGIN_TOKEN': JSON.stringify(env.VITE_LOGIN_TOKEN || ''),
        },
        // For production library builds, use relative paths or empty to allow loading from any location
        base: './',
        build: {
            ...(isDevelopment ? {} : (buildMode === 'advanced' ? advancedBuildConfig : simpleBuildConfig)),
            // Force inline of all assets (images, fonts, etc) to avoid 404s
            assetsInlineLimit: 100000000, // 100MB limit
            cssCodeSplit: false, // Force CSS to be gathered so we can inject it
        },
        plugins: isDevelopment ? [vue()] : [
            vue(),
            // Custom plugin to inject CSS into JS bundle
            {
                name: 'css-inject',
                apply: 'build',
                enforce: 'post',
                generateBundle(opts, bundle) {
                    let cssCode = '';
                    // Find all CSS files
                    for (const key in bundle) {
                        if (bundle[key].fileName.endsWith('.css') && bundle[key].type === 'asset') {
                            cssCode += (bundle[key] as any).source;
                            delete bundle[key]; // Remove the file so it's not emitted
                        }
                    }
                    if (cssCode) {
                        // Inject into the entry chunk
                        for (const key in bundle) {
                            if (bundle[key].type === 'chunk' && (bundle[key] as any).isEntry) {
                                const injectCode = `(function(){try{var elementStyle=document.createElement('style');elementStyle.appendChild(document.createTextNode(${JSON.stringify(cssCode)}));document.head.appendChild(elementStyle);}catch(e){console.error('vite-plugin-css-injected-by-js', e);}})();`;
                                (bundle[key] as any).code = injectCode + (bundle[key] as any).code;
                                break; // Only inject once (into the first entry found)
                            }
                        }
                        console.log('✓ Injected CSS into JS bundle');
                    }
                }
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
