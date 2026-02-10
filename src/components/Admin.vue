<template>
  <div class="admin-container">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="logo-area">
        <img src="/logo.png" alt="Baptizo Logo" class="logo-img" />
        <h1 class="app-title">BAPTIZO SETUP & ADMIN</h1>
      </div>
      <div class="actions">
        <button @click="navigateBack" class="ct-button ct-button--report">
          <span class="icon">←</span> ZURÜCK ZUM DASHBOARD
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="admin-content">
      
      <!-- Profile Switcher Card -->
      <section class="config-card profile-card">
        <div class="card-content">
          <div class="info-group">
            <h3>Umgebungs-Profil</h3>
            <p class="description">
              Wähle zwischen der <strong>Development</strong> (deine bestehende Konfiguration) 
              oder der <strong>End-User</strong> Umgebung (für Neu-Installationen).
            </p>
          </div>
          <div class="profile-toggle">
            <button 
              :class="{ active: settings.activeProfile === 'development' }"
              @click="toggleProfile('development')"
            >
              Development
            </button>
            <button 
              :class="{ active: settings.activeProfile === 'end-user' }"
              @click="toggleProfile('end-user')"
            >
              End-User
            </button>
          </div>
        </div>
      </section>

      <!-- The Big Red Button Section -->
      <section class="setup-hero">
        <div class="setup-viz">
          <div class="installer-button-wrapper" :class="{ 'is-loading': provisioning }">
            <button 
              class="big-red-button" 
              @click="confirmAndRunSetup" 
              :disabled="provisioning || isSetupComplete"
            >
              <div class="button-inner">
                <svg v-if="!provisioning" viewBox="0 0 24 24" class="btn-icon">
                  <path fill="currentColor" d="M11,15H13V9H11V15M11,19H13V17H11V19M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20Z" />
                </svg>
                <div v-else class="loader"></div>
                <span>{{ setupButtonText }}</span>
              </div>
            </button>
            <div class="halo"></div>
          </div>
          <p class="setup-hint" v-if="!isSetupComplete">
            Klicke auf den Button, um alle benötigten Gruppen, Kalender und Personenfelder <br/>
            vollautomatisch in dieser Instanz anzulegen und zu verknüpfen.
          </p>
          <div v-else class="setup-success">
            <span class="check-icon">✓</span>
            <span>Installation abgeschlossen! Die App ist in der {{ settings.activeProfile }} Umgebung betriebsbereit.</span>
          </div>
        </div>
      </section>

      <!-- Detailed Status List -->
      <section class="status-grid">
        <div class="status-column">
          <h3>Asset-Status ({{ settings.activeProfile }})</h3>
          <ul class="checklist">
            <li :class="{ complete: status.interestGroup }">
              <span class="status-icon">{{ status.interestGroup ? '✓' : '○' }}</span>
              <span class="label">Gruppe: Interessenten{{ currentSuffix }}</span>
              <span class="id-badge" v-if="currentProfileSettings.interestGroupId">ID: {{ currentProfileSettings.interestGroupId }}</span>
            </li>
            <li :class="{ complete: status.baptizedGroup }">
              <span class="status-icon">{{ status.baptizedGroup ? '✓' : '○' }}</span>
              <span class="label">Gruppe: Getauft{{ currentSuffix }}</span>
               <span class="id-badge" v-if="currentProfileSettings.baptizedGroupId">ID: {{ currentProfileSettings.baptizedGroupId }}</span>
            </li>
            <li :class="{ complete: status.calendar }">
              <span class="status-icon">{{ status.calendar ? '✓' : '○' }}</span>
              <span class="label">Kalender: Taufmanager{{ currentSuffix }}</span>
              <span class="id-badge" v-if="currentProfileSettings.calendarId">ID: {{ currentProfileSettings.calendarId }}</span>
            </li>
          </ul>
        </div>
        <div class="status-column">
          <h3>Personenfelder</h3>
          <ul class="checklist">
            <li v-for="(val, key) in status.fields" :key="key" :class="{ complete: val }">
              <span class="status-icon">{{ val ? '✓' : '○' }}</span>
              <span class="label">Feld: taufmanager_{{ key }}{{ currentSuffix }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Advanced / Maintenance Section -->
      <section class="maintenance-section">
        <div class="maintenance-grid">
          <!-- Cleanup Card -->
          <div class="maint-card">
            <h4>System-Bereinigung</h4>
            <p>Löscht alle erstellten Assets (Gruppen, Kalender, Felder) des aktuellen Profils.</p>
            <button 
              class="btn-outline-danger" 
              @click="confirmAndRunCleanup"
              :disabled="provisioning"
            >
              SYSTEM ZURÜCKSETZEN
            </button>
          </div>

          <!-- Test Data Card -->
          <div class="maint-card">
            <h4>Test-Daten</h4>
            <p>Erstellt Test-Personen und setzt Hannes als Leiter ein (nur für Sandbox-Tests).</p>
            <div class="btn-group-maint">
              <button 
                class="btn-outline-info" 
                @click="runProvisionTestData"
                :disabled="provisioning || !isSetupComplete"
              >
                DATEN LADEN
              </button>
              <button 
                class="btn-outline-secondary" 
                @click="runCleanupTestData"
                :disabled="provisioning"
              >
                LEEREN
              </button>
            </div>
          </div>
        </div>
      </section>

    </main>

    <!-- Modal for confirmation -->
    <div v-if="showConfirmModal" class="modal-overlay">
      <div class="modal-card">
        <h2>{{ confirmModalTitle }}</h2>
        <p v-html="confirmModalText"></p>
        <div class="modal-actions">
          <button @click="showConfirmModal = false" class="btn-cancel">Abbrechen</button>
          <button @click="handleConfirmAction" class="btn-confirm">Fortfahren</button>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div v-if="toast" :class="['toast', toast.type]">
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { getAdminSettings, saveAdminSettings, getDefaultAdminSettings, type AdminSettings, type EnvironmentProfile, type ProfileSettings } from '../lib/kv-store';
import { SetupService, type ProvisioningStatus } from '../services/setupService';
import { TestDataService } from '../services/testDataService';

const emit = defineEmits(['close']);

// State
const settings = ref<AdminSettings>(getDefaultAdminSettings());
const status = ref<ProvisioningStatus>({
  interestGroup: false,
  baptizedGroup: false,
  calendar: false,
  fields: { onboarding: false, seminar: false, taufe: false, urkunde: false, integration: false, offboarding: false, status: false }
});

const provisioning = ref(false);
const showConfirmModal = ref(false);
const confirmAction = ref<'setup' | 'cleanup'>('setup');
const toast = ref<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

// Services (reactive to profile)
const currentSuffix = computed(() => settings.value.activeProfile === 'end-user' ? '_test' : '');
const setupService = computed(() => new SetupService(currentSuffix.value));
const testDataService = computed(() => new TestDataService(currentSuffix.value));

// Computed
const currentProfileSettings = computed(() => {
  return settings.value[settings.value.activeProfile];
});

const isSetupComplete = computed(() => {
  return status.value.interestGroup && status.value.baptizedGroup && status.value.calendar && Object.values(status.value.fields).every(v => v);
});

const setupButtonText = computed(() => {
  if (provisioning.value) return 'Bitte warten...';
  if (isSetupComplete.value) return 'System Bereit';
  return 'JETZT INSTALLIEREN';
});

const confirmModalTitle = computed(() => {
  return confirmAction.value === 'setup' ? 'Installation starten?' : 'System zurücksetzen?';
});

const confirmModalText = computed(() => {
  if (confirmAction.value === 'setup') {
    return `Es werden neue Gruppen, Kalender und Felder in dieser ChurchTools-Instanz angelegt. <br/>
            Suffix: <strong>${currentSuffix.value || 'Keiner'}</strong><br/>
            Profil: <strong>${settings.value.activeProfile}</strong>`;
  } else {
    return `<span style="color: #ff4e50; font-weight: bold;">WARNUNG:</span> Dies löscht alle vom Taufmanager angelegten Gruppen, Kalender und Felder in diesem Profil.<br/>
            Profil: <strong>${settings.value.activeProfile}</strong>`;
  }
});

// Methods
async function loadStatus() {
  status.value = await setupService.value.getProvisioningStatus(currentProfileSettings.value);
}

onMounted(async () => {
  const loaded = await getAdminSettings();
  if (loaded) settings.value = loaded;
  await loadStatus();
});

async function toggleProfile(profile: EnvironmentProfile) {
  if (settings.value.activeProfile === profile) return;
  
  settings.value.activeProfile = profile;
  await saveAdminSettings(settings.value);
  showToast(`Profil gewechselt zu: ${profile}`, 'info');
  await loadStatus();
}

function confirmAndRunSetup() {
  if (isSetupComplete.value) return;
  confirmAction.value = 'setup';
  showConfirmModal.value = true;
}

function confirmAndRunCleanup() {
  confirmAction.value = 'cleanup';
  showConfirmModal.value = true;
}

function handleConfirmAction() {
  if (confirmAction.value === 'setup') runSetup();
  else runCleanup();
}

async function runSetup() {
  showConfirmModal.value = false;
  provisioning.value = true;
  
  try {
    const updatedProfileSettings = await setupService.value.runFullSetup(currentProfileSettings.value);
    updateProfileSettings(updatedProfileSettings);
    await saveAdminSettings(settings.value);
    await loadStatus();
    showToast('Installation erfolgreich abgeschlossen!', 'success');
  } catch (error: any) {
    showToast(`Fehler: ${error.message}`, 'error');
  } finally {
    provisioning.value = false;
  }
}

async function runCleanup() {
  showConfirmModal.value = false;
  provisioning.value = true;
  
  try {
    const clearedSettings = await setupService.value.runFullCleanup(currentProfileSettings.value);
    updateProfileSettings(clearedSettings);
    await saveAdminSettings(settings.value);
    await loadStatus();
    showToast('System erfolgreich zurückgesetzt.', 'success');
  } catch (error: any) {
    showToast(`Fehler beim Cleanup: ${error.message}`, 'error');
  } finally {
    provisioning.value = false;
  }
}

async function runProvisionTestData() {
  provisioning.value = true;
  try {
    await testDataService.value.provisionTestData(currentProfileSettings.value);
    showToast('Test-Daten erfolgreich geladen.', 'success');
  } catch (error: any) {
    showToast(`Fehler: ${error.message}`, 'error');
  } finally {
    provisioning.value = false;
  }
}

async function runCleanupTestData() {
  provisioning.value = true;
  try {
    await testDataService.value.cleanupTestData();
    showToast('Test-Daten wurden entfernt.', 'info');
  } catch (error: any) {
    showToast(`Fehler: ${error.message}`, 'error');
  } finally {
    provisioning.value = false;
  }
}

async function runCreateTestAppointments() {
  if (!currentProfileSettings.value.calendarId) return;
  provisioning.value = true;
  try {
    await setupService.value.createTestAppointments(currentProfileSettings.value.calendarId);
    showToast('Test-Termine wurden erstellt.', 'success');
  } catch (error: any) {
    showToast(`Fehler: ${error.message}`, 'error');
  } finally {
    provisioning.value = false;
  }
}

async function runDeleteTestAppointments() {
  if (!currentProfileSettings.value.calendarId) return;
  provisioning.value = true;
  try {
    await setupService.value.deleteTestAppointments(currentProfileSettings.value.calendarId);
    showToast('Test-Termine wurden entfernt.', 'info');
  } catch (error: any) {
    showToast(`Fehler: ${error.message}`, 'error');
  } finally {
    provisioning.value = false;
  }
}

function updateProfileSettings(newVal: ProfileSettings) {
  if (settings.value.activeProfile === 'development') {
    settings.value.development = newVal;
  } else {
    settings.value['end-user'] = newVal;
  }
}

function navigateBack() {
  emit('close');
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toast.value = { message, type };
  setTimeout(() => toast.value = null, 4000);
}
</script>

<style scoped>
.admin-container {
  background: #0f0f12;
  min-height: 100vh;
  color: #e0e0e0;
  font-family: 'Inter', -apple-system, sans-serif;
}

.dashboard-header {
  background: #1c1c2b;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 4px solid #92C9D6;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo-img { height: 40px; }
.app-title { font-size: 1.2rem; font-weight: 800; letter-spacing: 1px; color: #fff; margin: 0; }

.admin-content {
  padding: 2.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

/* Profile Switcher */
.profile-card {
  background: #1c1c2b;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 3rem;
  border: 1px solid #333;
}

.card-content { display: flex; justify-content: space-between; align-items: center; gap: 2rem; }
.info-group h3 { margin: 0 0 0.5rem 0; color: #92C9D6; font-size: 1.1rem; }
.description { margin: 0; font-size: 0.9rem; color: #aaa; line-height: 1.4; }

.profile-toggle {
  display: flex;
  background: #0f0f12;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #444;
}

.profile-toggle button {
  padding: 0.6rem 1.2rem;
  border: none;
  background: transparent;
  color: #888;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.profile-toggle button.active {
  background: #3C3C5B;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

/* Hero & Big Red Button */
.setup-hero {
  text-align: center;
  margin-bottom: 4rem;
}

.setup-viz {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.installer-button-wrapper { position: relative; }

.big-red-button {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(145deg, #ff4e50, #d62828);
  color: white;
  cursor: pointer;
  box-shadow: 
    0 15px 35px rgba(214, 40, 40, 0.4),
    inset 0 4px 10px rgba(255, 255, 255, 0.3),
    inset 0 -4px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  position: relative;
}

.big-red-button:hover:not(:disabled) {
  transform: scale(1.05) translateY(-5px);
  box-shadow: 0 20px 45px rgba(214, 40, 40, 0.5);
}

.big-red-button:active:not(:disabled) {
  transform: scale(0.95);
}

.big-red-button:disabled {
  background: #333;
  color: #666;
  box-shadow: none;
  cursor: not-allowed;
}

.big-red-button.is-setup-complete {
  background: linear-gradient(145deg, #10b981, #059669);
  box-shadow: 0 15px 35px rgba(16, 185, 129, 0.4);
}

.button-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  font-weight: 900;
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
}

.btn-icon { width: 40px; height: 40px; }

.halo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 220px;
  height: 220px;
  border: 2px solid rgba(214, 40, 40, 0.2);
  border-radius: 50%;
  animation: pulse 2s infinite;
  z-index: 1;
}

@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(0.95); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
}

.setup-hint { color: #888; font-size: 1rem; line-height: 1.6; }

.setup-success {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #10b981;
  font-weight: 600;
  font-size: 1.1rem;
  background: rgba(16, 185, 129, 0.1);
  padding: 1rem 2rem;
  border-radius: 50px;
}

.check-icon { font-size: 1.5rem; }

/* Status Grid */
.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 2rem;
  border-radius: 12px;
}

.status-column h3 { color: #f0f0f0; margin-bottom: 1.5rem; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; }

.checklist { list-style: none; padding: 0; margin: 0; }
.checklist li {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.status-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333;
  border-radius: 50%;
  font-size: 0.8rem;
  color: #666;
}

.complete .status-icon { background: #10b981; color: #fff; }
.complete .label { color: #fff; font-weight: 600; }

.id-badge {
  background: #3C3C5B;
  color: #92C9D6;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}

.modal-card {
  background: #1c1c2b;
  padding: 2.5rem;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  border: 1px solid #444;
}

.modal-card h2 { color: #fff; margin-bottom: 1.5rem; }
.modal-card p { color: #aaa; line-height: 1.6; margin-bottom: 2rem; }

.modal-actions { display: flex; gap: 1rem; justify-content: center; }

.btn-confirm {
  background: #d62828;
  color: #fff;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.btn-cancel {
  background: transparent;
  color: #888;
  border: 1px solid #444;
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

/* Other Utils */
.ct-button--report { background: transparent; border: 1px solid #444; color: #fff; padding: 0.6rem 1rem; border-radius: 6px; cursor: pointer; }

.toast {
  position: fixed;
  bottom: 2rem; left: 50%;
  transform: translateX(-50%);
  padding: 1rem 2rem;
  border-radius: 8px;
  color: #fff;
  font-weight: 700;
  z-index: 3000;
  box-shadow: 0 10px 20px rgba(0,0,0,0.4);
}
.toast.success { background: #10b981; }
.toast.error { background: #ef4444; }
.toast.info { background: #3C3C5B; }

.loader {
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #fff;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Maintenance & Test Data */
.maintenance-section {
  margin-top: 4rem;
  padding-top: 3rem;
  border-top: 1px solid #333;
}

.maintenance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.maint-card {
  background: #1c1c2b;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #333;
  display: flex;
  flex-direction: column;
}

.maint-card h4 { margin: 0 0 0.5rem 0; color: #fff; font-size: 1rem; }
.maint-card p { margin: 0 0 1.5rem 0; color: #888; font-size: 0.85rem; line-height: 1.4; flex-grow: 1; }

.btn-group-maint { display: flex; gap: 0.75rem; }

.btn-outline-danger, .btn-outline-info, .btn-outline-secondary {
  padding: 0.6rem 1rem;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;
  width: 100%;
}

.btn-outline-danger { border: 1px solid #ef4444; color: #ef4444; }
.btn-outline-danger:hover:not(:disabled) { background: #ef4444; color: #fff; }

.btn-outline-info { border: 1px solid #3b82f6; color: #3b82f6; }
.btn-outline-info:hover:not(:disabled) { background: #3b82f6; color: #fff; }

.btn-outline-secondary { border: 1px solid #666; color: #888; }
.btn-outline-secondary:hover:not(:disabled) { background: #666; color: #fff; }

button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
