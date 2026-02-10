<template>
  <div class="admin-container">
    <div class="settings-card">
      <!-- Settings Header -->
      <div class="settings-header">
        <h2 class="section-title">ChurchTools IDs konfigurieren</h2>
        <div class="header-actions">
          <button @click="showDebugModal = true" class="ct-button ct-button--debug">
            Schlüssel-Mapping kopieren
          </button>
          <button @click="handleDiscovery" class="ct-button ct-button--secondary" :disabled="discovering || saving">
            <span v-if="!discovering">IDs automatisch finden</span>
            <span v-else>Suche läuft...</span>
          </button>
          <button @click="handleSave" class="ct-button ct-button--primary" :disabled="saving || discovering">
            <span v-if="!saving">Einstellungen speichern</span>
            <span v-else>Speichert...</span>
          </button>
          <button @click="emit('close')" class="ct-button ct-button--report">
            Zurück zum Dashboard
          </button>
        </div>
      </div>

      <!-- Section: Gruppen -->
      <div class="config-section">
        <div class="section-header">
          <h3>Gruppen</h3>
        </div>
        <div class="ids-grid">
          <div class="id-card" :class="{ 'is-dirty': highlightedKeys.has('interestGroupId') }">
            <div class="card-header">
              <h4>Interessenten</h4>
            </div>
            <div class="form-group">
              <label>Gruppen-ID: interestGroupId</label>
              <input 
                v-model="localSettings.interestGroupId" 
                @input="markDirty('interestGroupId')"
                type="text" 
                placeholder="z.B. 123"
              />
            </div>
          </div>

          <div class="id-card" :class="{ 'is-dirty': highlightedKeys.has('baptizedGroupId') }">
            <div class="card-header">
              <h4>Getauft</h4>
            </div>
            <div class="form-group">
              <label>Gruppen-ID: baptizedGroupId</label>
              <input 
                v-model="localSettings.baptizedGroupId" 
                @input="markDirty('baptizedGroupId')"
                type="text" 
                placeholder="z.B. 456"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Kalender -->
      <div class="config-section">
        <div class="section-header">
          <h3>Kalender</h3>
        </div>
        <div class="ids-grid">
          <div class="id-card" :class="{ 'is-dirty': highlightedKeys.has('calendarId') }">
            <div class="card-header">
              <h4>Taufmanager</h4>
            </div>
            <div class="form-group">
              <label>Kalender-ID: calendarId</label>
              <input 
                v-model="localSettings.calendarId" 
                @input="markDirty('calendarId')"
                type="text" 
                placeholder="z.B. 5"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Personenfelder -->
      <div class="config-section">
        <div class="section-header">
          <h3>Personenfelder</h3>
        </div>
        <div class="ids-grid fields-grid">
          <div v-for="field in fieldMapping" :key="field.key" class="id-card" :class="{ 'is-dirty': highlightedKeys.has(field.settingsKey) }">
            <div class="card-header">
              <h4>{{ field.label }}</h4>
              <span class="field-badge" v-if="field.key">{{ field.key }}</span>
            </div>
            <div class="form-group">
              <label>Field-ID: {{ field.settingsKey }}</label>
              <input 
                v-model="localSettings[field.settingsKey as keyof AdminSettings]" 
                @input="markDirty(field.settingsKey)"
                type="text" 
                placeholder="z.B. 101"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mapping Modal -->
    <div v-if="showDebugModal" class="modal-overlay" @click.self="showDebugModal = false">
      <div class="modal-content debug-modal">
        <div class="modal-header">
          <h3>System-Schlüssel & IDs Mapping</h3>
          <button @click="showDebugModal = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p class="help-text">Diese Liste zeigt die internen ChurchTools-Schlüssel und die aktuell konfigurierten IDs.</p>
          <div class="mapping-table-container">
            <table class="mapping-table">
              <thead>
                <tr>
                  <th>Feld / Gruppe</th>
                  <th>CT Schlüssel (shorty)</th>
                  <th>Konfigurierte ID</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in fullDiscoveryMapping" :key="item.label">
                  <td>{{ item.label }}</td>
                  <td><code>{{ item.ctKey }}</code></td>
                  <td>{{ item.id || '---' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="copyMappingToClipboard" class="ct-button ct-button--primary">
            In Zwischenablage kopieren
          </button>
          <button @click="showDebugModal = false" class="ct-button ct-button--secondary">
            Schließen
          </button>
        </div>
      </div>
    </div>

    <!-- Feedback Toast -->
    <transition name="fade">
      <div v-if="saveMessage" class="save-toast" :class="{ error: saveError }">
        {{ saveMessage }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getAdminSettings, saveAdminSettings, getDefaultAdminSettings } from '../lib/kv-store';
import type { AdminSettings } from '../lib/kv-store';
import { DiscoveryService } from '../services/DiscoveryService';

const emit = defineEmits(['close']);

const localSettings = ref<AdminSettings>(getDefaultAdminSettings());
const saving = ref(false);
const discovering = ref(false);
const saveMessage = ref('');
const saveError = ref(false);
const highlightedKeys = ref<Set<string>>(new Set());
const showDebugModal = ref(false);

const fieldMapping = [
  { label: 'Onboarding (Datum)', key: 'taufmanager_onboarding', settingsKey: 'onboardingDateId' },
  { label: 'Seminar (Datum)', key: 'taufmanager_seminar', settingsKey: 'seminarDateId' },
  { label: 'Taufe (Datum)', key: 'taufmanager_taufe', settingsKey: 'baptismDateId' },
  { label: 'Urkunde (Datum)', key: 'taufmanager_urkunde', settingsKey: 'certificateDateId' },
  { label: 'Integration (Datum)', key: 'taufmanager_integration', settingsKey: 'integratedDateId' },
  { label: 'Offboarding (Datum)', key: 'taufmanager_offboarding', settingsKey: 'offboardingDateId' },
  { label: 'Status (Auswahl)', key: 'taufmanager_status', settingsKey: 'statusFieldId' },
  { label: 'Status: Aktiv (Option)', key: '', settingsKey: 'statusAktivId' },
  { label: 'Status: Inaktiv (Option)', key: '', settingsKey: 'statusInaktivId' },
];

const fullDiscoveryMapping = computed(() => [
  { label: 'Interessenten Gruppe', ctKey: 'n/a (Name search)', id: localSettings.value.interestGroupId },
  { label: 'Getauft Gruppe', ctKey: 'n/a (Name search)', id: localSettings.value.baptizedGroupId },
  { label: 'Taufmanager Kalender', ctKey: 'n/a (Name search)', id: localSettings.value.calendarId },
  ...fieldMapping.map(f => ({
    label: f.label,
    ctKey: f.key || '(Option ID)',
    id: (localSettings.value as any)[f.settingsKey]
  }))
]);

function markDirty(key: string) {
  highlightedKeys.value.add(key);
}

async function handleDiscovery() {
  discovering.value = true;
  try {
    const discoveryService = new DiscoveryService();
    const discovered = await discoveryService.discoverIds();
    
    // Merge discovered IDs into local settings and mark as dirty
    Object.keys(discovered).forEach(key => {
      const val = (discovered as any)[key];
      if (val) {
        (localSettings.value as any)[key] = val;
        markDirty(key);
      }
    });
    
    saveMessage.value = '✓ IDs automatisch eingetragen';
    saveError.value = false;
  } catch (error) {
    console.error('[Baptizo] Discovery error:', error);
    saveMessage.value = '✗ Discovery fehlgeschlagen';
    saveError.value = true;
  } finally {
    discovering.value = false;
    setTimeout(() => saveMessage.value = '', 3000);
  }
}

async function copyMappingToClipboard() {
  const text = fullDiscoveryMapping.value
    .map(item => `${item.label}: [Key: ${item.ctKey}] -> ID: ${item.id || 'not set'}`)
    .join('\n');
  
  try {
    await navigator.clipboard.writeText(text);
    saveMessage.value = '✓ Mapping kopiert';
    saveError.value = false;
  } catch (err) {
    saveMessage.value = '✗ Kopieren fehlgeschlagen';
    saveError.value = true;
  } finally {
    setTimeout(() => saveMessage.value = '', 3000);
  }
}

onMounted(async () => {
  try {
    const settings = await getAdminSettings();
    localSettings.value = settings ?? getDefaultAdminSettings();
  } catch (error) {
    console.error('[Baptizo] Error loading admin settings:', error);
  }
});

async function handleSave() {
  saving.value = true;
  saveMessage.value = '';
  saveError.value = false;

  try {
    const success = await saveAdminSettings(localSettings.value);
    if (success) {
      saveMessage.value = '✓ Einstellungen gespeichert';
      saveError.value = false;
      highlightedKeys.value.clear(); // Clear highlights after successful save
    } else {
      saveMessage.value = '✗ Fehler beim Speichern';
      saveError.value = true;
    }
  } catch (error) {
    saveMessage.value = '✗ Fehler beim Speichern';
    saveError.value = true;
  } finally {
    saving.value = false;
    setTimeout(() => saveMessage.value = '', 3000);
  }
}
</script>

<style scoped>
.admin-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.settings-card {
  background: #1e1e1e;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #92C9D6;
  margin: 0;
}

.config-section {
  margin-bottom: 2rem;
}

.section-header h3 {
  font-size: 1.1rem;
  font-weight: bold;
  color: #fff;
  margin: 0 0 1rem 0;
}

.ids-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.fields-grid {
  grid-template-columns: repeat(3, 1fr);
}

.id-card {
  background: #2a2a2a;
  padding: 1.25rem;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
}

.id-card.is-dirty {
  border-color: #f97316;
  background: rgba(249, 115, 22, 0.05);
}

.id-card.is-dirty input {
  border-color: #f97316;
  color: #f97316;
}

.id-card:hover {
  background: #2f2f2f;
}

.card-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #444;
}

.card-header h4 {
  margin: 0;
  color: #92C9D6;
  font-size: 1rem;
  font-weight: bold;
}

.field-badge {
  background: #444;
  color: #aaa;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  text-transform: lowercase;
  font-family: monospace;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background: #1a1a1a;
  border: 1px solid #444;
  color: #fff;
  border-radius: 4px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #92C9D6;
}

.form-group input::placeholder {
  color: #666;
}

.save-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: #10b981;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 4px;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
  z-index: 1000;
}

