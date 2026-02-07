<template>
  <div class="event-list-container">
    <!-- Header Controls -->
    <div class="events-header">
      <!-- Left: Filters -->
      <div class="filter-bar">
        <button 
          @click="filterType = 'all'" 
          :class="{ active: filterType === 'all' }"
        >Alle</button>
        <button 
          @click="filterType = 'seminar'" 
          :class="{ active: filterType === 'seminar' }"
        >Seminar</button>
        <button 
          @click="filterType = 'baptism'" 
          :class="{ active: filterType === 'baptism' }"
        >Taufe</button>
        <button 
          @click="showPastEvents = !showPastEvents" 
          :class="{ active: showPastEvents }"
        >Vergangene</button>
      </div>

      <!-- Right: Action -->
      <div class="action-button">
          <button class="ct-button ct-button--primary" @click="openCreateModal">
            <span class="icon">
              <!-- Plus SVG -->
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </span> 
            Neuen Termin anlegen
          </button>
      </div>
    </div>

    <!-- Event List -->
    <div class="event-list">
      <div v-if="filteredEvents.length === 0" class="empty-state">
        Keine Termine gefunden.
      </div>
      <div v-else v-for="event in filteredEvents" :key="event.id" class="event-card" :class="{ ghost: isPast(event) }">
        <div class="event-date">
          <span class="day">{{ getDay(event.date) }}</span>
          <span class="month">{{ getGermanMonth(event.date) }}</span>
        </div>
        
        <div class="event-details">
          <div class="header-row">
            <h4>{{ event.title }} {{ getFullGermanMonth(event.date) }} {{ getYear(event.date) }}</h4>
            <span class="type-badge" :class="event.type">
              {{ event.type === 'seminar' ? 'SEMINAR' : 'TAUFE' }}
            </span>
          </div>
          <div class="meta">
            <span class="leader" v-if="event.leader">Leitung: {{ event.leader }}</span>
            <span class="time" v-if="event.time">Start: {{ event.time }} Uhr</span>
          </div>
        </div>

        <div class="event-actions">
          <button class="edit-btn" @click="editEvent(event)">
            Bearbeiten
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title">{{ isEditing ? 'Termin bearbeiten' : 'Neuen Termin anlegen' }}</h2>
            <button class="close-btn" @click="showCreateModal = false">&times;</button>
        </div>
        
        <div class="modal-body">
            <div class="form-group">
            <label>Titel</label>
            <select v-model="modalEvent.type" class="input-field">
                <option value="baptism">Taufe</option>
                <option value="seminar">Taufseminar</option>
            </select>
            </div>

            <div class="form-group">
            <label>Datum</label>
            <input type="date" v-model="modalEvent.date" class="input-field">
            </div>

            <div class="form-group">
            <label>Leitung</label>
            <input v-model="modalEvent.leader" type="text" placeholder="Name des Leiters" class="input-field" />
            </div>
        </div>

        <div class="modal-actions" :style="{ justifyContent: isEditing ? 'space-between' : 'flex-end' }">
           <!-- Left: Delete (Only if Editing) -->
           <button v-if="isEditing" class="ct-button ct-button--delete" @click="deleteEvent">
             Löschen
           </button>
           
           <!-- Right Group -->
           <div style="display: flex; gap: 1rem;">
             <button class="ct-button ct-button--secondary" @click="showCreateModal = false">Abbrechen</button>
             <button class="ct-button ct-button--primary" @click="saveEvent">Speichern</button>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { EventService } from '../services/eventService';
import type { BaptizoEvent } from '../types/baptizo-types';

const eventService = new EventService();
const events = ref<BaptizoEvent[]>([]);

// Filter State
const filterType = ref<'all' | 'seminar' | 'baptism'>('all');
const showPastEvents = ref(false);

// Modal State
const showCreateModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | number | null>(null);

const modalEvent = ref({
  title: '',
  date: new Date().toISOString().split('T')[0],
  type: 'baptism', // Default
  leader: ''
});

// Helpers
const isPast = (event: BaptizoEvent) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return new Date(event.date) < now;
};

const getDay = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.getDate();
};

const getGermanMonth = (dateStr: string) => {
  const date = new Date(dateStr);
  const month = date.toLocaleString('de-DE', { month: 'short' }).toUpperCase();
  const map: Record<string, string> = { 'MAR': 'MÄR', 'MAY': 'MAI', 'OCT': 'OKT', 'DEC': 'DEZ', 'MÄRZ': 'MÄR' };
  let clean = month.replace('.', '');
  return map[clean] || clean;
};

const getFullGermanMonth = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('de-DE', { month: 'long' });
};

const getYear = (dateStr: string) => {
  const date = new Date(dateStr);
  return "'" + date.getFullYear().toString().slice(-2);
};

// Data Loading
const refresh = async () => {
  try {
    const rawEvents = await eventService.getEvents();
    
    // De-duplication
    const uniqueMap = new Map();
    rawEvents.forEach(evt => {
        const normalizedTitle = evt.title.trim().toLowerCase();
        const key = `${evt.date}|${normalizedTitle}`;
        if (!uniqueMap.has(key)) uniqueMap.set(key, evt);
    });
    
    events.value = Array.from(uniqueMap.values());
  } catch (e) {
    console.error('Failed to load events', e);
  }
};

defineExpose({ refresh });

