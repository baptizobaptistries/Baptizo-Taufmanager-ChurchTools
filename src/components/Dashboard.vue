<template>
  <div class="baptizo-dashboard">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="logo-area">
        <img src="/logo.png" alt="Baptizo Logo" class="logo-img" />
        <h1 class="app-title">Baptizo Taufmanager</h1>
      </div>
      <div class="actions">
        <select v-if="settings.multiSiteMode" class="location-filter">
          <option value="">Alle Standorte</option>
          <option v-for="campus in settings.campuses" :key="campus.id" :value="campus.id">
            {{ campus.name }}
          </option>
        </select>
        <button @click="openReportModal" class="ct-button ct-button--report">
          <span class="icon">📄</span> Report erstellen
        </button>
        <button @click="refreshData" class="ct-button ct-button--primary">
          <span class="icon">↻</span> Refresh
        </button>
      </div>
    </header>

    <!-- Tabs -->
    <div class="tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id" 
        class="tab-btn" 
        :class="{ active: currentTab === tab.id }"
        @click="currentTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Lade Daten...</p>
    </div>

    <!-- DASHBOARD TAB -->
    <div v-else-if="currentTab === 'dashboard'" class="dashboard-content">
      
      <!-- KPI Widgets (Dynamic) -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">INTERESSENTEN</span>
          <span class="kpi-value text-interessenten">{{ kpiInterested }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">SEMINARTEILNEHMER</span>
          <span class="kpi-value text-seminare">{{ kpiSeminars }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">GETAUFTE</span>
          <span class="kpi-value text-taufen">{{ kpiBaptisms }}</span>
        </div>
      </section>

      <!-- Chart Section -->
      <section class="master-chart-section">
        <div class="chart-header">
          <h3 class="chart-title">CHART</h3>
          <div class="chart-controls">
            <!-- Rolling Months -->
            <div class="btn-group">
              <button 
                v-for="months in [12, 24, 36]" 
                :key="months"
                class="chart-btn"
                :class="{ active: chartMode === 'rolling' && rollingMonths === months }"
                @click="setRollingMode(months)"
              >
                {{ months }} Mon
              </button>
            </div>
            <!-- Years (chronological 2023-2025) -->
            <div class="btn-group">
              <button 
                v-for="year in [2023, 2024, 2025]" 
                :key="year"
                class="chart-btn"
                :class="{ active: chartMode === 'years' && selectedYears.includes(year) }"
                @click="toggleYear(year)"
              >
                {{ year }}
              </button>
            </div>
          </div>
        </div>
        <div class="chart-container-large">
          <BaptismChart :data="chartData" />
        </div>
        <!-- Custom Legend -->
        <div class="chart-legend">
          <button 
            class="legend-btn"
            :class="{ active: visibleSeries.interessenten }"
            @click="toggleSeries('interessenten')"
          >
            <span class="legend-color" style="background: #92C9D6"></span>
            Interessenten
          </button>
          <button 
            class="legend-btn"
            :class="{ active: visibleSeries.seminare }"
            @click="toggleSeries('seminare')"
          >
            <span class="legend-color" style="background: #7383B2"></span>
            Seminarteilnehmer
          </button>
          <button 
            class="legend-btn"
            :class="{ active: visibleSeries.taufen }"
            @click="toggleSeries('taufen')"
          >
            <span class="legend-color" style="background: #FF9F43"></span>
            Getaufte
          </button>
        </div>
      </section>

      <!-- Global Filters -->
      <div class="global-filters">
        <span class="filter-label">ÜBERSICHT</span>
        <div class="filter-buttons">
          <button 
            v-for="filter in ['all', '>2w', '>6w', '>12w']" 
            :key="filter"
            class="filter-btn"
            :class="{ active: timeFilter === filter }"
            @click="timeFilter = filter"
          >
            {{ filter === 'all' ? 'Alle' : filter.toUpperCase() }}
          </button>
        </div>
      </div>

      <!-- 4 Lists Grid -->
      <section class="lists-grid">
        <!-- List 1 -->
        <div class="list-card">
          <div class="list-header">
            <h4>Ausstehendes Seminar</h4>
            <span class="badge badge-count">{{ listSeminarPending.length }}</span>
          </div>
          <div v-if="listSeminarPending.length === 0" class="empty-state">
            <span class="trophy">🏆</span>
          </div>
          <PersonList v-else :persons="listSeminarPending" @click="openPersonModal" />
        </div>

        <!-- List 2 -->
        <div class="list-card">
          <div class="list-header">
            <h4>Ausstehende Taufe</h4>
            <span class="badge badge-count">{{ listBaptismPending.length }}</span>
          </div>
          <div v-if="listBaptismPending.length === 0" class="empty-state">
            <span class="trophy">🏆</span>
          </div>
          <PersonList v-else :persons="listBaptismPending" @click="openPersonModal" />
        </div>

        <!-- List 3 -->
        <div class="list-card">
          <div class="list-header">
            <h4>Ausstehende Urkunde</h4>
            <span class="badge badge-count">{{ listCertificatePending.length }}</span>
          </div>
          <div v-if="listCertificatePending.length === 0" class="empty-state">
            <span class="trophy">🏆</span>
          </div>
          <PersonList v-else :persons="listCertificatePending" @click="openPersonModal" />
        </div>

        <!-- List 4 -->
        <div class="list-card">
          <div class="list-header">
            <h4>Ausstehende Integration</h4>
            <span class="badge badge-count">{{ listIntegrationPending.length }}</span>
          </div>
          <div v-if="listIntegrationPending.length === 0" class="empty-state">
            <span class="trophy">🏆</span>
          </div>
          <PersonList v-else :persons="listIntegrationPending" @click="openPersonModal" />
        </div>
      </section>
    </div>

    <!-- PERSONEN TAB -->
    <div v-else-if="currentTab === 'people'" class="people-content">
      <!-- Single row: Filters left, Buttons right (No title) -->
      <div class="people-header">
        <div class="filter-bar">
          <button @click="peopleFilter = 'all'" :class="{ active: peopleFilter === 'all' }">Alle</button>
          <button @click="peopleFilter = 'interested'" :class="{ active: peopleFilter === 'interested' }">Interessenten</button>
          <button @click="peopleFilter = 'baptized'" :class="{ active: peopleFilter === 'baptized' }">Getaufte</button>
          <button @click="peopleFilter = 'problems'" :class="{ active: peopleFilter === 'problems' }">Fokus</button>
        </div>
        <div class="management-buttons">
          <button @click="handleOnboarding" class="ct-button ct-button--primary">
            <span class="icon">➕</span> Onboarding
          </button>
          <button @click="handleOffboarding" class="ct-button ct-button--secondary">
            <span class="icon">📦</span> Offboarding
          </button>
        </div>
      </div>
      <table class="people-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Onboarding</th>
            <th>Seminar</th>
            <th>Taufe</th>
            <th>Urkunde</th>
            <th>Integriert</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="person in filteredPersons" :key="person.id" :class="{ inactive: person.status === 'inactive' }">
            <td>
              <div class="person-cell">
                <img :src="person.imageUrl" class="avatar-small">
                {{ person.firstName }} {{ person.lastName }}
              </div>
            </td>
            <td>{{ person.status === 'active' ? 'Aktiv' : 'Inaktiv' }}</td>
            <td>{{ formatDate(person.entry_date) }}</td>
            <td>
              <span v-if="person.fields.seminar_besucht_am" class="badge success">Ja</span>
              <span v-else class="badge pending">Nein</span>
            </td>
            <td>
              <span v-if="person.fields.getauft_am" class="badge success">Ja</span>
              <span v-else class="badge pending">Nein</span>
            </td>
            <td>
              <span v-if="person.fields.urkunde_ueberreicht" class="badge success">Ja</span>
              <span v-else class="badge pending">Nein</span>
            </td>
            <td>
              <span v-if="person.fields.in_gemeinde_integriert" class="badge success">Ja</span>
              <span v-else class="badge pending">Nein</span>
            </td>
            <td>
              <button class="edit-btn" @click="openPersonModal(person)">Bearbeiten</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- EVENTS TAB -->
    <div v-else-if="currentTab === 'events'" class="events-content">
      <EventList :events="events" @create="handleCreateEvent" />
    </div>

    <!-- SETTINGS TAB -->
    <div v-else-if="currentTab === 'settings'" class="settings-content">
      <SettingsTab :settings="settings" @update="updateSettings" />
    </div>

    <!-- FUNKTIONEN TAB -->
    <div v-else-if="currentTab === 'intro'" class="about-content">
      <h2>Funktionen des Baptist Taufmanagers</h2>
      <section class="intro-text">
        <p class="lead"><strong>Der BAPTIZO Taufmanager organisiert den gesamten Taufprozess deiner Gemeinde - vom ersten Interesse bis zur Integration in eure Gemeindefamilie.</strong></p>
        
        <p>Unser Plugin führt deine Leiter smart durch alle Schritte: Anmeldung, Taufseminar, Taufe, Follow-up. Alles läuft strukturiert, automatisiert und nachvollziehbar.</p>
        
        <h3>Deine Vorteile:</h3>
        <ul>
          <li><strong>Klarheit:</strong> Du siehst jederzeit, wo sich eine Person im Prozess befindet.</li>
          <li><strong>Struktur:</strong> Durchdachtes Gruppenkonzept und Event-Management.</li>
          <li><strong>Automatisierung:</strong> E-Mails und Erinnerungen laufen automatisch.</li>
          <li><strong>Entlastung:</strong> Leiter werden eigenständig an Tasks erinnert.</li>
          <li><strong>Reporting:</strong> Drop-offs und Status auf einen Blick.</li>
          <li><strong>Multisite-fähig:</strong> Für Gemeinden mit mehreren Standorten.</li>
        </ul>
        
        <p>Ideal für Gemeinden, die Taufe strukturiert begleiten wollen.<br>Mit minimalem Aufwand. Maximaler Wirkung.</p>
        <p><em>Weil jeder Mensch zählt.</em></p>
      </section>
    </div>

    <!-- ÜBER UNS TAB -->
    <div v-else-if="currentTab === 'about'" class="about-content">
      <h2>Über uns</h2>
      
      <h3>UNSERE VISION</h3>
      <p>Wir existieren, um Gemeinden dabei zu unterstützen, ihren Missionsauftrag kraftvoll zu erfüllen.</p>
      <p>Unser Anliegen: Das kraftvolle Zeichen der Wassertaufe sichtbarer machen - regelmäßig und ohne großen Aufwand.</p>
      
      <ul>
        <li>15 Minuten Aufbau - spontan einsetzbar</li>
        <li>10.000+ Taufen - absolut sicheres Konzept</li>
        <li>150+ zufriedene Kunden in 8 Ländern</li>
      </ul>

      <h3>UNSER HERZ</h3>
      <p>Mit unserer Lösung ist Kirche bereit, wenn es die Menschen sind.<br>
      Mehr Taufen. Mehr Zeugnisse. Mehr Wachstum.</p>

      <h3>UNSERE MISSION</h3>
      <p>Zu Gottes Ehre träumen wir davon, ganz Europa mit 1000 mobilen Taufbecken zu fluten.</p>

      <p><strong>Baptizo mobile Taufbecken - wir lieben Taufe!</strong><br>
      <a href="https://www.baptizo.church" target="_blank">www.baptizo.church</a> | 
      <a href="mailto:mail@baptizo.church">mail@baptizo.church</a> | 016098687610</p>
    </div>

    <!-- Footer -->
    <footer class="baptizo-footer">
      <p>Powered by <a href="https://www.baptizo.church" target="_blank">Baptizo – Mobile Taufbecken</a></p>
    </footer>

    <!-- Person Modal -->
    <PersonDetailModal 
      v-if="selectedPerson" 
      :person="selectedPerson" 
      @close="selectedPerson = null" 
      @save="handleSavePerson"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { MockDataProvider } from '../services/mock-data-provider';
import type { BaptizoGroup, BaptizoPerson, BaptizoEvent } from '../types/baptizo-types';
import BaptismChart from './BaptismChart.vue';
import PersonList from './PersonList.vue';
import EventList from './EventList.vue';
import PersonDetailModal from './PersonDetailModal.vue';
import SettingsTab from './SettingsTab.vue';
import { DEFAULT_SETTINGS } from '../types/baptizo-settings';
import type { BaptizoSettings } from '../types/baptizo-settings';

const provider = new MockDataProvider();
const loading = ref(true);
const groups = ref<BaptizoGroup[]>([]);
const events = ref<BaptizoEvent[]>([]);
const settings = ref<BaptizoSettings>({ ...DEFAULT_SETTINGS });
const currentTab = ref('dashboard');
const selectedPerson = ref<BaptizoPerson | null>(null);

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'people', label: 'Personen' },
  { id: 'events', label: 'Termine' },
  { id: 'settings', label: 'Einstellungen' },
  { id: 'intro', label: 'Hilfe' },
  { id: 'about', label: 'Über uns' }
];

