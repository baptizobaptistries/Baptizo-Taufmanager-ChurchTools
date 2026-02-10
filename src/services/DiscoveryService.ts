import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { AdminSettings } from '../lib/kv-store';

/**
 * Service to automatically discover IDs for groups, calendars, and fields
 * in a new ChurchTools environment.
 */
export class DiscoveryService {

    async discoverIds(): Promise<Partial<AdminSettings>> {
        const discovered: Partial<AdminSettings> = {};

        console.log('[Baptizo] Starting robust discovery (V2)...');

        // 1. Discover Groups
        try {
            const groupsRes = await churchtoolsClient.get<any>('/groups?limit=100');
            const allGroups = Array.isArray(groupsRes) ? groupsRes : (groupsRes.data || []);

            const interest = allGroups.find((g: any) => g.name === 'Interessenten' || g.name === 'Taufmanager: Interessenten');
            if (interest) discovered.interestGroupId = String(interest.id);

            const baptized = allGroups.find((g: any) => g.name === 'Getauft' || g.name === 'Taufmanager: Getauft');
            if (baptized) discovered.baptizedGroupId = String(baptized.id);

            console.log('[Baptizo] Groups discovery successful.');
        } catch (e: any) {
            console.error('[Baptizo] Groups discovery failed:', e.message);
        }

        // 2. Discover Calendar
        try {
            const calRes = await churchtoolsClient.get<any>('/calendars');
            const allCals = Array.isArray(calRes) ? calRes : (calRes.data || []);
            const cal = allCals.find((c: any) => c.name === 'Taufmanager');
            if (cal) discovered.calendarId = String(cal.id);
            console.log('[Baptizo] Calendar discovery successful.');
        } catch (e: any) {
            console.error('[Baptizo] Calendar discovery failed:', e.message);
        }

        // 3. Discover Person Fields & Status Options via /dbfields
        try {
            // Using /dbfields with include[]=options to get selection values
            const fieldsRes = await churchtoolsClient.get<any>('/dbfields?include[]=options');
            const allFields = Array.isArray(fieldsRes) ? fieldsRes : (fieldsRes.data || []);

            // In /dbfields, the internal key (e.g. taufmanager_seminar) is usually in 'shorty'
            const findField = (key: string) => allFields.find((f: any) => f.shorty === key || f.column === key);

            const onboard = findField('taufmanager_onboarding');
            if (onboard) discovered.onboardingDateId = String(onboard.id);

            const seminar = findField('taufmanager_seminar');
            if (seminar) discovered.seminarDateId = String(seminar.id);

            const taufe = findField('taufmanager_taufe');
            if (taufe) discovered.baptismDateId = String(taufe.id);

            const urkunde = findField('taufmanager_urkunde');
            if (urkunde) discovered.certificateDateId = String(urkunde.id);

            const integration = findField('taufmanager_integration');
            if (integration) discovered.integratedDateId = String(integration.id);

            const offboarding = findField('taufmanager_offboarding');
            if (offboarding) discovered.offboardingDateId = String(offboarding.id);

            const statusField = findField('taufmanager_status');
            if (statusField) {
                discovered.statusFieldId = String(statusField.id);

                // DISCOVER STATUS OPTIONS (Aktiv / Inaktiv)
                // In /dbfields response, options are in field.options
                const options = statusField.options || [];
                const aktiveOpt = options.find((o: any) => o.name === 'Aktiv' || o.label === 'Aktiv');
                const inaktivOpt = options.find((o: any) => o.name === 'Inaktiv' || o.label === 'Inaktiv');

                if (aktiveOpt) discovered.statusAktivId = String(aktiveOpt.id);
                if (inaktivOpt) discovered.statusInaktivId = String(inaktivOpt.id);

                console.log(`[Baptizo] Status Options discovered: Aktiv=${discovered.statusAktivId}, Inaktiv=${discovered.statusInaktivId}`);
            }

            console.log('[Baptizo] Fields discovery successful.');
        } catch (e: any) {
            console.error('[Baptizo] Fields discovery failed:', e.message);
        }

        return discovered;
    }
}
