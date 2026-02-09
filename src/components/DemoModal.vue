<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content demo-modal">
      <div class="modal-body">
        <div class="demo-icon-centered">
          <!-- Elegant Minimalist Coffee Cup SVG (Stroke 0.8) -->
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
            <line x1="6" y1="1" x2="6" y2="4"></line>
            <line x1="10" y1="1" x2="10" y2="4"></line>
            <line x1="14" y1="1" x2="14" y2="4"></line>
          </svg>
        </div>
        
        <h2 class="demo-title-centered">Feature in der Konferenz-Demo deaktiviert oder noch in Entwicklung.</h2>
      </div>
      
      <div class="modal-footer-centered">
        <button class="ct-button ct-button--primary" @click="$emit('close')">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000000;
}

.modal-content.demo-modal {
  background: #2a2a2a;
  padding: 1.5rem 2rem;
  border-radius: 8px;
  width: 380px;
  max-width: 90%;
  border: 1px solid #444;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal-body {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 1.5rem;
}

.demo-icon-centered {
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
}

.demo-title-centered {
  margin: 0;
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 400;
  text-align: center;
}

.modal-footer-centered {
  width: 100%;
  display: flex;
  justify-content: center;
}

.ct-button--primary {
  min-width: 100px;
  background: #92C9D6;
  color: #3C3C5B;
  border: none;
  padding: 0.6rem 1.5rem;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.ct-button--primary:hover {
  background: #a8d5e0;
  transform: translateY(-1px);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
