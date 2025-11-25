import type { DataProvider } from './data-provider.interface';
import type { BaptizoGroup, BaptizoFields, BaptizoEvent, BaptizoPerson } from '../types/baptizo-types';
import { DEFAULT_SETTINGS } from '../types/baptizo-settings';
import type { BaptizoSettings } from '../types/baptizo-settings';

export class MockDataProvider implements DataProvider {
    private groups: BaptizoGroup[] = [
        {
            id: 100,
            title: 'Taufinteressenten',
            members: [],
        },
        {
            id: 101,
            title: 'Getaufte',
            members: [],
        },
    ];

    constructor() {
        this.generateDeterministicData();
    }

    async updatePerson(updatedPerson: BaptizoPerson): Promise<void> {
        // Find person in groups and update
        for (const group of this.groups) {
            const index = group.members.findIndex(p => p.id === updatedPerson.id);
            if (index !== -1) {
                group.members[index] = updatedPerson;

                // Check if we need to move from Interested (100) to Baptized (101)
                if (group.id === 100 && updatedPerson.fields.getauft_am) {
                    // Remove from 100
                    group.members.splice(index, 1);
                    // Add to 101
                    const baptizedGroup = this.groups.find(g => g.id === 101);
                    if (baptizedGroup) baptizedGroup.members.push(updatedPerson);
                }
                return;
            }
        }
    }

    async deletePerson(id: number): Promise<void> {
        for (const group of this.groups) {
            const index = group.members.findIndex(p => p.id === id);
            if (index !== -1) {
                group.members.splice(index, 1);
                console.log(`[MockDB] Deleted Person ${id}`);
                return;
            }
        }
    }

    private generateDeterministicData() {
        const firstNames = ['Anna', 'Ben', 'Chris', 'Dora', 'Emil', 'Felix', 'Greta', 'Hannes', 'Ina', 'Jan', 'Klara', 'Leo', 'Mia', 'Noah', 'Paula', 'Paul', 'Sarah', 'Tim', 'Ulla', 'Vera', 'Lukas', 'Marie', 'Sophie', 'Elias', 'Leon', 'Finn', 'Lena', 'Emily', 'Luca', 'Max'];
        const lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz'];

        // Matrix: Exact distribution per year
        const yearConfigs = [
            { year: 2023, interested: 8, seminar: 5, baptized: 5 },
            { year: 2024, interested: 14, seminar: 12, baptized: 10 },
            { year: 2025, interested: 25, seminar: 20, baptized: 19 }
        ];

        const TODAY = new Date('2025-11-25');
        let idCounter = 1000;
        let nameIndex = 0;
        const allBaptized: BaptizoPerson[] = []; // Track all baptized for widget logic

        yearConfigs.forEach(config => {
            for (let i = 0; i < config.interested; i++) {
                const id = idCounter++;
                const firstName = firstNames[nameIndex % firstNames.length];
                const lastName = lastNames[Math.floor(nameIndex / firstNames.length) % lastNames.length];
                nameIndex++;

                // Deterministic date generation
                // 2025: compress into Jan-Nov, weighted towards autumn
                // 2024 & 2023: spread across year, weighted towards H2
                let entryMonth: number;
                if (config.year === 2025) {
                    // Compress into 0-10 (Jan-Nov), weighted towards 8-10 (Sep-Nov)
                    const monthWeights = [1, 1, 1, 1, 2, 2, 3, 4, 5, 6, 5]; // Nov has index 10
                    const totalWeight = monthWeights.reduce((a, b) => a + b, 0);
                    let rand = (id * 17 + i * 13) % totalWeight; // Deterministic "random"
                    entryMonth = 0;
                    for (let m = 0; m < monthWeights.length; m++) {
                        if (rand < monthWeights[m]) {
                            entryMonth = m;
                            break;
                        }
                        rand -= monthWeights[m];
                    }
                } else {
                    // 2023/2024: months 0-11, weighted towards 6-11 (Jul-Dec)
                    entryMonth = ((id * 7 + i * 11) % 12);
                    if (entryMonth < 6 && ((id + i) % 3) !== 0) {
                        entryMonth += 6; // 66% chance to be in H2
                    }
                }

                // Determine who gets seminar/baptism (first N people)
                const getsSeminar = i < config.seminar;
                const getsBaptized = i < config.baptized;

                let entryDate: Date;
                let seminarDate: string | null = null;
                let baptismDate: string | null = null;

                if (getsBaptized) {
                    // BACKWARDS CALCULATION to prevent year drift
                    // 1. First: Pick baptism date within the target year
                    let baptismMonth: number;
                    if (config.year === 2025) {
                        // 2025: Between Jan-Nov (0-10)
                        baptismMonth = ((id * 11 + i * 7) % 11);
                    } else {
                        // 2023/2024: Spread across year
                        baptismMonth = ((id * 7 + i * 11) % 12);
                    }
                    const baptismDay = ((id * 13 + i * 17) % 28) + 1;
                    const baptismD = new Date(config.year, baptismMonth, Math.min(baptismDay, 28));
                    const finalBaptismDate = baptismD > TODAY ? new Date(TODAY.getTime() - 86400000) : baptismD;
                    baptismDate = finalBaptismDate.toISOString().split('T')[0];

                    // 2. Then: Seminar 2-6 weeks BEFORE baptism
                    const seminarDaysBefore = 14 + ((id * 3) % 28); // 2-6 weeks
                    const seminarD = new Date(finalBaptismDate.getTime() - seminarDaysBefore * 86400000);
                    seminarDate = seminarD.toISOString().split('T')[0];

                    // 3. Finally: Entry 2-6 weeks BEFORE seminar
                    const entryDaysBefore = 14 + ((id * 5) % 28); // 2-6 weeks
                    entryDate = new Date(seminarD.getTime() - entryDaysBefore * 86400000);

                    // Safety: Ensure entry doesn't drift into previous year
                    if (entryDate.getFullYear() < config.year) {
                        // Compress: move entry to early in target year
                        entryDate = new Date(config.year, 0, ((id * 3 + i * 5) % 28) + 1);
                    }
                } else if (getsSeminar) {
                    // Has seminar but no baptism
                    // Pick seminar date in target year
                    const seminarMonth = ((id * 7 + i * 11) % 12);
                    const seminarDay = ((id * 13 + i * 17) % 28) + 1;
                    const seminarD = new Date(config.year, seminarMonth, Math.min(seminarDay, 28));
                    const finalSeminarDate = seminarD > TODAY ? new Date(TODAY.getTime() - 86400000 * 3) : seminarD;
                    seminarDate = finalSeminarDate.toISOString().split('T')[0];

                    // Entry 2-6 weeks before seminar
                    const entryDaysBefore = 14 + ((id * 5) % 28);
                    entryDate = new Date(finalSeminarDate.getTime() - entryDaysBefore * 86400000);

                    // Safety check
                    if (entryDate.getFullYear() < config.year) {
                        entryDate = new Date(config.year, 0, ((id * 3 + i * 5) % 28) + 1);
                    }
                } else {
                    // Only interested, no seminar
                    // Pick entry date in target year
                    let entryMonth: number;
                    if (config.year === 2025) {
                        entryMonth = ((id * 11 + i * 7) % 11); // 0-10 (Jan-Nov)
                    } else {
                        entryMonth = ((id * 7 + i * 11) % 12);
                    }
                    const entryDay = ((id * 5 + i * 7) % 28) + 1;
                    entryDate = new Date(config.year, entryMonth, Math.min(entryDay, 28));

                    // Ensure not after TODAY
                    if (entryDate > TODAY) {
                        entryDate = new Date(TODAY.getTime() - 86400000 * 7);
                    }
                }

                const person: BaptizoPerson = {
                    id,
                    firstName,
                    lastName,
                    status: 'active',
                    entry_date: entryDate.toISOString().split('T')[0],
                    fields: {
                        seminar_besucht_am: seminarDate,
                        getauft_am: baptismDate,
                        urkunde_ueberreicht: false, // Will be set later
                        in_gemeinde_integriert: false, // Will be set later
                    },
                    imageUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
                };

                // Add to correct group
                if (getsBaptized) {
                    this.groups[1].members.push(person);
                    allBaptized.push(person);
                } else {
                    this.groups[0].members.push(person);
                }
            }
        });

        // Widget Logic: Certificates and Integration
        // Rule: ALL baptized get certificate EXCEPT the very last one in 2025
        allBaptized.sort((a, b) => {
            const dateA = new Date(a.fields.getauft_am!).getTime();
            const dateB = new Date(b.fields.getauft_am!).getTime();
            return dateA - dateB;
        });

        const lastBaptized2025 = allBaptized
            .filter(p => p.fields.getauft_am?.startsWith('2025'))
            .sort((a, b) => new Date(b.fields.getauft_am!).getTime() - new Date(a.fields.getauft_am!).getTime())[0];

        allBaptized.forEach(person => {
            // Certificate: all true except last 2025 baptism
            person.fields.urkunde_ueberreicht = person.id !== lastBaptized2025?.id;
        });

        // Integration: ~4 people missing integration (deterministic selection)
        const integrationMissing = [
            allBaptized[2],   // 3rd person
            allBaptized[7],   // 8th person
            allBaptized[15],  // 16th person
            allBaptized[28]   // 29th person (if exists)
        ].filter(p => p !== undefined);

        allBaptized.forEach(person => {
            person.fields.in_gemeinde_integriert = !integrationMissing.includes(person);
        });
    }

