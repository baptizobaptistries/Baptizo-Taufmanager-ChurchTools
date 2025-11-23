<template>
  <div class="baptizo-dashboard">
    <!-- Header -->
    <header class="dashboard-header">
      <div class="logo-area">
        <!-- Logo Placeholder -->
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="8" fill="#92C9D6"/>
          <path d="M10 20L18 28L30 12" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h1>Baptizo Taufmanager</h1>
      </div>
      <div class="actions">
        <select class="location-filter">
          <option>Gesamtkirche</option>
          <option>Campus A</option>
          <option>Campus B</option>
        </select>
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
      <!-- Intro Text -->
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

      <!-- Master Chart -->
      <section class="master-chart-section">
        <div class="chart-header">
          <h3>Tauf-Entwicklung</h3>
          <div class="chart-controls">
            <button class="chart-btn active">12 Mon</button>
            <button class="chart-btn">24 Mon</button>
            <button class="chart-btn">36 Mon</button>
          </div>
        </div>
        <div class="chart-container-large">
          <BaptismChart :data="baptismData" />
        </div>
      </section>

      <!-- Widgets Grid -->
      <section class="widgets-grid">
        <div class="widget-card">
          <h3>Seminar-Hänger</h3>
          <PersonList :persons="seminarHaenger" type="warning" />
        </div>
        <div class="widget-card">
          <h3>Urkunden-Check</h3>
          <PersonList :persons="missingCertificates" type="info" />
        </div>
        <div class="widget-card">
          <h3>Integrations-Lücke</h3>
          <PersonList :persons="integrationGap" type="info" />
        </div>
        <div class="widget-card">
          <h3>Dauerschwimmer</h3>
          <PersonList :persons="longTermSwimmers" type="warning" />
        </div>
      </section>
    </div>

    <!-- About Content -->
    <div v-else-if="currentTab === 'about'" class="about-content">
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
import type { BaptizoGroup, BaptizoPerson } from '../types/baptizo-types';
import BaptismChart from './BaptismChart.vue';
import PersonList from './PersonList.vue';

const provider = new MockDataProvider();
const loading = ref(true);
const groups = ref<BaptizoGroup[]>([]);
const currentTab = ref('dashboard');

const refreshData = async () => {
  loading.value = true;
  try {
    groups.value = await provider.getGroups();
  } catch (e) {
    console.error('Failed to load data', e);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  refreshData();
});

// Computed Data
const baptismData = computed(() => {
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      { 
        label: 'Taufen',
        data: [1, 2, 1, 3, 2, 4, 2, 5, 3, 4, 6, 5],
        borderColor: '#92C9D6',
        backgroundColor: '#92C9D6',
        tension: 0.4
      },
      { 
        label: 'Interessenten',
        data: [3, 4, 2, 5, 4, 6, 5, 7, 5, 6, 8, 7],
        borderColor: '#7383B2',
        backgroundColor: '#7383B2',
        tension: 0.4
      }
    ]
  };
});

// Widget Logic
const seminarHaenger = computed(() => {
  const interestedGroup = groups.value.find(g => g.id === 100);
  if (!interestedGroup) return [];
  // Logic: Active, Has Seminar, but still in Interested group
  return interestedGroup.members.filter(p => p.fields.seminar_besucht_am && p.status === 'active');
});

const missingCertificates = computed(() => {
  const baptizedGroup = groups.value.find(g => g.id === 101);
  if (!baptizedGroup) return [];
  return baptizedGroup.members.filter(p => !p.fields.urkunde_ueberreicht);
});

const integrationGap = computed(() => {
  const baptizedGroup = groups.value.find(g => g.id === 101);
  if (!baptizedGroup) return [];
  return baptizedGroup.members.filter(p => !p.fields.in_gemeinde_integriert);
});

const longTermSwimmers = computed(() => {
  const interestedGroup = groups.value.find(g => g.id === 100);
  if (!interestedGroup) return [];
  // Logic: No Seminar, but in group (simulated "long term")
  return interestedGroup.members.filter(p => !p.fields.seminar_besucht_am && p.status === 'active');
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
  background: rgba(255,255,255,0.1);
  color: white;
  border: 1px solid rgba(255,255,255,0.2);
}

.ct-button--primary {
  background-color: #92C9D6;
  color: #3C3C5B;
  border: none;
  font-weight: bold;
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
.dashboard-content, .about-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
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

.widget-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: #fff;
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
