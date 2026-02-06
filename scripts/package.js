#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Read package.json for project info
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

// Read manifest.json for extension info
let manifest;
try {
    manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
} catch (error) {
    console.warn('Warning: Could not read manifest.json, using package.json');
}

const projectName = manifest?.key || packageJson.name;
const extensionName = manifest?.name || projectName;
const version = manifest?.version || packageJson.version;

// Get git commit hash (short)
let gitHash = '';
try {
    gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
    console.warn('Warning: Could not get git hash, using timestamp');
    gitHash = Date.now().toString(36);
}

// Create releases directory
const releasesDir = path.join(rootDir, 'releases');
if (!fs.existsSync(releasesDir)) {
    fs.mkdirSync(releasesDir, { recursive: true });
}

// Define archive name
const archiveName = `${projectName}-v${version}-${gitHash}.zip`;
const archivePath = path.join(releasesDir, archiveName);

console.log('📦 Creating ChurchTools extension package...');
console.log(`   Extension: ${extensionName}`);
console.log(`   Key: ${projectName}`);
console.log(`   Version: ${version}`);
console.log(`   Git Hash: ${gitHash}`);
console.log(`   Archive: ${archiveName}`);

// Check if dist directory exists
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
    console.error('❌ Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
}

// Check if manifest.json exists in dist
const distManifest = path.join(distDir, 'manifest.json');
if (!fs.existsSync(distManifest)) {
    console.error('❌ Error: manifest.json not found in dist. Make sure the build process copies it.');
    process.exit(1);
}
console.log('✓ manifest.json found in dist/');

try {
    // Create ZIP archive using system zip command
    // Create ZIP archive
    console.log('   Zipping...');
    if (process.platform === 'win32') {
        const powershellCommand = `powershell -Command "Compress-Archive -Path 'dist\\*' -DestinationPath '${archivePath}' -Force"`;
        execSync(powershellCommand, { stdio: 'inherit' });
    } else {
        // Use cd to flat zip the contents of dist
        const zipCommand = `cd dist && zip -r "${archivePath}" . -x "*.map" "*.DS_Store"`;
        execSync(zipCommand, { stdio: 'inherit' });
    }

    console.log('✅ Package created successfully!');
    console.log(`📁 Location: ${archivePath}`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Upload the ZIP file to your ChurchTools instance');
    console.log('   2. Go to Admin → Extensions → Upload Extension');
    console.log('   3. Select the ZIP file and install');
    console.log('');

    // Show file size
    const stats = fs.statSync(archivePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = (fileSizeInBytes / (1024 * 1024)).toFixed(2);
    console.log(`📊 Package size: ${fileSizeInMB} MB`);

} catch (error) {
    console.error('❌ Error creating package:', error.message);
    process.exit(1);
}