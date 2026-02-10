import { churchtoolsClient } from '@churchtools/churchtools-client';
import type { ProfileSettings } from '../lib/kv-store';

export interface TestDataStatus {
    personCount: number;
    hasLeader: boolean;
}

export class TestDataService {
    private suffix: string;

    constructor(suffix: string = '') {
        this.suffix = suffix;
    }

    /**
     * Creates a set of test persons and adds them to the Taufmanager groups.
     * Also sets Hannes Gruppenleiter as the leader.
     */
    async provisionTestData(settings: ProfileSettings): Promise<void> {
        if (!settings.interestGroupId || !settings.baptizedGroupId) {
            throw new Error('Groups must be provisioned before adding test data.');
        }

        console.log(`[Baptizo] Provisioning Test Data (Suffix: ${this.suffix})...`);

        // 1. Find Hannes Gruppenleiter (Orphan)
        const hannesId = await this.findHannesId();
        if (!hannesId) {
            console.warn('[Baptizo] Hannes Gruppenleiter not found. Proceeding without leader assignment.');
        }

        // 2. Define Test Persons
        const testPersons = [
            { firstName: 'Nils', lastName: 'Frost' + this.suffix, group: 'interest', fields: { taufmanager_status: '4' } },
            { firstName: 'Max', lastName: 'Mustermann' + this.suffix, group: 'interest', fields: { taufmanager_status: '4', taufmanager_seminar: '2024-02-01' } },
            { firstName: 'Lisa', lastName: 'Müller' + this.suffix, group: 'interest', fields: { taufmanager_status: '4', taufmanager_seminar: '2024-02-15' } },
            { firstName: 'Anna', lastName: 'Getauft' + this.suffix, group: 'baptized', fields: { taufmanager_status: '4', taufmanager_seminar: '2024-01-10', taufmanager_taufe: '2024-02-20' } },
        ];

        for (const p of testPersons) {
            const groupId = p.group === 'interest' ? parseInt(settings.interestGroupId) : parseInt(settings.baptizedGroupId);

            // a. Create Person
            const res = await churchtoolsClient.post<any>('/persons', {
                firstName: p.firstName,
                lastName: p.lastName,
                securityLevelId: 1
            });
            const personId = res.id || res.data?.id;

            if (personId) {
                console.log(`[Baptizo] Created Test Person: ${p.firstName} ${p.lastName} (ID: ${personId})`);

                // b. Add to Group
                await churchtoolsClient.post(`/groups/${groupId}/members`, {
                    personId: personId,
                    groupMemberStatusId: 1 // Teilnehmer
                });

                // c. Set Fields
                const fieldsWithSuffix: any = {};
                for (const [key, val] of Object.entries(p.fields)) {
                    fieldsWithSuffix[key + this.suffix] = val;
                }
                await churchtoolsClient.patch(`/persons/${personId}`, fieldsWithSuffix);
            }
        }

        // 3. Add Hannes as Leader
        if (hannesId) {
            const groups = [parseInt(settings.interestGroupId), parseInt(settings.baptizedGroupId)];
            for (const gid of groups) {
                try {
                    await churchtoolsClient.post(`/groups/${gid}/members`, {
                        personId: hannesId,
                        groupMemberStatusId: 2 // Leiter
                    });
                    console.log(`[Baptizo] Added Hannes (ID: ${hannesId}) as Leader to Group ${gid}`);
                } catch (e) {
                    // Might already be member
                }
            }
        }
    }

    /**
     * Cleans up all test persons created by this service (identified by name suffix).
     */
    async cleanupTestData(): Promise<void> {
        if (!this.suffix) {
            console.warn('[Baptizo] Cleanup requested without suffix. Refusing to batch-delete.');
            return;
        }

        console.log(`[Baptizo] Cleaning up Test Data (Suffix: ${this.suffix})...`);

        // Find persons with suffix in last name
        const res = await churchtoolsClient.get<any[]>('/persons?limit=100');
        const allPersons = Array.isArray(res) ? res : ((res as any).data || []);

        for (const p of allPersons) {
            if (p.lastName && p.lastName.endsWith(this.suffix)) {
                console.log(`[Baptizo] Deleting Test Person: ${p.firstName} ${p.lastName} (ID: ${p.id})`);
                await churchtoolsClient.deleteApi(`/persons/${p.id}`);
            }
        }
    }

    private async findHannesId(): Promise<number | null> {
        try {
            const res = await churchtoolsClient.get<any[]>('/persons?limit=100');
            const allPersons = Array.isArray(res) ? res : ((res as any).data || []);

            const hannes = allPersons.find((p: any) =>
                (p.firstName === 'Hannes' && p.lastName === 'Gruppenleiter') ||
                (p.firstName === 'Hannes' && p.lastName === 'Braun')
            );

            return hannes ? hannes.id : null;
        } catch (e) {
            return null;
        }
    }
}
