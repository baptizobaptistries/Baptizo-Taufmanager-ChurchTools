<template>
  <div class="settings-container">
    <!-- Header (Pixel-Perfect Match to Personen/Termine) -->
    <div class="settings-header">
      <div class="filter-bar">
        <button 
          @click="currentTab = 'emails'" 
          :class="{ active: currentTab === 'emails' }"
        >E-Mail Vorlagen</button>
        <button 
          @click="currentTab = 'fields'" 
          :class="{ active: currentTab === 'fields' }"
        >Feldbezeichnungen</button>
        <button 
          @click="currentTab = 'links'" 
          :class="{ active: currentTab === 'links' }"
        >Links</button>
      </div>
      
      <button @click="saveSettings" class="ct-button ct-button--primary" :disabled="saving">
        <span v-if="!saving">Einstellungen speichern</span>
        <span v-else>Speichert...</span>
      </button>
    </div>

    <div class="settings-content">
      <!-- Tab 1: E-Mail Vorlagen (2-Column Grid) -->
      <div v-if="currentTab === 'emails'" class="tab-pane">
        <div class="email-templates-grid">
          <!-- LEFT COLUMN: Taufseminar Mails -->
          <div class="template-column">
            <div class="column-header">
              <span class="category-badge seminar">SEMINAR</span>
              <button @click="addTemplate('seminar')" class="add-btn">+ Hinzufügen</button>
            </div>
            <div class="template-list">
              <div v-for="template in seminarTemplates" :key="template.id" class="template-card">
                <div class="template-header" @click="toggleTemplate(template.id)">
                  <span>{{ template.name }}</span>
                  <span class="offset-badge">{{ formatOffset(template) }}</span>
                </div>
                <div v-if="expandedTemplate === template.id" class="template-body">
                  <div class="form-group">
                    <label>Name</label>
                    <input v-model="template.name" type="text" />
                  </div>
                  <div class="form-group timing-group">
                    <label>Zeitpunkt</label>
                    <div class="timing-input">
                      <input v-model.number="template.daysOffset" type="number" min="0" />
                      <select v-model="template.offsetType">
                        <option value="before">Tage vor Event</option>
                        <option value="after">Tage nach Event</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group recipient-checkbox">
                    <label>
                      <input v-model="template.recipientType" type="checkbox" true-value="leader" false-value="participant" />
                      Mail an Leiter (statt an Person)
                    </label>
                  </div>
                  <div class="form-group">
                    <label>Betreff</label>
                    <input v-model="template.subject" type="text" />
                  </div>
                  <div class="form-group">
                    <label>Inhalt</label>
                    <textarea v-model="template.body" rows="6"></textarea>
                    <p class="help-text">Verfügbare Platzhalter: {name}, {uhrzeit}, {ort}, {leader}</p>
                  </div>
                  <button @click="deleteTemplate(template.id)" class="delete-btn">Löschen</button>
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Taufe Mails -->
          <div class="template-column">
            <div class="column-header">
              <span class="category-badge baptism">TAUFE</span>
              <button @click="addTemplate('baptism')" class="add-btn">+ Hinzufügen</button>
            </div>
            <div class="template-list">
              <div v-for="template in baptismTemplates" :key="template.id" class="template-card">
                <div class="template-header" @click="toggleTemplate(template.id)">
                  <span>{{ template.name }}</span>
                  <span class="offset-badge">{{ formatOffset(template) }}</span>
                </div>
                <div v-if="expandedTemplate === template.id" class="template-body">
                  <div class="form-group">
                    <label>Name</label>
                    <input v-model="template.name" type="text" />
                  </div>
                  <div class="form-group timing-group">
                    <label>Zeitpunkt</label>
                    <div class="timing-input">
                      <input v-model.number="template.daysOffset" type="number" min="0" />
                      <select v-model="template.offsetType">
                        <option value="before">Tage vor Event</option>
                        <option value="after">Tage nach Event</option>
                      </select>
                    </div>
                  </div>
                  <div class="form-group recipient-checkbox">
                    <label>
                      <input v-model="template.recipientType" type="checkbox" true-value="leader" false-value="participant" />
                      Mail an Leiter (statt an Person)
                    </label>
                  </div>
                  <div class="form-group">
                    <label>Betreff</label>
                    <input v-model="template.subject" type="text" />
                  </div>
                  <div class="form-group">
                    <label>Inhalt</label>
                    <textarea v-model="template.body" rows="6"></textarea>
                    <p class="help-text">Verfügbare Platzhalter: {name}, {uhrzeit}, {ort}, {leader}</p>
                  </div>
                  <button @click="deleteTemplate(template.id)" class="delete-btn">Löschen</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Feldbezeichnungen -->
      <div v-if="currentTab === 'fields'" class="tab-pane">
        <div class="fields-grid">
          <div v-for="field in localSettings.customFieldLabels" :key="field.key" class="field-card">
            <div class="field-header">
              <span class="field-key">{{ field.key }}</span>
            </div>
            <div class="form-group">
              <label>Anzeigename</label>
              <input v-model="field.label" type="text" placeholder="z.B. 'Seminar besucht'" />
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Links -->
      <div v-if="currentTab === 'links'" class="tab-pane">
        <div class="links-grid">
          <!-- Link 1: Anmeldeformular -->
          <div class="link-card">
            <div class="link-header">
              <span class="link-icon">📋</span>
              <h4>Anmeldeformular</h4>
            </div>
            <div class="form-group">
              <label>URL</label>
              <input v-model="localSettings.registrationFormUrl" type="url" placeholder="https://yourchurch.church.tools/..." />
              <p class="help-text">Platzhalter in Mails: <code>{link_anmeldung}</code></p>
            </div>
          </div>

          <!-- Link 2: Kleingruppen -->
          <div class="link-card">
            <div class="link-header">
              <span class="link-icon">👥</span>
              <h4>Kleingruppen</h4>
            </div>
            <div class="form-group">
              <label>URL</label>
              <input v-model="localSettings.smallGroupsUrl" type="url" placeholder="https://yourchurch.church.tools/smallgroups" />
              <p class="help-text">Platzhalter in Mails: <code>{link_kleingruppen}</code></p>
            </div>
          </div>

          <!-- Link 3: Taufinfo -->
          <div class="link-card">
            <div class="link-header">
              <span class="link-icon">🌊</span>
              <h4>Taufinfo & FAQ</h4>
            </div>
            <div class="form-group">
              <label>URL</label>
              <input v-model="localSettings.baptismInfoUrl" type="url" placeholder="https://yourchurch.de/taufe" />
              <p class="help-text">Platzhalter in Mails: <code>{link_taufinfo}</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="saveMessage" class="save-toast">{{ saveMessage }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { BaptizoSettings } from '../types/baptizo-settings';
import { MockDataProvider } from '../services/mock-data-provider';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  daysOffset: number;
  offsetType: 'before' | 'after';
  category: 'seminar' | 'baptism';
}

