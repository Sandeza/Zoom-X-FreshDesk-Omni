<template>
  <div class="call-ui-container">
    <!-- Caller Info Card -->
    <div class="zoom-card">
      <div class="zoom-card__header">
        <div class="avatar">
          <i class="fas fa-user"></i>
        </div>
        <div>
          <div class="caller-name">{{ caller_name || "Unknown Caller" }}</div>
          <div class="caller-number">{{ caller_number || "N/A" }}</div>
        </div>
      </div>
 
      <div class="zoom-card__details">
        <span class="call-state in-call">
          <i class="fas fa-phone"></i> {{ call_state || "In Call" }}
        </span>
      </div>
    </div>
 
    <!-- Notes Section -->
    <div class="section-header">Call Notes</div>
    <div class="notes-section">
      <textarea
        v-model="callNotes"
        placeholder="Write notes about the call..."
        class="notes-textarea"
      ></textarea>
      <button class="button save-btn" @click="saveNotes">
        <i class="fas fa-save"></i> Save Notes
      </button>
     
<!-- Notes Added Popup -->
<div v-if="showNotesPopup" :class="['notes-popup', popupType]">
  <i v-if="popupType === 'success'" class="fas fa-check-circle"></i>
  <i v-if="popupType === 'error'" class="fas fa-exclamation-circle"></i>
  {{ popupMessage }}
</div>
    </div>
 
    <!-- Bottom Bar -->
    <div class="bottom-bar">
      <button class="switch-btn" @click="goToFreshsales">
        <img class="icon" src='./cc.png' alt="Freshsales" />
        View Contact
      </button>
      <button class="switch-btn" @click="goToFreshchat">
        <img class="icon" src='./cnv.png' alt="Freshchat" />
        View Conversation
      </button>
    </div>
  </div>
</template>
 
<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { faUser, faPhone, faSave } from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  addNotes
} from "../../apis/handler.js";
library.add(faUser, faPhone, faSave);
 
export default {
  name: "CallConnected",
  components: { FontAwesomeIcon },
  data() {
    const name= this.$store.getters.contact_name;
    console.log("Contact Name from Store:", name);
    const callState = this.$store.state.call.current_call || {};
    console.log("callState in CallConnected:", callState);  
    const incoming=callState.direction=="inbound";
    const caller_name=incoming?callState.caller.name:callState.callee.name;
    const phoneNumber=incoming?callState.caller.phoneNumber:callState.callee.phoneNumber;
    const plusRemovedNumber =  phoneNumber.replace("+", "")
    return {
      caller_name: name || plusRemovedNumber || "UK",
      caller_number: phoneNumber || "",
      call_state: "ONGOING CALL",
      callNotes: "",
      showNotesPopup: false,
      popupType: "success", 
    };
  },
  async mounted() {
        const callState = this.$store.state.call.current_call || {};
    console.log("callState in CallConnected:", callState);
    console.log("CallConnected component mounted.");
     const data = await window.client.request.invoke("getAccountId", {});
    const accountDetails = JSON.parse(data.message);
    console.log("Account ID:", accountDetails.account_id);
    this.$store.dispatch("common/getAccountId");
  },
  methods: {
    async goToFreshsales() {
      const iparams = await client.iparams.get();
      const freshsalesDomain = iparams.crm_domain;
      let contactId = this.$store.getters.crm_contact_id.contact?.id ;
      console.log(typeof(contactId))// example
      const product = (await client.data.get("currentProduct")).currentProduct;
      console.log("contactId:", contactId);
     
      if (product === "freshsales") {
        if(!contactId){
          console.log("Opening Freshsales in new tab");
          window.open(`https://${freshsalesDomain}/crm/sales/contacts/`);
         
          return;
        }
       window.client.interface.trigger("show",
        { id: "contact", value:contactId});
        console.log("Show contact   mresult:");
      } else {
        if(!contactId){
          window.open(`https://${freshsalesDomain}/crm/sales/contacts/`);
          return;
        }
        window.open(`https://${freshsalesDomain}/crm/sales/contacts/${contactId}`);
      }
    },
    async goToFreshchat() {
      const response12 = await window.client.data.get("currentProduct");
      console.log("Testing");
      console.log("Current Product:", response12);
     const locationProduct = response12.currentProduct;
     const domain= client.context.productContext.url
     console.log("this is Domainnnn",domain)
       const account_id = this.$store.getters.account_id;
      console.log("Account ID:", account_id);
      const iparams = await client.iparams.get();
      const conversationId=this.$store.getters.conversation_internal_id;
      console.log("conversationId:", conversationId);
      const freshworksDomain = `https://${iparams.crm_domain}/crm/messaging/a/${account_id}/inbox/open/0/conversation/${conversationId}`;
      console.log("Freshworks domm",freshworksDomain)
 
      const context = await client.instance.context();
      console.log("Current location:jh", context.location);
      const location = context.location;
     
       
      if(locationProduct==="freshchat"){
      //     if(!conversationId){
      //   const freshchatURL = `https://${iparams.crm_domain}/crm/messaging/a/${account_id}/inbox`;
      // window.open(freshchatURL);
      //   return;
      // }
       if(!conversationId){
        const freshchatURL = `https://${iparams.crm_domain}/crm/messaging/a/${account_id}/inbox`;
      window.open(freshchatURL);
        return;
      }
      console.log("Triggering Freshchat conversation view");
       const repsonse= await client.interface.trigger("show",{id:"conversation",value:conversationId})
       console.log("Show conversation result:", repsonse);  
      }
      else{
         if(!conversationId){
        const freshchatURL = `https://${iparams.crm_domain}/crm/messaging/a/${account_id}/inbox`;
      window.open(freshchatURL);
        return;
      }
        console.log("Opening Freshchat in new tab");
        // window.open(freshworksDomain);
      const freshchatURL = `https://${iparams.crm_domain}/crm/messaging/a/${account_id}/inbox/open/0/conversation/${conversationId}`;
      window.open(freshchatURL);
      }
    },
    async saveNotes() {
    if (!this.callNotes.trim()) {
      // Show warning popup
      this.popupMessage = "Cannot save empty notes!";
      this.popupType = "error";
      this.showNotesPopup = true;
      setTimeout(() => (this.showNotesPopup = false), 2000);
      return;
    }

    try {
      await addNotes(this.callNotes); // save notes
      console.log("Call notes saved:", this.callNotes);

      this.popupMessage = "Notes Added!";
      this.popupType = "success";
      this.showNotesPopup = true;
      setTimeout(() => (this.showNotesPopup = false), 2000);

      this.callNotes = ""; // clear textarea
    } catch (error) {
      console.error("Error saving notes:", error);
      this.popupMessage = "Error saving notes!";
      this.popupType = "error";
      this.showNotesPopup = true;
      setTimeout(() => (this.showNotesPopup = false), 2000);
    }
  }
  },
};
</script>
 
