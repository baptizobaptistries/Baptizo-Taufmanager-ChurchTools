export interface BaptizoFields {
    seminar_besucht_am?: string | null; // ISO Date YYYY-MM-DD
    getauft_am?: string | null; // ISO Date YYYY-MM-DD
    urkunde_ueberreicht?: boolean;
    in_gemeinde_integriert?: boolean;
    custom_flag?: string | boolean | null;
}

export type BaptizoStatus = 'active' | 'inactive' | 'removed';

export interface BaptizoPerson {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    status: BaptizoStatus; // Status within the group (e.g. Leiter, Teilnehmer, etc. mapped to our logic)
    fields: BaptizoFields;
    imageUrl?: string;
}

export interface BaptizoGroup {
    id: number;
    title: string;
    members: BaptizoPerson[];
}