const props = defineProps<{
  settings: BaptizoSettings;
}>();

const emit = defineEmits<{
  (e: 'update', settings: BaptizoSettings): void;
}>();

const provider = new MockDataProvider();
const localSettings = ref<BaptizoSettings>({ ...props.settings });
const currentTab = ref('emails');
const expandedTemplate = ref<string | null>(null);
const saving = ref(false);
const saveMessage = ref('');

// Watch for external changes
watch(() => props.settings, (newSettings) => {
  localSettings.value = { ...newSettings };
}, { deep: true });

// Computed: Filter templates by category
const seminarTemplates = computed(() => 
  (localSettings.value.emailTemplates as EmailTemplate[]).filter(t => t.category === 'seminar')
);

const baptismTemplates = computed(() => 
  (localSettings.value.emailTemplates as EmailTemplate[]).filter(t => t.category === 'baptism')
);

// Format offset for display
const formatOffset = (template: EmailTemplate) => {
  const prefix = template.offsetType === 'before' ? '-' : '+';
  return `${prefix}${template.daysOffset}d`; // Added 'd' suffix for clarity
};

// Add new template
const addTemplate = (category: 'seminar' | 'baptism') => {
  const newTemplate: EmailTemplate = {
    id: Date.now().toString(),
    name: 'Neue Vorlage',
    subject: '',
    body: '',
    daysOffset: 0,
    offsetType: 'before',
    category
  };
  (localSettings.value.emailTemplates as EmailTemplate[]).push(newTemplate);
  expandedTemplate.value = newTemplate.id;
};

// Delete template
const deleteTemplate = (id: string) => {
  const index = (localSettings.value.emailTemplates as EmailTemplate[]).findIndex(t => t.id === id);
  if (index !== -1) {
    (localSettings.value.emailTemplates as EmailTemplate[]).splice(index, 1);
    if (expandedTemplate.value === id) {
      expandedTemplate.value = null;
    }
  }
};

// Save settings
const saveSettings = async () => {
  saving.value = true;
  await provider.updateSettings(localSettings.value);
  emit('update', localSettings.value);
  saving.value = false;
  saveMessage.value = 'Gespeichert! ✓';
  setTimeout(() => saveMessage.value = '', 3000);
};

// Toggle template expansion
const toggleTemplate = (id: string) => {
  expandedTemplate.value = expandedTemplate.value === id ? null : id;
};
</script>

<style scoped>
.settings-container {
  max-width: 1400px;
  margin: 0 auto;
  /* padding removed - already in .settings-content from Dashboard.vue */
}

/* Header (Matching Personen/Termine) */
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center; /* ZWINGEND: Alle Buttons auf einer Linie */
  margin-top: 1.5rem; /* Match Personen/Termine */
  margin-bottom: 1.5rem;
}

