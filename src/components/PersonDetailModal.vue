<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="person-name">{{ localPerson.firstName }} {{ localPerson.lastName }}</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="person-header">
          <div 
            class="avatar-large"
            :style="{ backgroundColor: getAvatarColor(localPerson), color: getAvatarTextColor(getAvatarColor(localPerson)) }"
          >
            <span v-if="!localPerson.imageUrl || localPerson.imageUrl.includes('ui-avatars') || localPerson.imageUrl.includes('dicebear')" class="initials-large">{{ getInitials(localPerson) }}</span>
            <img v-else :src="localPerson.imageUrl" alt="Avatar" class="avatar-img-large" />
          </div>
          <div class="info-text">
            <div class="form-group status-group">
              <label>Status (Mailversand)</label>
              <select v-model="status" class="status-select" :class="status">
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
              </select>
            </div>
            <p class="meta-info">Onboarding: {{ formatDate(localPerson.entry_date) }}</p>
          </div>
        </div>

        <!-- Boxed Attributes Section -->
        <div class="attributes-box">
          <!-- Row 1: Seminar -->
          <div class="grid-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="hasSeminar" @change="updateDate('seminar')">
              Seminar
            </label>
            <input v-if="hasSeminar" type="date" v-model="seminarDate" class="date-input">
          </div>

          <!-- Row 2: Taufe -->
          <div class="grid-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="isBaptized" @change="updateDate('baptism')">
              Taufe
            </label>
            <input v-if="isBaptized" type="date" v-model="baptismDate" class="date-input">
          </div>

          <!-- Row 3: Urkunde -->
          <div class="grid-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="hasCertificate" @change="updateDate('certificate')">
              Urkunde
            </label>
            <input v-if="hasCertificate" type="date" v-model="certificateDate" class="date-input">
          </div>

          <!-- Row 4: Integration -->
          <div class="grid-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="isIntegrated" @change="updateDate('integration')">
              Integration
            </label>
            <input v-if="isIntegrated" type="date" v-model="integrationDate" class="date-input">
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <!-- ... -->

        <button class="ct-button ct-button--contact" @click="toggleContactInfo">
            <span v-if="isLoadingContact">Lade...</span>
            <span v-else>{{ showContactInfo ? 'Kontakt verbergen' : 'Kontaktdaten' }}</span>
        </button>
        <div class="action-buttons">
          <button class="ct-button ct-button--secondary" @click="$emit('close')">Abbrechen</button>
          <button class="ct-button ct-button--primary" @click="save">Speichern</button>
        </div>
      </div>

      <div v-if="showContactInfo" class="contact-card">
        <div v-if="isLoadingContact" class="loading-contact">
            Lade Daten aus ChurchTools...
        </div>
        <template v-else>
            <div class="contact-row">
            <span class="contact-label-small">E-Mail:</span>
            <span class="contact-value">{{ localPerson.email || 'Keine E-Mail' }}</span>
            </div>
            <div class="contact-row">
            <span class="contact-label-small">Tel:</span>
            <span class="contact-value">{{ localPerson.mobile || localPerson.phone || 'Keine Nummer' }}</span>
            </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { BaptizoPerson, BaptizoStatus } from '../types/baptizo-types';
import { PersonService } from '../services/personService';

const props = defineProps<{
  person: BaptizoPerson
}>();

const emit = defineEmits(['close', 'update']);
const provider = new PersonService();

// Local state
const localPerson = ref<BaptizoPerson>({ ...props.person }); // Copy for local mutations/updates
const showContactInfo = ref(false);
const isLoadingContact = ref(false);

const status = ref<BaptizoStatus>(props.person.status);
const hasSeminar = ref(!!props.person.fields.seminar_besucht_am);
const seminarDate = ref(props.person.fields.seminar_besucht_am || '');
const isBaptized = ref(!!props.person.fields.getauft_am);
const baptismDate = ref(props.person.fields.getauft_am || '');
const hasCertificate = ref(!!props.person.fields.urkunde_ueberreicht);
const certificateDate = ref(props.person.fields.urkunde_ueberreicht || '');
const isIntegrated = ref(!!props.person.fields.in_gemeinde_integriert);
const integrationDate = ref(props.person.fields.in_gemeinde_integriert || '');

// Helpers
import { getAvatarColor, getAvatarTextColor, getInitials } from '../utils/theme';
const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'Unbekannt';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const updateDate = (field: 'seminar' | 'baptism' | 'certificate' | 'integration') => {
  const today = new Date().toISOString().split('T')[0];
  if (field === 'seminar') {
    seminarDate.value = hasSeminar.value ? (seminarDate.value || today) : '';
  } else if (field === 'baptism') {
    baptismDate.value = isBaptized.value ? (baptismDate.value || today) : '';
  } else if (field === 'certificate') {
    certificateDate.value = hasCertificate.value ? (certificateDate.value || today) : '';
  } else if (field === 'integration') {
    integrationDate.value = isIntegrated.value ? (integrationDate.value || today) : '';
  }
};

