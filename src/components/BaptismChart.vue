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
  datasets: props.data.datasets.map(ds => ({
    ...ds,
    pointRadius: 4,
    pointHoverRadius: 6
  }))
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      ticks: {
        stepSize: 1
      },
      beginAtZero: true
    }
  },
  plugins: {
    legend: {
      position: 'bottom' as const
    }
  }
};
</script>
