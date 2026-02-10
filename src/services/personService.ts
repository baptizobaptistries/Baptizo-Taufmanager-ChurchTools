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

        const settings = await getAdminSettings();
        const inaktivId = settings?.statusInaktivId || '5';

        try {
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
                    if (members.length < 10) hasMore = false;
                    page++;
                }
            }

            const exclusionPids = new Set(allMembers
                .filter(m => m.groupTypeRoleId !== 22)
                .map(m => m.personId));
            exclusionPids.add(1);

            const ctPersons = allMembers.filter(m =>
                m.groupTypeRoleId === 22 && !exclusionPids.has(m.personId)
            );

            const members: BaptizoPerson[] = [];
            const BATCH_SIZE = 5;

            for (let i = 0; i < ctPersons.length; i += BATCH_SIZE) {
                const batch = ctPersons.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (m) => {
                    let personDetail: any;
                    try {
                        personDetail = await churchtoolsClient.get<any>(`/persons/${m.personId}`);
                    } catch (e) {
                        return;
                    }

                    const fields: BaptizoFields = {
                        seminar_besucht_am: personDetail.taufmanager_seminar || null,
                        getauft_am: personDetail.taufmanager_taufe || null,
                        urkunde_ueberreicht: personDetail.taufmanager_urkunde || null,
                        in_gemeinde_integriert: personDetail.taufmanager_integration || null,
                        taufmanager_onboarding: personDetail.taufmanager_onboarding || null,
                        taufmanager_offboarding: personDetail.taufmanager_offboarding || null
                    };

                    const hasBaptismDate = !!personDetail.taufmanager_taufe;

                    let entryDate = personDetail.taufmanager_onboarding;
                    if (!entryDate && m.comment && m.comment.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        entryDate = m.comment;
                    }
                    if (!entryDate) {
                        entryDate = m.memberStartDate;
                    }

                    if (m.groupTypeRoleId !== 22) {
                        return {
                            id: m.personId || personDetail.id,
                            firstName: personDetail.firstName,
                            lastName: personDetail.lastName,
                            status: (String(personDetail.taufmanager_status) === inaktivId) ? 'inactive' : 'active',
                            entry_date: entryDate,
                            fields,
                            imageUrl: personDetail.imageUrl || `https://ui-avatars.com/api/?name=${personDetail.firstName}+${personDetail.lastName}&background=random`,
                            email: personDetail.email || null,
                            mobile: personDetail.mobile || null,
                            phone: personDetail.phone || null
                        };
                    }

                    if (personDetail.taufmanager_offboarding) {
                        await this.removePersonFromGroup(m.personId, interestGroupId);
                        await this.removePersonFromGroup(m.personId, baptizedGroupId);
                        return;
                    }

                    if (groupId === baptizedGroupId && !hasBaptismDate) {
                        await this.addPersonToGroup(m.personId, interestGroupId);
                        await this.removePersonFromGroup(m.personId, baptizedGroupId);
                    }

                    if (groupId === interestGroupId && hasBaptismDate) {
                        await this.addPersonToGroup(m.personId, baptizedGroupId);
                        await this.removePersonFromGroup(m.personId, interestGroupId);
                    }

                    if (personDetail.taufmanager_offboarding) {
                        return;
                    }

                    members.push({
                        id: m.personId || personDetail.id,
                        firstName: personDetail.firstName || 'Unknown',
                        lastName: personDetail.lastName || 'Unknown',
                        status: (String(personDetail.taufmanager_status) === inaktivId) ? 'inactive' : 'active',
                        entry_date: entryDate,
                        fields,
                        imageUrl: personDetail.imageUrl || `https://ui-avatars.com/api/?name=${personDetail.firstName}+${personDetail.lastName}&background=random`,
                        email: personDetail.email || null,
                        mobile: personDetail.mobile || null,
                        phone: personDetail.phone || null
                    });
                }));
            }

            return { id: groupId, title, members };
        } catch (error: any) {
            console.error(`[Baptizo] API Error ${groupId}:`, error);
            return { id: groupId, title, members: [] };
        }
    }

    async getGroup(id: number): Promise<BaptizoGroup | null> {
        const groups = await this.getGroups();
        return groups.find(g => g.id === id) || null;
    }

    async getPerson(personId: number): Promise<any> {
        return await churchtoolsClient.get(`/persons/${personId}`);
    }

    async updatePersonFields(personId: number, fields: Partial<BaptizoFields>): Promise<void> {
        const settings = await getAdminSettings();
        const aktivId = parseInt(settings?.statusAktivId || '4');
        const inaktivId = parseInt(settings?.statusInaktivId || '5');

        const ctFields: any = {};

        if (fields.seminar_besucht_am !== undefined) {
            ctFields['taufmanager_seminar'] = fields.seminar_besucht_am;
        }
        if (fields.getauft_am !== undefined) {
            ctFields['taufmanager_taufe'] = fields.getauft_am;
        }
        if (fields.urkunde_ueberreicht !== undefined) {
            ctFields['taufmanager_urkunde'] = fields.urkunde_ueberreicht;
        }
        if (fields.in_gemeinde_integriert !== undefined) {
            ctFields['taufmanager_integration'] = fields.in_gemeinde_integriert;
        }
        if (fields.taufmanager_onboarding !== undefined) {
            ctFields['taufmanager_onboarding'] = fields.taufmanager_onboarding;
            if (fields.taufmanager_onboarding && (fields as any).status === undefined) {
                ctFields['taufmanager_status'] = aktivId;
            }
        }
        if (fields.taufmanager_offboarding !== undefined) {
            ctFields['taufmanager_offboarding'] = fields.taufmanager_offboarding;
            if (fields.taufmanager_offboarding) {
                ctFields['taufmanager_status'] = null;
            }
        }

        if ((fields as any).status !== undefined) {
            const statusVal = (fields as any).status;
            ctFields['taufmanager_status'] = statusVal === 'inactive' ? inaktivId : (statusVal === 'active' ? aktivId : null);
        }

        console.log(`[Baptizo] Updating person ${personId} with fields:`, ctFields);

        try {
            await churchtoolsClient.patch(`/persons/${personId}`, ctFields);
            console.log(`[Baptizo] ✓ Successfully updated person ${personId}`);

            if (fields.getauft_am !== undefined || fields.taufmanager_offboarding !== undefined || fields.taufmanager_onboarding !== undefined) {
                if (settings?.interestGroupId && settings?.baptizedGroupId) {
                    const interestId = parseInt(settings.interestGroupId);
                    const baptizedId = parseInt(settings.baptizedGroupId);

                    const detail = await churchtoolsClient.get<any>(`/persons/${personId}`);
                    const hasOnboarding = !!detail.taufmanager_onboarding;
                    const hasOffboarding = !!detail.taufmanager_offboarding;
                    const taufe = detail.taufmanager_taufe;

                    const resInterest = await churchtoolsClient.get<any>(`/groups/${interestId}/members`);
                    const resBaptized = await churchtoolsClient.get<any>(`/groups/${baptizedId}/members`);

                    const interestMembers: any[] = Array.isArray(resInterest) ? resInterest : (resInterest.data || []);
                    const baptizedMembers: any[] = Array.isArray(resBaptized) ? resBaptized : (resBaptized.data || []);

                    const currentRoleInterest = interestMembers.find((m: any) => m.personId === personId)?.groupTypeRoleId;
                    const currentRoleBaptized = baptizedMembers.find((m: any) => m.personId === personId)?.groupTypeRoleId;
                    const currentRole = currentRoleInterest || currentRoleBaptized;

                    if (currentRole && currentRole !== 22) {
                        console.log(`[Baptizo] 🛡 Sync Protection: Person ${personId} has role ${currentRole}. Skipping automated move.`);
                        return;
                    }

                    if (!hasOnboarding || hasOffboarding) {
                        await this.removePersonFromGroup(personId, interestId);
                        await this.removePersonFromGroup(personId, baptizedId);
                    } else if (taufe) {
                        await this.addPersonToGroup(personId, baptizedId);
                        await this.removePersonFromGroup(personId, interestId);
                    } else {
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
        await this.updatePersonFields(updatedPerson.id, {
            ...updatedPerson.fields,
            status: updatedPerson.status as any
        } as Partial<BaptizoFields>);
    }

    async deletePerson(id: number): Promise<void> {
        console.warn(`[Baptizo] Delete person ${id} not implemented`);
    }

    async addPersonToGroup(personId: number, groupId: number): Promise<void> {
        console.log(`[Baptizo] Adding person ${personId} to group ${groupId}...`);
        try {
            const client: any = churchtoolsClient;
            if (typeof client.put === 'function') {
                await client.put(`/groups/${groupId}/members/${personId}`, { groupTypeRoleId: 22 });
            } else {
                const ax = client.ax || client;
                const csrf = client.csrfToken || client._csrfToken || ax.defaults?.headers?.common?.['x-csrf-token'];
                await ax.put(`/api/groups/${groupId}/members/${personId}`, { groupTypeRoleId: 22 }, { headers: { 'x-csrf-token': csrf } });
            }
        } catch (e: any) {
            console.error(`[Baptizo] Failed to add person ${personId} to group ${groupId}:`, e.message);
        }
    }

    async removePersonFromGroup(personId: number, groupId: number): Promise<void> {
        console.log(`[Baptizo] Removing person ${personId} from group ${groupId}...`);
        try {
            const client: any = churchtoolsClient;
            const deleteMethod = typeof client.deleteApi === 'function' ? client.deleteApi : (typeof client.delete === 'function' ? client.delete : (typeof client.del === 'function' ? client.del : null));

            if (deleteMethod) {
                await deleteMethod.call(client, `/groups/${groupId}/members/${personId}`);
            } else {
                const ax = client.ax || client;
                const csrf = client.csrfToken || client._csrfToken || ax.defaults?.headers?.common?.['x-csrf-token'];
                await ax.delete(`/api/groups/${groupId}/members/${personId}`, { headers: { 'x-csrf-token': csrf } });
            }
        } catch (e: any) {
            if (e.response?.status !== 404) {
                console.error(`[Baptizo] Failed to remove person ${personId} from group ${groupId}:`, e.message);
            }
        }
    }

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
                leader: '',
                time: evt.startDate.split('T')[1]?.substring(0, 5) || '10:00'
            }));
        } catch (error) {
            return [];
        }
    }

    async createEvent(_event: Omit<BaptizoEvent, 'id'>): Promise<BaptizoEvent> {
        throw new Error('Method not implemented.');
    }

    async searchPersons(query: string): Promise<BaptizoPerson[]> {
        if (!query || query.length < 3) return [];
        try {
            const response = await churchtoolsClient.get<any>(`/persons?query=${encodeURIComponent(query)}&limit=10`);
            const persons = Array.isArray(response) ? response : (response.data || []);
            return persons.map((p: any) => ({
                id: p.id,
                firstName: p.firstName || 'Unknown',
                lastName: p.lastName || 'Unknown',
                status: 'active',
                entry_date: null,
                fields: { seminar_besucht_am: null, getauft_am: null, urkunde_ueberreicht: null, in_gemeinde_integriert: null, taufmanager_onboarding: null, taufmanager_offboarding: null },
                imageUrl: p.imageUrl || `https://ui-avatars.com/api/?name=${p.firstName}+${p.lastName}&background=random`,
                email: p.email || null,
                mobile: p.mobile || null,
                phone: p.phone || null
            }));
        } catch (error) {
            return [];
        }
    }

    async runGlobalDiscoveryAndSync(): Promise<{ addedToInterest: number; addedToBaptized: number; removedFromInterest: number; realOrphans: string[] }> {
        const settings = await getAdminSettings();
        if (!settings || !settings.interestGroupId || !settings.baptizedGroupId) {
            return { addedToInterest: 0, addedToBaptized: 0, removedFromInterest: 0, realOrphans: [] };
        }

        const interestGroupId = parseInt(settings.interestGroupId);
        const baptizedGroupId = parseInt(settings.baptizedGroupId);
        let stats = { addedToInterest: 0, addedToBaptized: 0, removedFromInterest: 0, realOrphans: [] as string[] };

        try {
            const interestRes = await churchtoolsClient.get<any>(`/groups/${interestGroupId}/members`);
            const baptizedRes = await churchtoolsClient.get<any>(`/groups/${baptizedGroupId}/members`);

            const interestExclusions = new Set((interestRes.data || interestRes || []).filter((m: any) => m.groupTypeRoleId !== 22).map((m: any) => m.personId));
            const baptizedExclusions = new Set((baptizedRes.data || baptizedRes || []).filter((m: any) => m.groupTypeRoleId !== 22).map((m: any) => m.personId));
            interestExclusions.add(1); baptizedExclusions.add(1);

            const interestMemberIds = new Set((interestRes.data || interestRes || []).filter((m: any) => m.groupTypeRoleId === 22 && !interestExclusions.has(m.personId)).map((m: any) => m.personId));
            const baptizedMemberIds = new Set((baptizedRes.data || baptizedRes || []).filter((m: any) => m.groupTypeRoleId === 22 && !baptizedExclusions.has(m.personId)).map((m: any) => m.personId));
            const allExclusions = new Set<any>([...Array.from(interestExclusions), ...Array.from(baptizedExclusions)]);

            let page = 1;
            const limit = 500;
            let hasMore = true;

            while (hasMore) {
                const response = await churchtoolsClient.get<any>(`/persons?limit=${limit}&page=${page}&include=properties`);
                const persons: any[] = Array.isArray(response) ? response : (response.data || []);
                if (persons.length === 0) break;

                for (const p of persons) {
                    if (allExclusions.has(p.id)) continue;
                    let detail: any;
                    try { detail = await churchtoolsClient.get<any>(`/persons/${p.id}`); } catch (e) { continue; }

                    const hasOnboarding = !!detail.taufmanager_onboarding;
                    const hasOffboarding = !!detail.taufmanager_offboarding;
                    const hasBaptismDate = !!detail.taufmanager_taufe;
                    const inInterest = interestMemberIds.has(p.id);
                    const inBaptized = baptizedMemberIds.has(p.id);

                    if (!hasOnboarding && !hasOffboarding && !inInterest && !inBaptized) {
                        if (detail.taufmanager_seminar || detail.taufmanager_taufe) stats.realOrphans.push(`${p.firstName} ${p.lastName} (ID ${p.id})`);
                    }

                    if (hasOnboarding && !hasOffboarding) {
                        if (hasBaptismDate) {
                            if (!inBaptized) { await this.addPersonToGroup(p.id, baptizedGroupId); stats.addedToBaptized++; }
                            if (inInterest) { await this.removePersonFromGroup(p.id, interestGroupId); stats.removedFromInterest++; }
                        } else {
                            if (!inInterest) { await this.addPersonToGroup(p.id, interestGroupId); stats.addedToInterest++; }
                            if (inBaptized) { await this.removePersonFromGroup(p.id, baptizedGroupId); }
                        }
                    } else {
                        if (inInterest) { await this.removePersonFromGroup(p.id, interestGroupId); stats.removedFromInterest++; }
                        if (inBaptized) { await this.removePersonFromGroup(p.id, baptizedGroupId); }
                    }
                }
                if (persons.length < limit) hasMore = false;
                page++;
            }
        } catch (error) { console.error('[Baptizo] Sync Failed:', error); }

        return stats;
    }
}
