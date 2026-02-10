# 🪟 Windows Build Guide for ChurchTools Extensions

This guide is the **single source of truth** for building and deploying ChurchTools extensions on Windows. Follow it exactly. Every rule here was learned the hard way.

---

## 🚨 THE GOLDEN RULE: Use Standard HTML Entry Builds, NOT Library Mode

ChurchTools extensions **MUST** be built using Vite's standard **HTML entry point** mode.

### ✅ CORRECT: Standard HTML Entry Build
```typescript
// vite.config.ts
build: {
    outDir: 'dist',
    rollupOptions: {
        input: {
            main: resolve(__dirname, 'index-legacy.html'),
        },
    },
},
```
**Output:** `dist/index.html`, `dist/assets/main-HASH.js`, `dist/assets/main-HASH.css`

### ❌ WRONG: Library Mode Build — NEVER USE THIS FOR CT EXTENSIONS
```typescript
// DO NOT USE THIS — it causes "process is not defined" crashes
build: {
    lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        formats: ['es'],
        fileName: (format) => `extension.${format}.js`,
    },
},
```
**Why it fails:** Library mode does NOT replace `process.env.NODE_ENV` with `"production"`. Vue's runtime contains `process.env.NODE_ENV !== "production"` checks. In the browser, `process` doesn't exist → **ReferenceError: process is not defined**.

---

## 🛠️ The Complete Tech Stack

### 1. Vite Config (`vite.config.ts`)

The production config **must** have these three things:
1. **HTML entry point** via `rollupOptions.input` (NOT `lib`)
2. **Absolute base path** `/ccm/${key}/`
3. **Post-build plugin** to copy `manifest.json` and rename `index-legacy.html` → `index.html`

```typescript
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { copyFileSync, renameSync, existsSync } from 'fs';
import manifest from './manifest.json';

export default ({ mode }: { mode: string }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const isDevelopment = mode === 'development';
    const key = manifest.key;

    return defineConfig({
        base: isDevelopment ? './' : `/ccm/${key}/`,
        build: {
            outDir: 'dist',
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index-legacy.html'),
                },
            },
            assetsInlineLimit: 100000000,
        },
        plugins: [
            vue(),
            {
                name: 'ct-post-build',
                closeBundle() {
                    // Copy manifest.json
                    copyFileSync(
                        resolve(__dirname, 'manifest.json'),
                        resolve(__dirname, 'dist/manifest.json')
                    );
                    // Rename index-legacy.html → index.html
                    const src = resolve(__dirname, 'dist/index-legacy.html');
                    const dest = resolve(__dirname, 'dist/index.html');
                    if (existsSync(src)) renameSync(src, dest);
                },
            },
        ],
    });
};
```

### 2. Precise ZIP Structure (`dist/` Folder Wrapper)
ChurchTools expects a specific internal structure. The archive **MUST** contain a single root folder named `dist/`, which then contains your files.

```text
your-extension.zip
└── dist/
    ├── manifest.json
    ├── index.html          ← REQUIRED! Server error without it
    └── assets/
        ├── main-HASH.js
        └── main-HASH.css
```

### 3. Native Windows Tooling (`tar.exe`)
**ALWAYS** use `tar.exe`. **NEVER** use PowerShell's `Compress-Archive`.

```powershell
tar.exe -ac -f releases/baptizotaufmanager-COMMITID.zip dist
```

`Compress-Archive` creates ZIP files with non-standard headers or backslashes that the Linux-based ChurchTools server cannot interpret → "Missing index.html" errors.

### 4. Critical Environment Setup (.env Encoding)
Windows tools default to **UTF-16LE** encoding. Vite cannot read this.

- **Always** save `.env` files as **UTF-8**
- **Verify** in VS Code: check the encoding in the bottom status bar
- **Fix via PowerShell:**
  ```powershell
  [IO.File]::WriteAllText(".env", "VITE_KEY=value", [System.Text.Encoding]::UTF8)
  ```

---

## 🔥 Anti-Patterns — Things That WILL Break Your Build

### ❌ Adding `process.env` or `process` to `define` in `vite.config.ts`
```typescript
// ALL OF THESE ARE WRONG — they interfere with Vite's internal replacements
define: {
    'process.env': '({})',           // ← Breaks process.env.NODE_ENV replacement
    'process': '({ env: {} })',      // ← Same problem, broader scope
    'process.env': {},               // ← Vite stringifies this wrong
    'process.env.NODE_ENV': JSON.stringify('production'), // ← Unnecessary band-aid
}
```
**Why:** Vite's standard HTML build already handles `process.env.NODE_ENV` → `"production"` automatically. Adding custom `process` defines **interferes** with this mechanism and causes Vue's runtime check to reference a garbled/non-existent variable.

**The fix:** Don't define `process` at all. Just use the standard HTML entry build.

### ❌ Using CSS Injection Plugins with Standard HTML Builds
```typescript
// NOT NEEDED — Vite handles CSS automatically in HTML entry mode
{
    name: 'css-inject',
    generateBundle(opts, bundle) { /* ... inject CSS into JS ... */ }
}
```
**Why:** In standard HTML entry mode, Vite emits a separate CSS file and links it in the HTML automatically. CSS injection plugins are only needed for library mode (which you shouldn't use anyway).

### ❌ Manually Generating `index.html`
```typescript
// NOT NEEDED — Vite generates index.html from your input HTML
writeFileSync(indexDest, `<!DOCTYPE html>...`);
```
**Why:** When using `rollupOptions.input`, Vite transforms the input HTML and generates the output HTML with correct asset paths automatically. You only need to **rename** `index-legacy.html` → `index.html`.

### ❌ Using `base: './'` (Relative Paths) for Production
```typescript
// WRONG for CT production deployments
base: './',
```
**Why:** ChurchTools hosts extensions at `/ccm/your-key/`. Relative paths cause 404s for assets. Use `base: '/ccm/${key}/'` for production.

---

## 📐 Build Verification Checklist

Before uploading a ZIP, verify these:

1. **ZIP structure**: Run `tar.exe -tf your-extension.zip` and confirm `dist/index.html` exists
2. **No `process.env` in bundle**: Run `Select-String -Path dist/assets/main-*.js -Pattern "process\.env" -SimpleMatch` — should return **nothing**
3. **Bundle size**: Standard HTML build with Vue should be ~400-450 KB JS + ~50 KB CSS. If you see 700+ KB, you're probably in library mode with dev code included
4. **File structure matches working build**: Compare with `tar.exe -tf releases/baptizotaufmanager-v1.1.0-979aa41.zip`

---

## 💻 Quick Release Commands

```powershell
# 1. Build
npm run build

# 2. Verify
tar.exe -tf releases/baptizotaufmanager-v1.1.0-979aa41.zip  # compare structure

# 3. Commit & tag
git add . ; git commit -m "your message"
$commitId = git rev-parse --short HEAD

# 4. Package
tar.exe -ac -f "releases/baptizotaufmanager-$commitId.zip" dist

# 5. Push
git push origin willow
```

---

## 📜 Historical Wisdom

- **Clean Script:** Always use a Node-based clean script (`fs.rmSync`) instead of `rm -rf` for Windows compatibility.
- **Initialization:** `churchtoolsClient.setBaseUrl()` should be the first line of your entry point (`main-legacy.ts`).
- **Reference build:** `releases/baptizotaufmanager-v1.1.0-979aa41.zip` is the known-good reference. When in doubt, compare your output against it.

---

*Verified for ChurchTools Legacy Extensions (2026-02-11)*
*Last nightmare: Library mode build causing "process is not defined" — NEVER AGAIN*
