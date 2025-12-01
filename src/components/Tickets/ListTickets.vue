<template>
  <div class="ticket-ui-container">
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

  <!-- Corrected Add Contact button logic -->
  <div v-if="caller_name === 'Unknown Caller'" class="add-contact-wrapper">
    <button class="add-contact-btn" @click="addContact">
      <i class="fas fa-user-plus"></i>
    </button>
  </div>
</div>


      <div class="zoom-card__details">
        <span class="call-state in-call">
          <i class="fas fa-phone"></i> {{ call_state || "In Call" }}
        </span>
      </div>

      <button class="button" @click="createTicket">
        <i class="fas fa-circle-plus"></i> New Ticket
      </button>
    </div>

    <!-- Tickets -->
    <div class="section-header">Tickets</div>
    <div v-if="tickets && tickets.length" class="ticket-list">
      <div
        v-for="ticket in tickets"
        :key="ticket.id"
        class="ticket-item"
        @click="openTicket(ticket.id)"
      >
        <!-- Left: Ticket Avatar -->
        <div class="ticket-avatar">
          {{ ticket.id }}
        </div>

        <!-- Middle: Ticket Details -->
        <div class="ticket-details">
          <div class="ticket-title">
            <span class="ticket-subject">
              {{ shortenSubject(ticket.subject) }}
            </span>
            <span
              class="status-badge"
              :class="mapTicketStatus(ticket.status).className"
            >
              {{ mapTicketStatus(ticket.status).status }}
            </span>
          </div>
          <div class="ticket-meta">
            <font-awesome-icon :icon="['fas', 'user']" />
            <span>{{ ticket.requester || "Unknown" }}</span>
            <span>• Created {{ ticket.createdAt || "N/A" }}</span>
          </div>
        </div>

        <!-- Right: Add Note -->
        <div class="ticket-right">
          <fw-button
            size="small"
            color="secondary"
            @click.stop="setNotes(ticket)"
          >
            + Note
          </fw-button>
        </div>
      </div>
    </div>

    <div v-else class="no-tickets">
      <i class="fas fa-ticket-alt"></i>
      <p>No tickets found for this caller.</p>
    </div>

    <!-- Bottom Bar -->
    <div class="bottom-bar">
      <button class="switch-btn" @click="goToFreshdesk(ticket)">
        <img class="icon" src="../assets/cc.png" alt="Freshdesk" />
        View Contact
      </button>
      <!-- <button class="switch-btn" @click="goToFreshchat">
        <img class="icon" src="../assets/cnv.png" alt="Freshchat" />
        View conversation
      </button> -->
    </div>
  </div>
</template>

<script>
import CreateContact from "../Contact/CreateContact.vue";
import HomePage from "../Home/HomePage.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import CreateTicket from "../Tickets/createTicket.vue";

import AddNotes from "../Notes/AddNotes.vue";
import { mapGetters } from "vuex";
import { useStore } from "vuex";
import store from "../../store";
import { computed } from "vue";
import { findOrCreateFreshdeskContact,fetchTicketsForUser } from "../../apis/handler"; // Import your handler

import {
  faUser,
  faTicket,
  faCirclePlus,
} from "@fortawesome/free-solid-svg-icons";


library.add(faUser, faTicket, faCirclePlus);
// const store = useStore();
// const internalConvId = computed(() => store.getters.conversation_internal_id);
// const domain = "krish870185881052282232"; // your Freshdesk domain
// const freshchatURL =
//   `https://${iparam.crm_domain}.myfreshworks.com/crm/messaging/a/1028153697987550/inbox?dev=true`;

