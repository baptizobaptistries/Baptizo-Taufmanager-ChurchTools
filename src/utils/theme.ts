export type AvatarColorMode = 'random' | 'mono' | 'status';

// --- CONFIGURATION ---
// Toggle this to switch between 'random' (3-color hash), 'mono' (single color), or 'status' (process stage)
export const AVATAR_COLOR_MODE: AvatarColorMode = 'status';

// Color Constants
export const COLOR_TURQUOISE = '#92C9D6';
export const COLOR_PURPLE = '#7383B2';
export const COLOR_ORANGE = '#FF9F43';
export const COLOR_MINT = '#76E0C2';

// The Single Color for 'mono' mode
export const MONO_COLOR = COLOR_MINT;

// The Palette for 'random' mode
export const BRAND_PALETTE = [COLOR_TURQUOISE, COLOR_PURPLE, COLOR_ORANGE];

/**
 * Determines the background color for a person avatar.
 * Respects the global AVATAR_COLOR_MODE setting.
 */
export const getAvatarColor = (person: {
    firstName?: string;
    lastName?: string;
    id?: number;
    fields?: {
        seminar_besucht_am?: string;
        getauft_am?: string;
        urkunde_ueberreicht?: boolean | string;
        in_gemeinde_integriert?: boolean | string;
    }
}): string => {
    if ((AVATAR_COLOR_MODE as any) === 'mono') return MONO_COLOR;

    if (AVATAR_COLOR_MODE === 'status' && person.fields) {
        const { seminar_besucht_am, getauft_am, urkunde_ueberreicht } = person.fields;

        // 1. Certificate Overcomes: Baptized AND Certificate -> Green/Mint
        if (getauft_am && urkunde_ueberreicht) return COLOR_MINT;

        // 2. Baptized (includes Integration): -> Orange
        if (getauft_am) return COLOR_ORANGE;

        // 3. Seminar visited -> Purple/Lila (Overrides Integrated BEFORE Baptism)
        if (seminar_besucht_am) return COLOR_PURPLE;

        // 4. Default / Onboarded -> Turquoise/Türkis
        return COLOR_TURQUOISE;
    }

    // Random Hash Strategy (Fallback or 'random' mode)
    const str = (person.firstName || '') + (person.lastName || '') + (person.id || 0);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % BRAND_PALETTE.length;
    return BRAND_PALETTE[index];
};

/**
 * Determines the text color for a given background color to ensure contrast.
 */
export const getAvatarTextColor = (bgColor: string): string => {
    if (bgColor === COLOR_MINT) return '#1A1A1A';      // Mint -> Dark Gray
    if (bgColor === COLOR_TURQUOISE) return '#1A1A1A'; // Turquoise -> Dark Gray
    if (bgColor === COLOR_ORANGE) return '#251D15';    // Orange -> Dark Brown
    if (bgColor === COLOR_PURPLE) return '#1A1A1A';    // Purple -> Dark Gray (Updated for contrast)
    return '#FFFFFF';                                  // Default -> White
};

/**
 * Generates initials from a person object.
 */
export const getInitials = (person: { firstName?: string; lastName?: string }): string => {
    return (person.firstName?.charAt(0) || '') + (person.lastName?.charAt(0) || '');
};

