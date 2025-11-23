<template>
  <div class="baptizo-dashboard">
    <header class="dashboard-header">
      <h1>Baptizo Taufmanager</h1>
      <div class="actions">
        <button @click="refreshData" class="ct-button ct-button--primary">
          <span class="icon">↻</span> Refresh
        </button>
      </div>
    </header>

    <div v-if="loading" class="loading-state">
      <p>Lade Daten...</p>
    </div>

    <div v-else class="dashboard-content">
      <!-- Metrics Section -->
      <section class="metrics-grid">
        <div class="metric-card">
          <h3>Tauf-Kurve (12 Monate)</h3>
          <div class="chart-container">
            <BaptismChart :data="baptismData" />
          </div>
        </div>
        <div class="metric-card">
          <h3>Trichter (Funnel)</h3>
          <div class="chart-container">
            <FunnelChart :data="funnelData" />
          </div>
        </div>
      </section>

      <!-- Lists Section -->
      <section class="lists-grid">
        <div class="list-card">
          <h3>⚠️ Drop-Offs (Seminar aber keine Taufe > 3 Mon.)</h3>
          <PersonList :persons="dropOffs" type="warning" />
        </div>
        <div class="list-card">
          <h3>📄 Fehlende Urkunden</h3>
          <PersonList :persons="missingCertificates" type="info" />
        </div>
      </section>
    </div>

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
import FunnelChart from './FunnelChart.vue';
import PersonList from './PersonList.vue';

const provider = new MockDataProvider();
const loading = ref(true);
const groups = ref<BaptizoGroup[]>([]);

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

// Computed Data for Charts & Lists
const baptismData = computed(() => {
  // Mock logic for chart data based on groups
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{ data: [1, 2, 1, 3, 2, 4] }]
  };
});

const funnelData = computed(() => {
  const interested = groups.value.find(g => g.id === 100)?.members.length || 0;
  const baptized = groups.value.find(g => g.id === 101)?.members.length || 0;
  return {
    labels: ['Interessenten', 'Getaufte'],
    datasets: [{ data: [interested, baptized] }]
  };
});

const dropOffs = computed(() => {
  const interestedGroup = groups.value.find(g => g.id === 100);
  if (!interestedGroup) return [];
  // Logic: Active, Has Seminar, but still in Interested group (simplified for MVP)
  return interestedGroup.members.filter(p => p.fields.seminar_besucht_am && p.status === 'active');
});

const missingCertificates = computed(() => {
  const baptizedGroup = groups.value.find(g => g.id === 101);
  if (!baptizedGroup) return [];
  return baptizedGroup.members.filter(p => !p.fields.urkunde_ueberreicht);
});
</script>

<style scoped>
.baptizo-dashboard {
  padding: 2rem;
  color: var(--ct-text-color, #333);
  background-color: var(--ct-bg-color, #fff);
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.metrics-grid, .lists-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.metric-card, .list-card {
  background: var(--ct-card-bg, #f5f5f5);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.baptizo-footer {
  margin-top: 4rem;
  text-align: center;
  font-size: 0.9rem;
  opacity: 0.7;
  border-top: 1px solid var(--ct-border-color, #ddd);
  padding-top: 1rem;
}

.baptizo-footer a {
  color: inherit;
  text-decoration: none;
  font-weight: bold;
}

/* Dark Mode Support via ChurchTools Variables */
@media (prefers-color-scheme: dark) {
  .baptizo-dashboard {
    --ct-text-color: #eee;
    --ct-bg-color: #1a1a1a;
    --ct-card-bg: #2a2a2a;
    --ct-border-color: #444;
  }
}
</style>
