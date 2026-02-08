import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const possibleHtmlFiles = ['index-legacy.html', 'index.html'];

let legacyHtmlPath = null;
for (const f of possibleHtmlFiles) {
    const p = path.resolve(distDir, f);
    if (fs.existsSync(p)) {
        legacyHtmlPath = p;
        break;
    }
}

const finalHtmlPath = path.resolve(distDir, 'index.html');

console.log('🔄 Starting asset inlining process...');

if (!legacyHtmlPath) {
    console.error('❌ Error: No HTML file found in dist/ to inline. (Checked: index-legacy.html, index.html)');
    process.exit(1);
}

console.log(`📄 Found HTML at ${path.basename(legacyHtmlPath)}, processing...`);
let html = fs.readFileSync(legacyHtmlPath, 'utf-8');

/**
 * Recursively find all files in a directory
 */
function walkSync(dir, filelist = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            filelist = walkSync(filePath, filelist);
        } else {
            filelist.push(filePath);
        }
    });
    return filelist;
}

if (fs.existsSync(distDir)) {
    console.log('📂 Scanning dist directory for assets to inline...');
    const allFiles = walkSync(distDir);

    allFiles.forEach(filePath => {
        const file = path.basename(filePath);
        // Skip HTML and JSON files
        if (file.endsWith('.html') || file.endsWith('.json')) return;

        const content = fs.readFileSync(filePath, 'utf-8');

        if (file.endsWith('.js')) {
            console.log(`   📦 Processing JS: ${file}`);
            // Escape closing script tags to prevent breaking HTML
            const safeContent = content.replace(/<\/script>/g, '<\\/script>');

            // Regex to find script tag with this filename in src
            // It matches relative and absolute paths (including the /ccm/base/ prefix)
            const scriptRegex = new RegExp(`<script([^>]*)src=["'][^"']*?${file.replace(/\./g, '\\.')}["']([^>]*)><\/script>`, 'g');

            const originalLength = html.length;
            html = html.replace(scriptRegex, (match, p1, p2) => `<script${p1}${p2}>${safeContent}</script>`);

            if (html.length !== originalLength) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`   ✓ Inlined and removed ${file}`);
                } catch (e) {
                    console.warn(`   ⚠ Failed to remove ${file}:`, e.message);
                }
            } else {
                console.warn(`   ⚠ Could not inline ${file} (tag not found in HTML)`);
            }

        } else if (file.endsWith('.css')) {
            console.log(`   🎨 Processing CSS: ${file}`);
            const linkRegex = new RegExp(`<link[^>]*href=["'][^"']*?${file.replace(/\./g, '\\.')}["'][^>]*>`, 'g');

            const originalLength = html.length;
            html = html.replace(linkRegex, () => `<style>${content}</style>`);

            if (html.length !== originalLength) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`   ✓ Inlined and removed ${file}`);
                } catch (e) {
                    console.warn(`   ⚠ Failed to remove ${file}:`, e.message);
                }
            } else {
                console.warn(`   ⚠ Could not inline ${file} (tag not found in HTML)`);
            }
        }
    });
}

// Write to final index.html
fs.writeFileSync(finalHtmlPath, html);
console.log('✅ Inlined assets successfully.');

// Cleanup: remove index-legacy.html if it was the source and is different from index.html
if (path.basename(legacyHtmlPath) !== 'index.html') {
    try {
        fs.unlinkSync(legacyHtmlPath);
        console.log('🗑️  Removed source index-legacy.html');
    } catch (e) { }
}

// Final check: remove empty assets directory if it exists
const assetsDir = path.join(distDir, 'assets');
if (fs.existsSync(assetsDir) && fs.readdirSync(assetsDir).length === 0) {
    fs.rmdirSync(assetsDir);
    console.log('🗑️  Removed empty assets directory.');
}
