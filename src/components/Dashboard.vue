<template>
  <div class="baptizo-dashboard">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="logo-area">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="8" fill="#92C9D6"/>
          <path d="M10 20L18 28L30 12" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1>Baptizo Taufmanager</h1>
      </div>
      <div class="actions">
        <select class="location-filter">
          <option>Alle Standorte</option>
          <option>Campus A</option>
          <option>Campus B</option>
        </select>
        <button @click="generateReport" class="ct-button ct-button--secondary">
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
        class="tab-btn" 
        :class="{ active: currentTab === 'dashboard' }"
        @click="currentTab = 'dashboard'"
      >
        Dashboard
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: currentTab === 'events' }"
        @click="currentTab = 'events'"
      >
        Termine
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: currentTab === 'about' }"
        @click="currentTab = 'about'"
      >
        Über Baptizo
      </button>
    </div>

    <div v-if="loading" class="loading-state">
      <p>Lade Daten...</p>
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="currentTab === 'dashboard'" class="dashboard-content">
      
      <!-- KPI Cards (3 Items) -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Interessenten</span>
          <span class="kpi-value">{{ kpiInterested }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Seminar-Absolventen</span>
          <span class="kpi-value">{{ kpiSeminarGrads }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Taufen</span>
          <span class="kpi-value">{{ kpiBaptisms }}</span>
        </div>
      </section>

      <!-- Master Chart -->
      <section class="master-chart-section">
        <div class="chart-header">
          <h3>Tauf-Entwicklung</h3>
          <div class="chart-controls">
            <button 
              class="chart-btn" 
              :class="{ active: chartTimeRange === 12 }"
              @click="chartTimeRange = 12"
            >12 Mon</button>
            <button 
              class="chart-btn" 
              :class="{ active: chartTimeRange === 24 }"
              @click="chartTimeRange = 24"
            >24 Mon</button>
            <button 
              class="chart-btn" 
              :class="{ active: chartTimeRange === 36 }"
              @click="chartTimeRange = 36"
            >36 Mon</button>
          </div>
        </div>
        <div class="chart-container-large">
          <BaptismChart :data="baptismData" />
        </div>
      </section>

      <!-- Lists Grid (4 Categories) -->
      <section class="widgets-grid">
        <div class="widget-card">
          <div class="widget-header">
            <h3>Ausstehendes Seminar</h3>
            <span class="count-badge warning">{{ pendingSeminar.length }}</span>
          </div>
          <PersonList :persons="pendingSeminar" type="warning" />
        </div>
        <div class="widget-card">
          <div class="widget-header">
            <h3>Ausstehende Taufe</h3>
            <span class="count-badge info">{{ pendingBaptism.length }}</span>
          </div>
          <PersonList :persons="pendingBaptism" type="info" />
        </div>
        <div class="widget-card">
          <div class="widget-header">
            <h3>Offene Urkunden</h3>
            <span class="count-badge warning">{{ missingCertificates.length }}</span>
          </div>
          <PersonList :persons="missingCertificates" type="warning" />
        </div>
        <div class="widget-card">
          <div class="widget-header">
            <h3>Fehlende Integration</h3>
            <span class="count-badge info">{{ missingIntegration.length }}</span>
          </div>
          <PersonList :persons="missingIntegration" type="info" />
        </div>
      </section>
    </div>

    <!-- Events Content -->
    <div v-else-if="currentTab === 'events'" class="events-content">
      <EventList :events="events" @create="handleCreateEvent" />
    </div>

    <!-- About Content -->
    <div v-else-if="currentTab === 'about'" class="about-content">
      
      <!-- Intro Text (Moved here) -->
      <section class="intro-text">
        <p class="lead"><strong>Der BAPTIZO Taufmanager organisiert den gesamten Taufprozess deiner Gemeinde - vom ersten Interesse bis zur Integration in eure Gemeindefamilie.</strong></p>
        <p>Unser Plugin führt deine Leiter smart durch alle Schritte: Anmeldung, Taufseminar, Taufe, Follow-up. Alles läuft strukturiert, automatisiert und nachvollziehbar. Es erinnert, begleitet, informiert - und denkt für euch mit.</p>
        <p><strong>Deine Vorteile:</strong></p>
        <ul>
          <li><strong>Klarheit:</strong> Du siehst jederzeit, wo sich eine Person im Prozess befindet - und wo es hakt.</li>
          <li><strong>Struktur:</strong> Ein durchdachtes Gruppenkonzept und integriertes Event-Management halten alles zusammen - vom Seminar bis zur Taufe.</li>
          <li><strong>Automatisierung:</strong> E-Mails, Gruppenwechsel und Erinnerungen orientieren sich automatisch an euren Terminen.</li>
          <li><strong>Entlastung:</strong> Deine Leiter werden eigenständig an Tasks erinnern - damit niemand vergessen wird und die Daten immer aktuell sind</li>
          <li><strong>Smartes Reporting:</strong> Drop-offs, Integrationsstatus und Urkundenstatus auf einen Blick - inklusive konkreter Handlungstipps.</li>
          <li><strong>Multisite-fähig:</strong> Auch für Gemeinden mit mehreren Standorten - dank Standortfilterung jederzeit auswertbar.</li>
        </ul>
        <p>Ideal für Gemeinden, die den powervollen Schritt der Taufe strukturiert begleiten wollen.<br>Mit minimalem Verwaltungsaufwand. Und maximaler Wirkung.</p>
        <p><em>Weil jeder Mensch zählt.</em></p>
      </section>

      <hr class="divider">

      <h2>Über Baptizo Baptistries</h2>
      
      <h3>UNSERE VISION</h3>
      <p>Wir existieren, um Gemeinden dabei zu unterstützen, ihren Missionsauftrag kraftvoll und effektiv zu erfüllen - für eine Kirche, die bereit ist, wenn es die Menschen sind. Mit Taufbecken die einfach, mobil, schön und sicher sind!<br>
      Wir glauben fest daran, dass Gott uns die richtige Idee zur richtigen Zeit geschenkt hat! Unser Anliegen ist es, das kraftvolle Zeichen der Wassertaufe noch sichtbarer zu machen und so nah wie möglich am Herzen jeder Gemeinde zu integrieren - regelmäßig und ohne großen Aufwand.</p>
      <ul>
        <li>15 Minuten Aufbau - spontan und überall einsetzbar.</li>
        <li>10 000+ Taufen - vom Gemeindesaal bis ins Kino ein absolut sicheres Konzept.</li>
        <li>150+ zufriedene Kunden in acht verschiedenen Ländern.</li>
      </ul>

      <h3>UNSER HERZ</h3>
      <p>Mit unserer einfachen und flexiblen Lösung ist Kirche sofort bereit, wenn es die Menschen sind. Das ist neutestamentliche Gemeindekultur.<br>
      Mehr Taufen. Mehr Zeugnisse. Mehr Wachstum.</p>

      <h3>UNSERE MISSION</h3>
      <p>Zu Gottes Ehre träumen wir davon, ganz Europa mit 1000 mobilen Taufbecken zu fluten - denn die Art der Durchführung der Taufe kann eine komplette Veränderung für eine Gemeinde in Bezug auf Wachstum und Dynamik bedeuten.</p>

      <p><strong>Baptizo mobile Taufbecken - wir lieben Taufe!</strong><br>
      Alle Infos auf unserer Webseite: <a href="https://www.baptizo.church" target="_blank">www.baptizo.church</a><br>
      Kontakt: <a href="mailto:mail@baptizo.church">mail@baptizo.church</a> | Mobil: 016098687610</p>
    </div>

    <!-- Footer -->
    <footer class="baptizo-footer">
      <p>
        Powered by <a href="https://www.baptizo.church" target="_blank">Baptizo – Mobile Taufbecken</a>
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { MockDataProvider } from '../services/mock-data-provider';
import type { BaptizoGroup, BaptizoPerson, BaptizoEvent } from '../types/baptizo-types';
import BaptismChart from './BaptismChart.vue';
import PersonList from './PersonList.vue';
import EventList from './EventList.vue';

const provider = new MockDataProvider();
const loading = ref(true);
const groups = ref<BaptizoGroup[]>([]);
const events = ref<BaptizoEvent[]>([]);
const currentTab = ref('dashboard');
const chartTimeRange = ref(12);

const refreshData = async () => {
  loading.value = true;
  try {
    groups.value = await provider.getGroups();
    events.value = await provider.getEvents();
  } catch (e) {
    console.error('Failed to load data', e);
  } finally {
    loading.value = false;
  }
};

const generateReport = () => {
  console.log("PDF Export started");
  alert("PDF Report wird generiert (Simulation)");
};

const handleCreateEvent = async (event: Omit<BaptizoEvent, 'id'>) => {
  await provider.createEvent(event);
  await refreshData();
};

onMounted(() => {
  refreshData();
});

// Helper to check if a date is within the last N months
const isInRange = (dateStr: string | null | undefined, months: number) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - months);
  return date >= past && date <= now;
};