// Chart State
const chartMode = ref<'rolling' | 'years'>('rolling');
const rollingMonths = ref(12);
const selectedYears = ref<number[]>([2025]);
const visibleSeries = ref({ interessenten: true, seminare: true, taufen: true });

// Filter State
const timeFilter = ref('all');
const peopleFilter = ref('all');

// Data Loading
const loadData = async () => {
  loading.value = true;
  try {
    const [groupsData, eventsData, settingsData] = await Promise.all([
      provider.getGroups(),
      provider.getEvents(),
      provider.getSettings()
    ]);
    groups.value = groupsData;
    events.value = eventsData;
    settings.value = settingsData;
  } catch (e) {
    console.error('Failed to load data', e);
  } finally {
    loading.value = false;
  }
};

const refreshData = () => loadData();
const updateSettings = (s: BaptizoSettings) => { settings.value = s; };
const openReportModal = () => alert("Bericht konfigurieren\n\nEmpfänger hinzufügen:\n- Pastor@example.com\n- Team@example.com\n\n(Simulation)");
const handleCreateEvent = async (e: any) => { await provider.createEvent(e); await loadData(); };
const openPersonModal = (p: BaptizoPerson) => { selectedPerson.value = p; };
const handleSavePerson = async (p: BaptizoPerson) => { 
  await provider.updatePerson(p); 
  selectedPerson.value = null; 
  await loadData(); 
};
const handleOnboarding = () => alert("Onboarding:\n\nSimuliere Suche in ChurchTools-Datenbank...\n(Feature in Entwicklung)");
const handleOffboarding = () => alert("Offboarding:\n\nPerson archivieren.\n(Feature in Entwicklung)");

