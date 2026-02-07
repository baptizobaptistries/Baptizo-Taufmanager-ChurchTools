import type { DataProvider } from './data-provider.interface';
import type { BaptizoGroup, BaptizoPerson, BaptizoEvent, BaptizoFields } from '../types/baptizo-types';

export class MockPersonService implements DataProvider {
    async getGroups(): Promise<BaptizoGroup[]> {
        console.log('[MockProvider] Returning mock groups');
        return [
            {
                id: 13,
                title: 'Taufinteressenten',
                members: [
                    this.createMockPerson(101, 'Max', 'Mustermann', 'active', '2023-10-01', {}),
                    this.createMockPerson(102, 'Lisa', 'Müller', 'active', '2023-11-15', { seminar_besucht_am: '2023-12-01' }),
                    this.createMockPerson(103, 'Tom', 'Tester', 'active', '2024-01-10', {}),
                    this.createMockPerson(104, 'Sarah', 'Inactive', 'inactive', '2023-05-01', {}),
                ]
            },
            {
                id: 16,
                title: 'Getaufte',
                members: [
                    this.createMockPerson(201, 'Anna', 'Getauft', 'active', '2023-01-01', {
                        seminar_besucht_am: '2023-01-15',
                        getauft_am: '2023-02-20'
                    }),
                    this.createMockPerson(202, 'Ben', 'Complete', 'active', '2022-11-01', {
                        seminar_besucht_am: '2022-11-15',
                        getauft_am: '2022-12-01',
                        urkunde_ueberreicht: '2022-12-10',
                        in_gemeinde_integriert: '2023-01-01'
                    })
                ]
            }
        ];
    }

    private createMockPerson(id: number, firstName: string, lastName: string, status: 'active' | 'inactive', entryDate: string, fields: Partial<BaptizoFields>): BaptizoPerson {
        return {
            id,
            firstName,
            lastName,
            status,
            entry_date: entryDate,
            imageUrl: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
            email: `${firstName.toLowerCase()}@example.com`,
            fields: {
                seminar_besucht_am: fields.seminar_besucht_am || null,
                getauft_am: fields.getauft_am || null,
                urkunde_ueberreicht: fields.urkunde_ueberreicht || null,
                in_gemeinde_integriert: fields.in_gemeinde_integriert || null,
                taufmanager_onboarding: entryDate, // Sync entry date
                taufmanager_offboarding: null
            }
        };
    }

    async getGroup(id: number): Promise<BaptizoGroup | null> {
        const groups = await this.getGroups();
        return groups.find(g => g.id === id) || null;
    }

    async updatePersonFields(personId: number, fields: Partial<BaptizoFields>): Promise<void> {
        console.log(`[MockProvider] Updating person ${personId} fields:`, fields);
        // In a real mock, we would update state, but for now just log
    }

    async updatePerson(person: BaptizoPerson): Promise<void> {
        console.log(`[MockProvider] Updating person ${person.id}`, person);
    }

    async getSettings(): Promise<any> {
        return {
            emailTemplates: [],
            placeholders: [],
            multiSiteMode: false,
            campuses: [],
            emailSendingEnabled: false
        };
    }

    async updateSettings(settings: any): Promise<void> {
        console.log('[MockProvider] Settings updated', settings);
    }

    async getEvents(): Promise<BaptizoEvent[]> {
        return [
            { id: 1, title: 'Taufseminar', date: '2024-03-15', time: '19:00', type: 'seminar', leader: 'Pastor Mo' },
            { id: 2, title: 'Taufgottesdienst', date: '2024-03-31', time: '10:00', type: 'baptism', leader: '' }
        ];
    }

    async createEvent(event: Omit<BaptizoEvent, 'id'>): Promise<BaptizoEvent> {
        console.log('[MockProvider] Creating event', event);
        return { ...event, id: Math.random() };
    }
}
