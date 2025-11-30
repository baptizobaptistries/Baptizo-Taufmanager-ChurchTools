<template>
  <Line :data="chartData" :options="chartOptions" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const props = defineProps<{
  data: { 
    labels: string[], 
    datasets: { 
      data: number[],
      borderColor?: string,
      backgroundColor?: string,
      solidColor?: string
    }[] 
  }
}>();

const chartData = computed(() => ({
  labels: props.data.labels,
  datasets: props.data.datasets.map(ds => ({
    ...ds,
    pointStyle: 'rectRounded',
    pointRadius: 6,
    pointHoverRadius: 8,
    pointBackgroundColor: 'transparent',
    pointBorderColor: ds.borderColor,
    pointBorderWidth: 2,
    pointHoverBorderWidth: 2,
    pointHoverBackgroundColor: 'transparent',
    pointHoverBorderColor: ds.borderColor
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
      display: false
    },
    tooltip: {
      backgroundColor: '#2a2a2a',
      titleColor: '#ffffff',
      bodyColor: '#cccccc',
      borderColor: '#444444',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      usePointStyle: true,
      boxPadding: 6,
      callbacks: {
        title: (tooltipItems: any[]) => {
          // Matches "März 25" or "März 2025" and ensures "März '25"
          return tooltipItems[0].label.replace(/(\s)(\d{2,4})$/, (_match: string, space: string, year: string) => {
            return space + "'" + year.slice(-2);
          });
        },
        labelColor: (context: any) => {
          const color = context.dataset.solidColor || context.dataset.borderColor;
          return {
            borderColor: color,
            backgroundColor: color,
            borderWidth: 0,
            borderRadius: 2,
          };
        }
      }
    }
  }
};
</script>