// Helper Functions
const getDaysSince = (dateStr: string | undefined | null) => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 0;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
};

const filterByTime = (person: BaptizoPerson, dateField: string) => {
  if (timeFilter.value === 'all') return true;
  const dateStr = dateField === 'entry' ? person.entry_date : person.fields.getauft_am;
  if (!dateStr) return false;
  const days = getDaysSince(dateStr);
  if (timeFilter.value === '>2w') return days > 14;
  if (timeFilter.value === '>6w') return days > 42;
  if (timeFilter.value === '>12w') return days > 84;
  return true;
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

// Chart Logic
const setRollingMode = (months: number) => {
  chartMode.value = 'rolling';
  rollingMonths.value = months;
  selectedYears.value = [];
};

const toggleYear = (year: number) => {
  if (chartMode.value === 'rolling') {
    chartMode.value = 'years';
    selectedYears.value = [year];
  } else {
    const index = selectedYears.value.indexOf(year);
    if (index === -1) {
      if (selectedYears.value.length < 3) {
        selectedYears.value.push(year);
      }
    } else {
      if (selectedYears.value.length > 1) {
        selectedYears.value.splice(index, 1);
      }
    }
  }
};

const toggleSeries = (series: 'interessenten' | 'seminare' | 'taufen') => {
  visibleSeries.value[series] = !visibleSeries.value[series];
};

// Chart Data
const chartData = computed(() => {
  const datasets: any[] = [];
  
  if (chartMode.value === 'rolling') {
    const labels: string[] = [];
    const intData: number[] = [];
    const semData: number[] = [];
    const baptData: number[] = [];
    
    const now = new Date();
    for (let i = rollingMonths.value - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('de-DE', { month: 'long', year: '2-digit' }));
      
      let intCount = 0, semCount = 0, baptCount = 0;
      
      
      groups.value.forEach(group => {
        group.members.forEach(m => {
          // 1. Interessenten (Entry Date)
          if (m.entry_date) {
            const ed = new Date(m.entry_date);
            if (ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear()) {
              intCount++;
            }
          }
          
          // 2. Seminare (Seminar Date) - Independent check!
          if (m.fields.seminar_besucht_am) {
            const sd = new Date(m.fields.seminar_besucht_am);
            if (sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear()) {
              semCount++;
            }
          }

          // 3. Taufen (Baptism Date)
          if (m.fields.getauft_am) {
            const bd = new Date(m.fields.getauft_am);
            if (bd.getMonth() === d.getMonth() && bd.getFullYear() === d.getFullYear()) {
              baptCount++;
            }
          }
        });
      });
      
      intData.push(intCount);
      semData.push(semCount);
      baptData.push(baptCount);
    }
    
    if (visibleSeries.value.interessenten) {
      datasets.push({
        label: 'Interessenten',
        data: intData,
        borderColor: '#92C9D6',
        solidColor: '#92C9D6',
        backgroundColor: 'rgba(146, 201, 214, 0.1)',
        tension: 0.4
      });
    }
    if (visibleSeries.value.seminare) {
      datasets.push({
        label: 'Seminare',
        data: semData,
        borderColor: '#7383B2',
        solidColor: '#7383B2',
        backgroundColor: 'rgba(115, 131, 178, 0.1)',
        tension: 0.4
      });
    }
    if (visibleSeries.value.taufen) {
      datasets.push({
        label: 'Taufen',
        data: baptData,
        borderColor: '#FF9F43',
        solidColor: '#FF9F43',
        backgroundColor: 'rgba(255, 159, 67, 0.1)',
        tension: 0.4
      });
    }
    
    return { labels, datasets };
    
  } else {
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const sortedYears = [...selectedYears.value].sort((a, b) => b - a);
    
    sortedYears.forEach((year, idx) => {
      // Progressive transparency: newest 100%, then 50%, then 20%
      let opacity;
      if (idx === 0) opacity = 1.0;      // Current/newest year
      else if (idx === 1) opacity = 0.5; // Previous year  
      else opacity = 0.2;                // Older years
      
      const intData = new Array(12).fill(0);
      const semData = new Array(12).fill(0);
      const baptData = new Array(12).fill(0);
      
      // Count from ALL persons in BOTH groups (single source of truth)
      groups.value.forEach(group => {
        group.members.forEach(person => {
          // Count Interessenten: based on entry_date
          if (person.entry_date) {
            const entryDate = new Date(person.entry_date);
            if (entryDate.getFullYear() === year) {
              intData[entryDate.getMonth()]++;
            }
          }
          
          // Count Seminare: based on seminar_besucht_am
          if (person.fields.seminar_besucht_am) {
            const seminarDate = new Date(person.fields.seminar_besucht_am);
            if (seminarDate.getFullYear() === year) {
              semData[seminarDate.getMonth()]++;
            }
          }
          
          // Count Taufen: based on getauft_am
          if (person.fields.getauft_am) {
            const baptismDate = new Date(person.fields.getauft_am);
            if (baptismDate.getFullYear() === year) {
              baptData[baptismDate.getMonth()]++;
            }
          }
        });
      });
      
      if (visibleSeries.value.interessenten) {
        datasets.push({
          label: `Interessenten '${year.toString().slice(-2)}`,
          data: intData,
          borderColor: `rgba(146, 201, 214, ${opacity})`,
          solidColor: '#92C9D6',
          backgroundColor: `rgba(146, 201, 214, ${opacity * 0.1})`,
          tension: 0.4
        });
      }
      if (visibleSeries.value.seminare) {
        datasets.push({
          label: `Seminarteilnehmer '${year.toString().slice(-2)}`,
          data: semData,
          borderColor: `rgba(115, 131, 178, ${opacity})`,
          solidColor: '#7383B2',
          backgroundColor: `rgba(115, 131, 178, ${opacity * 0.1})`,
          tension: 0.4
        });
      }
      if (visibleSeries.value.taufen) {
        datasets.push({
          label: `Taufen '${year.toString().slice(-2)}`,
          data: baptData,
          borderColor: `rgba(255, 159, 67, ${opacity})`,
          solidColor: '#FF9F43',
          backgroundColor: `rgba(255, 159, 67, ${opacity * 0.1})`,
          tension: 0.4
        });
      }
    });
    
    return { labels: months, datasets };
  }
});

