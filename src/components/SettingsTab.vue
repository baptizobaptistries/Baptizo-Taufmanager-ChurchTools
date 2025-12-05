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
          @click="currentTab = 'general'" 
          :class="{ active: currentTab === 'general' }"
        >Anmeldeformular</button>
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
              <h4>Taufseminar Mails</h4>
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
              <h4>Taufe Mails</h4>
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
        <div class="fields-content">
          <p class="intro-text">Hier können die Bezeichnungen der Status-Flags angepasst werden.</p>
          <div class="fields-list">
            <div v-for="field in localSettings.customFieldLabels" :key="field.key" class="form-group">
              <label>{{ field.key }} (Intern)</label>
              <input v-model="field.label" type="text" />
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 3: Anmeldeformular -->
      <div v-if="currentTab === 'general'" class="tab-pane">
        <div class="general-content">
          <div class="form-group">
            <label>Link zum Anmeldeformular</label>
            <input v-model="localSettings.registrationFormUrl" type="text" placeholder="https://..." />
            <p class="help-text">URL zum externen Anmeldeformular (z.B. ChurchTools oder Typeform)</p>
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
  return `${prefix}${template.daysOffset}`;
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
  padding: 0 20px;
}

/* Header (Matching Personen/Termine) */
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
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
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-weight: bold;
  font-size: 1rem;
  transition: all 0.2s;
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

/* Content Area */
.settings-content {
  margin-bottom: 2rem;
}

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
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.column-header h4 {
  margin: 0;
  color: #92C9D6;
  font-size: 1.1rem;
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
  width: 100%;
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 1rem;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: #b91c1c;
}

/* Fields Content */
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
