<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="person-name">Taufmanager Offboarding</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Info Text removed -->
        
        <div class="person-list">
          <div 
            v-for="person in sortedPersons" 
            :key="person.id"
            class="person-item"
            :class="{ selected: selectedPersonIds.includes(person.id) }"
            @click="toggleSelection(person.id)"
          >
            <!-- Avatar Logic (Restored individual colors) -->
            <div 
              class="avatar-small"
              :style="{ backgroundColor: getAvatarColor(person as any), color: getAvatarTextColor(getAvatarColor(person as any)) }"
            >
              <span v-if="!person.imageUrl || person.imageUrl.includes('ui-avatars') || person.imageUrl.includes('dicebear')" class="initials-small">{{ getInitials(person) }}</span>
              <img v-else :src="person.imageUrl" alt="Avatar" class="avatar-img-small" />
            </div>

            <div class="person-info">
              <div class="person-name-list">{{ person.firstName }} {{ person.lastName }}</div>
              <div class="person-meta">Onboarding: {{ formatDate(person.entry_date) }}</div>
            </div>
            
            <!-- STUI Badges -->
            <div class="badges-container">
              <span class="badge-mini" :class="person.fields.seminar_besucht_am ? 'success' : 'pending'">S</span>
              <span class="badge-mini" :class="person.fields.getauft_am ? 'success' : 'pending'">T</span>
              <span class="badge-mini" :class="person.fields.urkunde_ueberreicht ? 'success' : 'pending'">U</span>
              <span class="badge-mini" :class="person.fields.in_gemeinde_integriert ? 'success' : 'pending'">I</span>
            </div>
          </div>
        </div>
        
        <div v-if="selectedPersonIds.length > 0" class="form-group">
          <label>Offboarding-Datum (für {{ selectedPersonIds.length }} Personen)</label>
          <input 
            v-model="offboardingDate" 
            type="date" 
            class="input-field"
          >
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="loading" class="loading-message">Entferne Personen...</div>
      </div>
      
      <div class="modal-footer">
        <button class="ct-button ct-button--secondary" @click="$emit('close')">Abbrechen</button>
        <button class="ct-button ct-button--primary" @click="removePersons" :disabled="selectedPersonIds.length === 0 || loading">
          Prozess abschließen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { BaptizoPerson } from '../types/baptizo-types';
import { PersonService } from '../services/personService';

const props = defineProps<{
  persons: BaptizoPerson[]
}>();

const emit = defineEmits(['close', 'personRemoved']);

const selectedPersonIds = ref<number[]>([]);
const offboardingDate = ref(new Date().toISOString().split('T')[0]);
const loading = ref(false);
const error = ref('');

const provider = new PersonService();

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return 'Unbekannt';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

// Toggle Selection
const toggleSelection = (id: number) => {
  const index = selectedPersonIds.value.indexOf(id);
  if (index === -1) {
    selectedPersonIds.value.push(id);
  } else {
    selectedPersonIds.value.splice(index, 1);
  }
};

// SORTING LOGIC: Score based (S+T+U+I count)
const sortedPersons = computed(() => {
  return [...props.persons].sort((a, b) => {
    const scoreA = 
      (a.fields.seminar_besucht_am ? 1 : 0) + 
      (a.fields.getauft_am ? 1 : 0) + 
      (a.fields.urkunde_ueberreicht ? 1 : 0) + 
      (a.fields.in_gemeinde_integriert ? 1 : 0);
      
    const scoreB = 
      (b.fields.seminar_besucht_am ? 1 : 0) + 
      (b.fields.getauft_am ? 1 : 0) + 
      (b.fields.urkunde_ueberreicht ? 1 : 0) + 
      (b.fields.in_gemeinde_integriert ? 1 : 0);
      
    return scoreB - scoreA; // Descending (High score first)
  });
});

// AVATAR LOGIC (Imported)
import { getInitials, getAvatarColor, getAvatarTextColor } from '../utils/theme';

const removePersons = async () => {
  if (selectedPersonIds.value.length === 0) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    // Parallel updates: Set offboarding date AND clear status (so it disappears from CT)
    const promises = selectedPersonIds.value.map(id => 
      provider.updatePersonFields(id, {
        taufmanager_offboarding: offboardingDate.value,
        taufmanager_status: null
      })
    );
    
    await Promise.all(promises);
    
    console.log(`[Baptizo] ${selectedPersonIds.value.length} persons offboarded on ${offboardingDate.value}`);
    emit('personRemoved'); // Will trigger reload
    emit('close');
  } catch (e: any) {
    console.error('[Baptizo] Offboarding failed:', e);
    error.value = `Fehler: ${e.message || 'Personen konnten nicht entfernt werden'}`;
  } finally {
    loading.value = false;
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
  width: 600px;
  max-width: 90%;
  max-height: 80vh;
  color: white;
  border: 1px solid #444;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.modal-header h2 {
  margin: 0;
  color: #92C9D6;
  font-size: 24px;
  font-weight: 700;
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

.modal-body {
  flex: 1;
  overflow-y: auto;
}

.info-text {
  display: none; 
}

.person-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #444;
  border-radius: 4px;
  margin-bottom: 1rem;
  background: #1a1a1a;
}

.person-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #333;
}

.person-item:last-child {
  border-bottom: none;
}

.person-item:hover {
  background: #2a2a2a;
}

.person-item.selected {
  background: #3C3C5B;
  /* border-left removed */
}

/* AVATAR STYLES */
.avatar-small {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.9rem;
  font-weight: bold;
  overflow: hidden;
  flex-shrink: 0;
  margin-right: 1rem;
  color: #1a1a1a;
}

.initials-small {
  text-transform: uppercase;
}

.avatar-img-small {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.person-info {
  flex: 1;
}

.person-name-list {
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #fff;
}

.person-meta {
  font-size: 0.85rem;
  color: #888;
}

/* MINI BADGES (S T U I) */
.badges-container {
  display: flex;
  gap: 8px; /* Slightly more space */
}

.badge-mini {
  width: 24px;
  height: 24px;
  border-radius: 50%; /* Circle */
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: default;
}

.badge-mini.success {
  background: #76E0C2; /* Punchy Mint */
  color: #3C3C5B; /* Dark Text */
}

.badge-mini.pending {
  background: #6b7280;
  color: rgba(255,255,255,0.7);
}

.form-group {
  margin-top: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  color: #aaa;
  margin-bottom: 0.5rem;
}

.input-field {
  width: 100%;
  background: #1a1a1a;
  border: 1px solid #444;
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  color-scheme: dark;
}

.error-message {
  color: #ff6b6b;
  padding: 0.5rem;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 4px;
  margin-top: 1rem;
}

.loading-message {
  color: #92C9D6;
  padding: 0.5rem;
  text-align: center;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
  /* border-top removed */
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

.ct-button--primary:hover:not(:disabled) {
  background-color: #a8d5e0;
}

.ct-button--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ct-button--secondary {
  background-color: #444;
  color: #fff;
}

.ct-button--secondary:hover {
  background-color: #555;
}
</style>
