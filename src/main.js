

import { createApp } from 'vue';
import App from './App.vue';
import store from './store';

import BootstrapVueNext from 'bootstrap-vue-3';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue-3/dist/bootstrap-vue-3.css';

import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faUserSecret,
  faPhone,
  faMobile,
  faUser,
  faArrowUp,
  faArrowDown,
  
   
  faLevelUpAlt,
  faUserPlus,
  faTicket,
  faCirclePlus,
  faAddressBook,
  faInbox,
  faListUl,
  faEnvelope,
  
  
  faPhoneVolume,
  faPhoneSlash,
} from "@fortawesome/free-solid-svg-icons";

import { applyPolyfills, defineCustomElements } from '@freshworks/crayons/loader';

library.add(
  faUserSecret,
  faPhone,
  faMobile,
  faUser,
  faArrowUp,
  faArrowDown,
  faLevelUpAlt,
  faUserPlus,
  faTicket,
  faCirclePlus,
  faAddressBook,
  faInbox,
  faListUl,
  faEnvelope,
  
  faPhoneVolume,
  faPhoneSlash
);
const LEADER_KEY = "zoom_tab_leader";
const HEARTBEAT_TIMEOUT = 3000;
applyPolyfills().then(() => defineCustomElements());

window.frsh_init().then(function (client) {
  window.client = client;
  window.client.instance.resize({ height: "650px" });
 

  const app = createApp(App);
   app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('fw-')
  app.use(store);
  app.use(BootstrapVueNext);
  app.component('font-awesome-icon', FontAwesomeIcon);
  console.log('Vue app initialized with Freshworks client:', window.client);
 
if (tryBecomeLeader()) {
  console.log("🟢 This tab is the LEADER. Mounting app...");
  startLeaderHeartbeat();
   app.mount('#app');
} else {
  console.log("🔴 This tab is NOT the leader. App will not mount.");
}
  
});
function tryBecomeLeader() {
  const now = Date.now();
  const heartbeat = Number(localStorage.getItem(LEADER_KEY));

  // If leader is alive → cannot take lock
  if (heartbeat && now - heartbeat < HEARTBEAT_TIMEOUT) {
    return false;
  }

  // Take leadership
  localStorage.setItem(LEADER_KEY, now.toString());
  return true;
}
function startLeaderHeartbeat() {
  setInterval(() => {
    localStorage.setItem(LEADER_KEY, Date.now().toString());
  }, HEARTBEAT_TIMEOUT / 2);
}