// Computed
const filteredEvents = computed(() => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return events.value.filter(event => {
    if (filterType.value !== 'all' && event.type !== filterType.value) return false;
    const eventDate = new Date(event.date);
    
    // Future: Always show
    if (eventDate >= now) return true;
    
    // Past: Show only if toggle ON
    if (!showPastEvents.value && eventDate < now) return false;
    
    return true; // Keep past event if toggle is ON
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
});

// Actions
const openCreateModal = () => {
    isEditing.value = false;
    editingId.value = null;
    modalEvent.value = {
        title: '',
        date: new Date().toISOString().split('T')[0],
        type: 'baptism',
        leader: ''
    };
    showCreateModal.value = true;
};

const editEvent = (event: BaptizoEvent) => {
    isEditing.value = true;
    editingId.value = event.id;
    
    // Copy data to modal
    modalEvent.value = {
        title: event.title,
        date: event.date,
        type: event.type as 'baptism' | 'seminar',
        leader: event.leader || ''
    };
    showCreateModal.value = true;
};

const saveEvent = async () => {
  if (!modalEvent.value.date) return;
  
  try {
      const title = modalEvent.value.type === 'baptism' ? 'Taufe' : 'Taufseminar';

      if (isEditing.value && editingId.value) {
          await eventService.updateEvent(editingId.value, {
            title: title,
            date: modalEvent.value.date,
            type: modalEvent.value.type as 'seminar' | 'baptism',
            leader: modalEvent.value.leader
          });
      } else {
          await eventService.createEvent({
            title: title,
            date: modalEvent.value.date,
            type: modalEvent.value.type as 'seminar' | 'baptism',
            leader: modalEvent.value.leader
          });
      }
      
      await refresh();
      showCreateModal.value = false;
  } catch (e) {
      alert('Fehler beim Speichern: ' + e);
  }
};

const deleteEvent = async () => {
    if (!editingId.value) return;
    // Confirm removed per user request: "Sicherheitsfrage... muss WEG!!!"
    
    try {
        await eventService.deleteEvent(editingId.value);
        await refresh();
        showCreateModal.value = false;
    } catch (e) {
        alert('Fehler beim Löschen: ' + e);
    }
};


onMounted(() => {
  refresh();
});
</script>

<style scoped>

  /* Header Controls */
  .events-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .action-button {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

/* Filter Bar */
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

/* Archive Controls */
.archive-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: #1a1a1a;
  padding: 0.5rem 1rem;
  border-radius: 6px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #aaa;
  font-size: 0.9rem;
  cursor: pointer;
}

.archive-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #aaa;
  font-size: 0.9rem;
}

.archive-input-group.disabled {
  opacity: 0.3;
  pointer-events: none;
}

.archive-input-group input {
  width: 50px;
  background: #333;
  border: 1px solid #555;
  color: white;
  padding: 0.2rem;
  border-radius: 4px;
  text-align: center;
}

/* Event List */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  /* No margin-bottom to avoid double spacing with footer */
}

.event-card {
  background: #2a2a2a;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  gap: 1.5rem;
  align-items: center;
  border-left: 4px solid transparent; /* Default */
  transition: transform 0.2s;
}

.event-card:hover {
  transform: translateX(5px);
}

.event-date {
  background: rgba(255,255,255,0.05);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  text-align: center;
  min-width: 70px;
}

.event-date .day {
  display: block;
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
}

.event-date .month {
  display: block;
  font-size: 0.8rem;
  font-weight: bold;
  color: #888;
  line-height: 1.2;
}

.event-details {
  flex: 1;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.event-details h4 {
  margin: 0;
  color: #fff;
  font-size: 1.1rem;
}

.meta {
  font-size: 0.9rem;
  color: #aaa;
  display: flex;
  gap: 1.5rem;
}

/* Badges */
.type-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 0.5px;
}

.type-badge.seminar {
  background: rgba(115, 131, 178, 0.2);
  color: #7383B2;
}

.type-badge.baptism {
  background: rgba(255, 159, 67, 0.2);
  color: #FF9F43;
}

/* Actions */
.edit-btn {
  background: none;
  border: 1px solid #444;
  color: #ffffff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: #444;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
  background: #2a2a2a;
  border-radius: 8px;
}

/* Button Styles (Copied from PersonDetailModal/Dashboard) */
.ct-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.ct-button--primary {
  background-color: #92C9D6;
  color: #3C3C5B;
  border: 2px solid #92C9D6;
}

.ct-button--primary:hover {
  background-color: #7ab3c2;
  border-color: #7ab3c2;
}

.ct-button--secondary {
  background-color: transparent;
  color: #aaa;
  border: 1px solid #444;
}

.ct-button--secondary:hover {
  border-color: #fff;
  color: #fff;
}


/* Modal Overlay */
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
  border-bottom: none; /* Onboarding has no border */
  padding: 0;
}

.modal-title {
  margin: 0;
  color: #92C9D6; /* Turquoise */
  font-size: 24px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: normal;
}

.modal-body {
  padding: 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  color: #aaa;
  margin-bottom: 0.5rem;
  font-weight: normal;
}

.input-field {
  width: 100%;
  padding: 0.75rem;
  background: #333;
  border: 1px solid #444;
  color: white;
  border-radius: 4px;
  font-size: 1rem;
}

/* Delete Button */
.ct-button--delete {
  background-color: #3C3C5B !important; /* Dark Baptizo Purple FORCE */
  color: white;
  margin-right: auto; /* Push to left */
}

.ct-button--delete:hover {
  background-color: #4b4b6e !important;
}

.input-field:focus {
  outline: none;
  border-color: #92C9D6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding: 0;
  border-top: none;
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
  background: #92C9D6;
  color: #3C3C5B;
}

.ct-button--secondary {
  background: #444;
  color: #fff;
}

/* Ghost Look for Past Events */
.event-card.ghost {
  opacity: 0.5;
  filter: grayscale(100%);
}

.ct-button--delete {
  background-color: #7383B2;
  color: white;
  padding: 0.4rem 0.8rem;
  font-weight: bold;
  border-radius: 4px;
}

.ct-button--delete:hover {
  background-color: #8593c2;
}
</style>
