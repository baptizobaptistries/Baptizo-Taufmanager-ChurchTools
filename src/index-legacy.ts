import mainEntryPoint from './entry-points/main';
import adminEntryPoint from './entry-points/admin';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { EntryPoint } from './types/extension';

// Safe initialization helper
// In Legacy mode (Library), we must ensure the client has a Base URL
// because we are not using the standard renderExtension wrapper.
const safeInit = () => {
    // 1. Try window.settings (Standard CT injection)
    // 2. Try VITE_BASE_URL (Env var)
    // 3. Fallback to hardcoded URL (Safety net)
    const baseUrl = (window as any).settings?.base_url ?? import.meta.env.VITE_BASE_URL ?? 'https://baptizo.church.tools/';
    churchtoolsClient.setBaseUrl(baseUrl);
    console.log('[Baptizo Legacy] Initialized Client with Base URL:', baseUrl);
};

export const main: EntryPoint = (context) => {
    console.log('[Baptizo Legacy] Main Entry Point called');
    safeInit();
    try {
        return mainEntryPoint(context);
    } catch (error) {
        console.error('[Baptizo Legacy] Critical Error in Main:', error);
        context.element.innerHTML = `<div style="color:red; padding:20px;">
            <h3>Extension Error</h3>
            <p>${error instanceof Error ? error.message : String(error)}</p>
        </div>`;
    }
};

export const admin: EntryPoint = (context) => {
    console.log('[Baptizo Legacy] Admin Entry Point called');
    safeInit();
    return adminEntryPoint(context);
};
