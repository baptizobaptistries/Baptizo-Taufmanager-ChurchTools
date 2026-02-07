<template>
  <div class="admin-container">
    <!-- Header (Identical to Dashboard) -->
    <header class="dashboard-header">
      <div class="logo-area">
        <img src="/logo.png" alt="Baptizo Logo" class="logo-img" />
        <h1 class="app-title">BAPTIZO TAUFMANAGER</h1>
      </div>
      <div class="actions">
        <!-- 
        <button @click="runSync" class="ct-button ct-button--primary" :disabled="syncing">
          <span v-if="!syncing">🔄 Globale Personen-Sync</span>
          <span v-else>⏳ Synchronisiere...</span>
        </button> 
        -->
        <!-- 
        <button @click="findOnboardingField" class="ct-button ct-button--secondary" style="margin-left: 10px;">
          🔍 Feld-Namen suchen
        </button>
        <button @click="runMigration" class="ct-button ct-button--primary" :disabled="migrating" style="margin-left: 10px;">
          <span v-if="!migrating">🔄 Onboarding-Daten migrieren</span>
          <span v-else>⏳ Migriert...</span>
        </button> 
        -->
        <button @click="navigateBack" class="ct-button ct-button--report">
          <span class="icon">←</span> ZURÜCK ZUM DASHBOARD
        </button>
      </div>
    </header>

    <!-- Content Area -->
    <div class="admin-content">
      <!-- Settings Header -->
      <div class="settings-header">
        <h2 class="section-title">ChurchTools IDs konfigurieren</h2>
        <button @click="handleSave" class="ct-button ct-button--primary" :disabled="saving">
          <span v-if="!saving">Einstellungen speichern</span>
          <span v-else>Speichert...</span>
        </button>
      </div>

      <!-- Section: Gruppen -->
      <div class="config-section">
        <div class="section-header">
          <h3>Gruppen</h3>
        </div>
        <div class="ids-grid">
          <div class="id-card">
            <div class="card-header">
              <h4>Taufmanager: Interessenten</h4>
            </div>
            <div class="form-group">
              <label>Gruppen-ID: interestGroupId</label>
              <input 
                v-model="localSettings.interestGroupId" 
                type="text" 
                placeholder="z.B. 123"
              />
            </div>
          </div>

          <div class="id-card">
            <div class="card-header">
              <h4>Taufmanager: Getauft</h4>
            </div>
            <div class="form-group">
              <label>Gruppen-ID: baptizedGroupId</label>
              <input 
                v-model="localSettings.baptizedGroupId" 
                type="text" 
                placeholder="z.B. 456"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Section: Kalender -->
      <div class="config-section">
        <div class="section-header">
          <!-- User asked to remove the prefix A/B. And maybe the separator? -->
          <!-- User said "hier kann einfach Gruppen stehen" (done above) -->
          <!-- User said for Calendar: "unten steht einfach nur Kalender" -->
          <!-- Also remove the "Events" title and replace with "Taufmanager" -->
          <!-- Remove the badge -->
          <h3>Kalender</h3>
        </div>
        <div class="ids-grid">
          <div class="id-card">
            <div class="card-header">
              <h4>Taufmanager</h4>
              <!-- Badge removed -->
            </div>
            <div class="form-group">
              <label>Kalender-ID: calendarId</label>
              <input 
                v-model="localSettings.calendarId" 
                type="text" 
                placeholder="z.B. 5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>




    <!-- Save Toast -->
    <div v-if="saveMessage" class="save-toast" :class="{ error: saveError }">
      {{ saveMessage }}
    </div>
    

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getAdminSettings, saveAdminSettings, getDefaultAdminSettings, type AdminSettings } from '../lib/kv-store';


const props = defineProps<{
  onNavigate?: (target: string) => void;
}>();

const emit = defineEmits(['close']);

function navigateBack() {
  emit('close');
}

const localSettings = ref<AdminSettings>(getDefaultAdminSettings());
const saving = ref(false);
const saveMessage = ref('');
const saveError = ref(false);

// Cleaned up: Sync/Migration logic removed as per Ticket 51

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
  background: #1a1a1a;
  min-height: 100vh;
  color: #eee;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.dashboard-header {
  background: #3C3C5B;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-img {
  height: 50px;
  width: auto;
}

.app-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
  margin: 0;
}

.actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.ct-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ct-button--primary {
  background-color: #92C9D6;
  color: #3C3C5B;
  border: 2px solid #92C9D6;
}

.ct-button--primary:hover {
  background: #7ab8c5;
}

.ct-button--report {
  background-color: rgba(0, 0, 0, 0.3);
  border: 2px solid #92C9D6;
  color: #fff;
}

.ct-button--report:hover {
  background: rgba(146, 201, 214, 0.2);
}

.ct-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.admin-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  /* Border removed as requested */
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
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.id-card {
  background: #2a2a2a;
  padding: 1.25rem;
  border-radius: 8px;
}

.id-card:hover {
  background: #2f2f2f;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.field-type {
  background: #444;
  color: #aaa;
  padding: 0.2rem 0.5rem;
  border-radius: 3px;
  font-size: 0.75rem;
  text-transform: uppercase;
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

.help-text {
  font-size: 0.8rem;
  color: #888;
  margin-top: 0.5rem;
  margin-bottom: 0;
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
</style>
