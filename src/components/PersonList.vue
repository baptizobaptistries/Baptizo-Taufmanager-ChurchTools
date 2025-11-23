<template>
  <div class="person-list">
    <div v-if="persons.length === 0" class="empty-state">
      Keine Einträge.
    </div>
    <ul v-else>
      <li v-for="person in persons" :key="person.id" class="person-item">
        <img :src="person.imageUrl" alt="Avatar" class="avatar" />
        <div class="details">
          <span class="name">{{ person.firstName }} {{ person.lastName }}</span>
          <span class="status-badge" :class="type">{{ getStatusText(person) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { BaptizoPerson } from '../types/baptizo-types';

const props = defineProps<{
  persons: (BaptizoPerson & { subtitle?: string })[],
  type: 'warning' | 'info'
}>();

const getStatusText = (p: BaptizoPerson & { subtitle?: string }) => {
  if (p.subtitle) return p.subtitle;
  if (props.type === 'warning') return 'Aktion erforderlich';
  if (props.type === 'info') return 'Info';
  return '';
};
</script>

<style scoped>
.person-list {
  max-height: 300px;
  overflow-y: auto;
}
.person-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--ct-border-color, #eee);
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 1rem;
}
.details {
  display: flex;
  flex-direction: column;
}
.name {
  font-weight: bold;
}
.status-badge {
  font-size: 0.8rem;
  color: #666;
}
.status-badge.warning { color: #d97706; }
.status-badge.info { color: #dc2626; }
</style>
