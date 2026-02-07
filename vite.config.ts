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

    return defineConfig({
        // Explicitly set envDir to project root to ensure .env is loaded
        envDir: process.cwd(),
        // Explicitly define env vars for client (workaround for Vite env loading issues)
        define: {
            'import.meta.env.VITE_BASE_URL': JSON.stringify(env.VITE_BASE_URL || 'https://baptizo.church.tools/'),
            'import.meta.env.VITE_USERNAME': JSON.stringify(env.VITE_USERNAME || ''),
            'import.meta.env.VITE_PASSWORD': JSON.stringify(env.VITE_PASSWORD || ''),
            'import.meta.env.VITE_LOGIN_TOKEN': JSON.stringify(env.VITE_LOGIN_TOKEN || ''),
        },
        // For development, use the ccm path
        // For production library builds, use relative paths so ChurchTools can control deployment location
        base: `/extensions/${key}/`,
        build: isDevelopment ? {} : (buildMode === 'advanced' ? advancedBuildConfig : simpleBuildConfig),
        plugins: isDevelopment ? [vue()] : [
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
