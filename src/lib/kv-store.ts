/**
 * KV-Store for Baptizo Admin Settings
 * Stores configuration IDs for groups, fields, and calendar.
 */

import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { BaptizoSettings } from '../types/baptizo-settings';

export interface AdminSettings {
    interestGroupId: string;
    baptizedGroupId: string;
    seminarDateId: string;
    baptismDateId: string;
    certificateDateId: string;
    integratedDateId: string;
    statusFieldId: string;
    calendarId: string;
}

const ADMIN_SETTINGS_KEY = 'baptizo-admin-settings';
const APP_SETTINGS_KEY = 'baptizo-app-settings';

/**
 * Get admin settings
 * Priority: 
 * 1. KV Store (Shared)
 * 2. localStorage (Local fallback if API 404s)
 * 3. Smart Discovery (Search by Name)
 * 4. Hardcoded Defaults (Test System Safety)
 */
export async function getAdminSettings(): Promise<AdminSettings | null> {
    // A. Development Mode
    if (import.meta.env.MODE === 'development') {
        const stored = localStorage.getItem(ADMIN_SETTINGS_KEY);
        return stored ? JSON.parse(stored) : null;
    }

    let settings: AdminSettings | null = null;

    // B. Shared Storage (KV Store)
    try {
        console.log('[Baptizo] Loading settings from /config/kv-store...');
        const response = await churchtoolsClient.get('/config/kv-store') as { data?: Array<{ key: string; value: string }> };
        const kvData = response?.data?.find((item: any) => item.key === ADMIN_SETTINGS_KEY);

        if (kvData?.value) {
            settings = JSON.parse(kvData.value);
            console.log('[Baptizo] Settings loaded from ChurchTools KV Store.');
        }
    } catch (error) {
        console.warn('[Baptizo] KV Store unreachable (404/403). Falling back to local/discovery.');
    }

    // C. Local Fallback (If KV Store failed or is empty)
    if (!settings) {
        const local = localStorage.getItem(ADMIN_SETTINGS_KEY);
        if (local) {
            settings = JSON.parse(local);
            console.log('[Baptizo] Settings recovered from localStorage.');
        }
    }

    // D. Smart Discovery (If still missing critical IDs)
    if (!settings || !settings.interestGroupId || !settings.baptizedGroupId) {
        console.log('[Baptizo] Critical IDs missing. Running Name-Based Discovery...');
        const discovered = await discoverDefaultSettings();
        if (discovered) {
            settings = { ...(settings || getDefaultAdminSettings()), ...discovered };
            console.log('[Baptizo] Applied discovered IDs:', discovered);
        }
    }

    // E. Hardcoded Fallback (Test System)
    if (!settings || !settings.interestGroupId || !settings.baptizedGroupId) {
        console.log('[Baptizo] Discovery failed. Using hardcoded test system defaults.');
        settings = getDefaultAdminSettings();
    }

    return settings;
}

/**
 * Save admin settings
 * Tries KV Store, falls back to localStorage if API is 404.
 */
export async function saveAdminSettings(settings: AdminSettings): Promise<boolean> {
    // 1. Always save to localStorage (Quick Persistence)
    localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));

    if (import.meta.env.MODE === 'development') return true;

    // 2. Try to save to ChurchTools (Shared)
    try {
        await churchtoolsClient.put('/config/kv-store', {
            key: ADMIN_SETTINGS_KEY,
            value: JSON.stringify(settings)
        });
        console.log('[Baptizo] Administrative settings saved to ChurchTools KV Store.');
        return true;
    } catch (error) {
        console.error('[Baptizo] KV Store Save Failed (404). Settings preserved in LOCAL browser (localStorage) only.');
        // We return true because they ARE saved locally for this user
        return true;
    }
}

/**
 * Auto-discover groups by EXACT name or obvious variations
 */
async function discoverDefaultSettings(): Promise<Partial<AdminSettings> | null> {
    try {
        // Fetch more groups to avoid pagination issues
        const groups = await churchtoolsClient.get<any[]>('/groups?limit=1000');
        const groupsArr = Array.isArray(groups) ? groups : (groups as any).data || [];

        console.log(`[Baptizo] Scanning ${groupsArr.length} groups for discovery...`);
        if (groupsArr.length > 0) {
            console.log('[Baptizo] Sample groups:', groupsArr.slice(0, 5).map((g: any) => g.name));
        }

        // Match specific names provided by user
        const interest = groupsArr.find((g: any) =>
            g.name === 'Taufmanager: Interessenten' ||
            g.name.toLowerCase().includes('interessenten')
        );
        const baptized = groupsArr.find((g: any) =>
            g.name === 'Taufmanager: Getauft' ||
            g.name.toLowerCase().includes('getauft')
        );

        // Calendar
        const calendars = await churchtoolsClient.get<any[]>('/calendars');
        const calArr = Array.isArray(calendars) ? calendars : (calendars as any).data || [];
        const calendar = calArr.find((c: any) =>
            c.name === 'Taufmanager' ||
            c.name.toLowerCase().includes('taufmanager')
        );

        if (interest || baptized || calendar) {
            const result: Partial<AdminSettings> = {};
            if (interest) result.interestGroupId = String(interest.id);
            if (baptized) result.baptizedGroupId = String(baptized.id);
            if (calendar) result.calendarId = String(calendar.id);
            return result;
        }
    } catch (e) {
        console.error('[Baptizo] Auto-discovery error:', e);
    }
    return null;
}

/**
 * Default IDs for the specific ChurchTools test system.
 * These act as a "last resort" if both KV Store and Discovery fail.
 */
export function getDefaultAdminSettings(): AdminSettings {
    return {
        interestGroupId: '13',
        baptizedGroupId: '16',
        seminarDateId: '',
        baptismDateId: '',
        certificateDateId: '',
        integratedDateId: '',
        statusFieldId: '',
        calendarId: '7'
    };
}

// App Settings (Dashboard Tab selection etc.)
export async function getAppSettings(): Promise<BaptizoSettings | null> {
    const local = localStorage.getItem(APP_SETTINGS_KEY);
    if (local) return JSON.parse(local);

    try {
        const response = await churchtoolsClient.get('/config/kv-store').catch(() => ({ data: [] })) as any;
        const kvData = response?.data?.find((item: any) => item.key === APP_SETTINGS_KEY);
        return kvData?.value ? JSON.parse(kvData.value) : null;
    } catch { return null; }
}

export async function saveAppSettings(settings: BaptizoSettings): Promise<boolean> {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    try {
        await churchtoolsClient.put('/config/kv-store', { key: APP_SETTINGS_KEY, value: JSON.stringify(settings) });
        return true;
    } catch { return true; }
}