// Dynamic KPIs (Event-Based Logic)
const kpiInterested = computed(() => {
  let count = 0;
  
  // Determine time range based on mode
  let startDate: Date, endDate: Date;
  
  if (chartMode.value === 'rolling') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() - rollingMonths.value + 1, 1);
    endDate = now;
  } else {
    // Years mode: get min and max from selected years
    const years = [...selectedYears.value].sort();
    startDate = new Date(years[0], 0, 1);
    endDate = new Date(years[years.length - 1], 11, 31);
  }
  
  // Count ALL persons whose entry_date is in range (from both groups)
  groups.value.forEach(group => {
    group.members.forEach(person => {
      if (person.entry_date) {
        const entryDate = new Date(person.entry_date);
        if (entryDate >= startDate && entryDate <= endDate) {
          count++;
        }
      }
    });
  });
  
  return count;
});

const kpiSeminars = computed(() => {
  let count = 0;
  
  // Determine time range
  let startDate: Date, endDate: Date;
  
  if (chartMode.value === 'rolling') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() - rollingMonths.value + 1, 1);
    endDate = now;
  } else {
    const years = [...selectedYears.value].sort();
    startDate = new Date(years[0], 0, 1);
    endDate = new Date(years[years.length - 1], 11, 31);
  }
  
  // Count ALL persons whose seminar_besucht_am is in range (from both groups)
  groups.value.forEach(group => {
    group.members.forEach(person => {
      if (person.fields.seminar_besucht_am) {
        const seminarDate = new Date(person.fields.seminar_besucht_am);
        if (seminarDate >= startDate && seminarDate <= endDate) {
          count++;
        }
      }
    });
  });
  
  return count;
});

