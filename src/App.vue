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
    <AddContact v-if="page_route== 'add-contact'"></AddContact>
    <CreateContact v-if="page_route== 'new-contact'"></CreateContact>
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
import AddContact from "./components/Contact/addContact.vue";
import CreateTicket from "./components/Tickets/createTicket.vue";
import AddNotes from "./components/Notes/AddNotes.vue";
import {
  addNotes,
  handleRingingEvent,
  onCallEndedFreshChat,
  handleVoicemailEvent,
} from "./apis/handler.js";
import CrmConnect from "./components/CrmConnect/CrmConnect.vue";

const callIdValue = "100000000013citiigjlkjlokithorodin12345";
const callIdValue1 = "100000000013_1";
const direction = "inbound";

export default {
  components: {
    HomePage,
    ListTickets,
    IncomingCall,
    CreateContact,
    CreateTicket,
    AddNotes,
    CrmConnect,
    AddContact
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
    window.addEventListener("storage", () => {
  const info = JSON.parse(localStorage.getItem("zoom_tab_leader"));
  if (!info) return;

  // If this tab is NOT the leader → switch to fallback
  if (info.token !== window.__leaderToken) {
    console.log("Switching to  follower mode…");
    window.location.reload();
  }
});

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
        window.client.interface.trigger("show", { id: location !== "left_nav_cti" ? "softphone" : "phoneApp" });
          // console.log("Incoming call event received",flag);
        console.log("call is ringing");
        this.$store.dispatch("call/setCallEndedFlag", false);
   
         if (event.data.data.direction == 'inbound') {
              console.log('inbound call')
              this.showIncomingCall = true;
            }
    
        handleRingingEvent(client, event.data); 
        
             const context = await client.instance.context();
      console.log("Current location:jh", context.location);
      const location = context.location;

        
        
       
        console.log("event data", event.data);
        
        // this.$store.dispatch("call/handleIncomingCall", event.data);

        // this.$store.dispatch("call/createConversationFreshchat",event.data)
      }
    if (type === "zp-call-log-completed-event") {
  const callId = event.data?.data?.callId;
  // 

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
    handleRingingEvent(client, event.data);  
    }
  if (type === "zp-call-ended-event") {
    this.$store.commit("call/SET_CONTACT_NAME", "")
    const callId = event.data?.data?.callId;
            this.showIncomingCall = false;
        this.$store.commit("common/SET_PAGE_ROUTE", "home");
    
     handleRingingEvent(client, event.data); 

  }



    if (type === "zp-call-recording-completed-event") {
           this.showIncomingCall = false;
  console.log("Call recording completed:", event.data);

  const callId = event.data.data.callId;
  
     handleRingingEvent(client, event.data);
  
    
          console.log("Recording with flag true");
         
        // handleRingingEvent(client, event.data);
        const recordingUrl = event.data?.data?.recordingUrl;
        if (recordingUrl) {
          // Save recording in Vuex
          this.$store.dispatch("call/setRecordingUrl", recordingUrl);
          console.log("Recording URL stored:", recordingUrl);       
        }
        
        // optional: this.$store.commit("common/SET_PAGE_ROUTE", "call");
    }

    if (type === "zp-notes-save-event") {
        console.log("Notes event",event.data);
        // addNotes(event.data);
         const disposition = event.data.data.notesData.Disposition
      ? event.data.data.notesData.Disposition
      : "no Disposition";

        const callNotes = "Disposition: " + disposition + "\n" + event.data?.data?.notesData.Description;
        console.log("Saving call notes:", callNotes);
      const contactId = this.$store.getters.crm_contact_id.contact.id;
      console.log("Associated contact ID:", contactId);
      // You can dispatch Vuex action or API call here
      if(event.data?.data?.notesData.Description!=undefined && event.data?.data?.notesData.Description!=""){
        window.client.request.invoke("saveCallNotes", { notes:callNotes, contactId:contactId})
      }
      else{
        console.log("No notes to save.");
      
      }
    }
if (type === "zp-call-voicemail-received-event") {
    const callId = event.data?.data?.callId;
    handleRingingEvent(client,event.data)
  
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
