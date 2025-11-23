<template>
  <Line :data="chartData" :options="chartOptions" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const props = defineProps<{
  data: { labels: string[], datasets: { data: number[] }[] }
}>();

const chartData = computed(() => ({
  labels: props.data.labels,
  datasets: [{
    label: 'Taufen',
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    data: props.data.datasets[0].data
  }]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false
};
</script>
