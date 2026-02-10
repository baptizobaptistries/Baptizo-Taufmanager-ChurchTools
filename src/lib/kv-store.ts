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

export type EnvironmentProfile = 'development' | 'end-user';

export interface ProfileSettings {
    interestGroupId: string;
    baptizedGroupId: string;
    seminarDateId: string;
    baptismDateId: string;
    certificateDateId: string;
    integratedDateId: string;
    onboardingDateId: string;
    offboardingDateId: string;
    statusFieldId: string;
    calendarId: string;
}

export interface AdminSettings {
    activeProfile: EnvironmentProfile;
    development: ProfileSettings;
    'end-user': ProfileSettings;
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

        let remoteSettings: any = null;

        if (category) {
            // 3. Get Values
            const values = await getCustomDataValues<any>(category.id, module.id);
            // Distinguish by 'name' property inside the JSON payload
            const configValue = values.find(v => v.name === 'config');
            if (configValue && configValue.value) {
                try {
                    remoteSettings = JSON.parse(configValue.value);
                } catch (e) {
                    console.error('[Baptizo] Error parsing remote config JSOn', e);
                }
            }
        }

        // 4. Fallback to localStorage if remote failed
        if (!remoteSettings) {
            const local = localStorage.getItem(ADMIN_SETTINGS_KEY);
            if (local) {
                remoteSettings = JSON.parse(local);
            }
        }

        // 5. Migration & Defaults logic
        if (!remoteSettings) {
            return getDefaultAdminSettings();
        }

        // Check if it's the old flat structure
        if (remoteSettings.interestGroupId && !remoteSettings.activeProfile) {
            console.log('[Baptizo] Migrating flat settings to Development profile...');
            const defaults = getDefaultAdminSettings();

            // Map old flat keys to Development profile
            const migrated: AdminSettings = {
                activeProfile: 'development',
                development: {
                    interestGroupId: remoteSettings.interestGroupId || defaults.development.interestGroupId,
                    baptizedGroupId: remoteSettings.baptizedGroupId || defaults.development.baptizedGroupId,
                    seminarDateId: remoteSettings.seminarDateId || '',
                    baptismDateId: remoteSettings.baptismDateId || '',
                    certificateDateId: remoteSettings.certificateDateId || '',
                    integratedDateId: remoteSettings.integratedDateId || '',
                    onboardingDateId: '',
                    offboardingDateId: '',
                    statusFieldId: remoteSettings.statusFieldId || '',
                    calendarId: remoteSettings.calendarId || defaults.development.calendarId,
                },
                'end-user': { ...defaults['end-user'] }
            };
            return migrated;
        }

        // Return as is if it's the new structure
        return remoteSettings as AdminSettings;

    } catch (error) {
        console.warn('[Baptizo] CustomModule API failed completely.', error);
        return getDefaultAdminSettings();
    }
}

/**
 * Convenient helper to get only the flat settings of the ACTIVE profile.
 * Useful for all services that don't care about the profile structure itself.
 */
export async function getActiveAdminSettings(): Promise<ProfileSettings> {
    const settings = await getAdminSettings();
    const defaults = getDefaultAdminSettings();
    if (!settings) return defaults.development;

    return settings[settings.activeProfile] || settings.development || defaults.development;
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

        if (configValue) {
            // Update: Payload is the settings object + name tag
            const payload = { ...settings, name: 'config' };
            await updateCustomDataValue(category.id, configValue.id, {
                value: JSON.stringify(payload)
            }, module.id);
        } else {
            // Create: Payload is the settings object + name tag
            const payload = { ...settings, name: 'config' };
            await createCustomDataValue({
                dataCategoryId: category.id,
                value: JSON.stringify(payload)
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
    const devProfile: ProfileSettings = {
        interestGroupId: '13',
        baptizedGroupId: '16',
        seminarDateId: '',
        baptismDateId: '',
        certificateDateId: '',
        integratedDateId: '',
        onboardingDateId: '',
        offboardingDateId: '',
        statusFieldId: '',
        calendarId: '7'
    };

    const endUserProfile: ProfileSettings = {
        interestGroupId: '',
        baptizedGroupId: '',
        seminarDateId: '',
        baptismDateId: '',
        certificateDateId: '',
        integratedDateId: '',
        onboardingDateId: '',
        offboardingDateId: '',
        statusFieldId: '',
        calendarId: ''
    };

    return {
        activeProfile: 'development',
        development: devProfile,
        'end-user': endUserProfile
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
