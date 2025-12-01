<template>
  <div class="recent-search">
    <b-form-input
      size="sm"
      class="recent-input-search"
      v-model="recentCallSearch"
      :change="searchContact()"
      placeholder="Search Recent Calls"
    />
    <!-- <button size="sm" class="ml-2" @click="dummy()">Load Dummy Data</button> -->
   
  </div>

  <div class="recent-call-list">
    <div v-if="filteredCalls.length > 0">
      <div
        v-for="(contact, index) in filteredCalls"
        :key="index"
        style="cursor: auto;"
        class="recent-call-entry"
      >
        <b-row no-gutters align-v="center">
          <b-col
            cols="2"
            class="call-history-icon d-flex justify-content-center"
          >
            <font-awesome-icon
              v-if="contact.direction === 'missed'||contact.direction==='abandoned'"
              class="call-icon missed"
              icon="level-up-alt"
              size="sm"
            />
            <font-awesome-icon
              v-else-if="contact.direction==='Rejected'"
              class="call-icon missed"
              icon="level-up-alt"
              size="sm"
            />
            <font-awesome-icon
              v-else-if="contact.callDirection === 'outgoing'"
              class="call-icon outbound"
              icon="arrow-up"
              size="lg"
            />
            <font-awesome-icon
              v-else-if="contact.callDirection === 'incoming'"
              class="call-icon inbound"
              icon="arrow-down"
              size="lg"
            />
          </b-col>
          <b-col cols="7" class="call-log-list">
            <h6 class="contact-info-name" ><!-- @click="contactRedirection(contact)"-->
              {{ contact.callerName }}
            </h6>
            <div class="contact-info-number">{{ contact.callerNumber }}</div>
            <div class="contact-time-stamp">{{ contact.callTimeStamp }}</div>
          </b-col>

          <b-col
            cols="3"
            class="icon-actions d-flex justify-content-end align-items-center"
          >
            <font-awesome-icon
              v-if="contact.callerName === 'Unknown Caller'"
              @click="redirectToAddContact(contact.callerNumber)"
              class="contact-add-icon"
              icon="user-plus"
              title="Add Contact"
              size="sm"
            />
            <font-awesome-icon
              @click="contactRedirectionAndMakeOutboundCall(contact)"
              class="contact-phone-icon"
              icon="phone"
              title="Call"
              size="sm"
            />
          </b-col>
        </b-row>
      </div>
    </div>
    <div v-else class="no-recents">No recent calls found.</div>
  </div>
</template>

<script>

