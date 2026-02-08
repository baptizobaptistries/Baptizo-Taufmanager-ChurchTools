/**
 * KV-Store for Baptizo Admin Settings
 * Stores configuration IDs for groups, fields, and calendar.
 */
import type { BaptizoSettings } from '../types/baptizo-settings';
import {
    getOrCreateModule,
    getCustomDataCategory,
    createCustomDataCategory,
    getCustomDataValues,
    createCustomDataValue,
    updateCustomDataValue
} from '../utils/kv-store';

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

const MODULE_KEY = 'baptizotaufmanager';
const SETTINGS_CATEGORY = 'settings';
const ADMIN_SETTINGS_KEY = 'baptizo-admin-settings'; // localStorage backup key

/**
 * Get admin settings
 * Priority: 
 * 1. Custom Modules API (Official)
 * 2. localStorage (Final Fallback)
 * 3. Defaults
 */
export async function getAdminSettings(): Promise<AdminSettings | null> {
    try {
        console.log('[Baptizo] Loading settings from /custommodules...');

        // 1. Ensure Module Exists
        const module = await getOrCreateModule(MODULE_KEY, 'Baptizo Taufmanager', 'Taufmanager Extension Configuration');

        // 2. Get Settings Category
        let category = await getCustomDataCategory(SETTINGS_CATEGORY);

        if (!category) {
            console.log('[Baptizo] Settings category not found. Returning defaults.');
            return getDefaultAdminSettings();
        }

        // 3. Get Values
        const values = await getCustomDataValues<any>(category.id, module.id);

        // Map values to AdminSettings object
        const settings: any = {};
        values.forEach(v => {
            // We assume the 'name' of the value is the key (e.g. 'interestGroupId')
            // But usually CustomDataValues have a 'name' field? 
            // The Boilerplate stores data in 'value' as JSON? 
            // Time-Tracker usage: One value named 'config' containing all settings?
            // OR individual values? 

            // LET'S USE A SINGLE VALUE named 'config' for simplicity and atomicity
            if (v.name === 'config') {
                Object.assign(settings, v);
            }
        });

        // If we found a config object, use it.
        if (Object.keys(settings).length > 0) {
            console.log('[Baptizo] Settings loaded from CustomModule.');
            // Remove metadata fields from the result object if they leaked in
            const { id, domainType, domainId, ...cleanSettings } = settings;
            return cleanSettings as AdminSettings;
        }

    } catch (error) {
        console.warn('[Baptizo] CustomModule API failed. Falling back to local.', error);
    }

    // Fallback: localStorage
    const local = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (local) {
        console.log('[Baptizo] Settings recovered from localStorage.');
        return JSON.parse(local);
    }

    return getDefaultAdminSettings();
}

/**
 * Save admin settings
 * Uses /custommodules API (and localStorage backup)
 */
export async function saveAdminSettings(settings: AdminSettings): Promise<boolean> {
    // 1. Always save to localStorage (Quick Persistence)
    localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));

    try {
        // 1. Ensure Module
        const module = await getOrCreateModule(MODULE_KEY, 'Baptizo Taufmanager', 'Taufmanager Extension Configuration');

        // 2. Ensure Category
        let category = await getCustomDataCategory(SETTINGS_CATEGORY);
        if (!category) {
            category = await createCustomDataCategory({
                customModuleId: module.id,
                name: 'Settings',
                shorty: SETTINGS_CATEGORY,
                description: 'Settings for Baptizo Taufmanager'
            }, module.id);
        }

        // 3. Save Config as a Single Value
        const values = await getCustomDataValues<any>(category.id, module.id);
        const configValue = values.find(v => v.name === 'config');

        const payloadToSave = { ...settings, name: 'config' };

        if (configValue) {
            // Update
            await updateCustomDataValue(category.id, configValue.id, {
                value: JSON.stringify(payloadToSave)
            }, module.id);
        } else {
            // Create
            await createCustomDataValue({
                dataCategoryId: category.id,
                value: JSON.stringify(payloadToSave)
            }, module.id);
        }

        console.log('[Baptizo] Settings saved to CustomModule API.');
        return true;

    } catch (error) {
        console.error('[Baptizo] Failed to save to CustomModule API.', error);
        return false;
    }
}

/**
 * Default IDs for the specific ChurchTools test system.
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

// App Settings (Dashboard Tab selection etc.) - reused logic
export async function getAppSettings(): Promise<BaptizoSettings | null> {
    // For now, keep simple localStorage for UI state
    const local = localStorage.getItem('baptizo-app-settings');
    return local ? JSON.parse(local) : null;
}

export async function saveAppSettings(settings: BaptizoSettings): Promise<boolean> {
    localStorage.setItem('baptizo-app-settings', JSON.stringify(settings));
    return true;
}
