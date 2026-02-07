# Error Analysis & Fix Documentation

**Context**: ChurchTools Extension (Legacy/IIFE Build)
**Issue**: Application failed to mount in ChurchTools context (blank screen, 404s on assets).
**Fix Provided By**: Michi (ChurchTools Support) via PR.

## 1. Root Cause Analysis

### A. Asset Path Resolution (The "Base" Issue)
*   **Problem**: In our original internal build, we set `base: '/ccm/baptizotaufmanager/'`.
    *   This works if the extension is strictly served from that exact path.
    *   However, ChurchTools extension loaders or proxies might serve the file from different contexts or dynamically rewrite URLs.
    *   Hardcoded absolute paths caused the browser to look for `src/main.ts` at the wrong root, leading to 404s.
*   **Solution**: Changed `vite.config.legacy.ts` to use `base: './'`.
    *   This forces Vite to generate **relative paths** for imports and assets.
    *   The browser resolves `./assets/script.js` relative to `index.html`, regardless of the actual URL displayed in the address bar.

### B. Entry Point Interface (The "Mounting" Issue)
*   **Problem**: We were using a "Self-Executing" application pattern.
    *   Our `main.ts` immediately called `createApp(...).mount('#app')`.
    *   ChurchTools Extensions spec expects an **Entry Point Module**.
    *   The host system (ChurchTools) wants to import the extension and *tell it* where to mount and pass context (User, API tokens, etc.).
    *   By auto-mounting, we were:
        1.  Racing against the DOM (element might not exist yet).
        2.  Missing context injection (we tried to hack it via `window.ChurchTools` globals).
*   **Solution**: Adopted the `src/entry-points/` architecture.
    *   Created `src/entry-points/main.ts` which exports a **function**:
        ```typescript
        const mainEntryPoint: EntryPoint = ({ element, user, emit }) => { ... }
        ```
    *   Created `src/entry-points/index.ts` to export a `registry`.
    *   This allows the loader (whether our `index-legacy.html` or the real CT loader) to:
        1.  Load the module.
        2.  Call `loadEntryPoint('main')`.
        3.  Execute the function with the correct DOM element and context.

## 2. Merge Confirmation

*   **PR Status**: We have merged `origin/pr/2`.
*   **Coverage**: This PR includes:
    *   The architectural fix (Entry Points).
    *   The build config fix (`base: './'`).
    *   Small fixes ("Kleinigkeiten") like `package.js` script updates and Admin UI polish found in `origin/pr/1`.
*   **Validation**:
    *   We compared `origin/pr/1` and `origin/pr/2` and confirmed `pr/2` is the latest, most complete version.
    *   We verified that our local data migration scripts (Typo Fix) were **preserved** during the merge.

## 3. Technical Summary for Michi
> "The issue was a combination of Absolute Base Paths breaking asset loading in the extension proxy, and the lack of a standard Entry Point function export. We were trying to auto-mount the Vue app, but the CT extension contract requires exporting a `mount` function (EntryPoint) to receive the container element and context properly. The PR aligned our project with the standard ChurchTools Extension architecture."
