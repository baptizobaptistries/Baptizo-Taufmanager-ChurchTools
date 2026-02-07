<template>
  <div class="settings-container">
    <!-- Header -->
    <div class="settings-header">
      <div class="filter-bar">
        <button 
          @click="switchTab('emails')" 
          :class="{ active: currentTab === 'emails' }"
        >Erstellen</button>
        <button 
          @click="switchTab('placeholders')" 
          :class="{ active: currentTab === 'placeholders' }"
        >Platzhalter</button>
        <button 
          @click="openPlaceholders" 
          :class="{ active: placeholderActive }"
        >
          Mehr Platzhalter
        </button>
      </div>
      
      <div class="header-actions">
          <!-- Email Toggle (Auto-Save, Tooltip) -->
          <div class="toggle-container tooltip-trigger" @click="toggleEmailSending">
              <div class="toggle-switch" :class="{ active: localSettings.emailSendingEnabled }">
                <div class="toggle-knob"></div>
              </div>
              <label class="toggle-label">Mailversand</label>
              
              <!-- Tooltip -->
              <div class="custom-tooltip">Automatischer Versand nur an Personen mit Status 'Aktiv'</div>
          </div>

          <button 
            @click="saveSettings(false)" 
            class="ct-button settings-save-btn" 
            :class="saveButtonClass"
            :disabled="!isDirty && !saving"
          >
            <!-- Show 'Speichert...' only if triggered via button -->
            <span v-if="!saving">Einstellungen speichern</span>
            <span v-else>Speichert...</span>
          </button>
      </div>
    </div>

    <div class="settings-content">
      <!-- Tab 1: E-Mail Vorlagen (Two Columns) -->
      <div v-if="currentTab === 'emails'" class="tab-pane">
        <div class="email-templates-grid">
          <!-- LEFT COLUMN: Taufseminar Mails -->
          <div class="template-column">
            <div class="column-header">
              <span class="category-badge seminar">SEMINAR</span>
              <button @click="addTemplate('seminar')" class="add-btn">+ Hinzufügen</button>
            </div>
            <div class="template-list">
              <div v-if="seminarTemplates.length === 0" class="empty-state">
                Keine Vorlagen
              </div>
              <div v-for="template in seminarTemplates" :key="template.id" class="template-card">
                <div class="template-header header-seminar" @click="toggleTemplate(template.id)">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                     <svg v-if="expandedTemplate === template.id" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                     <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                     <span>{{ template.name }}</span>
                  </div>
                  <span class="offset-badge">{{ formatOffset(template) }}</span>
                </div>
                <div v-if="expandedTemplate === template.id" class="template-body">
                  <div class="form-group">
                    <label>Name</label>
                    <input v-model="template.name" type="text" class="standard-input" />
                  </div>
                  <div class="form-group timing-group">
                    <label>Zeitpunkt</label>
                    <div class="timing-input">
                      <input v-model.number="template.daysOffset" type="number" min="0" class="standard-input" />
                      <select v-model="template.offsetType" class="standard-input">
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
                    <input v-model="template.subject" type="text" class="standard-input" />
                  </div>
                  <div class="form-group">
                    <label>Inhalt</label>
                    <textarea v-model="template.body" rows="8" class="body-textarea"></textarea>
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
              <div v-if="baptismTemplates.length === 0" class="empty-state">
                Keine Vorlagen
              </div>
              <div v-for="template in baptismTemplates" :key="template.id" class="template-card">
                <div class="template-header header-baptism" @click="toggleTemplate(template.id)">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                     <svg v-if="expandedTemplate === template.id" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                     <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                     <span>{{ template.name }}</span>
                  </div>
                  <span class="offset-badge">{{ formatOffset(template) }}</span>
                </div>
                <div v-if="expandedTemplate === template.id" class="template-body">
                  <div class="form-group">
                    <label>Name</label>
                    <input v-model="template.name" type="text" class="standard-input" />
                  </div>
                  <div class="form-group timing-group">
                    <label>Zeitpunkt</label>
                    <div class="timing-input">
                      <input v-model.number="template.daysOffset" type="number" min="0" class="standard-input" />
                      <select v-model="template.offsetType" class="standard-input">
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
                    <input v-model="template.subject" type="text" class="standard-input" />
                  </div>
                  <div class="form-group">
                    <label>Inhalt</label>
                    <textarea v-model="template.body" rows="8" class="body-textarea"></textarea>
                  </div>
                  <button @click="deleteTemplate(template.id)" class="delete-btn">Löschen</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 2: Interne Platzhalter (Stacked) -->
      <div v-if="currentTab === 'placeholders'" class="tab-pane">
        <div class="placeholders-stack">
            <!-- Section 1: Links -->
            <div class="section-container">
              <div class="section-header">
                 <p class="section-desc">Konfiguriere permanente Links für deine E-Mails</p>
              </div>
              <div class="links-grid">
                <div v-for="p in linkPlaceholders" :key="p.id" class="link-card">
                  <div class="form-group dense">
                     <input v-model="p.label" type="text" placeholder="Titel" class="standard-input" />
                  </div>
                  <div class="form-group dense">
                    <input v-model="p.value" type="url" placeholder="URL eingeben..." class="standard-input" />
                  </div>
                  <div class="form-group dense">
                    <input v-model="p.key" type="text" placeholder="{{...}}" class="code-input standard-input" />
                  </div>
                </div>
              </div>
            </div>
    
            <!-- Section 2: Custom -->
            <div class="section-container">
              <div class="section-header">
                 <p class="section-desc">Konfiguriere variable Termine oder festen Text für deine E-Mails</p>
              </div>
              <div class="links-grid">
                 <div v-for="p in textPlaceholders" :key="p.id" class="link-card">
                  <div class="form-group dense">
                     <input v-model="p.label" type="text" placeholder="Titel" class="standard-input" />
                  </div>
                  <div class="form-group dense">
                    <input 
                      v-if="isDynamic(p.id)" 
                      :value="getDynamicValue(p.id)" 
                      type="text" 
                      disabled 
                      class="standard-input dynamic-value" 
                      title="Wird automatisch berechnet"
                    />
                    <input 
                      v-else 
                      v-model="p.value" 
                      type="text" 
                      placeholder="Wert eingeben..." 
                      class="standard-input" 
                    />
                  </div>
                  <div class="form-group dense">
                    <input v-model="p.key" type="text" placeholder="{{...}}" class="code-input standard-input" />
                  </div>
                 </div>
              </div>
            </div>
        </div>
      </div>
    </div>
    
    <div v-if="saveMessage" class="save-toast">{{ saveMessage }}</div>
    
    <!-- Custom Unsaved Changes Modal (Matches EventList) -->
    <div v-if="showUnsavedModal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">Ungespeicherte Änderungen</h2>
                <button class="close-btn" @click="showUnsavedModal = false">&times;</button>
            </div>
            
            <div class="modal-body">
                <p>Du hast Änderungen vorgenommen, die noch nicht gespeichert wurden. Möchtest du speichern?</p>
            </div>

            <div class="modal-actions">
                <button @click="discardAndSwitch" class="ct-button ct-button--secondary">Verwerfen</button>
                <div style="display: flex; gap: 1rem;">
                    <button @click="showUnsavedModal = false" class="ct-button ct-button--secondary">Abbrechen</button>
                    <button @click="saveAndSwitch" class="ct-button ct-button--primary">Speichern</button>
                </div>
            </div>
        </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { type BaptizoSettings, DEFAULT_SETTINGS, type EmailTemplate } from '../types/baptizo-settings';