// KPIs (Dynamic based on chartTimeRange)
const kpiInterested = computed(() => {
  const interestedGroup = groups.value.find(g => g.id === 100);
  if (!interestedGroup) return 0;
  return interestedGroup.members.filter(p => isInRange(p.entry_date, chartTimeRange.value)).length;
});

const kpiSeminarGrads = computed(() => {
  const allMembers = groups.value.flatMap(g => g.members);
  return allMembers.filter(p => isInRange(p.fields.seminar_besucht_am, chartTimeRange.value)).length;
});

const kpiBaptisms = computed(() => {
  const baptizedGroup = groups.value.find(g => g.id === 101);
  if (!baptizedGroup) return 0;
  return baptizedGroup.members.filter(p => isInRange(p.fields.getauft_am, chartTimeRange.value)).length;
});

// Computed Data for Chart
const baptismData = computed(() => {
  const months = chartTimeRange.value;
  const labels: string[] = [];
  const dataInterested: number[] = [];
  const dataSeminar: number[] = [];
  const dataBaptism: number[] = [];

  const now = new Date();
  
  // Generate labels and data buckets for the last N months (Current month on right)
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
    labels.push(monthLabel);

    // Filter logic for this specific month
    const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    const isInMonth = (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date >= startOfMonth && date <= endOfMonth;
    };

    const allMembers = groups.value.flatMap(g => g.members);
    
    dataInterested.push(allMembers.filter(p => isInMonth(p.entry_date)).length);
    dataSeminar.push(allMembers.filter(p => isInMonth(p.fields.seminar_besucht_am)).length);
    dataBaptism.push(allMembers.filter(p => isInMonth(p.fields.getauft_am)).length);
  }

  return {
    labels: labels,
    datasets: [
      { 
        label: 'Interessenten',
        data: dataInterested,
        borderColor: '#7383B2',
        backgroundColor: '#7383B2',
        tension: 0.4
      },
      { 
        label: 'Seminar-Absolventen',
        data: dataSeminar,
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        tension: 0.4,
        hidden: true
      },
      { 
        label: 'Taufen',
        data: dataBaptism,
        borderColor: '#92C9D6',
        backgroundColor: '#92C9D6',
        tension: 0.4
      }
    ]
  };
});

