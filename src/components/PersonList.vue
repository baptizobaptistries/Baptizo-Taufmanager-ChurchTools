<template>
  <div class="person-list">
    <div v-if="persons.length === 0" class="empty-state">
      Keine Einträge.
    </div>
    <ul v-else>
      <li 
        v-for="person in persons" 
        :key="person.id" 
        class="person-item" 
        :class="{ clickable: clickable }"
        @click="handleClick(person)"
      >
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

const props = withDefaults(defineProps<{
  persons: (BaptizoPerson & { subtitle?: string })[],
  type?: 'warning' | 'info' | 'default',
  clickable?: boolean
}>(), {
  type: 'default',
  clickable: true
});

const emit = defineEmits(['click']);

const getStatusText = (p: BaptizoPerson & { subtitle?: string }) => {
  if (p.subtitle) return p.subtitle;
  if (props.type === 'warning') return 'Aktion erforderlich';
  if (props.type === 'info') return 'Info';
  return '';
};

const handleClick = (person: BaptizoPerson) => {
  if (props.clickable) {
    emit('click', person);
  }
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  transition: background-color 0.2s;
}
.person-item.clickable {
  cursor: pointer;
}
.person-item.clickable:hover {
  background-color: rgba(255, 255, 255, 0.05);
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