import { EventService } from '../services/eventService';

const props = defineProps<{
  settings: BaptizoSettings;
}>();

const emit = defineEmits<{
  (e: 'update', settings: BaptizoSettings): void;
}>();

const eventService = new EventService();

const nextBaptismDate = ref<string>('Berechne...');
const nextSeminarDate = ref<string>('Berechne...');

// --- Initialization & Migration ---
const initializeSettings = (source: BaptizoSettings | undefined): BaptizoSettings => {
  let parsed: BaptizoSettings;
  try {
    parsed = source ? JSON.parse(JSON.stringify(source)) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  } catch (e) {
    console.error('Settings JSON parse error:', e);
    parsed = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
  if (!Array.isArray(parsed.emailTemplates)) parsed.emailTemplates = []; 
  if (!Array.isArray(parsed.placeholders)) parsed.placeholders = []; 
  if (parsed.emailTemplates.length === 0) parsed.emailTemplates = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.emailTemplates));
  if (parsed.placeholders.length === 0) parsed.placeholders = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.placeholders));
  
  if (parsed.emailSendingEnabled === undefined) parsed.emailSendingEnabled = false;

  // MIGRATION: Replace old placeholders if found in existing data
  parsed.emailTemplates.forEach(t => {
      if (t.body.includes('{{name}}')) {
          t.body = t.body.replace(/{{name}}/g, '{{person.firstName}}');
      }
      if (t.body.includes('{{leader}}')) {
          t.body = t.body.replace(/{{leader}}/g, '{{person.firstName}}');
      }
      if (t.body.includes('{{uhrzeit}}') || t.body.includes('{{ort}}')) {
          t.body = t.body.replace(' um {{uhrzeit}} am {{ort}}', ' um 10:00 Uhr im Gemeindezentrum');
          t.body = t.body.replace('{{uhrzeit}} am {{ort}}', '10:00 Uhr im Gemeindezentrum');
          t.body = t.body.replace('{{uhrzeit}}', '10:00 Uhr');
          t.body = t.body.replace('{{ort}}', 'Gemeindezentrum');
      }
  });

  return parsed;
};

