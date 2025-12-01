<template>
  <div class="wrap">
    <div class="box">
      <h3>Another tab is active</h3>

      <p class="msg">
        This app is already open in another browser tab.<br />
        If you want, you can switch control to this tab.
      </p>

      <button @click="forceTakeover" class="btn">
        Make this tab active
      </button>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    forceTakeover() {
      const token = crypto.randomUUID();

      localStorage.setItem(
        "zoom_tab_leader",
        JSON.stringify({
          token,
          lastHeartbeat: 0
        })
      );

      window.__forcedLeader = true;
      window.location.reload();
    }
  }
};
</script>

<style scoped>
.wrap {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #fafafa;
  padding: 15px;
}

.box {
  background: #fff;
  padding: 22px 25px;
  width: 300px;
  border-radius: 10px;
  border: 1px solid #dcdcdc;
}

h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.msg {
  font-size: 14px;
  color: #555;
  line-height: 1.4;
  margin-bottom: 18px;
}

.btn {
  background: #0a7cff;
  color: #fff;
  border: none;
  padding: 9px 14px;
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}

.btn:hover {
  background: #0568d1;
}
</style>
