<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Taufmanager Onboarding</h2>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      
      <div class="modal-body">
        
        <!-- Search Input -->
        <div class="form-group" v-if="!selectedPerson">
          <label>Person suchen (Name)</label>
          <div class="search-wrapper">
              <input 
                v-model="searchQuery" 
                @input="onSearch"
                type="text" 
                placeholder="Name eingeben..."
                class="input-field search-input"
                autofocus
              >
              <div v-if="isSearching" class="search-spinner"></div>
          </div>
          
          <!-- Search Results Dropdown -->
          <div v-if="searchResults.length > 0 && searchQuery.length > 2" class="search-results">
              <div 
                v-for="person in searchResults" 
                :key="person.id" 
                class="search-result-item"
                @click="selectPerson(person)"
              >
                  <img :src="person.imageUrl" class="result-avatar" />
                  <div class="result-info">
                      <div class="result-name">{{ person.firstName }} {{ person.lastName }}</div>
                      <div class="result-meta">ID: {{ person.id }}</div>
                  </div>
              </div>
          </div>
          <div v-else-if="searchQuery.length > 2 && !isSearching && searchResults.length === 0" class="no-results">
              Keine Person gefunden
          </div>
        </div>

        <!-- Selected Person Preview -->
        <div v-else class="selected-person-card">
            <div class="selected-header">
                <img :src="selectedPerson.imageUrl" class="selected-avatar" />
                <div class="selected-info">
                    <div class="selected-name">{{ selectedPerson.firstName }} {{ selectedPerson.lastName }}</div>
                    <div class="selected-id">ID: {{ selectedPerson.id }}</div>
                </div>
                <button class="remove-btn" @click="clearSelection">✕</button>
            </div>
        </div>
        
        <div class="form-group">
          <label>Onboarding-Datum</label>
          <input 
            v-model="onboardingDate" 
            type="date" 
            class="input-field"
          >
        </div>
        
        <div v-if="error" class="error-message">{{ error }}</div>
      </div>
      
      <div class="modal-footer">
        <button class="ct-button ct-button--secondary" @click="$emit('close')">Abbrechen</button>
        <button class="ct-button ct-button--primary" @click="addPerson" :disabled="!selectedPerson || loading">
          Person hinzufügen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { PersonService } from '../services/personService';
import type { BaptizoPerson } from '../types/baptizo-types';

const emit = defineEmits(['close', 'personAdded']);

const onboardingDate = ref(new Date().toISOString().split('T')[0]);
const loading = ref(false);
const error = ref('');

// Search State
const searchQuery = ref('');
const searchResults = ref<BaptizoPerson[]>([]);
const isSearching = ref(false);
const selectedPerson = ref<BaptizoPerson | null>(null);
let searchTimeout: any = null;

const provider = new PersonService();

const onSearch = () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    
    if (searchQuery.value.length < 3) {
        searchResults.value = [];
        return;
    }

    searchTimeout = setTimeout(async () => {
        isSearching.value = true;
        searchResults.value = await provider.searchPersons(searchQuery.value);
        isSearching.value = false;
    }, 300);
};

const selectPerson = (person: BaptizoPerson) => {
    selectedPerson.value = person;
    searchQuery.value = '';
    searchResults.value = [];
};

const clearSelection = () => {
    selectedPerson.value = null;
    searchQuery.value = '';
};

const addPerson = async () => {
  if (!selectedPerson.value) return;
  
  loading.value = true;
  error.value = '';
  
  try {
    const pid = selectedPerson.value.id;
    
    // Check if person exists (refresh detail) - technically we already have partial data, but let's ensure we can fetch full
    // But since selectedPerson comes from search, it might be partial. getPerson guarantees full details.
    // However, updatePersonFields technically doesn't need getPerson first if just updating.
    // But to be safe and consistent with logic:
    
    // Always overwrite onboarding date & clear offboarding date, set status active
    await provider.updatePersonFields(pid, {
      taufmanager_onboarding: onboardingDate.value,
      taufmanager_offboarding: null,
      taufmanager_status: 'active'
    });
    
    console.log(`[Baptizo] Person ${pid} onboarded on ${onboardingDate.value}`);
    emit('personAdded');
    emit('close');
  } catch (e: any) {
    console.error('[Baptizo] Onboarding failed:', e);
    error.value = `Fehler: ${e.message || 'Person konnte nicht gefunden werden'}`;
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

.info-text {
  color: #888;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
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
  border: 1px solid #444; /* Subtle border */
  color: white;
  padding: 0.5rem;
  border-radius: 4px;
  outline: none !important; /* Remove browser default blue outline */
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-field:focus {
  border-color: #92C9D6; /* Feature Color */
  box-shadow: 0 0 0 2px rgba(146, 201, 214, 0.2); /* Subtle glow matching theme */
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
  padding-top: 1rem;
  border-top: 1px solid #444;
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

/* Search Styles */
.search-wrapper {
    position: relative;
}
.search-input {
    width: 100%;
}
.search-spinner {
    position: absolute;
    right: 10px;
    top: 10px;
    width: 16px; 
    height: 16px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.search-results {
    background: #222;
    border: 1px solid #444;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
    margin-top: 0.5rem;
}
.search-result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    cursor: pointer;
    border-bottom: 1px solid #333;
}
.search-result-item:hover {
    background: #333;
}
.result-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
}
.result-name {
    font-weight: bold;
    color: #eee;
}
.result-meta {
    font-size: 0.8rem;
    color: #888;
}
.no-results {
    padding: 10px;
    color: #888;
    text-align: center;
    font-style: italic;
}

/* Selected Person Card */
.selected-person-card {
    background: #252535;
    border: 1px solid #3d3d5c;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
}
.selected-header {
    display: flex;
    align-items: center;
    gap: 15px;
}
.selected-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
}
.selected-info {
    flex: 1;
}
.selected-name {
    font-size: 1.1rem;
    font-weight: bold;
    color: #92C9D6;
}
.selected-id {
    color: #777;
    font-size: 0.9rem;
}
.remove-btn {
    background: none;
    border: none;
    color: #aaa;
    font-size: 1.2rem;
    cursor: pointer;
}
.remove-btn:hover {
    color: white;
}
</style>