// --- State ---
const localSettings = ref<BaptizoSettings>(initializeSettings(props.settings));
const originalSettings = ref<string>(''); // For dirty checking

const currentTab = ref('emails');
const pendingTab = ref<string | null>(null); // For modal redirection
const showUnsavedModal = ref(false);

const expandedTemplate = ref<string | null>(null);
const saving = ref(false);
const saveMessage = ref('');
const placeholderActive = ref(false);

// --- Dirty Checking ---
const isDirty = computed(() => {
    return JSON.stringify(localSettings.value) !== originalSettings.value;
});

// Calculate button class based on dirty state
const saveButtonClass = computed(() => {
    if (isDirty.value) return 'ct-button--primary'; // Solid/Bright when dirty
    return 'ct-button--ghost'; // Grey filled when clean
});


// Update original when props change (initially)
watch(() => props.settings, (newSettings) => {
  if (newSettings) {
    const initialized = initializeSettings(newSettings);
    localSettings.value = initialized;
    originalSettings.value = JSON.stringify(initialized);
  }
}, { deep: true, immediate: true });


// --- Tab Switching with Custom Modal ---
const switchTab = (newTab: string) => {
    if (currentTab.value === newTab) return;
    
    // Check if dirty
    if (isDirty.value) {
        pendingTab.value = newTab;
        showUnsavedModal.value = true;
    } else {
        currentTab.value = newTab;
    }
};

const saveAndSwitch = async () => {
    await saveSettings(false);
    showUnsavedModal.value = false;
    if (pendingTab.value) {
        currentTab.value = pendingTab.value;
        pendingTab.value = null;
    }
};

const discardAndSwitch = () => {
    // Reset to original
    if (originalSettings.value) {
        localSettings.value = JSON.parse(originalSettings.value);
    }
    showUnsavedModal.value = false;
    if (pendingTab.value) {
        currentTab.value = pendingTab.value;
        pendingTab.value = null;
    }
};