<style scoped>
.call-ui-container {
  padding: 16px;
  font-family: "Inter", sans-serif;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
 
/* Section Header */
.section-header {
  font-weight: 600;
  font-size: 1rem;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 6px;
}
 
/* Notes Section */
.notes-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
 
.notes-textarea {
  width: 100%;
  min-height: 120px;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  resize: vertical;
  outline: none;
 color:black
}
 
.notes-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #93c5fd;
}
 
.save-btn {
  align-self: flex-end;
}
 
/* Caller Card */
.zoom-card {
  background-color: #f0f9ff;
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
}
 
.zoom-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
 
.avatar {
  width: 3rem;
  height: 3rem;
  background-color: #dbeafe;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #2563eb;
}
 
.caller-name {
  font-weight: bold;
  font-size: 1rem;
  color: #1f2937;
}
 
.caller-number {
  font-size: 0.85rem;
  color: #6b7280;
}
 
.call-state {
  font-size: 0.85rem;
  font-weight: 500;
  color: #2563eb;
}
 
.button {
  cursor: pointer;
  padding: 8px 12px;
  background-color: #2563eb;
  font-size: 0.85rem;
  font-weight: 500;
  color: white;
  border: none;
  border-radius: 8px;
  transition: background 0.2s ease;
}
 
.button:hover {
  background-color: #1e40af;
}
 
/* Bottom Bar */
.bottom-bar {
  display: flex;
  justify-content: space-around;
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 10px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  bottom: 8px;
}
 
.switch-btn {
  background: none;
  border: none;
  text-align: center;
  font-size: 0.8rem;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
 
/* .switch-btn:hover {
  color: #2563eb;
} */
 
.icon {
  width: 28px;
  height: 28px;
}
.save-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  position: relative;
}
 
.notes-popup {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  animation: popupSlide 0.4s ease, fadeOut 2s ease 1.6s forwards;
  z-index: 9999;
  min-width: 220px;
  justify-content: center;
}

/* Success and Error Colors */
.notes-popup.success {
  background: rgba(16, 185, 129, 0.9);
}

.notes-popup.error {
  background: rgba(239, 68, 68, 0.9);
}

/* Slide + Fade Animations */
@keyframes popupSlide {
  0% { opacity: 0; transform: translate(-50%, 20px); }
  100% { opacity: 1; transform: translate(-50%, 0); }
}

@keyframes fadeOut {
  0% { opacity: 1; }
  100% { opacity: 0; }
}

.notes-popup i {
  font-size: 1.1rem;
}

 
</style>
 
 