export default {
  name: "ListTickets",
  components: { FontAwesomeIcon, CreateTicket, HomePage, AddNotes },

   data() {
    // Get call state from Vuex store
    // const name= this.$store.getters.contact_name;
    // console.log("Contact Name from Store:", name);

    const callState = this.$store.state.call.current_call || {};
     const incoming=callState?.direction=="inbound";
    console.log("callState in CallConnected:", callState); 
    const phoneNumber=incoming?callState?.caller?.phoneNumber:callState?.callee?.phoneNumber;
    console.log("Phone Number from Call State:", phoneNumber);
//     const user=await window.client.request.invokeTemplate("search_user_by_phone",{
//       context: { phone_number:123412834 },
//     });
//     console.log("User fetched by phone:", JSON.parse(user.response));  
//     const parsed = JSON.parse(user.response) || [];
// const name = parsed.length > 0 ? parsed[0].first_name : null;
//     console.log("Name fetched by phone:", name);
     
   
    
    // Optionally fallback if not present
    return {
      CreateContact:false,
      caller_name:"",
      caller_number: phoneNumber || "",
      call_state: "ONGOING CALL",
      tickets: [],
      response:null,
    };
  },
  async mounted() {
    const callState = this.$store.state.call.current_call || {};
     const incoming=callState?.direction=="inbound";
    console.log("callState in CallConnected:", callState); 
    const phoneNumber=incoming?callState?.caller?.phoneNumber:callState?.callee?.phoneNumber;
    console.log("Phone Number from Call State:", phoneNumber);
    const user=await window.client.request.invokeTemplate("search_user_by_phone",{
      context: { phone_number:phoneNumber },
    });
    console.log("User fetched by phone:", JSON.parse(user.response));  
    const parsed = JSON.parse(user.response) || [];
const name = parsed.length > 0 ? parsed[0].first_name : null;
    console.log("Name fetched by phone:", name);
    this.caller_name=name||"Unknown Caller";
  function normalizePhoneNumber(phone) {
  if (!phone) return "";
  return phone.startsWith("+") ? phone.substring(1) : phone;
}
    const data = await window.client.request.invoke("getAccountId", {});
    const accountDetails = JSON.parse(data.message);
    console.log("Account ID:", accountDetails.account_id);
    this.$store.dispatch("common/getAccountId");
    const caller_number=normalizePhoneNumber(this.caller_number);
    console.log("listticket ....", caller_number,this.caller_name);
    this.response = await findOrCreateFreshdeskContact(
      client,
      caller_number,
      this.caller_name
    );
    const ticketu=await fetchTicketsForUser(client, caller_number)
    console.log("tickets fetched",ticketu)
    // Use tickets for your UI
    console.log("Freshdesk tickets:", this.response);
    this.tickets = this.response.tickets;
    console.log("tickets array", this.tickets);
  },
  methods: {
    
//     async goToFreshdesk() {
//       const iparams = await client.iparams.get();
//       const freshsalesDomain = iparams.crm_domain;
//       const contactId = this.$store.getters.crm_contact_id.contact.id ;
//       console.log("iparams", iparams,"asda",this.response);
//       const freshdeskId=this.$store.getters.contact_id;
//       const freshdeskDomain = iparams.d_domain; // your Freshdesk  domain
//       // const contactId = this.response.contact.id;
//       // console.log(contactId);
//       console.log("Freshdesk tickets:", this.response);
//       let locationProduct;
//         const context = await client.instance.context();
//       console.log("Current location:jh", context.location);
//       const location = context.location;
//        if(location!== "left_nav_cti"){
//         console.log("Opening Freshdesk in current tab");
//          const response12 = await window.client.data.get("currentProduct");
//       console.log("Testing");
//       console.log("Current Product:", response12);
//       locationProduct = response12.currentProduct;
//       }
//       else{
//         console.log("Opening Freshdesk in new tab");
//         locationProduct = "freshdesk";
//       }
//       // const response12 = await window.client.data.get("currentProduct");
//       // console.log("Testing");
//       // console.log("Current Product:", response12);
//       // locationProduct = response12.currentProduct;
//       if (locationProduct === "freshchat") {
//         console.log("Opening  in new tab");
//          window.open(
//         `https://${freshsalesDomain}/crm/sales/contacts/${contactId}`
//       );
//         // if(contactId=="123456"){
//         //   alert("No contact associated with this call.");
//         //   return;
//         // }
//         // Already in Freshdesk, open in background
// //          client.interface.trigger("show", {
// //   id: "contact",
// //   value: 402014171844
// // })
//         // client.interface.trigger("click", {
//         //   id: "contact",
//         //   value: 402014171844,
//         // });
       
//       } else {
//         // if(contactId=="123456"){
//         //   alert("No contact associated with this call.");
//         //   return;
//         // }
//         // Coming from Freshchat or  others — open in new tab
//         console.log("Opening Freshdesk in current tab", freshdeskId);
        
//        window.client.interface.trigger("click", {
//   id: "contact",
//   value:freshdeskId||contactId
// })
//       //  window.open(
//       //   `https://${freshdeskDomain}/a/contacts/${402014171844}`
//       // );
//       }
//     },
 
    // async goToFreshchat() {
    //  const domain= client.context.productContext.url
    //  console.log("this is Domainnnn",domain)
    //    const account_id = this.$store.getters.account_id;
    //   console.log("Account ID:", account_id);
    //   const iparams = await client.iparams.get();
    //   const conversationId=this.$store.getters.conversation_internal_id;
    //   console.log("conversationId:", conversationId);
    //   const freshworksDomain = `https://${iparams.crm_domain}/crm/messaging/a/${account_id}/inbox/open/0/conversation/${conversationId}`;
    //   console.log("Freshworks domm",freshworksDomain)

    //   const context = await client.instance.context();
    //   console.log("Current location:jh", context.location);
    //   const location = context.location;
    //   if (location === "left_nav_cti") {
    //     console.log("Opening Freshchat in current tab");
    //      client.interface.trigger("show", {
    //         id: "conversation",
    //         value: conversationId,
    //       });
    //   } else {
    //     console.log("Opening Freshchat in new tab");
    //     window.open(freshworksDomain); 
    //   }
    // },
     async goToFreshdesk() {
          const data = await client.data.get("domainName");
    // success operation
    // "data" is {domainName: "sample.freshdesk.com"}
    console.log("All data:", data);
    console.log("Domain Name:", data.domainName);
      let locationProduct
      const iparams = await client.iparams.get();
      const freshsalesDomain = iparams.crm_domain;
      const contactId = this.$store.getters?.crm_contact_id?.contact?.id ||" ";
      console.log("contactId:", contactId);
      const freshdeskId=this.$store.getters.contact_id;
      const freshdeskDomain = iparams.d_domain; // your Freshdesk  domain
      // const contactId = this.response.contact.id;
      // console.log(contactId);
      console.log("Freshdesk tickets:", this.response);
     
        const context = await client.instance.context();
      console.log("Current location:jh", context.location);
      const location = context.location;
      console.log("location",location);
     
 
        console.log("Opening Freshdesk in current tab");
       window.client.interface.trigger("click", {
        id: "contact",
        value:freshdeskId||contactId
        })
       
    },
 
    async goToFreshchat() {
     
      //  const response12 = await window.client.data.get("currentProduct");
      // console.log("Testing");
      // console.log("Current Product:", response12);
      // locationProduct = response12.currentProduct;
     const domain= client.context?.productContext.url
     console.log("this is Domainnnn",domain)
       const account_id = this.$store.getters?.account_id;
      console.log("Account ID:", account_id);
      const iparams = await client.iparams.get();
      const conversationId=this.$store.getters?.conversation_internal_id;
      console.log("conversationId:", conversationId);
      const freshworksDomain = `https://${iparams.crm_domain}/crm/messaging/a/${account_id}/inbox/open/0/conversation/${conversationId}`;
      console.log("Freshworks domm",freshworksDomain)
      let locationProduct
      const context = await client.instance.context();
      console.log("Current location:jh", context.location);
      const location = context.location;
      //   if(location!== "left_nav_cti"){
      //   console.log("Opening Freshdesk in current tab");
      //    const response12 = await window.client.data.get("currentProduct");
      // console.log("Testing");
      // console.log("Current Product:", response12);
      // locationProduct = response12.currentProduct;
      // }
      // else{
      //   console.log("Opening Freshdesk in new tab");
      //   locationProduct = "freshdesk";
      // }
      // console.log("CCCC",locationProduct)
      // if (locationProduct === "freshchat") {
      //   console.log("if tab")
      //     if(!conversationId){
      //   console.log("new tab open")
      //   window.open(`https://${iparams.crm_domain}/crm/messaging/a/${account_id}/inbox`);
      //   return;
      // }
      //   console.log("Opening Freshchat in current tab");
      //    client.interface.trigger("show", {
      //       id: "conversation",
      //       value: conversationId,
      //     });
       
       
      // } else {
        console.log("else tab")
       if(!conversationId){
        console.log("new tab open")
        window.open(`https://${iparams.crm_domain}/crm/messaging/a/${account_id}/inbox`);
        return;
      }
        console.log("Opening Freshchat in new tab");
        window.open(freshworksDomain);
     
    },
 addContact() {
  console.log("Add Contact clicked");
   this.$store.commit("common/SET_PAGE_ROUTE", "add-contact");   
},
    
    createTicket() {
      console.log("commited");
      setTimeout(() => {
        this.$store.commit("common/SET_PAGE_ROUTE", "ticket");
      }, 0);
      //     await client.request.invokeTemplate("createTicket", {
      //     body: JSON.stringify({
      //       description: "Details about the issue...",
      //       subject: "created from mobile.........",
      //       phone: "1234567890",
      //       priority: 1,
      //       status: 2,
      //       name: "NNO",
      //     }),
      //   });
      // } catch (error) {
      //   console.error("Error creating ticket:", error);
      // }
    },
    async openTicket(id) {
      const iparams = await client.iparams.get();
      const freshdeskDomain = iparams.d_domain; // your    Freshdesk dom ain
      const context = await client.instance.context();
      console.log("Current location:jh", context.location);
      const location = context.location;
      if (location !== "left_nav_cti") {
        console.log("Opening Freshdesk in current tab");
        // Already in Freshdesk, open in background
        client.interface.trigger("click", {
          id: "ticket",
          value: id,
        });
      } else {
        // Coming from Freshchat  or  others — open in new tab
        console.log("Opening Freshdesk in new tab");
        window.open(`https://${freshdeskDomain}/a/tickets/${id}`);
      }
    },
    setNotes(tick) {
      console.log("Add notes to ticket:", JSON.stringify(tick));
      this.$store.commit("common/SET_TICKET_ID", tick);
      console.log("ticketid", tick.id);
      this.$store.commit("common/SET_PAGE_ROUTE", "note");
    },
    shortenSubject(subject) {
      return subject.length > 60 ? subject.slice(0, 57) + "..." : subject;
    },
    mapTicketStatus(status) {
      switch (status) {
        case 2:
          return {
            status: "Open",
            color: "green",
            iconColor: "#28a745",
            className: "open",
          };
        case 3:
          return {
            status: "Pending",
            color: "yellow",
            iconColor: "#f0ad4e",
            className: "pending",
          };
        case 4:
          return {
            status: "Resolved",
            color: "blue",
            iconColor: "#17a2b8",
            className: "resolved",
          };
        case 5:
          return {
            status: "Closed",
            color: "red",
            iconColor: "#dc3545",
            className: "closed",
          };
        default:
          return {
            status: "Unknown",
            color: "gray",
            iconColor: "#6c757d",
            className: "",
          };
      }
    },
  },
};
</script>

