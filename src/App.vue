<template>
  <div id="app">
  <!-- Simulation Buttons -->
     <!-- <div class="sim-buttons">
      <button @click="simulateIncomingCall">RINGING</button>
      <button @click="CONNECTED">CONNECTED</button>
      <button @click="VOICEMAIL">VOICEMAIL</button>
      <button @click="TRANSFER">TRANSFER</button>
      <button @click="RECORDING">RECORDING</button>
      <button @click="ENDED">ENDED</button>
      <button @click="CONNECTED">OUTBOUND CONNECTED</button>
      <button @click="MISSED">MISSED ENDED</button>
      <button @click="backhome()">notes</button>
      <button @click="CALLLOG">call log</button>
    </div>  -->
    <HomePage v-if="page_route === 'home'" />
    <ListTickets v-if="page_route == 'call'"></ListTickets>
    <CreateContact v-if="page_route == 'new-contact'"></CreateContact>
    <IncomingCall v-if="page_route === 'incoming_call'" />
    <!-- Always render IncomingCall as a floating widget -->
    <IncomingCall
      v-if="showIncomingCall"
      @decline="hideCallPopup"
      @accept="goToCallPage"
    />
      <CrmConnect v-if="page_route === 'crmcall'" />
    <CreateTicket v-if="page_route === 'ticket'" />
    <AddNotes v-if="page_route === 'note'" />
  </div>
</template>

<script>
import { mapGetters, computed, mapMutations } from "vuex";
import HomePage from "./components/Home/HomePage.vue";
import ListTickets from "./components/Tickets/ListTickets.vue";
import { ref } from "vue";
import IncomingCall from "./components/call/IncomingCall.vue";
import CreateContact from "./components/Contact/CreateContact.vue";
import CreateTicket from "./components/Tickets/createTicket.vue";
import AddNotes from "./components/Notes/AddNotes.vue";
import {
  addNotes,
  handleRingingEvent,
  onCallEndedFreshChat,
  handleVoicemailEvent,
} from "./apis/handler.js";
import CrmConnect from "./components/CrmConnect/CrmConnect.vue";
// import  { handleRingingEvent }  from "./handler.js";
// ------- Unified Zoom Call Event Dedupe Engine -------
// Place this at the top of mounted() or in a module imported
// before registering the window message listener.
const callIdValue = "100000000013citiigjlkjlokithorodin12345";
const callIdValue1 = "100000000013_1";
const direction = "inbound";
///// CONFIG
const RESERVE_TTL_MS = 5000;     // how long a reservation lives (auto-release)

///// STATE
const CALL_STATE = new Map(); // callId -> { ended: bool, voicemail: bool, recording: bool, connected: bool, ringing: bool }
const connectedReservations = new Set();
const recordingReservations = new Set();
const voicemailReservations = new Set();
const endedReservations = new Set();
const calllogReservations = new Set();
let callLogProcessingLock = false; // mutex for call log processing

///// BroadcastChannel (single handler)
const bc = new BroadcastChannel("zoom-call-dedupe-channel");
function handleZoomEventOnce(event, eventName, handlerFn) {
  const callId = event?.data?.data?.callId;
  if (!callId) return;

  const lockKey = `zoom-event-${eventName}-${callId}`;

  // 1️⃣ Leader tab dedupe (across windows)
  if (!acquireCrossTabLock(lockKey, 3000)) {
    console.log(`⛔ SKIPPED (leader tab handled already): ${eventName}`, callId);
    return;
  }

  // 2️⃣ Local dedupe (within same tab)
  const s = ensureCallState(callId);
  if (s[eventName]) {
    console.log(`⛔ SKIPPED (same tab duplicate): ${eventName}`, callId);
    return;
  }

  // Lock local state
  s[eventName] = true;

  console.log(`✅ Processing ${eventName} once`, callId);

  try {
    handlerFn(event);
  } catch (err) {
    console.error(`❌ Error in ${eventName}:`, err);
  }
}