const kpiBaptisms = computed(() => {
  let count = 0;
  
  // Determine time range
  let startDate: Date, endDate: Date;
  
  if (chartMode.value === 'rolling') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth() - rollingMonths.value + 1, 1);
    endDate = now;
  } else {
    const years = [...selectedYears.value].sort();
    startDate = new Date(years[0], 0, 1);
    endDate = new Date(years[years.length - 1], 11, 31);
  }
  
  // Count ALL persons whose getauft_am is in range (typically in baptized group)
  const baptGroup = groups.value.find(g => g.id === 101);
  if (baptGroup) {
    baptGroup.members.forEach(person => {
      if (person.fields.getauft_am) {
        const baptismDate = new Date(person.fields.getauft_am);
        if (baptismDate >= startDate && baptismDate <= endDate) {
          count++;
        }
      }
    });
  }
  
  return count;
});

// Lists
const listSeminarPending = computed(() => {
  const g = groups.value.find(g => g.id === 100);
  if (!g) return [];
  return g.members
    .filter(m => !m.fields.seminar_besucht_am && filterByTime(m, 'entry'))
    .map(p => ({ ...p, subtitle: `Interesse: ${formatDate(p.entry_date)}` }));
});

const listBaptismPending = computed(() => {
  const g = groups.value.find(g => g.id === 100);
  if (!g) return [];
  return g.members
    .filter(m => m.fields.seminar_besucht_am && !m.fields.getauft_am && filterByTime(m, 'entry'))
    .map(p => ({ ...p, subtitle: `Seminar: ${formatDate(p.fields.seminar_besucht_am)}` }));
});