    private events: BaptizoEvent[] = [
        {
            id: 1,
            title: 'Taufseminar März',
            date: '2025-03-15',
            type: 'seminar',
            leader: 'Pastor Peter',
        },
        {
            id: 2,
            title: 'Oster-Taufe',
            date: '2025-04-20',
            type: 'baptism',
            leader: 'Pastor Paul',
        },
    ];

    async getGroups(): Promise<BaptizoGroup[]> {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        return [...this.groups];
    }

    async getGroup(id: number): Promise<BaptizoGroup | null> {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const group = this.groups.find((g) => g.id === id);
        return group || null;
    }

    async updatePersonFields(personId: number, fields: Partial<BaptizoFields>): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 300));

        for (const group of this.groups) {
            const person = group.members.find((p) => p.id === personId);
            if (person) {
                person.fields = { ...person.fields, ...fields };
                console.log(`[MockDB] Updated Person ${personId}:`, person.fields);
                return;
            }
        }

        console.warn(`[MockDB] Person ${personId} not found.`);
    }

    async getEvents(): Promise<BaptizoEvent[]> {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return [...this.events];
    }

    async createEvent(event: Omit<BaptizoEvent, 'id'>): Promise<BaptizoEvent> {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const newEvent = { ...event, id: Math.max(0, ...this.events.map(e => e.id)) + 1 };
        this.events.push(newEvent);
        return newEvent;
    }

    // Settings
    private settings: BaptizoSettings = { ...DEFAULT_SETTINGS };

    async getSettings(): Promise<BaptizoSettings> {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { ...this.settings };
    }

    async updateSettings(settings: Partial<BaptizoSettings>): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 300));
        this.settings = { ...this.settings, ...settings };
        console.log('[MockDB] Updated Settings:', this.settings);
    }
}
