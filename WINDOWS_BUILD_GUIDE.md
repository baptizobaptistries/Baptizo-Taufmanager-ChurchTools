# 🪟 Windows Build Guide for ChurchTools Extensions

This guide is for developers building ChurchTools extensions on **Windows**. It solves the persistent "Black Screen", "MIME Type Error", and "Missing index.html" issues that often occur due to Windows-specific shell behavior and non-standard ZIP compression.

---

## 🛠️ The "Gold Standard" Tech Stack
To ensure your extension works on the ChurchTools server, you must strictly follow these three architectural requirements.

### 1. Absolute Base Paths (Vite Config)
ChurchTools hosts extensions in a nested path (e.g., `https://yourdomain.church.tools/ccm/your-extension/`). Using relative paths (`./`) in your build will cause 404 errors for assets.

**Solution:** Set the `base` in your `vite.config.ts` to the absolute path of your extension.

```typescript
// vite.config.ts
import manifest from './manifest.json';
const key = manifest.key; // e.g., 'baptizotaufmanager'

export default defineConfig({
  base: `/ccm/${key}/`, // CRITICAL: Standard for CT resource loading
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index-legacy.html'),
      },
    },
  },
});
```

### 2. Precise ZIP Structure (`dist/` Folder Wrapper)
ChurchTools expects a specific internal structure when uploading a ZIP. The archive **MUST** contain a single root folder named `dist/`, which then contains your files.

**Archive Internal Layout:**
```text
your-extension.zip
└── dist/
    ├── manifest.json
    ├── index.html
    └── assets/
        ├── main-hash.js
        └── main-hash.css
```

### 3. Native Windows Tooling (`tar.exe`)
Avoid PowerShell's `Compress-Archive`. It often creates ZIP files with non-standard headers or backslashes (`\`) that the Linux-based ChurchTools server cannot interpret, leading to "Missing index.html" errors even if the file is there.

**Solution:** Use `tar.exe` (available in Windows 10/11) as it provides standard `bsdtar` compatibility.

---

## 💻 Implementation: `scripts/package.js`

Use this Node.js script to automate the packaging. It handles the `dist/` wrapper and uses `tar.exe` for the actual compression.

```javascript
// scripts/package.js
import { execSync } from 'child_process';
import path from 'path';

// ... (setup paths and manifest info)

try {
  if (process.platform === 'win32') {
    // -a: auto-compress (uses .zip format)
    // -c: create
    // -f: file
    // This command zips the 'dist' folder itself into the archive root
    const tarCommand = `tar.exe -ac -f "${archivePath}" dist`;
    execSync(tarCommand, { cwd: rootDir, stdio: 'inherit' });
  } else {
    // Mac/Linux fallback
    const zipCommand = `zip -r "${archivePath}" dist -x "*.map" "*.DS_Store"`;
    execSync(zipCommand, { cwd: rootDir, stdio: 'inherit' });
  }
} catch (error) {
  console.error('Packaging failed:', error.message);
}
```

---

## 🧪 Common Pitfalls & MIME Errors

If you see: `Loading module from "..." was blocked because of a disallowed MIME type ("text/html")`
*   **Cause:** The server returned a 404 page (HTML) instead of your JS file.
*   **Reason:** Usually an incorrect `base` path in Vite or a malformed ZIP structure that prevents the server from finding the files.
*   **Check:** Verify your `index.html` has absolute paths like `/ccm/your-key/assets/main.js`.

---

## 📜 Historical Wisdom (Maintenance)
*   **Clean Script:** Always use a Node-based clean script (`fs.rmSync`) instead of `rm -rf` to ensure Windows compatibility.
*   **Initialization:** Manual client initialization (`churchtoolsClient.setBaseUrl()`) should be the first line of your entry point (`main-legacy.ts`) to prevent silent failures in the legacy environment.

---

*Verified for ChurchTools Legacy Extensions (2026)*
