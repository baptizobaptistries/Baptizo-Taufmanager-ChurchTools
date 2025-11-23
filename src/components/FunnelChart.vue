<template>
  <Bar :data="chartData" :options="chartOptions" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps<{
  data: { labels: string[], datasets: { data: number[] }[] }
}>();

const chartData = computed(() => ({
  labels: props.data.labels,
  datasets: [{
    label: 'Anzahl',
    backgroundColor: ['#f59e0b', '#10b981'],
    data: props.data.datasets[0].data
  }]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const
};
</script>