// Widget Logic (4 Specific Categories)

// 1. Ausstehendes Seminar: Active in Pool (100), No Seminar
const pendingSeminar = computed(() => {
  const interestedGroup = groups.value.find(g => g.id === 100);
  if (!interestedGroup) return [];
  return interestedGroup.members
    .filter(p => p.status === 'active' && !p.fields.seminar_besucht_am)
    .map(p => ({ ...p, subtitle: `Interesse: ${p.entry_date || 'N/A'}` }));
});

// 2. Ausstehende Taufe: Active in Pool (100), Has Seminar, No Baptism (implicitly if in Pool)
const pendingBaptism = computed(() => {
  const interestedGroup = groups.value.find(g => g.id === 100);
  if (!interestedGroup) return [];
  return interestedGroup.members
    .filter(p => p.status === 'active' && p.fields.seminar_besucht_am)
    .map(p => ({ ...p, subtitle: `Seminar: ${p.fields.seminar_besucht_am}` }));
});

// 3. Offene Urkunden: In Baptized (101), No Certificate
const missingCertificates = computed(() => {
  const baptizedGroup = groups.value.find(g => g.id === 101);
  if (!baptizedGroup) return [];
  return baptizedGroup.members
    .filter(p => !p.fields.urkunde_ueberreicht)
    .map(p => ({ ...p, subtitle: `Taufe: ${p.fields.getauft_am}` }));
});

