import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { ProfileSettings } from '../lib/kv-store';

export interface ProvisioningStatus {
    interestGroup: boolean;
    baptizedGroup: boolean;
    calendar: boolean;
    fields: {
        onboarding: boolean;
        seminar: boolean;
        taufe: boolean;
        urkunde: boolean;
        integration: boolean;
        offboarding: boolean;
        status: boolean;
    };
}

export class SetupService {
    private suffix: string = '';

    constructor(suffix: string = '') {
        this.suffix = suffix;
    }

    /**
     * Checks which assets already exist in ChurchTools (by name match + suffix)
     */
    async getProvisioningStatus(settings: ProfileSettings): Promise<ProvisioningStatus> {
        const status: ProvisioningStatus = {
            interestGroup: false,
            baptizedGroup: false,
            calendar: false,
            fields: {
                onboarding: false,
                seminar: false,
                taufe: false,
                urkunde: false,
                integration: false,
                offboarding: false,
                status: false
            }
        };

        try {
            // 1. Check Groups
            if (settings.interestGroupId) {
                try { await churchtoolsClient.get(`/groups/${settings.interestGroupId}`); status.interestGroup = true; } catch (e) { }
            }
            if (settings.baptizedGroupId) {
                try { await churchtoolsClient.get(`/groups/${settings.baptizedGroupId}`); status.baptizedGroup = true; } catch (e) { }
            }

            // 2. Check Calendar
            if (settings.calendarId) {
                try { await churchtoolsClient.get(`/calendars/${settings.calendarId}`); status.calendar = true; } catch (e) { }
            }

            // 3. Check Fields
            const fieldsRes = await churchtoolsClient.get<any[]>('/fields');
            const fields = Array.isArray(fieldsRes) ? fieldsRes : ((fieldsRes as any).data || []);

            const checkField = (key: string) => fields.some((f: any) => f.key === key || f.column === key);

            status.fields.onboarding = checkField('taufmanager_onboarding' + this.suffix);
            status.fields.seminar = checkField('taufmanager_seminar' + this.suffix);
            status.fields.taufe = checkField('taufmanager_taufe' + this.suffix);
            status.fields.urkunde = checkField('taufmanager_urkunde' + this.suffix);
            status.fields.integration = checkField('taufmanager_integration' + this.suffix);
            status.fields.offboarding = checkField('taufmanager_offboarding' + this.suffix);
            status.fields.status = checkField('taufmanager_status' + this.suffix);

        } catch (error) {
            console.error('[Baptizo] Error checking provisioning status:', error);
        }

        return status;
    }

    /**
     * Creates all missing assets and returns the updated settings
     */
    async runFullSetup(currentSettings: ProfileSettings): Promise<ProfileSettings> {
        const newSettings = { ...currentSettings };

        // 1. Groups
        if (!newSettings.interestGroupId) {
            newSettings.interestGroupId = String(await this.createGroup(`Taufmanager: Interessenten${this.suffix}`));
        }
        if (!newSettings.baptizedGroupId) {
            newSettings.baptizedGroupId = String(await this.createGroup(`Taufmanager: Getauft${this.suffix}`));
        }

        // 2. Calendar
        if (!newSettings.calendarId) {
            newSettings.calendarId = String(await this.createCalendar(`Taufmanager${this.suffix}`));
        }

        // 3. Person Fields
        await this.ensurePersonFields();

        // We don't necessarily update IDs for fields in settings because 
        // the app uses the 'taufmanager_{key}' naming convention anyway, 
        // but we could store the IDs if needed for future proofing.

        return newSettings;
    }

    private async createGroup(name: string): Promise<number> {
        console.log(`[Baptizo] Creating Group: ${name}`);
        const res = await churchtoolsClient.post('/groups', {
            name: name,
            information: {
                groupTypeId: 3, // Dienstgruppe
                groupCategoryId: 3, // Standard? 
                color: 'blue'
            }
        });
        return (res as any).id || (res as any).data?.id;
    }

    private async createCalendar(name: string): Promise<number> {
        console.log(`[Baptizo] Creating Calendar: ${name}`);
        const res = await churchtoolsClient.post('/calendars', {
            name: name,
            color: '#3E70CE',
            isPublic: true
        });
        return (res as any).id || (res as any).data?.id;
    }

    private async ensurePersonFields(): Promise<void> {
        const fields = [
            { key: 'taufmanager_onboarding', name: 'Taufmanager: Onboarding', type: 'date' },
            { key: 'taufmanager_seminar', name: 'Taufmanager: Seminar', type: 'date' },
            { key: 'taufmanager_taufe', name: 'Taufmanager: Taufe', type: 'date' },
            { key: 'taufmanager_urkunde', name: 'Taufmanager: Urkunde', type: 'date' },
            { key: 'taufmanager_integration', name: 'Taufmanager: Integration', type: 'date' },
            { key: 'taufmanager_offboarding', name: 'Taufmanager: Offboarding', type: 'date' },
            {
                key: 'taufmanager_status',
                name: 'Taufmanager: Status',
                type: 'select',
                options: [
                    { id: '4', name: 'Aktiv', sortKey: 1 },
                    { id: '5', name: 'Inaktiv', sortKey: 2 }
                ]
            }
        ];

        for (const f of fields) {
            const fullKey = f.key + this.suffix;
            const fullName = f.name + (this.suffix ? ` (${this.suffix})` : '');

            try {
                console.log(`[Baptizo] Creating Field: ${fullKey}`);
                await churchtoolsClient.post('/fields', {
                    key: fullKey,
                    name: fullName,
                    nameTranslated: fullName,
                    shorty: fullName,
                    fieldCategoryCode: 'f_church',
                    fieldTypeCode: f.type,
                    isActive: true,
                    secLevel: 3,
                    nullable: true,
                    options: (f as any).options || []
                });
            } catch (e: any) {
                if (e.response?.status === 409) {
                    console.log(`[Baptizo] Field ${fullKey} already exists.`);
                } else {
                    console.error(`[Baptizo] Failed to create field ${fullKey}:`, e.message);
                }
            }
        }
    }
}
