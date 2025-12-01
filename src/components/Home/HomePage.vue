<template>
  <div class="homepage-container">
    <!-- Fixed Tabs -->
    <div class="tabs" :class="productClass">
      <div
        :class="['tab-item', { active: home_tab === 'recent' }]"
        @click="setTab('recent')"
      >
        <i class="fa fa-clock"></i>
        <span>Recent</span>
      </div>
      <div
        :class="['tab-item', { active: home_tab === 'contacts' }]"
        @click="setTab('contacts')"
      >
        <i class="fa fa-user-friends"></i>
        <span>Contacts</span>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="scroll-area" ref="scrollArea">
      <RecentCalls v-if="home_tab === 'recent'" />
      <ContactList v-if="home_tab === 'contacts'" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import RecentCalls from "../Contact/RecentCalls.vue";
import ContactList from "../Contact/ContactList.vue";
import { useStore } from "vuex";
import { computed } from "vue";
const productClass = ref("freshdesk");
const store = useStore();
const home_tab = computed(() => store.getters.home_tab);
const locationType = ref("");
const scrollArea = ref(null);
function setTab(tab) {
   requestAnimationFrame(() => {
    if (scrollArea.value) {
      scrollArea.value.scrollTop = 0;
    }
  });
  store.commit("common/SET_HOME_TAB", tab);
}



onMounted(async () => {
 

  try {
    const client = window.client;
    const context = await client.instance.context();
    locationType.value = context.location;
    console.log("Current location:", locationType.value);
    const response12 = await window.client.data.get("currentProduct");
    console.log("Current product:", response12.currentProduct);

    // Normalize: freshchat + freshdesk → green
    if (response12.currentProduct === "freshsales") {
      productClass.value = "freshsales"; // orange
    } else {
      productClass.value = "freshdesk"; // green (for both freshdesk + freshchat)
    }
  } catch (error) {
    console.error("Error fetching context:", error);
  }
});

const domain = "krish870185881052282232"; // your Freshdesk domain
const freshchatURL =
  "https://krish-870185881052282232.myfreshworks.com/crm/messaging/a/1028153697987550/inbox?dev=true";

const goToFreshdesk = () => {
  if (locationType.value !== "left_nav_cti") {
    console.log("Opening Freshdesk in current tab");
    // Already in Freshdesk, open in background
    client.interface.trigger("click", {
      id: "ticket",
      value: "",
    });
  } else {
    // Coming from Freshchat or others — open in new tab
    console.log("Opening Freshdesk in new tab");
    window.open(`https://${domain}.freshdesk.com/a/tickets?dev=true`);
    //  try{
    //   await client.interface.trigger("openTab", {
    //     url: `https://${domain}.freshdesk.com/a/tickets`,
    //   });
    // }
    // catch(error) {
    //   console.error("Error opening Freshdesk:", error);
    // }
  }
};

const goToFreshchat = () => {
  if (locationType.value === "left_nav_cti") {
    console.log("Opening Freshchat in current tab");
    // window.open(freshchatURL, '_blank');
  } else {
    console.log("Opening Freshchat in new tab");
    window.open(freshchatURL); //
  }
};
</script>

<style scoped>
.homepage-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #fafafa;
  font-family: "Segoe UI", Roboto, sans-serif;
}

.tabs {
  display: flex;
  justify-content: center;
  background: #ffffff;
  padding: 12px 8px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0; /* Prevent shrinking */
  position: sticky;
  top: 0;
  z-index: 20;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-size: 14px;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  color: #555;
  font-weight: 500;
}

.tab-item.active {
  color: #fff;
  font-weight: 600;
}
.tabs.freshdesk {
  --activeColor: #28b76b; /* green */
  --hoverColor: #7eeeba;
}
.tabs.freshchat {
  --activeColor: #28b76b; /* green */
  --hoverColor: #7eeeba;
}
.tabs.freshsales {
  --activeColor: #ff7900; /* orange  */
  --hoverColor: #ffb27a;
}
.tab-item.active {
  background-color: var(--activeColor);
}

.tab-item:hover {
  background-color: var(--hoverColor);
}
  


.scroll-area {
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px 12px;
  position: relative; /* Needed for fade overlay positioning */
  scroll-behavior: smooth;
}

/* Fade effect */
.scroll-area::before,
.scroll-area::after {
  content: "";
  position: sticky;
  left: 0;
  right: 0;
  height: 20px;
  pointer-events: none;
  z-index: 10;
}

.scroll-area::before {
  top: 0;
  background: linear-gradient(to bottom, #fafafa, rgba(250, 250, 250, 0));
}

.scroll-area::after {
  bottom: 0;
  background: linear-gradient(to top, #fafafa, rgba(250, 250, 250, 0));
}

/* Nice scrollbar */
.scroll-area::-webkit-scrollbar {
  width: 6px;
}

.scroll-area::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 4px;
}

.scroll-area::-webkit-scrollbar-track {
  background: transparent;
}
</style>
