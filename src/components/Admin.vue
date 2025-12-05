<template>
  <div class="admin-container">
    <div class="admin-empty">
      <h2>Konfiguration erfolgt über das Dashboard</h2>
      <p>Bitte nutze den Reiter "Einstellungen" im Dashboard für alle Konfigurationen.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Empty - configuration now handled in Dashboard Settings tab
</script>

<style scoped>
.admin-container {
  background-color: #1E1E2E;
  min-height: 100vh;
  color: #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.admin-empty {
  text-align: center;
  max-width: 600px;
  padding: 3rem;
}

.admin-empty h2 {
  color: #92C9D6;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.admin-empty p {
  color: #aaa;
  font-size: 1rem;
  line-height: 1.6;
}
</style>