const listCertificatePending = computed(() => {
  const g = groups.value.find(g => g.id === 101);
  if (!g) return [];
  return g.members
    .filter(m => !m.fields.urkunde_ueberreicht && filterByTime(m, 'baptism'))
    .map(p => ({ ...p, subtitle: `Taufe: ${formatDate(p.fields.getauft_am)}` }));
});

const listIntegrationPending = computed(() => {
  const g = groups.value.find(g => g.id === 101);
  if (!g) return [];
  return g.members
    .filter(m => !m.fields.in_gemeinde_integriert && filterByTime(m, 'baptism'))
    .map(p => ({ ...p, subtitle: `Taufe: ${formatDate(p.fields.getauft_am)}` }));
});

// People Tab Filter (SORTED BY ONBOARDING DATE - FIFO)
const filteredPersons = computed(() => {
  let list = groups.value.flatMap(g => g.members);
  if (peopleFilter.value === 'interested') list = list.filter(p => !p.fields.getauft_am);
  else if (peopleFilter.value === 'baptized') list = list.filter(p => p.fields.getauft_am);
  else if (peopleFilter.value === 'problems') {
    list = list.filter(p => {
      if (p.status !== 'active') return false;
      if (p.fields.getauft_am && (!p.fields.urkunde_ueberreicht || !p.fields.in_gemeinde_integriert)) return true;
      if (!p.fields.seminar_besucht_am && p.entry_date && getDaysSince(p.entry_date) > 180) return true;
      return false;
    });
  }
  // Sort by onboarding date ascending (FIFO - oldest first)
  return list.sort((a, b) => {
    const dateA = a.entry_date ? new Date(a.entry_date).getTime() : 0;
    const dateB = b.entry_date ? new Date(b.entry_date).getTime() : 0;
    
    // Smart Sort: Focus (problems) = ASC (Oldest first), Others = DESC (Newest first)
    if (peopleFilter.value === 'problems') {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });
});

onMounted(() => loadData());
</script>

<style scoped>
:root {
  --baptizo-accent: #92C9D6;
  --baptizo-secondary: #7383B2;
  --baptizo-header-bg: #3C3C5B;
  --master-gap: 60px;
}

.baptizo-dashboard {
  color: #eee;
  background-color: #1a1a1a;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Header */
.dashboard-header {
  background-color: #3C3C5B;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
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
  margin: 0; 
  font-size: 1.5rem; 
  font-weight: bold;
  text-transform: uppercase;
}

.actions { 
  display: flex; 
  gap: 1rem; 
  align-items: center; 
}

.location-filter {
  padding: 0.5rem;
  border-radius: 4px;
  background: #2a2a2a;
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
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
}

.ct-button--secondary {
  background-color: #444;
  color: #fff;
}

.ct-button--report {
  background-color: transparent;
  border: 2px solid #92C9D6;
  color: #92C9D6;
}

.ct-button--report:hover {
  background-color: rgba(146, 201, 214, 0.1);
}

.ct-button.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

/* Tabs */
.tabs {
  background-color: #2a2a2a;
  padding: 0 2rem;
  border-bottom: 1px solid #444;
  display: flex;
  gap: 1rem;
}

.tab-btn {
  background: none;
  border: none;
  color: white;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
}

.tab-btn.active {
  color: #92C9D6;
  font-weight: bold;
  border-bottom-color: #92C9D6;
}

/* Dashboard Content */
.dashboard-content {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 20px 0 20px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

.kpi-card {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 4px solid #444;
}

.kpi-label {
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 0.5rem;
  font-weight: bold;
  letter-spacing: 1px;
}

.kpi-value {
  font-size: 3rem;
  font-weight: bold;
}

.text-interessenten { color: #92C9D6; }
.text-seminare { color: #7383B2; }
.text-taufen { color: #FF9F43; }

/* Chart Section */
.master-chart-section {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.chart-title {
  font-size: 0.9rem;
  color: #888;
  margin: 0;
  font-weight: bold;
  letter-spacing: 1px;
}

.chart-container-large {
  height: 300px;
}

.chart-controls {
  display: flex;
  gap: 10px;
}

.btn-group {
  display: flex;
  gap: 2px;
  background: #333;
  padding: 2px;
  border-radius: 4px;
}

.chart-btn {
  background: transparent;
  border: none;
  color: white;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
}

.chart-btn.active {
  background: #92C9D6;
  color: #3C3C5B;
  font-weight: bold;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #444;
}

.legend-btn {
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.legend-btn.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

/* Global Filters */
.global-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: #2a2a2a;
  padding: 1rem;
  border-radius: 8px;
}

.filter-label {
  font-size: 0.9rem;
  color: #888;
  font-weight: bold;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
}

.filter-btn {
  background: #444;
  border: none;
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn.active {
  background: #92C9D6;
  color: #3C3C5B;
  font-weight: bold;
}

/* Lists Grid */
.lists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 0;
}

.list-card {
  background: #2a2a2a;
  padding: 1rem;
  border-radius: 8px;
  border-top: 4px solid #555;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: none;
}

.list-header h4 {
  margin: 0;
  font-size: 14px;
  color: #888;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.badge-count {
  background: #555;
  color: #fff;
}

.badge.success {
  background: #10b981;
  color: white;
}

.badge.pending {
  background: #6b7280;
  color: white;
}

/* Normale Schriftstärke für alle Namen in den 4 Listen-Boxen */
.lists-grid :deep(.person-name),
.lists-grid :deep(.name) {
    font-weight: normal !important;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  color: #666;
}

.trophy {
  font-size: 3rem;
  opacity: 0.3;
}

/* People Content */
.people-content {
  padding: 0 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.people-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  margin-bottom: 1.5rem;

}

.management-buttons {
  display: flex;
  gap: 0.5rem;
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

.people-table {
  width: 100%;
  border-collapse: collapse;
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  table-layout: fixed;
}

.people-table th,
.people-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #444;
}

.people-table th {
  text-transform: uppercase;
  color: #888;
  font-size: 0.9rem;
  letter-spacing: 1px;
  font-weight: bold;
}

.people-table tr:last-child td {
  border-bottom: none;
}

/* Fixed column widths for stability */
.people-table th:nth-child(1),
.people-table td:nth-child(1) { width: 25%; }
.people-table th:nth-child(2),
.people-table td:nth-child(2) { width: 10%; }
.people-table th:nth-child(3),
.people-table td:nth-child(3) { width: 12%; }
.people-table th:nth-child(4),
.people-table td:nth-child(4) { width: 10%; }
.people-table th:nth-child(5),
.people-table td:nth-child(5) { width: 10%; }
.people-table th:nth-child(6),
.people-table td:nth-child(6) { width: 10%; }
.people-table th:nth-child(7),
.people-table td:nth-child(7) { width: 10%; }
.people-table th:nth-child(8),
.people-table td:nth-child(8) { width: 13%; }



.people-table tr.inactive {
  opacity: 0.5;
}

.person-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-small {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

/* Events & Settings */
/* Events & Settings */
.events-content {
  padding: 0 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.settings-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* About Content */
.about-content {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
}

.about-content h2 {
  color: #92C9D6;
  margin-bottom: 2rem;
  color: #92C9D6;
  text-decoration: none;
}

.intro-text .lead {
  font-size: 1.2rem;
  margin-bottom: 1.5rem;
  color: #fff;
}

.intro-text ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.intro-text li {
  margin-bottom: 0.5rem;
}

/* Footer */
.baptizo-footer {
  margin-top: 4rem;
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.7;
  border-top: none;
  padding: 2rem;
  background: #1a1a1a;
}

.baptizo-footer a {
  color: #92C9D6;
  text-decoration: none;
  font-weight: bold;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  color: #aaa;
}
/* Edit Button (Outline Style) */
.edit-btn {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-color: rgba(255, 255, 255, 0.4);
}
</style>
