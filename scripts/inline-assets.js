import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const legacyHtmlPath = path.resolve(distDir, 'index-legacy.html');
const finalHtmlPath = path.resolve(distDir, 'index.html');

console.log('­ƒöä Starting asset inlining process...');

if (!fs.existsSync(legacyHtmlPath)) {
    console.error('ÔØî Error: index-legacy.html not found in dist:', legacyHtmlPath);
    process.exit(1);
}

console.log('­ƒôä Found legacy HTML, processing...');
let html = fs.readFileSync(legacyHtmlPath, 'utf-8');

// Find JS and CSS files in dist (flat structure)
const assetsDir = distDir;
if (fs.existsSync(assetsDir)) {
    console.log('­ƒôé Dist directory found, scanning for assets...');
    const files = fs.readdirSync(assetsDir);

    files.forEach(file => {
        // Skip HTML and JSON files
        if (file.endsWith('.html') || file.endsWith('.json')) return;

        const filePath = path.join(assetsDir, file);
        if (fs.statSync(filePath).isDirectory()) return; // Skip directories like screenshots

        const content = fs.readFileSync(filePath, 'utf-8');

        if (file.endsWith('.js')) {
            console.log(`   ­ƒôª Processing JS: ${file}`);
            // Escape closing script tags
            const safeContent = content.replace(/<\/script>/g, '<\\/script>');
            // Preserve attributes like type="module"
            const scriptRegex = new RegExp(`<script([^>]*)src=["'].*?${file}["']([^>]*)><\/script>`, 'g');

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
            console.log(`   ­ƒÄ¿ Processing CSS: ${file}`);
            const linkRegex = new RegExp(`<link[^>]*href=["'].*?${file}["'][^>]*>`, 'g');

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
} else {
    console.warn('ÔÜá´©Å Warning: No assets directory found to inline.');
}

// Write to index.html
fs.writeFileSync(finalHtmlPath, html);
console.log('Ô£à Inlined assets and wrote to dist/index.html');

// Delete legacy HTML and Assets folder (cleanup)
try {
    fs.unlinkSync(legacyHtmlPath);
    console.log('­ƒùæ´©Å  Removed index-legacy.html');

    // Optional: remove assets dir if purely inlined
    // fs.rmSync(assetsDir, { recursive: true, force: true });
} catch (e) {
    console.warn('ÔÜá´©Å Could not remove index-legacy.html', e);
}
