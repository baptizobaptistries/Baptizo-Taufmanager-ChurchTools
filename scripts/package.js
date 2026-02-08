#!/usr/bin/env node

/**
 * Professional Packaging Script for ChurchTools Extensions
 * Uses tar.exe (bsdtar) on Windows or zip on Mac/Linux for maximum compatibility.
 * Ensures the 'dist/' folder structure required by CT Legacy.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read info
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
let manifest;
try {
    manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
} catch (e) {
    console.warn('Warning: No manifest.json found at root');
}

const key = manifest?.key || packageJson.name;
const version = manifest?.version || packageJson.version;

// Get git commit hash
let gitHash = 'unknown';
try {
    gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (e) { }

const archiveName = `${key}-v${version}-${gitHash}.zip`;
const archivePath = path.join(rootDir, 'releases', archiveName);

console.log(`📦 Packaging ${key} v${version} (${gitHash})...`);

// Verify dist
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
    console.error('❌ Error: dist directory missing. Run build first.');
    process.exit(1);
}

// Ensure releases dir
const releasesDir = path.join(rootDir, 'releases');
if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
}

// Ensure manifest and index are in dist
if (!fs.existsSync(path.join(distDir, 'manifest.json')) || !fs.existsSync(path.join(distDir, 'index.html'))) {
    console.error('❌ Error: Required files (manifest.json, index.html) missing in dist/');
    process.exit(1);
}

try {
    console.log('   Creating archive with root dist/ folder...');

    if (process.platform === 'win32') {
        // Use Windows tar.exe (available in Win10+) for standard ZIP creation
        // We go to root and zip the 'dist' folder
        const tarCommand = `tar.exe -ac -f "${archivePath}" dist`;
        execSync(tarCommand, { cwd: rootDir, stdio: 'inherit' });
    } else {
        // Mac/Linux
        const zipCommand = `zip -r "${archivePath}" dist -x "*.map" "*.DS_Store"`;
        execSync(zipCommand, { cwd: rootDir, stdio: 'inherit' });
    }

    console.log(`✅ Success! Archive created at: ${archivePath}`);
    const stats = fs.statSync(archivePath);
    console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

} catch (error) {
    console.error('❌ Packaging failed:', error.message);
    process.exit(1);
}