import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { DataProvider } from './data-provider.interface';
import type { BaptizoGroup, BaptizoPerson, BaptizoFields, BaptizoEvent } from '../types/baptizo-types';
import { getAdminSettings, getAppSettings, saveAppSettings } from '../lib/kv-store';

/**
 * Real DataProvider implementation using ChurchTools API.
 * Reads configuration from kv-store (Admin Settings).
 */
export class PersonService implements DataProvider {

    async getGroups(): Promise<BaptizoGroup[]> {
        const settings = await getAdminSettings();

        // If settings are missing or incomplete, return empty to trigger dashboard warning
        if (!settings || !settings.interestGroupId || !settings.baptizedGroupId) {
            console.warn('[Baptizo] Admin settings missing or incomplete. Please configure IDs in Admin panel.');
            return [];
        }

        const interestGroup = await this.fetchGroupInternal(parseInt(settings.interestGroupId), 'Taufinteressenten');
        const baptizedGroup = await this.fetchGroupInternal(parseInt(settings.baptizedGroupId), 'Getaufte');

        return [interestGroup, baptizedGroup];
    }

    private async fetchGroupInternal(groupId: number, title: string): Promise<BaptizoGroup> {
        console.log(`[Baptizo] Versuche Daten zu laden für Gruppe: ${groupId} (${title})`);


        try {
            // Fetch ALL group members with pagination
            let allMembers: any[] = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                const response = await churchtoolsClient.get<any>(`/groups/${groupId}/members?page=${page}`);
                const members: any[] = Array.isArray(response) ? response : (response.data || []);

                if (members.length === 0) {
                    hasMore = false;
                } else {
                    allMembers = allMembers.concat(members);
                    // ChurchTools default pagination is usually 10 per page
                    if (members.length < 10) hasMore = false;
                    page++;
                }
            }

            // Filter out leaders (groupTypeRoleId 1 = Leader, 23/other = Participant)
            const ctPersons = allMembers.filter(m => m.groupTypeRoleId !== 1);

            console.log(`[Baptizo] API Erfolg für Gruppe ${groupId}. Gesamt: ${allMembers.length}, Teilnehmer: ${ctPersons.length}`);

            if (ctPersons.length === 0) {
                console.warn(`[Baptizo] Verbindung steht, aber Gruppe ${groupId} hat keine Teilnehmer.`);
            }

            // Map to BaptizoPerson - Sequential for stability
            const members: BaptizoPerson[] = [];

            for (const m of ctPersons) {
                // Group member has personId but person object is just a summary
                // Must fetch full person details to get custom fields!
                let personDetail: any;
                try {
                    personDetail = await churchtoolsClient.get<any>(`/persons/${m.personId}`);
                } catch (e) {
                    console.error(`[Baptizo] Failed to fetch person ${m.personId} in group ${groupId}`, e);
                    continue;
                }

                // ChurchTools custom fields are at root level of person detail
                const fields: BaptizoFields = {
                    seminar_besucht_am: personDetail.taufmanager_seminar || null,
                    getauft_am: personDetail.taufmanager_taufe || null,
                    urkunde_ueberreicht: personDetail.taufmanager_urkunde || null,
                    in_gemeinde_integriert: personDetail.taufmanager_integration || null,
                    taufmanager_onboarding: personDetail.taufmanager_onboarding || null,
                    taufmanager_offboarding: personDetail.taufmanager_offboarding || null
                };

                // CRITICAL: Skip persons with offboarding date - they left the Taufmanager
                if (personDetail.taufmanager_offboarding) {
                    continue;
                }

                // Entry date fallback logic:
                // 1. taufmanager_onboarding (Explicit Date)
                // 2. group member "comment" (Legacy Taufmanager stores entry date there)
                // 3. group member "memberStartDate" (CT System Date)
                let entryDate = personDetail.taufmanager_onboarding; // Prio 1

                if (!entryDate && m.comment) {
                    // Start date is often in comment for legacy reasons
                    // Format check YYYY-MM-DD
                    if (m.comment.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        entryDate = m.comment;
                    }
                }

                if (!entryDate) {
                    entryDate = m.memberStartDate; // Fallback
                }

                members.push({
                    id: m.personId || personDetail.id,
                    firstName: personDetail.firstName || 'Unknown',
                    lastName: personDetail.lastName || 'Unknown',
                    status: m.groupMemberStatus === 'inactive' ? 'inactive' : 'active',
                    entry_date: entryDate,
                    fields,
                    imageUrl: personDetail.imageUrl || `https://ui-avatars.com/api/?name=${personDetail.firstName}+${personDetail.lastName}&background=random`,
                    email: personDetail.email || null,
                    mobile: personDetail.mobile || null,
                    phone: personDetail.phone || null
                });
            }

            return {
                id: groupId,
                title,
                members
            };

        } catch (error: any) {
            console.error(`[Baptizo] API-Fehlermeldung bei Fehlschlag für Gruppe ${groupId}:`, error);
            // Log detailed error info if available (axios error)
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error(`Data:`, error.response.data);
            }
            return { id: groupId, title, members: [] };
        }
    }

    async getGroup(id: number): Promise<BaptizoGroup | null> {
        // Find efficiently by fetching all (simple caching could be added)
        const groups = await this.getGroups();
        return groups.find(g => g.id === id) || null;
    }

    async getPerson(personId: number): Promise<any> {
        // Fetch individual person details from ChurchTools
        return await churchtoolsClient.get(`/persons/${personId}`);
    }

    async updatePersonFields(personId: number, fields: Partial<BaptizoFields>): Promise<void> {
        // ChurchTools custom fields use naming convention: taufmanager_{fieldname}
        // NOT numeric IDs! Must use actual field names.
        const ctFields: any = {};

        if (fields.seminar_besucht_am !== undefined) {
            ctFields['taufmanager_seminar'] = fields.seminar_besucht_am;
        }
        if (fields.getauft_am !== undefined) {
            ctFields['taufmanager_taufe'] = fields.getauft_am;
        }
        if (fields.urkunde_ueberreicht !== undefined) {
            // Date string or null
            ctFields['taufmanager_urkunde'] = fields.urkunde_ueberreicht;
        }
        if (fields.in_gemeinde_integriert !== undefined) {
            // Date string or null
            ctFields['taufmanager_integration'] = fields.in_gemeinde_integriert;
        }
        if (fields.taufmanager_onboarding !== undefined) {
            ctFields['taufmanager_onboarding'] = fields.taufmanager_onboarding;
        }
        if (fields.taufmanager_offboarding !== undefined) {
            ctFields['taufmanager_offboarding'] = fields.taufmanager_offboarding;
        }

        console.log(`[Baptizo] Updating person ${personId} with fields:`, ctFields);

        try {
            await churchtoolsClient.patch(`/persons/${personId}`, ctFields);
            console.log(`[Baptizo] ✓ Successfully updated person ${personId}`);
        } catch (error) {
            console.error('[Baptizo] Error updating person:', error);
            throw error;
        }
    }

    async updatePerson(updatedPerson: BaptizoPerson): Promise<void> {
        console.log(`[Baptizo] Saving Person ${updatedPerson.id}...`);

        // 1. Update Custom Fields (Dates etc.)
        await this.updatePersonFields(updatedPerson.id, updatedPerson.fields);

        if (updatedPerson.status && updatedPerson.status !== 'removed') {
            await this.updatePersonStatus(updatedPerson.id, updatedPerson.status);
        }
    }

    private async updatePersonStatus(personId: number, status: 'active' | 'inactive'): Promise<void> {
        const settings = await getAdminSettings();
        if (!settings) return;

        // Map 'active'/'inactive' to CT Group Member Status IDs
        // Usually: 1 = Active, 3 = Inactive (Standard ChurchTools)
        // We verify this assumption or make it configurable later.
        const statusId = status === 'active' ? 1 : 3; // 3 is commonly "Passive" or "Inactive"

        const targetGroups = [
            parseInt(settings.interestGroupId),
            parseInt(settings.baptizedGroupId)
        ];

        for (const groupId of targetGroups) {
            if (!groupId) continue;
            try {
                // Check if person is in this group
                const groupResponse = await churchtoolsClient.get<any>(`/groups/${groupId}/members/${personId}`).catch(() => null);

                if (groupResponse) {
                    console.log(`[Baptizo] Updating status for person ${personId} in group ${groupId} to ${status} (${statusId})`);
                    // API FIX: Use PATCH for updates (PUT is deprecated)
                    await churchtoolsClient.patch(`/groups/${groupId}/members/${personId}`, {
                        groupMemberStatusId: statusId
                    });
                }
            } catch (e) {
                console.warn(`[Baptizo] Failed to update status for person ${personId} in group ${groupId}`, e);
            }
        }
    }

    async deletePerson(id: number): Promise<void> {
        // Not implemented for safety in v1
        console.warn(`[Baptizo] Delete person ${id} not implemented in real provider`);
    }

    // Settings (Email templates etc - stored in KV Store)
    async getSettings(): Promise<any> {
        const settings = await getAppSettings();
        return settings || {
            emailTemplates: [],
            placeholders: [],
            multiSiteMode: false,
            campuses: [],
            emailSendingEnabled: false
        };
    }

    async updateSettings(settings: any): Promise<void> {
        await saveAppSettings(settings);
        console.log('[Baptizo] ✓ App settings saved to KV store');
    }

    async getEvents(): Promise<BaptizoEvent[]> {
        const settings = await getAdminSettings();
        if (!settings || !settings.calendarId) return [];

        try {
            const response = await churchtoolsClient.get<{ data: any[] }>(`/calendars/${settings.calendarId}/appointments?from=2024-01-01&to=2026-12-31`);
            return (response.data || []).map((evt: any) => ({
                id: evt.id,
                title: evt.caption,
                date: evt.startDate.split('T')[0],
                type: evt.caption.toLowerCase().includes('seminar') ? 'seminar' : 'baptism',
                leader: '', // Not always available
                time: evt.startDate.split('T')[1]?.substring(0, 5) || '10:00'
            }));
        } catch (error) {
            console.error('[Baptizo] Error fetching events:', error);
            return [];
        }
    }

    async createEvent(event: Omit<BaptizoEvent, 'id'>): Promise<BaptizoEvent> {
        // Implement if needed for v1
        console.warn('createEvent not implemented', event);
        throw new Error('Method not implemented.');
    }

    async searchPersons(query: string): Promise<BaptizoPerson[]> {
        if (!query || query.length < 3) return [];
        console.log(`[Baptizo] Searching persons with query: '${query}'`);

        try {
            // Use ChurchTools /persons endpoint with query
            const response = await churchtoolsClient.get<any>(`/persons?query=${encodeURIComponent(query)}&limit=10`);
            const persons = Array.isArray(response) ? response : (response.data || []);

            return persons.map((p: any) => ({
                id: p.id,
                firstName: p.firstName || 'Unknown',
                lastName: p.lastName || 'Unknown',
                status: 'active', // Default for search results (we don't know group status yet)
                entry_date: null,
                fields: { // Empty fields for search result
                    seminar_besucht_am: null,
                    getauft_am: null,
                    urkunde_ueberreicht: null,
                    in_gemeinde_integriert: null,
                    taufmanager_onboarding: null,
                    taufmanager_offboarding: null
                },
                imageUrl: p.imageUrl || `https://ui-avatars.com/api/?name=${p.firstName}+${p.lastName}&background=random`,
                email: p.email || null,
                mobile: p.mobile || null,
                phone: p.phone || null
            }));
        } catch (error) {
            console.error('[Baptizo] Search failed:', error);
            return [];
        }
    }

    async runGlobalDiscoveryAndSync(): Promise<{ addedToInterest: number; addedToBaptized: number; removedFromInterest: number }> {
        const settings = await getAdminSettings();
        if (!settings) return { addedToInterest: 0, addedToBaptized: 0, removedFromInterest: 0 };

        console.log('[Baptizo] Starting Global Discovery & Sync...');

        let stats = { addedToInterest: 0, addedToBaptized: 0, removedFromInterest: 0 };

        try {
            // 1. Fetch current members of target groups for efficient lookup
            const interestGroup = await this.fetchGroupInternal(parseInt(settings.interestGroupId), 'Interest');
            const baptizedGroup = await this.fetchGroupInternal(parseInt(settings.baptizedGroupId), 'Baptized');

            const interestMemberIds = new Set(interestGroup.members.map(m => m.id));
            const baptizedMemberIds = new Set(baptizedGroup.members.map(m => m.id));

            // 2. Iterate ALL persons (Pagination)
            let page = 1;
            const limit = 500;
            let hasMore = true;

            while (hasMore) {
                // IMPORTANT: Use /persons endpoint (v2) which seems to work relative to baseURL
                // ADDED: status_ids to filter for active+inactive+archive to find everyone
                // IDs: 1 (active), 2 (archive), 3 (inactive) - standardized in CT usually
                // Safe approach: status_ids[]=active&status_ids[]=inactive

                // DEBUG: Inspect Base URL to prevent double slashes
                // @ts-ignore
                const baseUrl = churchtoolsClient.ax?.defaults?.baseURL || 'UNKNOWN';

                // Construct path carefully. User requested /api/persons check.
                // Note: churchtoolsClient adds /api prefix automatically!
                // IMPORTANT: Add include=properties to get custom fields!
                const endpoint = '/persons';
                const query = `limit=${limit}&page=${page}&include=properties`;
                const url = `${endpoint}?${query}`;

                console.log(`[Baptizo] DEBUG URL Config: Base: '${baseUrl}', Request: '${url}'`);

                const response = await churchtoolsClient.get<any>(url);

                // DEBUG: Log raw response structure
                console.log('[Baptizo] RAW Response (first 500 chars):', JSON.stringify(response).substring(0, 500));

                // API returns persons as direct array, NOT wrapped in {data:[]}
                const persons: any[] = Array.isArray(response) ? response : (response.data || []);

                console.log(`[Baptizo] Page ${page}: Received ${persons.length} persons.`);
                // DEBUG: Log Meta to see total count (only if wrapped response)
                if (response.meta) {
                    console.log('[Baptizo] API Meta:', response.meta);
                }

                if (persons.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const [index, p] of persons.entries()) {
                    const pid = p.id;

                    // ChurchTools: /persons list doesn't include custom fields
                    // Must fetch individual person to get them!
                    let personDetail: any;
                    try {
                        personDetail = await churchtoolsClient.get<any>(`/persons/${pid}`);
                    } catch (e) {
                        console.error(`[Baptizo] Failed to fetch details for person ${pid}`, e);
                        continue;
                    }

                    // Custom fields might be in 'fields', 'properties', or root level
                    const fields = personDetail.fields || personDetail.properties || personDetail || {};

                    // DEBUG: Log first person's full structure to find where custom fields are
                    if (page === 1 && index === 0) {
                        console.log('[Baptizo] DEBUG CHECK - Settings IDs:', {
                            seminar: settings.seminarDateId,
                            baptism: settings.baptismDateId,
                            certificate: settings.certificateDateId,
                            integration: settings.integratedDateId,
                            status: settings.statusFieldId
                        });
                        console.log('[Baptizo] DEBUG CHECK - First Person FULL Detail Object:', personDetail);
                        console.log('[Baptizo] DEBUG CHECK - First Person Fields/Properties (Keys):', Object.keys(fields));
                        console.log('[Baptizo] DEBUG CHECK - First Person Fields/Properties (Full):', fields);

                        // DEEP SEARCH: Find where '2023-08-12' is hiding!
                        const jsonStr = JSON.stringify(personDetail);
                        if (jsonStr.includes('2023')) {
                            console.log('[Baptizo] FOUND DATE in object! Full JSON:', jsonStr);
                            // Find the key
                            for (const key of Object.keys(personDetail)) {
                                const val = JSON.stringify(personDetail[key]);
                                if (val && val.includes('2023')) {
                                    console.log(`[Baptizo] DATE FOUND IN KEY: '${key}' => ${val}`);
                                }
                            }
                        } else {
                            console.log('[Baptizo] NO DATE FOUND - personDetail does NOT contain 2023');
                        }
                    }

                    // Check Fields - HARD-MAPPED to actual ChurchTools field names!
                    // Keys are at ROOT level of personDetail, NOT in a "fields" object
                    const hasSeminar = !!personDetail.taufmanager_seminar;
                    const hasBaptism = !!personDetail.taufmanager_taufe; // TAUFE => Group 16
                    const hasCertificate = !!personDetail.taufmanager_urkunde;
                    const hasIntegration = !!personDetail.taufmanager_integration;
                    const hasStatus = !!personDetail.taufmanager_status;

                    // Debug log for first few persons
                    if (index < 3) {
                        console.log(`[Baptizo] Person ${pid} (${personDetail.firstName}): seminar=${hasSeminar}, taufe=${hasBaptism}, urkunde=${hasCertificate}, integration=${hasIntegration}, status=${hasStatus}`);
                    }

                    // LOGIC:

                    // Case A: Has Baptism Date (187) -> MUST be in Group 16 (Baptized)
                    if (hasBaptism) {
                        // Ensure in Group 16
                        if (!baptizedMemberIds.has(pid)) {
                            console.log(`[Baptizo] [SYNC] Found Baptized (ID ${pid}): adding to Group ${settings.baptizedGroupId}`);
                            try {
                                // API FIX: Use POST to add member (PUT is deprecated)
                                const response = await churchtoolsClient.post(`/groups/${settings.baptizedGroupId}/members`, {
                                    personId: pid,
                                    groupMemberStatusId: 1 // 1 = active member
                                });
                                console.log(`[Baptizo] POST response for ${pid}:`, response);
                                stats.addedToBaptized++;
                                baptizedMemberIds.add(pid);
                            } catch (e) {
                                console.error(`[Baptizo] Failed to add ${pid} to Baptized group`, e);
                            }
                        }

                        // Ensure NOT in Group 13
                        if (interestMemberIds.has(pid)) {
                            console.log(`[Baptizo] [SYNC] Removing ${p.firstName} ${p.lastName} from Interest Group (${settings.interestGroupId}) because they are baptized.`);
                            try {
                                await churchtoolsClient.deleteApi(`/groups/${settings.interestGroupId}/members/${pid}`);
                                stats.removedFromInterest++;
                                interestMemberIds.delete(pid);
                            } catch (e) {
                                console.error(`[Baptizo] Failed to remove ${pid} from Interest group`, e);
                            }
                        }
                    }
                    // Case B: NO Baptism Date, but Has Other Milestones -> MUST be in Group 13 (Interest)
                    else if (hasSeminar || hasCertificate || hasIntegration || hasStatus) {
                        const ininterest = interestMemberIds.has(pid);
                        const inbaptized = baptizedMemberIds.has(pid);

                        if (!ininterest && !inbaptized) {
                            console.log(`[Baptizo] [SYNC] Found Lost candidate: ${personDetail.firstName} ${personDetail.lastName}. Adding to Interest Group (${settings.interestGroupId})`);
                            try {
                                // API FIX: Use POST to add member (PUT is deprecated)
                                const response = await churchtoolsClient.post(`/groups/${settings.interestGroupId}/members`, {
                                    personId: pid,
                                    groupMemberStatusId: 1 // 1 = active member
                                });
                                console.log(`[Baptizo] POST response for ${pid}:`, response);
                                stats.addedToInterest++;
                                interestMemberIds.add(pid);
                            } catch (e) {
                                console.error(`[Baptizo] Failed to add ${pid} to Interest group`, e);
                            }
                        }
                    }
                }

                // Check pagination meta
                if (response.meta && response.meta.pagination) {
                    if (page >= response.meta.pagination.lastPage) {
                        hasMore = false;
                    }
                } else {
                    // Fallback if meta missing
                    if (persons.length < limit) hasMore = false;
                }
                page++;
            }

        } catch (error) {
            console.error('[Baptizo] Auto-Sync Failed:', error);
        }

        console.log('[Baptizo] Auto-Sync Complete. Stats:', stats);
        return stats;
    }
}
