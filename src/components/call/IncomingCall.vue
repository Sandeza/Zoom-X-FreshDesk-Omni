<template>
<transition name="fade">
<div
 
      class="incoming-call-banner"
 
      v-if="showCall"
 
      @click="acceptAndRedirect"
 
      :style="{ background: gradientColor }"
>
<div class="avatar">{{ avatarLetter }}</div>
<div class="caller-info">
<span class="name">{{ callee_name }}</span>
<span class="number">{{ callee_number }}</span>
</div>
<font-awesome-icon icon="phone" class="ring-icon" />
</div>
</transition>
</template>
 
<script>
 
export default {
 
  name: "IncomingCallBanner",
 
  data() {
    
    const call = this.$store.getters.current_call || {};
    console.log("IncomingCallBanner call data:", call);
    const data=this.$store.getters.contact_name;
    console.log("IncomingCallBanner contact data:", data);
    const plusRemovedNumber =  call.caller.phoneNumber.replace("+", "")
      
    return {
 
      callee_name: data || plusRemovedNumber ||"Unknown",
 
      callee_number: call.caller.phoneNumber || "",
 
      zoomUrl: call.zoomUrl || "",
 
      showCall: true,
 
      hue: 200,
 
      gradientColor: "",
 
    };
 
  },
 
  computed: {
 
    avatarLetter() {
 
      return this.callee_name.charAt(0).toUpperCase();
 
    },
 
  },
 
  mounted() {
 
    this.vibrate();
 
    this.startGlitterAnimation();
 
  },
 
  methods: {
 
    vibrate() {
 
      if ("vibrate" in navigator) {
 
        navigator.vibrate([600, 300, 600, 300, 600]);
 
      }
 
    },
 
    startGlitterAnimation() {
 
      let direction = 1;
 
      const animate = () => {
 
        this.hue += direction * 0.7;
 
        if (this.hue >= 235 || this.hue <= 185) direction *= -1;
 
        this.gradientColor = `linear-gradient(135deg, #f0f9ff, #cfeaff)`;;
 
        requestAnimationFrame(animate);
 
      };
 
      animate();
 
    },
 
    acceptAndRedirect() {
 
      this.$emit("accept");
 
      if (this.zoomUrl) {
 
        window.location.href = this.zoomUrl;
 
      }
 
    },
 
  },
 
};
</script>
 
<style scoped>
 
.incoming-call-banner {
 
  position: fixed;
 
  top: 12px;
 
  left: 50%;
 
  transform: translateX(-50%);
 
  width: 260px;
 
  height: 64px;
 
  color: white;
 
  padding: 0 12px;
 
  display: flex;
 
  align-items: center;
 
  gap: 10px;
 
  font-family: "Segoe UI", sans-serif;
 
  font-weight: 600;
 
  z-index: 10000;
 
  cursor: pointer;
 
  box-shadow: 0 3px 12px rgba(0,0,0,0.18);
 
  border-radius: 14px;
 
  overflow: hidden;
 
  background-size: 200% 200%;
 
  animation: shine 2.8s linear infinite;
 
}
 
@keyframes shine {
 
  0% { background-position: 0% 50%; }
 
  100% { background-position: 200% 50%; }
 
}
 
.avatar {
 
  width: 38px;
 
  height: 38px;
 
  background: rgba(5, 5, 5, 0.25);
  color: rgba(0, 0, 0, 0.9);
  border-radius: 10px;
 
  display: flex;
 
  align-items: center;
 
  justify-content: center;
 
  font-size: 16px;
 
  font-weight: 700;
 
  flex-shrink: 0;
 
}
 
.caller-info {
   color: rgba(0, 0, 0, 0.9);
  flex-grow: 1;
 
  display: flex;
 
  flex-direction: column;
 
  overflow: hidden;
 
}
 
.name {
   color: rgba(0, 0, 0, 0.9);
  font-size: 15px;
 
  white-space: nowrap;
 
  overflow: hidden;
 
  text-overflow: ellipsis;
 
}
 
.number {
   color: rgba(0, 0, 0, 0.9);
  font-size: 12px;
 
  opacity: 0.9;
 
  white-space: nowrap;
 
  overflow: hidden;
 
  text-overflow: ellipsis;
 
}
 
.ring-icon {
  color: rgba(0, 0, 0, 0.9);
  font-size: 18px;
 
  animation: ring 1.3s infinite;
 
}
 
@keyframes ring {
 
  0%, 100% { transform: rotate(0deg); }
 
  15%, 45%, 75% { transform: rotate(-14deg); }
 
  30%, 60%, 90% { transform: rotate(14deg); }
 
}
 
.fade-enter-active {
 
  animation: slideDown 0.3s ease-out;
 
}
 
@keyframes slideDown {
 
  from { transform: translateX(-50%) translateY(-80px); opacity: 0; }
 
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
 
}
</style>
 
 