bc.onmessage = (msg) => {
  if (!msg?.data) return;
  const { type, callId } = msg.data;

  switch (type) {
    case "reserve-connected":
      if (callId) connectedReservations.add(callId);
      break;
    case "release-connected":
      if (callId) connectedReservations.delete(callId);
      break;

    case "reserve-recording":
      if (callId) recordingReservations.add(callId);
      break;
    case "release-recording":
      if (callId) recordingReservations.delete(callId);
      break;

    case "reserve-voicemail":
      if (callId) voicemailReservations.add(callId);
      break;
    case "release-voicemail":
      if (callId) voicemailReservations.delete(callId);
      break;

    case "reserve-ended":
      if (callId) endedReservations.add(callId);
      break;
    case "release-ended":
      if (callId) endedReservations.delete(callId);
      break;

    default:
      // ignore unrelated messages
      break;
  }
};
function acquireCrossTabLock(key, ttl = 1500) {
  const now = Date.now();
  const lock = localStorage.getItem(key);

  if (lock) {
    const { timestamp } = JSON.parse(lock);
    if (now - timestamp < ttl) {
      return false; // someone else owns lock
    }
  }

  localStorage.setItem(
    key,
    JSON.stringify({ timestamp: now })
  );

  return true;
}

function releaseCrossTabLock(key) {
  localStorage.removeItem(key);
}
function BOOT_RECORDING_GUARD_FIRED() {
  return BOOT_RECORDING_GUARD_FIRED._fired === true;
}
function mark_boot_recording_guard() {
  // mark fired and set a short TTL so only the very first burst is skipped
  BOOT_RECORDING_GUARD_FIRED._fired = true;
  setTimeout(() => {
    BOOT_RECORDING_GUARD_FIRED._fired = false;
  }, 2000);
}
bc.onmessage = (msg) => {
  const { type, callId } = msg.data || {};

  if (type === "reserve-calllog") {
    calllogReservations.add(callId);
  }

  if (type === "release-calllog") {
    calllogReservations.delete(callId);
  }
};

///// Helpers
function normalizeCallId(event) {
  // Zoom event shapes vary; check multiple places
  if (!event) return null;
  return (
    event?.data?.callId ||
    event?.data?.data?.callId ||
    event?.data?.data?.sessionId ||
    event?.data?.sessionId ||
    null
  );
}

function ensureCallState(callId) {
  if (!callId) return null;
  if (!CALL_STATE.has(callId)) {
    CALL_STATE.set(callId, {
      ended: false,
      voicemail: false,
      recording: false,
      connected: false,
      ringing: false,
    });
  }
  return CALL_STATE.get(callId);
}

function reserveOnce(setRef, callId, reserveType) {
  // returns true if we successfully reserved (meaning we should process)
  // returns false if reservation already exists (skip processing)
  if (!callId) return true; // when callId missing, fall back to time-based dedupe elsewhere
  if (setRef.has(callId)) return false;
  setRef.add(callId);
  bc.postMessage({ type: `reserve-${reserveType}`, callId });

  // auto-release after TTL
  setTimeout(() => {
    setRef.delete(callId);
    bc.postMessage({ type: `release-${reserveType}`, callId });
  }, RESERVE_TTL_MS);

  return true;
}

///// Per-event small time guards (fallback when callId missing)
const lastTimes = {
  recording: 0,
  ringing: 0,
  voicemail: 0,
  ended: 0,
};