.save-toast.error {
  background: #ef4444;
}

@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.ct-button {
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.ct-button--primary {
  background: #92C9D6;
  color: #1a1a1a;
}

.ct-button--primary:hover:not(:disabled) {
  background: #aed9e3;
}

.ct-button--secondary {
  background: transparent;
  border: 2px solid #92C9D6;
  color: #92C9D6;
}

.ct-button--secondary:hover:not(:disabled) {
  background: rgba(146, 201, 214, 0.1);
}

.ct-button--report {
  background-color: rgba(0, 0, 0, 0.3);
  border: 2px solid #92C9D6;
  color: #fff;
}

.ct-button--report:hover:not(:disabled) {
  background-color: rgba(146, 201, 214, 0.1);
}

.ct-button--debug {
  background: #444;
  color: #ccc;
}
.ct-button--debug:hover {
  background: #555;
  color: #fff;
}

.ct-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #1e1e1e;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid #333;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #92C9D6;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 2rem;
  cursor: pointer;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.mapping-table-container {
  background: #111;
  border-radius: 8px;
  padding: 0.5rem;
}

.mapping-table {
  width: 100%;
  border-collapse: collapse;
  color: #ccc;
  font-size: 0.9rem;
}

.mapping-table th, .mapping-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #222;
}

.mapping-table th {
  color: #888;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
}

.mapping-table code {
  color: #76E0C2;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #333;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
