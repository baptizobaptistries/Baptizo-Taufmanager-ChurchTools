import type { EntryPoint } from '../types/extension';

/**
 * Admin Configuration Entry Point
 *
 * Uses Mock Data to prevent 400 errors on read-only system.
 */

const adminEntryPoint: EntryPoint = ({ element }) => {
    console.log('[Admin] Initializing Mock Admin');

    element.innerHTML = `
        <div style="max-width: 600px; margin: 2rem auto; padding: 2rem; background: #2a2a2a; color: #eee; border-radius: 8px;">
            <h1 style="color: #92C9D6;">Baptizo Einstellungen</h1>
            <p>Hier können globale Einstellungen vorgenommen werden.</p>
            
            <div style="margin-top: 2rem; padding: 1rem; background: #3C3C5B; border-radius: 4px;">
                <h3 style="margin-top: 0;">Mock-Modus Aktiv</h3>
                <p>Das System läuft aktuell im Read-Only Modus. Einstellungen werden nicht gespeichert.</p>
            </div>

            <div style="margin-top: 2rem;">
                <label style="display: block; margin-bottom: 0.5rem;">E-Mail Absender Name</label>
                <input type="text" value="Tauf-Team" style="width: 100%; padding: 0.5rem; background: #444; border: 1px solid #555; color: white; border-radius: 4px;" />
            </div>

            <button id="save-btn" style="margin-top: 2rem; padding: 0.75rem 1.5rem; background: #92C9D6; color: #3C3C5B; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
                Speichern (Simulation)
            </button>
        </div>
    `;

    const saveBtn = element.querySelector('#save-btn');
    saveBtn?.addEventListener('click', () => {
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Gespeichert! ✓';
        setTimeout(() => {
            if (saveBtn) saveBtn.textContent = originalText;
        }, 2000);
    });

    return () => {
        console.log('[Admin] Cleaning up');
    };
};

export default adminEntryPoint;

