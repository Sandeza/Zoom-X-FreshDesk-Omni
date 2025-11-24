<template>
  <div class="fallback">
    <h2>This app is already open in another tab</h2>
    <p>Please close the other tab and refresh this page.</p>
  </div>
</template>

<style>
.fallback {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-family: sans-serif;
  text-align: center;
  color: #333;
  background: #f0f9ff;
}

h2 {
  margin-bottom: 10px;
  color: #0d63c6;
}

p {
  opacity: 0.8;
}
</style>