const save = () => {
  const updatedPerson: BaptizoPerson = {
    ...localPerson.value, // Use localPerson as base to preserve any fetched updates (like email)
    status: status.value,
    fields: {
      ...localPerson.value.fields,
      seminar_besucht_am: hasSeminar.value ? seminarDate.value : null,
      getauft_am: isBaptized.value ? baptismDate.value : null,
      urkunde_ueberreicht: hasCertificate.value ? certificateDate.value : null,
      in_gemeinde_integriert: isIntegrated.value ? integrationDate.value : null,
    }
  };
  emit('update', updatedPerson);
};

const toggleContactInfo = async () => {
  showContactInfo.value = !showContactInfo.value;
  
  // Lazy refresh from CT when opening
  if (showContactInfo.value) {
      isLoadingContact.value = true;
      try {
          const freshData = await provider.getPerson(localPerson.value.id);
          // Update contact fields
          if (freshData) {
              localPerson.value.email = freshData.email || null;
              localPerson.value.mobile = freshData.mobile || null;
              localPerson.value.phone = freshData.phone || null;
              // Check if imageUrl changed?
              if (freshData.imageUrl) localPerson.value.imageUrl = freshData.imageUrl;
              console.log('[Baptizo] Refreshed contact data for', localPerson.value.firstName);
          }
      } catch (e) {
          console.error('[Baptizo] Failed to refresh contact info', e);
      } finally {
          isLoadingContact.value = false;
      }
  }
};
</script>

<style scoped>
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
  z-index: 1000;
}

.modal-content {
  background: #2a2a2a;
  padding: 2rem;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  color: white;
  border: 1px solid #444;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.person-name {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #92C9D6;
}

.close-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s;
}

.close-btn:hover {
  color: white;
}

.person-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem; /* Reduced from 2.5rem */
  font-weight: bold; 
  overflow: hidden;
  flex-shrink: 0;
  border: 4px solid rgba(255,255,255,0.1);
}

.avatar-img-large {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.initials-large {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.info-text {
  flex: 1;
}

.status-group {
  margin-bottom: 0.5rem;
}

.status-group label {
  display: block;
  font-size: 0.8rem;
  color: #aaa;
  margin-bottom: 0.2rem;
}

.status-select {
  background: #1a1a1a;
  color: white;
  border: 1px solid #444;
  padding: 0.3rem;
  border-radius: 4px;
  width: 100%;
}

.meta-info {
  font-size: 0.85rem;
  color: #888;
  margin: 0;
}

/* Attributes Box */
.attributes-box {
  background: #222;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.grid-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  min-height: 32px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 500;
}

.checkbox-label input[type="checkbox"] {
  accent-color: #3C3C5B !important; /* Dark Baptizo Purple */
  width: 18px;
  height: 18px;
  cursor: pointer;
  border: 1px solid #92C9D6; /* Suggestion from user description, though accent-color might override */
}

.date-input {
  background: #444;
  border: 1px solid #666;
  color: white;
  padding: 0.3rem;
  border-radius: 4px;
  width: 140px; /* Fixed width for Flexbox alignment */
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2rem;
  padding-top: 0; /* Removed padding */
  border-top: none; /* Removed border */
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.ct-button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  font-weight: bold;
  transition: all 0.2s;
}

.ct-button--primary {
  background-color: #92C9D6;
  color: #3C3C5B;
}

.ct-button--primary:hover {
  background-color: #a8d5e0;
}

.ct-button--secondary {
  background-color: #444;
  color: #fff;
}

.ct-button--secondary:hover {
  background-color: #555;
}

.ct-button--contact {
  background-color: #3C3C5B !important; /* Dark Purple FORCE */
  color: white;
  padding: 0.4rem 0.8rem;
}

.ct-button--contact:hover {
  background-color: #4b4b6e !important;
}

.contact-card {
  margin-top: 1rem;
  background: #222;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #444;
  animation: slideDown 0.2s ease-out;
}

.contact-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  color: #ddd;
  font-size: 0.9rem; /* Reduced to match checkboxes */
}

.contact-row:last-child {
  margin-bottom: 0;
}

.contact-label-small {
  color: #aaa;
  width: 50px; /* Fixed width for alignment */
}

.contact-value {
  font-weight: 500;
  color: #fff;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.loading-contact {
    color: #92C9D6;
    font-style: italic;
    font-size: 0.9rem;
    text-align: center;
    padding: 0.5rem;
}
</style>