// Auto-Save Toggle (Silent)
const toggleEmailSending = async () => {
    localSettings.value.emailSendingEnabled = !localSettings.value.emailSendingEnabled;
    await saveSettings(true); // Silent save
};


onMounted(async () => {
    try {
        const events = await eventService.getEvents();
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcomingBaptisms = events
            .filter(e => {
                const title = e.title.toLowerCase();
                 return title.includes('taufe') && !title.includes('seminar') && new Date(e.date) >= now;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
        if (upcomingBaptisms.length > 0) {
            nextBaptismDate.value = new Date(upcomingBaptisms[0].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else {
            nextBaptismDate.value = 'Kein Termin gefunden';
        }

        const upcomingSeminars = events
           .filter(e => {
               const title = e.title.toLowerCase();
               return title.includes('seminar') && new Date(e.date) >= now;
           })
           .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
           
        if (upcomingSeminars.length > 0) {
            nextSeminarDate.value = new Date(upcomingSeminars[0].date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else {
            nextSeminarDate.value = 'Kein Termin gefunden';
        }
    } catch (e) {
        console.error('Error fetching events:', e);
        nextBaptismDate.value = 'Fehler';
        nextSeminarDate.value = 'Fehler';
    }
});

const isDynamic = (id: string) => {
    return id === 'p_date_baptism' || id === 'p_date_seminar';
};

const getDynamicValue = (id: string) => {
    if (id === 'p_date_baptism') return nextBaptismDate.value;
    if (id === 'p_date_seminar') return nextSeminarDate.value;
    return '';
};


const seminarTemplates = computed(() => (localSettings.value.emailTemplates || []).filter(t => t.category === 'seminar'));
const baptismTemplates = computed(() => (localSettings.value.emailTemplates || []).filter(t => t.category === 'baptism'));
const linkPlaceholders = computed(() => (localSettings.value.placeholders || []).filter(p => p.type === 'link'));
const textPlaceholders = computed(() => (localSettings.value.placeholders || []).filter(p => p.type === 'text'));

const formatOffset = (template: EmailTemplate) => {
  const prefix = template.offsetType === 'before' ? '-' : '+';
  return `${prefix}${template.daysOffset}d`;
};

const addTemplate = (category: 'seminar' | 'baptism') => {
  const newTemplate: EmailTemplate = {
    id: Date.now().toString(),
    name: 'Neue Vorlage',
    subject: '',
    body: '',
    daysOffset: 0,
    offsetType: 'before',
    category,
    recipientType: 'participant'
  };
  if (!localSettings.value.emailTemplates) localSettings.value.emailTemplates = [];
  localSettings.value.emailTemplates.push(newTemplate);
  expandedTemplate.value = newTemplate.id;
};

const deleteTemplate = (id: string) => {
  if (!localSettings.value.emailTemplates) return;
  const index = localSettings.value.emailTemplates.findIndex((t) => t.id === id);
  if (index !== -1) {
    localSettings.value.emailTemplates.splice(index, 1);
    if (expandedTemplate.value === id) expandedTemplate.value = null;
  }
};

const saveSettings = async (silent = false) => {
  if (!silent) saving.value = true;
  
  
  emit('update', localSettings.value);
  originalSettings.value = JSON.stringify(localSettings.value); // Reset dirty state
  
  if (!silent) {
      saving.value = false;
      saveMessage.value = 'Gespeichert! ✓';
      setTimeout(() => saveMessage.value = '', 3000);
  }
};

const toggleTemplate = (id: string) => {
  expandedTemplate.value = expandedTemplate.value === id ? null : id;
};

const openPlaceholders = () => {
  placeholderActive.value = true;
  setTimeout(() => { placeholderActive.value = false; }, 200);
  window.open('https://churchtools.academy/de/help/verwaltung/platzhalter/35-platzhalter-in-churchtools/', '_blank'); 
};
</script>

<style scoped>
.settings-container {
  max-width: 1400px;
  margin: 0 auto;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 10;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem; 
}

/* Toggle Styles & Tooltip */
.toggle-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid #555;
  border-radius: 4px;
  transition: all 0.2s;
  cursor: pointer;
  user-select: none;
  position: relative; 
  /* Force same box size properties as buttons */
  height: 40px; 
  box-sizing: border-box;
}

.toggle-container:hover {
    border-color: #888;
}

.toggle-label {
  font-size: 0.85rem;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.toggle-switch {
  position: relative;
  width: 34px;
  height: 18px;
  background: #555;
  border-radius: 9px;
  transition: background 0.3s;
  flex-shrink: 0;
  pointer-events: none;
}

.toggle-switch.active {
  background: #92C9D6;
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #ddd;
  border-radius: 50%;
  transition: all 0.3s;
}

.toggle-switch.active .toggle-knob {
  left: 18px;
  background: #fff;
}

/* Tooltip Implementation */
.custom-tooltip {
  visibility: hidden;
  background-color: #222;
  color: #efefef;
  text-align: center;
  border-radius: 6px;
  padding: 8px 12px;
  position: absolute;
  z-index: 9999; 
  top: 130%; 
  right: 0; 
  width: 280px; 
  box-shadow: 0 4px 15px rgba(0,0,0,0.8);
  border: 1px solid #444;
  font-size: 0.85rem;
  font-weight: normal;
  line-height: 1.4;
}

.custom-tooltip::after {
  content: "";
  position: absolute;
  bottom: 100%; 
  right: 20px; 
  margin-left: -5px;
  border-width: 6px;
  border-style: solid;
  border-color: transparent transparent #444 transparent;
}

.toggle-container:hover .custom-tooltip {
  visibility: visible;
}


.ct-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-weight: bold;
  font-size: 0.9rem;
  transition: all 0.2s;
  
  /* Dimensions to match Toggle */
  height: 40px; 
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Primary = Dirty State */
.ct-button--primary {
  background: #92C9D6;
  color: #3C3C5B;
  border: 2px solid #92C9D6; 
}

.ct-button--primary:hover {
  background: #7ab8c5;
  border-color: #7ab8c5;
}

/* Ghost => Changed to Disabled/Grey Filled as requested */
.ct-button--ghost {
  background: #333; /* Dark Grey Filled */
  color: #aaa;      /* Grey Text */
  border: 2px solid transparent; /* Transparent border to maintain size */
}

.ct-button--ghost:hover {
  filter: brightness(1.1); /* Subtle hover */
}

.ct-button--secondary {
  background: transparent; 
  color: #aaa;
  border: 1px solid #444;
}
.ct-button--secondary:hover {
  border-color: #fff;
  color: #fff;
}
.ct-button--text {
    background: transparent;
    color: #ccc;
}
.ct-button--text:hover {
    color: white;
}

.tab-pane {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.email-templates-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.placeholders-stack {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.template-column {
  display: flex;
  flex-direction: column;
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.category-badge {
  display: inline-flex;       /* Flex for centering */
  align-items: center;        /* Vertical Center */
  justify-content: center;    /* Horizontal Center */
  padding: 0 1.5rem;          /* Wider padding */
  height: 40px;               /* Button Height */
  border-radius: 4px;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 0.9rem;          /* Button Font Size */
  letter-spacing: 0.05em;
  box-sizing: border-box;
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
  border: 1px solid #444;
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

.template-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-state {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 1rem;
}

.template-card {
  background: #2a2a2a;
  border: none; /* Removed as requested */
  border-radius: 4px;
  overflow: hidden;
}

.template-header {
  padding: 0.6rem 1.25rem; /* Further reduced height */
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
  font-size: 1rem; /* Reduced from 1.1rem ("Tick zu groß") */
  font-weight: normal; 
  color: white;
}

.template-header.header-seminar {
  background: rgba(115, 131, 178, 0.15); /* Soft Purple */
  /* border-bottom removed */
}

.template-header.header-baptism {
  background: rgba(255, 159, 67, 0.15); /* Soft Orange */
  /* border-bottom removed */
}

.template-header:hover {
  filter: brightness(1.2);
}

.offset-badge {
  /* background removed (set by parent) */
  color: #fff;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: monospace;
  font-weight: bold;
  border: none;
}

.header-seminar .offset-badge {
  background: #3C3C5B; /* Deep Purple */
}

.header-baptism .offset-badge {
  background: #FF9F43; /* Orange */
  color: #251D15; /* User Dictated Hex for Text */
}

.template-body {
  padding: 0.5rem; /* Compact padding */
  /* border-top removed to avoid disconnect */
}

.form-group {
  margin-bottom: 0.8rem; /* Compact margin */
  display: block; 
}

/* Dense form group for placeholders */
.form-group.dense {
    margin-bottom: 0.4rem;
}
.form-group.dense:last-child {
    margin-bottom: 0;
}


.form-group label {
    display: block;
    margin-bottom: 0.3rem; /* Tighter label spacing */
    color: #ccc;
    font-size: 0.9rem;
}

.standard-input {
  width: 100%;
  padding: 0.6rem; /* Slightly smaller input padding */
  background: #1a1a1a;
  border: 1px solid #444;
  color: #fff;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.standard-input:focus,
.body-textarea:focus {
  outline: none;
  border-color: #92C9D6; 
}

.dynamic-value {
  background: #333 !important;
  color: #ccc !important;
  font-style: italic;
  border: 1px solid #444 !important; 
  cursor: default;
}

.code-input {
  font-family: 'Courier New', monospace;
  color: #FF9F43 !important;
}

.body-textarea {
  resize: vertical;
  width: 100%;
  padding: 0.6rem; /* Slightly smaller textarea padding */
  background: #1a1a1a;
  border: 1px solid #444;
  color: #fff;
  border-radius: 4px;
}

.timing-group .timing-input {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 0.5rem;
}

.recipient-checkbox {
  margin-bottom: 0.8rem;
}
.recipient-checkbox label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.recipient-checkbox input {
    width: 20px;
    height: 20px;
    accent-color: #92C9D6;
}


.delete-btn {
  width: auto;
  background: #3C3C5B !important; /* Dark Purple FORCE */
  color: white;
  border: none;
  padding: 0.4rem 1.2rem; /* Compact button padding */
  border-radius: 4px;
  cursor: pointer;
  font-weight: normal;
  margin-top: 0.25rem; /* Tighter margin */
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #4b4b6e !important;
}

.section-container {
  display: flex;
  flex-direction: column;
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
}

.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
}

.section-desc {
  margin: 0;
  color: #92C9D6; 
  font-size: 1.0rem; 
  font-weight: normal; 
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.link-card {
  background: #2a2a2a;
  padding: 1.0rem; /* Reduced from 1.5rem */
  border-radius: 8px;
  border: 1px solid #444;
}

.link-card:hover {
  border-color: #555;
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

/* Modal Overlay matches EventList */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7); 
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999999;
}

.modal-content {
  background: #2a2a2a;
  padding: 2rem;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  color: white;
  border: 1px solid #444;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0;
}

.modal-title {
  margin: 0;
  color: #92C9D6; 
  font-size: 1.1rem; /* Reduced from 1.25rem */
  font-weight: 700;
}

.modal-body {
  padding: 0;
  margin-bottom: 2rem;
}

.modal-body p {
    color: #ccc;
    font-size: 0.9rem; 
    line-height: 1.5;
}

.modal-actions {
  display: flex;
  justify-content: space-between; 
  align-items: center;
  padding: 0;
  background: transparent;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: white;
}
</style>
