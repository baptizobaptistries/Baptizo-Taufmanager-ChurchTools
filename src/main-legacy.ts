import { createApp } from 'vue';
import Dashboard from './components/Dashboard.vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';

declare const window: Window &
    typeof globalThis & {
        settings?: {
            base_url?: string;
        };
    };

/**
 * Legacy Bootstrapper for ChurchTools CCM
 * This file replaces the complex renderExtension logic to avoid hangs in the legacy environment.
 */
console.log('[Baptizo Legacy] Initializing...');

const init = async () => {
    try {
        // 1. Initial setup (Goldstandard: setBaseUrl MUST be first)
        const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL ?? 'https://baptizo.church.tools/';
        churchtoolsClient.setBaseUrl(baseUrl);
        console.log('[Baptizo Legacy] Base URL:', baseUrl);

        // 2. Wait for DOM (Safety for legacy environments)
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        // 2. Simple mounting
        const app = createApp(Dashboard, {
            // We pass a minimal user object since Dashboard expects it
            user: {
                is_admin: true,
                firstName: 'User',
                lastName: ''
            },
            onNavigate: (target: string) => {
                console.log('[Baptizo Legacy] Navigating to:', target);
            }
        });

        app.mount('#app');
        console.log('[Baptizo Legacy] App mounted successfully');
    } catch (error) {
        console.error('[Baptizo Legacy] Critical Error during initialization:', error);
        const appEl = document.getElementById('app');
        if (appEl) {
            appEl.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
                <h2>Fehler beim Laden</h2>
                <p>${error instanceof Error ? error.message : String(error)}</p>
                <p>Bitte lade die Seite neu oder kontaktiere den Administrator.</p>
            </div>`;
        }
    }
};

init();
