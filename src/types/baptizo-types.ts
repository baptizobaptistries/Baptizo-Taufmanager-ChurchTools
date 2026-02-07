export interface BaptizoFields {
    seminar_besucht_am?: string | null; // ISO Date YYYY-MM-DD
    getauft_am?: string | null; // ISO Date YYYY-MM-DD
    urkunde_ueberreicht?: string | null; // ISO Date YYYY-MM-DD (date when certificate was given)
    in_gemeinde_integriert?: string | null; // ISO Date YYYY-MM-DD (date when integrated)
    taufmanager_onboarding?: string | null; // ISO Date YYYY-MM-DD (when person joined Taufmanager)
    taufmanager_offboarding?: string | null; // ISO Date YYYY-MM-DD (when person left Taufmanager)
    taufmanager_status?: string | null; // 'active' or null
    custom_flag?: string | boolean | null;
}

export type BaptizoStatus = 'active' | 'inactive' | 'removed';

export interface BaptizoPerson {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    mobile?: string;
    phone?: string;
    status: BaptizoStatus; // Status within the group (e.g. Leiter, Teilnehmer, etc. mapped to our logic)
    entry_date?: string; // ISO Date YYYY-MM-DD (When they entered the process/group)
    fields: BaptizoFields;
    imageUrl?: string;
}

export interface BaptizoGroup {
    id: number;
    title: string;
    members: BaptizoPerson[];
}

export interface BaptizoEvent {
    id: number | string;
    title: string;
    date: string; // ISO Date YYYY-MM-DD
    type: 'seminar' | 'baptism';
    leader?: string;
    time?: string;
}
