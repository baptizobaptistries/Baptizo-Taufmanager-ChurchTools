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
        // Diagnostic: What methods are available on the client?
        const clientKeys = Object.keys(churchtoolsClient || {});
        const hasDelete = typeof (churchtoolsClient as any).delete === 'function';
        console.log(`[Baptizo] Client Diagnostic: Keys=[${clientKeys.join(', ')}], hasDelete=${hasDelete}`);

        const settings = await getAdminSettings();

        // If settings are missing or incomplete, return empty to trigger dashboard warning
        if (!settings || !settings.interestGroupId || !settings.baptizedGroupId) {
            console.warn('[Baptizo] Admin settings missing or incomplete. Please configure IDs in Admin panel.');
            return [];
        }

        const interestGroup = await this.fetchGroupInternal(parseInt(settings.interestGroupId), 'Taufinteressenten', parseInt(settings.interestGroupId), parseInt(settings.baptizedGroupId));
        const baptizedGroup = await this.fetchGroupInternal(parseInt(settings.baptizedGroupId), 'Getaufte', parseInt(settings.interestGroupId), parseInt(settings.baptizedGroupId));

        return [interestGroup, baptizedGroup];
    }

    private async fetchGroupInternal(groupId: number, title: string, interestGroupId: number, baptizedGroupId: number): Promise<BaptizoGroup> {
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

            // IDENTIFY LEADERS/ADMINS: Anyone who hasn't role 22 (Participant)
            // or is PID 1 (Stefan) should be excluded from sync.
            const exclusionPids = new Set(allMembers
                .filter(m => m.groupTypeRoleId !== 22)
                .map(m => m.personId));

            // ADD pid 1 as explicit protection
            exclusionPids.add(1);

            // Final participants for sync: Must have role 22 AND no leadership roles
            const ctPersons = allMembers.filter(m =>
                m.groupTypeRoleId === 22 && !exclusionPids.has(m.personId)
            );

            console.log(`[Baptizo] API Erfolg für Gruppe ${groupId}. Gesamt: ${allMembers.length}, Teilnehmer (Role 22 Only): ${ctPersons.length}`);

            if (ctPersons.length === 0) {
                console.warn(`[Baptizo] Verbindung steht, aber Gruppe ${groupId} hat keine Teilnehmer.`);
            }

            // Map to BaptizoPerson - Sequential for stability
            const members: BaptizoPerson[] = [];

            // Batch processing to avoid timeouts (N+1 problem)
            const BATCH_SIZE = 5;


            for (let i = 0; i < ctPersons.length; i += BATCH_SIZE) {
                const batch = ctPersons.slice(i, i + BATCH_SIZE);
                console.log(`[Baptizo] Processing batch ${i / BATCH_SIZE + 1} / ${Math.ceil(ctPersons.length / BATCH_SIZE)}`);

                await Promise.all(batch.map(async (m) => {
                    let personDetail: any;
                    try {
                        personDetail = await churchtoolsClient.get<any>(`/persons/${m.personId}`);
                    } catch (e) {
                        console.error(`[Baptizo] Failed to fetch person ${m.personId} in group ${groupId}`, e);
                        return; // Skip this person
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

                    // SOFT SYNC: Check for baptism date consistency
                    const hasBaptismDate = !!personDetail.taufmanager_taufe;

                    if (groupId === baptizedGroupId && !hasBaptismDate) {
                        console.log(`[Baptizo] ⚠ Soft Sync: ${personDetail.firstName} in Baptized group but NO date. Moving to Interest.`);
                        // Attempt to fix sync issues: add to new group FIRST, then remove from old
                        await this.addPersonToGroup(m.personId, interestGroupId);
                        await this.removePersonFromGroup(m.personId, baptizedGroupId);
                        // Do NOT return; let the person be rendered in the current group result 
                        // so they don't disappear during the move. They will be in the correct group next refresh.
                    }

                    if (groupId === interestGroupId && hasBaptismDate) {
                        console.log(`[Baptizo] ⚠ Soft Sync: ${personDetail.firstName} in Interest group but HAS date. Moving to Baptized.`);
                        await this.addPersonToGroup(m.personId, baptizedGroupId);
                        await this.removePersonFromGroup(m.personId, interestGroupId);
                    }

                    // CRITICAL: Skip persons with offboarding date - they left the Taufmanager
                    if (personDetail.taufmanager_offboarding) {
                        return;
                    }

                    // Entry date fallback logic:
                    let entryDate = personDetail.taufmanager_onboarding; // Prio 1

                    if (!entryDate && m.comment) {
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
                        // Standard Status Mapping: Use the existing ChurchTools person field
                        // Discovery: ID 196 (taufmanager_status) -> 4 = Aktiv, 5 = Inaktiv
                        status: (String(personDetail.taufmanager_status) === '5') ? 'inactive' : 'active',
                        entry_date: entryDate,
                        fields,
                        imageUrl: personDetail.imageUrl || `https://ui-avatars.com/api/?name=${personDetail.firstName}+${personDetail.lastName}&background=random`,
                        email: personDetail.email || null,
                        mobile: personDetail.mobile || null,
                        phone: personDetail.phone || null
                    });
                }));
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
            // If we are setting an onboarding date, default status to "Aktiv" (ID 4) 
            // but only if a status isn't already being explicitly set in this update
            if (fields.taufmanager_onboarding && (fields as any).status === undefined) {
                ctFields['taufmanager_status'] = 4;
            }
        }
        if (fields.taufmanager_offboarding !== undefined) {
            ctFields['taufmanager_offboarding'] = fields.taufmanager_offboarding;
            // Clear status field on offboarding
            if (fields.taufmanager_offboarding) {
                ctFields['taufmanager_status'] = null;
            }
        }

        // Internal status mapping to ChurchTools numerical IDs
        // Discovery: 4 = Aktiv, 5 = Inaktiv
        if ((fields as any).status !== undefined) {
            const statusVal = (fields as any).status;
            ctFields['taufmanager_status'] = statusVal === 'inactive' ? 5 : (statusVal === 'active' ? 4 : null);
        }

        console.log(`[Baptizo] Updating person ${personId} with fields:`, ctFields);

        try {
            await churchtoolsClient.patch(`/persons/${personId}`, ctFields);
            console.log(`[Baptizo] ✓ Successfully updated person ${personId}`);

            // INSTANT GROUP SYNC: If baptism date was updated, trigger group reconciliation
            if (fields.getauft_am !== undefined) {
                const settings = await getAdminSettings();
                if (settings?.interestGroupId && settings?.baptizedGroupId) {
                    const interestId = parseInt(settings.interestGroupId);
                    const baptizedId = parseInt(settings.baptizedGroupId);

                    if (fields.getauft_am) {
                        // Move to Baptized
                        await this.addPersonToGroup(personId, baptizedId);
                        await this.removePersonFromGroup(personId, interestId);
                    } else {
                        // Move back to Interest
                        await this.addPersonToGroup(personId, interestId);
                        await this.removePersonFromGroup(personId, baptizedId);
                    }
                }
            }
        } catch (error) {
            console.error('[Baptizo] Error updating person:', error);
            throw error;
        }
    }

    async updatePerson(updatedPerson: BaptizoPerson): Promise<void> {
        console.log(`[Baptizo] Saving Person ${updatedPerson.id}...`);

        // 1. Update Custom Fields (Dates and Status)
        await this.updatePersonFields(updatedPerson.id, {
            ...updatedPerson.fields,
            status: updatedPerson.status as any // Pass status for mapping to CT numerical ID
        } as Partial<BaptizoFields>);
    }

    // Status update logic moved to updatePersonFields (direct field sync)

    async deletePerson(id: number): Promise<void> {
        // Not implemented for safety in v1
        console.warn(`[Baptizo] Delete person ${id} not implemented in real provider`);
    }

    async addPersonToGroup(personId: number, groupId: number): Promise<void> {
        console.log(`[Baptizo] Adding person ${personId} to group ${groupId}...`);
        try {
            // Using internal axios instance (ax) for maximum reliability across environments
            const ax = (churchtoolsClient as any).ax || (churchtoolsClient as any);
            await ax.put(`/groups/${groupId}/members/${personId}`, {
                groupTypeRoleId: 22
            });
            console.log(`[Baptizo] ✓ Successfully added person ${personId} to group ${groupId}.`);
        } catch (e: any) {
            console.error(`[Baptizo] ❌ Failed to add person ${personId} to group ${groupId}:`, e.response?.data || e.message);
        }
    }

    // Helper: Remove person from group
    async removePersonFromGroup(personId: number, groupId: number): Promise<void> {
        console.log(`[Baptizo] Removing person ${personId} from group ${groupId}...`);
        try {
            const ax = (churchtoolsClient as any).ax || (churchtoolsClient as any);
            await ax.delete(`/groups/${groupId}/members/${personId}`);
            console.log(`[Baptizo] ✓ Successfully removed person ${personId} from group ${groupId}.`);
        } catch (e: any) {
            if (e.response?.status === 404) {
                console.log(`[Baptizo] Person ${personId} not in group ${groupId}, skip removal.`);
            } else {
                console.error(`[Baptizo] ❌ Failed to remove person ${personId} from group ${groupId}:`, e.response?.data || e.message);
            }
        }
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

    async runGlobalDiscoveryAndSync(): Promise<{ addedToInterest: number; addedToBaptized: number; removedFromInterest: number; realOrphans: string[] }> {
        const settings = await getAdminSettings();
        if (!settings || !settings.interestGroupId || !settings.baptizedGroupId) {
            return { addedToInterest: 0, addedToBaptized: 0, removedFromInterest: 0, realOrphans: [] };
        }

        console.log('[Baptizo] Starting Active Global Sync & Discovery...');

        const interestGroupId = parseInt(settings.interestGroupId);
        const baptizedGroupId = parseInt(settings.baptizedGroupId);

        let stats = { addedToInterest: 0, addedToBaptized: 0, removedFromInterest: 0, realOrphans: [] as string[] };

        try {
            // 1. Fetch current members of target groups for efficient lookup
            const interestRes = await churchtoolsClient.get<any>(`/groups/${interestGroupId}/members`);
            const baptizedRes = await churchtoolsClient.get<any>(`/groups/${baptizedGroupId}/members`);

            // IDENTIFY LEADERS/ADMINS: Anyone who hasn't role 22 (Participant)
            // or is PID 1 (Stefan) should be excluded from sync.
            const interestExclusions = new Set((interestRes.data || interestRes || [])
                .filter((m: any) => m.groupTypeRoleId !== 22)
                .map((m: any) => m.personId));
            const baptizedExclusions = new Set((baptizedRes.data || baptizedRes || [])
                .filter((m: any) => m.groupTypeRoleId !== 22)
                .map((m: any) => m.personId));

            interestExclusions.add(1);
            baptizedExclusions.add(1);

            const interestMemberIds = new Set((interestRes.data || interestRes || [])
                .filter((m: any) => m.groupTypeRoleId === 22 && !interestExclusions.has(m.personId))
                .map((m: any) => m.personId));
            const baptizedMemberIds = new Set((baptizedRes.data || baptizedRes || [])
                .filter((m: any) => m.groupTypeRoleId === 22 && !baptizedExclusions.has(m.personId))
                .map((m: any) => m.personId));

            // Combined exclusion list for the search/discovery phase
            const allExclusions = new Set<any>([...Array.from(interestExclusions), ...Array.from(baptizedExclusions)]);

            // 2. Iterate ALL persons (Pagination)
            let page = 1;
            const limit = 500;
            let hasMore = true;

            while (hasMore) {
                const endpoint = '/persons';
                const query = `limit=${limit}&page=${page}&include=properties`;
                const response = await churchtoolsClient.get<any>(`${endpoint}?${query}`);

                const persons: any[] = Array.isArray(response) ? response : (response.data || []);
                if (persons.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const p of persons) {
                    const pid = p.id;
                    if (allExclusions.has(pid)) continue; // SKIP LEADERS

                    const name = `${p.firstName} ${p.lastName}`;

                    // Detail fetch for custom fields
                    let detail: any;
                    try {
                        detail = await churchtoolsClient.get<any>(`/persons/${pid}`);
                    } catch (e) {
                        continue;
                    }

                    const hasOnboarding = !!detail.taufmanager_onboarding;
                    const hasOffboarding = !!detail.taufmanager_offboarding;
                    const hasBaptismDate = !!detail.taufmanager_taufe;

                    const inInterest = interestMemberIds.has(pid);
                    const inBaptized = baptizedMemberIds.has(pid);

                    // CASE 1: Enrollment Diagnostic - No onboarding date at all
                    if (!hasOnboarding && !hasOffboarding && !inInterest && !inBaptized) {
                        // This person has no onboarding date but maybe they should? 
                        // These are the "Real Orphans" requested by the user.
                        // For now we just report them if they have any other taufmanager data
                        if (detail.taufmanager_seminar || detail.taufmanager_taufe) {
                            stats.realOrphans.push(`${name} (ID ${pid})`);
                        }
                    }

                    // CASE 2: Active Participant Sync
                    if (hasOnboarding && !hasOffboarding) {
                        if (hasBaptismDate) {
                            // Should be in Baptized group
                            if (!inBaptized) {
                                await this.addPersonToGroup(pid, baptizedGroupId);
                                stats.addedToBaptized++;
                            }
                            // Should NOT be in Interest group
                            if (inInterest) {
                                await this.removePersonFromGroup(pid, interestGroupId);
                                stats.removedFromInterest++;
                            }
                        } else {
                            // Should be in Interest group
                            if (!inInterest) {
                                await this.addPersonToGroup(pid, interestGroupId);
                                stats.addedToInterest++;
                            }
                            // Should NOT be in Baptized group
                            if (inBaptized) {
                                await this.removePersonFromGroup(pid, baptizedGroupId);
                                // Optional: stats for removal from baptized?
                            }
                        }
                    }
                }

                if (persons.length < limit) hasMore = false;
                page++;
            }

        } catch (error) {
            console.error('[Baptizo] Sync Failed:', error);
        }

        console.log('[Baptizo] Sync Complete:', stats);
        return stats;
    }
}
