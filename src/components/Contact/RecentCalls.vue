<template>
  <div class="recent-search">
    <b-form-input
      size="sm"
      class="recent-input-search"
      v-model="recentCallSearch"
      :change="searchContact()"
      placeholder="Search Recent Calls"
    />
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
              v-if="contact.callDirection === 'missed'"
              class="call-icon missed"
              icon="level-up-alt"
              size="sm"
            />
            <font-awesome-icon
              v-if="contact.callDirection === 'outgoing'"
              class="call-icon outbound"
              icon="arrow-up"
              size="lg"
            />
            <font-awesome-icon
              v-if="contact.callDirection === 'incoming'"
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
  border-radius: 6px;
  padding: 6px 10px;
  border: 1px solid #ddd;
}

.recent-call-list {
  margin-top: 15px;
}

.recent-call-entry {
  padding: 10px 14px;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s ease;
}

.recent-call-entry:hover {
  background-color: #f9f9f9;
  cursor: pointer;
}

.call-history-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-icon {
  margin-top: 4px;
}

.call-icon.missed {
  color: #db4437;
}

.call-icon.outbound {
  color: #4285f4;
}

.call-icon.inbound {
  color: #0f9d58;
}

.call-log-list {
  padding-left: 10px;
  align-items: flex-start;
  text-align: left;
}

.contact-info-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.contact-info-number {
  font-size: 0.9em;
  font-weight: bold;
  color: #333;
}

.contact-time-stamp {
  font-size: 0.75em;
  color: #0e72ed;
}

.icon-actions font-awesome-icon {
  margin-left: 5px;
  color: #999;
  transition: color 0.2s ease;
}

.icon-actions :hover {
  color: #0e72ed;
}

.contact-add-icon {
  padding-right: 8px;
}
.contact-add-icon:hover {
  color: #28c76f;
}

.no-recents {
  text-align: center;
  padding: 20px;
  color: #888;
}
</style>