.filter-bar {
  display: flex;
  gap: 0.5rem;
  background: #1a1a1a;
  padding: 0.25rem;
  border-radius: 6px;
}

.filter-bar button {
  background: #444;
  border: none;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.filter-bar button.active {
  background: #3C3C5B;
  color: white;
  font-weight: bold;
}

/* Primary Button (Save) */
.ct-button {
  padding: 0.5rem 1rem; /* Match filter-bar button height */
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-weight: bold;
  font-size: 0.9rem; /* Match filter-bar font size */
  transition: all 0.2s;
  margin: 0; /* Pflicht: Kein extra margin */
}

.ct-button--primary {
  background: #92C9D6;
  color: #3C3C5B;
}

.ct-button--primary:hover {
  background: #7ab8c5;
}

.ct-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Content Area - no bottom margin needed, footer handles spacing */

.tab-pane {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 2-Column Email Templates Grid */
.email-templates-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.template-column {
  display: flex;
  flex-direction: column;
  background: #2a2a2a; /* Visual area background */
  padding: 1.5rem;
  border-radius: 8px;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

/* Category Badges (Event-Style) */
.category-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}

.category-badge.seminar {
  background: rgba(115, 131, 178, 0.2);
  color: #7383B2;
}

.category-badge.baptism {
  background: rgba(255, 159, 67, 0.2);
  color: #FF9F43;
}

.add-btn {
  background: none;
  border: 1px dashed #444;
  color: #92C9D6;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.add-btn:hover {
  border-color: #92C9D6;
  background: rgba(146, 201, 214, 0.1);
}

/* Template Cards */
.template-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.template-card {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 4px;
  overflow: hidden;
}

.template-header {
  padding: 0.75rem 1rem;
  background: #333;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.template-header:hover {
  background: #3a3a3a;
}

.offset-badge {
  background: #444;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-family: monospace;
}

.template-body {
  padding: 1rem;
  border-top: 1px solid #444;
}

/* Form Groups */
.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #ccc;
  font-weight: 500;
  font-size: 0.9rem;
}

/* Recipient Checkbox - Simple & Clean */
.recipient-checkbox {
  margin-bottom: 1.5rem;
}

.recipient-checkbox label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: normal;
  color: #ccc;
}

.recipient-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #7383B2;
  margin: 0;
}

.recipient-checkbox label:hover {
  color: #fff;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  background: #1a1a1a;
  border: 1px solid #444;
  color: #fff;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.95rem;
}

.form-group textarea {
  resize: vertical;
}

.help-text {
  font-size: 0.85rem;
  color: #888;
  margin-top: 0.5rem;
}

/* Timing Input Group */
.timing-group .timing-input {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 0.5rem;
}

/* Delete Button */
.delete-btn {
  width: auto; /* Not full-width, just fits content */
  background: #7383B2; /* Purple/Lila to match app design */
  color: white;
  border: none;
  padding: 0.5rem 1.5rem; /* Smaller padding */
  border-radius: 4px;
  cursor: pointer;
  font-weight: normal; /* Less bold */
  margin-top: 1rem;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #5a6a99; /* Darker purple on hover */
}

/* Fields Content */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.field-card {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.field-card:hover {
  background: #2f2f2f;
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #444;
}

.field-key {
  font-weight: bold;
  color: #92C9D6;
  font-size: 1rem;
}

.field-label-small {
  font-size: 0.75rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Form URL Card */
.form-url-card {
  background: #2a2a2a;
  padding: 1.5rem; /* Match field-card padding */
  border-radius: 8px;
  max-width: 1400px; /* Full page width like other content */
}

.card-header h4 {
  margin: 0 0 1.5rem 0;
  color: #92C9D6;
  font-size: 1rem; /* Match field-key font-size */
  font-weight: bold;
}

.preview-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #444;
}

.preview-section label {
  display: block;
  margin-bottom: 0.5rem;
  color: #888;
  font-size: 0.9rem;
}

.preview-link {
  color: #92C9D6;
  text-decoration: none;
  word-break: break-all;
  transition: color 0.2s;
}

.preview-link:hover {
  color: #a8d9e5;
  text-decoration: underline;
}

/* Links Grid */
.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.link-card {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
  transition: all 0.2s;
}

.link-card:hover {
  background: #2f2f2f;
}

.link-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #444;
}

.link-icon {
  font-size: 1.5rem;
}

.link-header h4 {
  margin: 0;
  color: #92C9D6;
  font-size: 1rem;
  font-weight: bold;
}

.help-text code {
  background: #1a1a1a;
  color: #FF9F43;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
}

/* Legacy selectors for backward compatibility */
.fields-content,
.general-content {
  max-width: 800px;
}

.intro-text {
  color: #aaa;
  margin-bottom: 1.5rem;
}

.fields-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

/* Save Toast */
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

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