<style scoped>
.ticket-ui-container {
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

/* Ticket List  */
.ticket-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ticket-item {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ticket-item:hover {
  background: #f3f4f6;
  transform: translateY(-2px);
}

/* Ticket Left (Avatar) */
.ticket-avatar {
  min-width: 46px;
  height: 46px;
  background: #eff6ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #2563eb;
  font-size: 0.85rem;
  margin-right: 12px;
}

/* Ticket Details */
.ticket-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ticket-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.95rem;
}

.ticket-subject {
  color: #111827;
}

.status-badge {
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.open {
  background-color: #dcfce7;
  color: #166534;
}
.pending {
  background-color: #fef9c3;
  color: #92400e;
}
.resolved {
  background-color: #e0f2fe;
  color: #075985;
}
.closed {
  background-color: #fee2e2;
  color: #991b1b;
}

.ticket-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 2px;
}

.ticket-right {
  margin-left: auto;
}

/* Caller Card */
.zoom-card {
  --primary: #2563eb;
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
  color: var(--primary);
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
  color: var(--primary);
}

.button {
  cursor: pointer;
  padding: 8px;
  background-color: var(--primary);
  font-size: 0.85rem;
  font-weight: 500;
  color: white;
  border: none;
  border-radius: 8px;
  transition: background 0.2s ease;
}

/* .button:hover {
  background-color: #1e40af;
} */

/* Empty State */
.no-tickets {
  text-align: center;
  color: #6b7280;
  font-size: 0.9rem;
  padding: 20px;
}
.no-tickets i {
  font-size: 1.4rem;
  margin-bottom: 6px;
  color: #9ca3af;
  display: block;
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
.add-contact-btn {
  margin-top: 8px;
  padding: 6px 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.add-contact-btn:hover {
  background: #1d4ed8;
}

</style>
