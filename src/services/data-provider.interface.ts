import type { BaptizoGroup, BaptizoFields } from '../types/baptizo-types.ts';

export interface DataProvider {
    /**
     * Retrieves all relevant groups for the Baptizo process.
     */
    getGroups(): Promise<BaptizoGroup[]>;

    /**
     * Retrieves a specific group by ID.
     */
    getGroup(id: number): Promise<BaptizoGroup | null>;

    /**
     * Updates specific custom fields for a person.
     * @param personId The ID of the person to update
     * @param fields The fields to update
     */
    updatePersonFields(personId: number, fields: Partial<BaptizoFields>): Promise<void>;
}
