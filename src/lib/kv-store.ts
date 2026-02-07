/**
 * KV-Store for Baptizo Admin Settings
 * Stores configuration IDs for groups, fields, and calendar.
 * 
 * Final v1 Mapping: 8 IDs total
 * - A. Container: 2 Groups (Interest, Baptized)
 * - B. Milestones: 4 Date Fields (Seminar, Baptism, Certificate, Integrated)
 * - C. Control: Status Field + Calendar
 */

import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { BaptizoSettings } from '../types/baptizo-settings';

export interface AdminSettings {
    // === A. CONTAINER (Gruppen) ===
    /** ID Gruppe: Interessenten */
    interestGroupId: string;
    /** ID Gruppe: Getaufte */
    baptizedGroupId: string;

    // === B. MEILENSTEINE (Alle Typ: Datum) ===
    /** ID Feld: Seminar (Datum) */
    seminarDateId: string;
    /** ID Feld: Taufe (Datum) */
    baptismDateId: string;
    /** ID Feld: Urkunde (Datum) */
    certificateDateId: string;
    /** ID Feld: Integration (Datum) */
    integratedDateId: string;

    // === C. STEUERUNG ===
    /** ID Feld: Aktiv/Inaktiv (Dropdown) - Pausiert-Status */
    statusFieldId: string;
    /** ID Kalender: Events */
    calendarId: string;
}

const ADMIN_SETTINGS_KEY = 'baptizo-admin-settings';
const APP_SETTINGS_KEY = 'baptizo-app-settings';

/**
 * Get admin settings from localStorage (dev) or ChurchTools KV store (prod)
 */
export async function getAdminSettings(): Promise<AdminSettings | null> {
    // In development, use localStorage
    if (import.meta.env.MODE === 'development') {
        const stored = localStorage.getItem(ADMIN_SETTINGS_KEY);
        return stored ? JSON.parse(stored) : null;
    }

    // In production, use ChurchTools KV store API
    try {
        const response = await churchtoolsClient.get('/api/config/kv-store') as { data?: Array<{ key: string; value: string }> };
        const kvData = response?.data?.find((item) => item.key === ADMIN_SETTINGS_KEY);
        return kvData?.value ? JSON.parse(kvData.value) : null;
    } catch (error) {
        console.error('[Baptizo] Failed to load admin settings from KV store:', error);
        return null;
    }
}

/**
 * Save admin settings to localStorage (dev) or ChurchTools KV store (prod)
 */
export async function saveAdminSettings(settings: AdminSettings): Promise<boolean> {
    // In development, use localStorage
    if (import.meta.env.MODE === 'development') {
        localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
        console.log('[Baptizo] Admin settings saved to localStorage');
        return true;
    }

    // In production, use ChurchTools KV store API
    try {
        await churchtoolsClient.put('/api/config/kv-store', {
            key: ADMIN_SETTINGS_KEY,
            value: JSON.stringify(settings)
        });
        console.log('[Baptizo] Admin settings saved to KV store');
        return true;
    } catch (error) {
        console.error('[Baptizo] Failed to save admin settings to KV store:', error);
        return false;
    }
}

/**
 * Get app settings from localStorage (dev) or ChurchTools KV store (prod)
 */
export async function getAppSettings(): Promise<BaptizoSettings | null> {
    if (import.meta.env.MODE === 'development') {
        const stored = localStorage.getItem(APP_SETTINGS_KEY);
        return stored ? JSON.parse(stored) : null;
    }

    try {
        const response = await churchtoolsClient.get('/api/config/kv-store') as { data?: Array<{ key: string; value: string }> };
        const kvData = response?.data?.find((item) => item.key === APP_SETTINGS_KEY);
        return kvData?.value ? JSON.parse(kvData.value) : null;
    } catch (error) {
        console.error('[Baptizo] Failed to load app settings from KV store:', error);
        return null;
    }
}

/**
 * Save app settings to localStorage (dev) or ChurchTools KV store (prod)
 */
export async function saveAppSettings(settings: BaptizoSettings): Promise<boolean> {
    if (import.meta.env.MODE === 'development') {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
        return true;
    }

    try {
        await churchtoolsClient.put('/api/config/kv-store', {
            key: APP_SETTINGS_KEY,
            value: JSON.stringify(settings)
        });
        return true;
    } catch (error) {
        console.error('[Baptizo] Failed to save app settings to KV store:', error);
        return false;
    }
}

/**
 * Get default empty settings (all 8 IDs)
 */
export function getDefaultAdminSettings(): AdminSettings {
    return {
        // A. Container
        interestGroupId: '',
        baptizedGroupId: '',
        // B. Meilensteine
        seminarDateId: '',
        baptismDateId: '',
        certificateDateId: '',
        integratedDateId: '',
        // C. Steuerung
        statusFieldId: '',
        calendarId: ''
    };
}