///// Public unified processor (call from your window.message handler)
async function processZoomEvent(client, rawEvent) {
  // Guard non-Zoom messages
  const type = rawEvent?.data?.type;
  if (!type || !type.startsWith("zp-")) return;

  // Normalize callId
  const callId = normalizeCallId(rawEvent);
  // For debugging:
  // console.log("Zoom event:", type, "callId:", callId, rawEvent);

  // Simple switch; each case uses the same pattern:
  // 1) ensure state
  // 2) local state-machine dedupe
  // 3) cross-tab reservation (reserveOnce)
  // 4) process once
  // 5) mark state

}
export default {
  components: {
    HomePage,
    ListTickets,
    IncomingCall,
    CreateContact,
    CreateTicket,
    AddNotes,
    CrmConnect,
  },
  data() {
    return {
      showIncomingCall: false,
    };
  },
  computed: {
    ...mapGetters(["page_route", "call_logs", "recording_url"]),
  },

  methods: {
    ...mapMutations(["setContactList"]),
  async simulateIncomingCall() {
      // // const data=  await window.client.request.invoke("getAccountId",{});
      // // const accountDetails=JSON.parse(data.message);
      // // console.log("Account ID:", accountDetails.account_id);
      //  this.$store.dispatch("common/getAccountId");
      window.postMessage({
        type: "zp-call-ringing-event",
        data: {
          callId: callIdValue,
          callee: {
            extensionId: "xA8mgzDBTX2UePf-8-n19w",
            extensionNumber: "800",
            extensionType: "user",
            name: "hulk",
            phoneNumber: "123456",
          },
          caller: {
           name: "john doe",
            number: "+89293829",
            numberType: 2,
          },
          dateTime: "2025-08-1T09:58:51Z",
          direction: direction,
          enableAutoLog: false,
        },
      });
    },
    CONNECTED() {
      window.postMessage({
        type: "zp-call-connected-event",
        data: {
          callId: callIdValue,
          callee: {
            extensionId: "xA8mgzDBTX2UePf-8-n19w",
            extensionNumber: "800",
            extensionType: "user",
            name: "hulk",
            phoneNumber: "123456",
          },
          caller: {
           name: "john doe",
            number: "+89293829",
            numberType: 2,
          },
          dateTime: "2025-08-1T09:58:51Z",
          direction: direction,
          enableAutoLog: false,
        },
      });
    },
    RECORDING() {
      window.postMessage({
        type: "zp-call-recording-completed-event",
        data: {
          callId: callIdValue,
          callee: {
            extensionId: "xA8mgzDBTX2UePf-8-n19w",
            extensionNumber: "800",
            extensionType: "user",
            name: "hulk",
            phoneNumber: "123456",
          },
          caller: {
         name: "800 Service",
            number: "+654321",
            numberType: 2,
          },
          dateTime: "2025-08-1T09:58:51Z",
          direction: direction,
          recordingUrl:
            "https://applications.zoom.us/integration/phone/embeddablephone/audio/play/0/bbf5c62b-0953-40e4-bbc9-6d565200a7e7",
          enableAutoLog: false,
        },
      });
    },
    MISSED() {
      window.postMessage({
        type: "zp-call-ended-event",
        data: {
          callId: callIdValue,
          callee: {
            extensionId: "xA8mgzDBTX2UePf-8-n19w",
            extensionNumber: "800",
            extensionType: "user",
            name: "hulk",
            phoneNumber: "123456",
          },
          caller: {
            name: "800 Service",
            number: "+654321",
            numberType: 2,
          },
          dateTime: "2025-08-1T09:58:51Z",
          direction: direction,
          enableAutoLog: false,
          result: "missed",
        },
      });
    },
    ENDED() {
      window.postMessage({
        type: "zp-call-ended-event",
        data: {
          callId: callIdValue,
         callee: {
            extensionId: "xA8mgzDBTX2UePf-8-n19w",
            extensionNumber: "800",
            extensionType: "user",
            name: "hulk",
            phoneNumber: "123456",
          },
          caller: {
         name: "800 Service",
            number: "+654321",
            numberType: 2,
          },
          dateTime: "2025-08-1T09:58:51Z",
          direction: direction,
          enableAutoLog: false,
          result: "ended",
        },
      });
    },
   
    hideCallPopup() {
      this.showIncomingCall = false;
    },
    goToCallPage() {
      // this.showIncomingCall = false;
      if (typeof window.togglePlatform === "function") {
        window.togglePlatform();
      } else {
        console.log("togglePlatform is not available.");
      }
      // this.$store.commit("common/SET_PAGE_ROUTE", "call");
    },
  },

  async mounted() {
    const resp= await window.client.request.invoke("fetchCallLogs",{})
  this.$store.commit("callLogs/SET_CALL_LOGS",JSON?.parse(resp.message));
  console.log("call logs from app.vue",resp.message);
    // getLoggedInUserData();
function getEmbeddedEnvironment() {
  // Get full URL
  const fullUrl = window.location.href;
  console.log("Full URL:", fullUrl);

  const params = new URLSearchParams(window.location.search);
  console.log("URLSearchParams:", params.toString());

  // Try to get origin from query param
  let origin = params.get("origin");

  if (!origin) {
    origin = window.location.origin;
    console.log("Fallback to window.location.origin:", origin);
  } else {
    console.log("Embedded origin URL:", origin);
  }

  const originLower = origin.toLowerCase();
  const fullUrlLower = fullUrl.toLowerCase();

  // Check both the full URL and the origin
  if (originLower.includes("freshdesk") || fullUrlLower.includes("freshdesk")) {
    return "freshdesk";
  } else if (originLower.includes("freshsales") || fullUrlLower.includes("freshsales")) {
    return "freshsales";
  } else if (
    originLower.includes("localhost") ||
    fullUrlLower.includes("localhost") ||
    fullUrlLower.includes("127.0.0.1")
  ) {
    return "local";
  } else {
    return "unknown";
  }
}


// Example usage:
console.log('Detected environment:', getEmbeddedEnvironment());

 
    const page_route = this.$store.getters.page_route;
    page_route === "call"
      ? this.$store.commit("common/SET_PAGE_ROUTE", "call")
      : this.$store.commit("common/SET_PAGE_ROUTE", page_route);
    const DB_KEY = "Zoom_BYOT";
    const channelId = await client.db.get(DB_KEY);

    console.log("Db channelid", channelId);
    this.$store.commit("call/SET_CHANNEL_ID", channelId.zoomPhoneChannelId);
    this.$store.dispatch("common/getClientMethods", client);
    this.$store.dispatch("common/getContactList", "");
    const zoom = document.getElementById("zoomCCP");
    console.log("Zoom iframe:", zoom);
    console.log("call logs", this.call_logs);
    zoom.contentWindow.postMessage(
      {
        type: "zp-init-config",
        data: {
          enableSavingLog: true,
          enableAutoLog: true,
          enableContactSearching: true,
          enableContactMatching: true,
          notePageConfiguration: [
            {
              fieldName: "Disposition",
              fieldType: "select",
              selectOptions: [
                {
                  label: "Interested",
                  value: "interested",
                },
                {
                  label: "Not Interested",
                  value: "not_interested",
                },
                {
                  label: "No Contact",
                  value: "no_contact",
                },
              ],
              placeholder: "Select an option",
            },
            {
              fieldName: "Description",
              fieldType: "text",
              placeholder: "Enter notes",
            },
          ],
        },
      },
      "https://applications.zoom.us"
    );
    window.addEventListener("message", async (event) => {
      console.log("EVENTS FROM EVENTLISTNER", event.data);
      

      const { type } = event.data || {};
     
      if (type === "zp-call-ringing-event") {
        const callId = event.data?.data?.callId;  
         if (event.data.data.direction == 'inbound') {
              console.log('inbound call')
              this.showIncomingCall = true;
            }
             const context = await client.instance.context();
      console.log("Current location:jh", context.location);
      const location = context.location;

        client.interface.trigger("show", { id: location !== "left_nav_cti" ? "softphone" : "phoneApp" });
          // console.log("Incoming call event received",flag);
        console.log("call is ringing");
        this.$store.dispatch("call/setCallEndedFlag", false);
        const now = Date.now();
      if (now - lastTimes.ringing < 150) {
        // block micro-bursts
        // console.log("Blocked ringing micro-burst");
        return;
      }
      lastTimes.ringing = now;

      const s = ensureCallState(callId);
      if (s && s.ringing) return;
      if (callId) s.ringing = true;
        handleRingingEvent(client, event.data);
    
        
       
        console.log("event data", event.data);
        
        // this.$store.dispatch("call/handleIncomingCall", event.data);

        // this.$store.dispatch("call/createConversationFreshchat",event.data)
      }
    if (type === "zp-call-log-completed-event") {
  const callId = event.data?.data?.callId;
  if (!callId) {
    console.warn("❌ Missing callId in log-completed event");
    return;
  }

  const lockKey = `call-log-completed-${callId}-lock`;

  // ---------------------------------------------------------
  // 1️⃣ CROSS-TAB LOCK (localStorage)
  // ---------------------------------------------------------
  if (!acquireCrossTabLock(lockKey, 1800)) {
    console.log("⛔ Duplicate call-log-completed blocked (cross-tab lock):", callId);
    return;
  }

  // Auto release for safety
  setTimeout(() => {
    releaseCrossTabLock(lockKey);
    bc.postMessage({ type: "release-calllog", callId });
  }, 1800);

  // ---------------------------------------------------------
  // 2️⃣ PER-TAB MUTEX (fast double firing prevention)
  // ---------------------------------------------------------
  if (callLogProcessingLock) {
    console.log("⛔ Duplicate log-completed blocked (tab mutex)", callId);
    return;
  }

  callLogProcessingLock = true;
  setTimeout(() => {
    callLogProcessingLock = false;
  }, 50);

  // ---------------------------------------------------------
  // 3️⃣ RESERVATION SYSTEM (cross-tab instant dedupe)
  // ---------------------------------------------------------
  if (calllogReservations.has(callId)) {
    console.log("⛔ Blocked duplicate log-completed via reservation:", callId);
    return;
  }

  calllogReservations.add(callId);
  bc.postMessage({ type: "reserve-calllog", callId });

  // ---------------------------------------------------------
  // 4️⃣ PROCESS EVENT EXACTLY ONCE
  // ---------------------------------------------------------
  console.log("✅ Handling log-completed ONCE for:", callId);

  try {
    handleRingingEvent(client, event.data);
  } catch (err) {
    console.error("❌ Error in handleRingingEvent:", err);
  }

  // Vue state reset
  this.$store.dispatch("call/setCallEndedFlag", true);
  this.showIncomingCall = false;

  // Reset all flags after completion

}

     
    if (type === "zp-call-connected-event") {
          this.showIncomingCall = false;
            try{
         const response12 = await window.client.data.get("currentProduct");
      console.log("Testing");
      console.log("Current Product:", response12);
     const currentProuct = response12.currentProduct;
       console.log("current product in app.vue",currentProuct);
       if(currentProuct==="freshsales"||(currentProuct==="freshchat")){
         this.$store.commit("common/SET_PAGE_ROUTE","crmcall")
       }else{
        this.$store.commit("common/SET_PAGE_ROUTE","call")
        // this.$store.commit("common/SET_PAGE_ROUTE", "call");
        }
      }catch(err){
        this.$store.commit("common/SET_PAGE_ROUTE","call")
        // console.error("Error fetching current product:", err);
      }
         const callId = event.data.data.callId;
     
 handleZoomEventOnce(event, "connected", () => {
    handleRingingEvent(client, event.data);
  });
        
        
       
        console.log("call is connected app.vue");
      
     
        //  const conversationId= this.$store.dispatch("call/createConversationFreshchat",event.data);
        //  this.$store.commit("SET_CONVERSATION_ID", conversationId.conversation_id);
    }
  if (type === "zp-call-ended-event") {
    const callId = event.data?.data?.callId;
            this.showIncomingCall = false;
        this.$store.commit("common/SET_PAGE_ROUTE", "home");
        
  

    console.log("📞 Call Ended Event:", callId);

    // ---------------------------------------------------------
    // 1️⃣ LEADER LOCK (cross-tab dedupe)
    // ---------------------------------------------------------

   
     handleRingingEvent(client, event.data);

    
  

       
    

  
    

  }



    if (type === "zp-call-recording-completed-event") {
           this.showIncomingCall = false;
  console.log("Call recording completed:", event.data);

  const callId = event.data.data.callId;
  console.log("call id in app.vue", callId);

 
           handleZoomEventOnce(event, "recording", () => {
     handleRingingEvent(client, event.data);
  });
         
          console.log("Recording with flag true");
         
        // handleRingingEvent(client, event.data);
        const recordingUrl = event.data?.data?.recordingUrl;
        if (recordingUrl) {
          // Save recording in Vuex
          this.$store.dispatch("call/setRecordingUrl", recordingUrl);
          console.log("Recording URL stored:", recordingUrl);

          // Update Freshchat with recording bubble
          // const recordingPayload = {
          //   conversationId: this.$store.getters.freshchat_conversation_id,
          //   channel_id: this.$store.getters.freshchat_channel_id,
          //   call_id: event.data.callId,
          //   recording_link: recordingUrl,
          //   call_life_cycle_event_type: "CALL_RECORDING_AVAILABLE",
          // };

          // client.request
          //   .invoke("updateRecordingsInFreshChatConvo", recordingPayload)
          //   .then((res) =>
          //     console.log("Recording bubble added to Freshchat", res)
          //   )
          //   .catch((err) =>
          //     console.error("Error updating Freshchat with recording:", err)
          //   );
        }
        
        // optional: this.$store.commit("common/SET_PAGE_ROUTE", "call");
  }

    if (type === "zp-notes-save-event") {
        console.log("Notes event");
        addNotes(event.data);
      }
if (type === "zp-call-voicemail-received-event") {
    const callId = event.data?.data?.callId;
    if (!callId) return;

    handleZoomEventOnce(event, "voicemail", () => {
    handleRingingEvent(client, event.data);
  });
     
}

    if (event.data.iFrameEventType === "IST_IFRAME_STOP_NOTIFY") {
       
        console.log("iFrame stopped:", event.data);
    }
   
  
  });
    try {
      if (window.client) {
        window.client.instance.resize({ height: "650px" });
      }
    } catch (err) {
      console.error("Error initializing app:", err);
    }

    try {
      const response12 = await window.client.data.get("currentProduct");
      console.log("Testing");
      this.$store.commit("common/SET_CURRENT_PRODUCT", response12);
      console.log("Current Product:", response12);
    } catch (error) {
      console.error("Error fetching current product:", error);
    }


  },
};


</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  /* color: #2ce50 ; */
}

body::-webkit-scrollbar {
  display: none;
}

</style>