// 4. Fehlende Integration: In Baptized (101), No Integration
const missingIntegration = computed(() => {
  const baptizedGroup = groups.value.find(g => g.id === 101);
  if (!baptizedGroup) return [];
  return baptizedGroup.members
    .filter(p => !p.fields.in_gemeinde_integriert)
    .map(p => ({ ...p, subtitle: `Taufe: ${p.fields.getauft_am}` }));
});
</script>

<style scoped>
/* Colors */
:root {
  --baptizo-accent: #92C9D6;
  --baptizo-secondary: #7383B2;
  --baptizo-header-bg: #3C3C5B;
}

.baptizo-dashboard {
  padding: 0;
  color: var(--ct-text-color, #eee);
  background-color: var(--ct-bg-color, #1a1a1a);
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

.logo-area h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
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

/* Tabs */
.tabs {
  background-color: #2a2a2a;
  padding: 0 2rem;
  border-bottom: 1px solid #444;
  display: flex;
  gap: 2rem;
}

.tab-btn {
  background: none;
  border: none;
  color: #aaa;
  padding: 1rem 0;
  font-size: 1rem;
  cursor: pointer;
  border-bottom: 3px solid transparent;
}

.tab-btn.active {
  color: #92C9D6;
  border-bottom-color: #92C9D6;
  font-weight: bold;
}

/* Content */
.dashboard-content, .about-content, .events-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* KPI Cards */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: 4px solid #7383B2;
}

.kpi-label {
  font-size: 0.9rem;
  color: #aaa;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
}

.kpi-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #fff;
}

.kpi-value.warning {
  color: #f59e0b;
}

/* Intro Text */
.intro-text {
  margin-bottom: 3rem;
  line-height: 1.6;
  color: #ddd;
}

.intro-text .lead {
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #fff;
}

.intro-text ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.intro-text li {
  margin-bottom: 0.5rem;
}

.divider {
  border: 0;
  border-top: 1px solid #444;
  margin: 3rem 0;
}

/* Master Chart */
.master-chart-section {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-controls {
  display: flex;
  gap: 0.5rem;
}

.chart-btn {
  background: #444;
  border: none;
  color: #aaa;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.chart-btn.active {
  background: #92C9D6;
  color: #3C3C5B;
}

.chart-container-large {
  height: 300px;
}

/* Widgets */
.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.widget-card {
  background: #2a2a2a;
  padding: 1.5rem;
  border-radius: 8px;
  border-top: 4px solid #7383B2;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.widget-card h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #fff;
}

.count-badge {
  background: #444;
  color: #fff;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: bold;
}

.count-badge.warning {
  background: #f59e0b;
  color: #000;
}

.count-badge.info {
  background: #92C9D6;
  color: #3C3C5B;
}

/* About Tab */
.about-content h2 {
  color: #92C9D6;
  margin-bottom: 2rem;
}

.about-content h3 {
  color: #7383B2;
  margin-top: 2rem;
  margin-bottom: 1rem;
  text-transform: uppercase;
  font-size: 1rem;
  letter-spacing: 1px;
}

.about-content p, .about-content li {
  line-height: 1.6;
  color: #ddd;
}

.about-content a {
  color: #92C9D6;
  text-decoration: none;
}

/* Footer */
.baptizo-footer {
  margin-top: 4rem;
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.7;
  border-top: 1px solid #444;
  padding: 2rem;
  background: #1a1a1a;
}

.baptizo-footer a {
  color: #92C9D6;
  text-decoration: none;
  font-weight: bold;
}
</style>