import { mapGetters } from "vuex";
import { store } from "../../store";
import {fetchCallLogs} from "..//../apis/handler"
const zoom = document.getElementById("zoomCCP");
export default {
  name: "RecentCalls",
  computed: {
    ...mapGetters(["call_logs","page_route","create_contact_phone_number"]),
   
    // filteredCalls() {
    //   console.log("call logs",this.call_logs);
    //    const search = (this.recentCallSearch || "").toLowerCase();
    //   return this.call_logs.filter((contact) => {
       
    //     return (
    //       !search ||
    //       (contact.callerName || "").toLowerCase().includes(search) ||
    //       (contact.callerNumber || "").toLowerCase().includes(search)
    //     );
    //   });
    // },
      filteredCalls() {
  console.log("call logs", this.call_logs);
 
  const search = (this.recentCallSearch || "").toLowerCase();
 
  // 1️⃣ Remove duplicates: same callId = duplicate
  const uniqueCalls = [];
  const seen = new Set();
 
  for (const c of this.call_logs || []) {
    // Create a unique key from callId (the globally unique call identifier)
    const logKey = c.callId || `${c.callerNumber || "unknown"}_${c.callTimeStamp || ""}`;
    
    if (!seen.has(logKey)) {
      seen.add(logKey);
      uniqueCalls.push(c);
    } else {
      console.log(`[RecentCalls] Skipping duplicate call: ${logKey}`);
    }
  }
 
  // 2️⃣ Now apply the search filter
  return uniqueCalls.filter((contact) => {
    return (
      !search ||
      (contact.callerName || "").toLowerCase().includes(search) ||
      (contact.callerNumber || "").toLowerCase().includes(search)
    );
  });
},
 
  },
  mounted(){
    //fetchCallLogs().then(res=>{
      //this.$store.commit("callLogs/SET_CALL_LOGS",res.data);
    //})
    // this.$store.dispatch("callLogs/fetchCallLogs");
    //console.log("call logs handler",fetchCallLogs);
      console.log("call logs",this.call_logs);
  },
  data() {
    return {
      recentCallSearch: "",
    };
  },
  methods: {

    async redirectToAddContact(number) {
    
      this.$store.dispatch("call/setCreateContactNumber", number);
      // console.log(this.create_contact_phone_number);
     this.$store.commit("common/SET_PAGE_ROUTE", "new-contact");
    },
    searchContact() {
      console.log(this.recentCallSearch);
    },
    dummy(){
      console.log("button clicked");
      this.$store.commit("callLogs/SET_CALL_LOGS", [
  {
    callId: "CALL_001",
    callerName: "John Mathews",
    callerNumber: "+1 202-555-0148",
    callDirection: "incoming",
    callTimeStamp: "2025-11-25 10:32 AM"
  },
  {
    callId: "CALL_002",
    callerName: "Unknown Caller",
    callerNumber: "+1 415-555-7782",
    callDirection: "incoming",
    callTimeStamp: "2025-11-25 09:10 AM",
    direction:"Rejected"
  },
  {
    callId: "CALL_003",
    callerName: "Sophia Wilson",
    callerNumber: "+1 305-555-6621",
    callDirection: "outgoing",
    callTimeStamp: "2025-11-24 08:45 PM"
  }
]);

    },
    contactRedirection(contact) {
    
      // console.log(contact);
      // client.interface.trigger("click", {
      //   id: "contact",
      //   value: "",
      // });
      
    },
    contactRedirectionAndMakeOutboundCall(contact) {
      zoom.contentWindow.postMessage(
        {
          type: "zp-make-call",
          data: {
            number: contact.callerNumber||"",
            // callerId: "+14708662627",
          },
        },
        "https://applications.zoom.us"
      );
      console.log("outbound call initiated!!");
      if (typeof window.togglePlatform === "function") {
        window.togglePlatform();
      } else {
        console.log("togglePlatform is not available.");
      }
    },
  },
};
</script>

<style scoped>
.recent-search {
  margin: 8px;
}

.recent-input-search {
  width: 100%;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid #d0d7de;
  background: #f9fafb;
  transition: all 0.2s ease;
}

.recent-input-search:focus {
  border-color: #0e72ed;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(14, 114, 237, 0.15);
}

.recent-call-list {
  margin-top: 12px;
}

.recent-call-entry {
  padding: 12px 14px;
  border-radius: 10px;
  background: #ffffff;
  margin-bottom: 10px; /* looks like a card */
  transition: all 0.2s ease;
  border: 1px solid #f0f0f0;
}

.recent-call-entry:hover {
  background-color: #f7fbff;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.call-history-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-icon {
  margin-top: 2px;
  padding-right: 6px;
  transition: transform 0.2s ease;
}

.recent-call-entry:hover .call-icon {
  transform: scale(1.1);
}

/* ICON COLORS */
.call-icon.missed {
  color: #e74c3c;
}
.call-icon.rejected {
  color: #ff5733;
}

.call-icon.outbound {
  color: #0e72ed;
}

.call-icon.inbound {
  color: #28b463;
}

.call-log-list {
  padding-left: 10px;
  text-align: left;
}

.contact-info-name {
  font-weight: 600;
  margin-bottom: 2px;
  font-size: 0.95rem;
}

.contact-info-number {
  font-size: 0.9em;
  font-weight: 600;
  color: #222;
}

.contact-time-stamp {
  font-size: 0.72em;
  color: #0e72ed;
  margin-top: 3px;
}

.icon-actions font-awesome-icon {
  margin-left: 10px;
  color: #888;
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s ease;
}

.icon-actions font-awesome-icon:hover {
  color: #0e72ed;
  transform: translateY(-1px);
}
.contact-add-icon {
  background-color: transparent;
  margin-top: 20px;
  border-style: none;
  border-radius: 6px;
  

  margin-right: 10px;
}
.contact-add-icon:hover {
  color: #28c76f !important;
}

.no-recents {
  text-align: center;
  padding: 25px 10px;
  color: #666;
  font-size: 0.9rem;
}
.contact-phone-icon {
  background-color: transparent;
  margin-top: 20px;
  border-style: none;
  border-radius: 6px;
}
.contact-phone-icon:hover {
  color: #0e72ed !important;
}

</style>
