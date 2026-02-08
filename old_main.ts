
import { renderExtension, loadEntryPoint } from './index';

// Simple logger that works before UI is ready
function log(msg: string) {
    console.log('[Legacy Main] ' + msg);
    try {
        const el = document.getElementById('init-log');
        if (el) el.innerHTML += msg + '<br>';
    } catch (e) { }
}

(async () => {
    try {
        log('Legacy entry point initializing...');

        // Wait for DOM
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        log('Loading "main" entry point...');
        const entryPoint = await loadEntryPoint('main');

        if (!entryPoint) {
            throw new Error('Entry point "main" returned null/undefined');
        }

        log('Entry point loaded. Mounting to #app...');
        await renderExtension('app', entryPoint, {});

        log('Mount successful');

        // Hide loader on success
        const loader = document.getElementById('init-loader');
        if (loader) loader.style.display = 'none';

    } catch (error: any) {
        console.error('Legacy main error:', error);
        log('ERROR: ' + error.message);

        const loader = document.getElementById('init-loader');
        if (loader) {
            loader.innerHTML += `<div style="color:red; margin-top:10px; font-weight:bold">CRITICAL ERROR: ${error.message}</div>`;
        }
    }
})();
