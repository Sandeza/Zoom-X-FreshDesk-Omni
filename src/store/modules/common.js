const state = {
  contact_list: [],
  contact_list_crm: [], // USED — ContactList.vue (mapGetters, search),CreateContact.vue (updates list after create)
  single_contact: [], // USED — common/createTicketForCaller,ListTicket.vue (to display selected contact details)
  page_route: "home", //  USED — App.vue, HomePage.vue, routing between "home", "new-contact", "list-ticket"
  fdk_client: {},
  client_methods: "", // USED — ContactList.vue,App.vue (mapGetters)
  // contact_id: "", // NOT USED directly in components (used internally in Vuex),Set by commits
  event_type: "default", // NOT USED
  freshdesk_domain: "", //  NOT USED — you derive actual domain from iparams in getClientMethods()
  loading: false, // USED — App.vue (mapGetters possible),ListTicket.vue (loading spinner usage via mapGetters from common)
  home_tab: "recent",
  account_id:"",
  ticket_id: "",
  current_product:"",
  flag:""
};

const mutations = {
  SET_CURRENT_PRODUCT: (state, product) => {
    state.current_product=product
    console.log("common::set_current_product",product)
  },
  SET_TICKET_ID: (state, id) => {
    state.ticket_id = id;
    console.log("COMMON::SET_TICKET_ID", id);
  },
  GET_CRMCONTACT_LIST:(state,contacts)=>{
    state.contact_list_crm=contacts
    console.log("COMMON::GET_CRM_CONTACT",contacts)
  },
  GET_CONTACT_LIST: (state, contacts) => {
    state.contact_list = contacts;
    console.log("COMMON::GET_CONTACT_LIST:", state.contact_list);
  },

  PUSH_CONTACT_LIST: (state, contact) => {
    state.contact_list.push(contact);
    console.log("COMMON::PUSH_CONTACT_LIST:", state.contact_list);
  },
  SET_PAGE_ROUTE: (state, route) => {
    state.page_route = route;
    console.log("COMMON::SET_PAGE_ROUTE", state.page_route);
  },
  SET_HOME_TAB: (state, route) => {
    state.home_tab = route;
    console.log("COMMON::SET_HOME_TAB", state.home_tab);
  },
  SET_LOADING: (state, payload) => {
    state.loading = payload;
  },
  SET_CLIENT_METHODS(state, methods) {
    state.client_methods = methods;
    console.log("client_methods set:", methods);
  },
  CREATE_CONTACT: (state, contact) => {
    state.contact_list.unshift(contact);
    console.log("COMMON::CREATE_CONTACT", contact);
  },
  SET_SINGLE_CONTACT(state, contact) {
    state.single_contact = contact;
    console.log("Set single contact:", contact);
  },
  SET_ACCOUNT_ID: (state, id) => {
    state.account_id = id;
    console.log("COMMON::ACCOUNT_ID", id);
  },
};

const actions = {
  async getAccountId({ commit }) {
    try {
      const data = await window.client.request.invoke("getAccountId", {});
      console.log("Account ID data:", data);
      const accountDetails = JSON.parse(data.message);
      commit("SET_ACCOUNT_ID", accountDetails.account_id);
      console.log("Account ID set in store:", accountDetails.account_id);
    } catch (error) {
      console.error("Error fetching account ID:", error);
    }
  },
  // async getContactList({ commit }, contacts = null) {
  //   commit("SET_LOADING", true);
  //   try {
  //     if (contacts) {
  //       commit("GET_CONTACT_LIST", contacts);
  //     } else {
  //       if (!window.client || !window.client.request) {
  //         throw new Error("Freshdesk client is not available.");
  //       }
  //       const response = await window.client.request.invokeTemplate(
  //         "get_contact_list"
  //       );
  //       const apiContacts = JSON.parse(response.response);
  //       commit("GET_CONTACT_LIST", apiContacts);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching contacts:", error);
  //     commit("GET_CONTACT_LIST", []);
  //   } finally {
  //     commit("SET_LOADING", false);
  //   }
  // },
  async getContactList({ commit }, contacts = null) {
    commit("SET_LOADING", true);
        let currentProduct=await window.client.instance.context();
        console.log("CURRENT PRODUCT",currentProduct.location);
        let product=currentProduct.location;
        let getFilterContactId = await window.client.request.invokeTemplate("get_contact_filter", {});
        let payload = JSON.parse(getFilterContactId.response)
        let contactId;
        let contactTypes = payload.filters
        contactTypes.filter((contactType) => {
          if (contactType.name == 'All Contacts') {
            contactId = contactType.id
          }
        })
        console.log("FILTER CONTACTS",contactId)
    try {
      if (contacts) {
        commit("GET_CONTACT_LIST", contacts);
      } else {
        if (!window.client || !window.client.request) {
          throw new Error("Freshdesk client is not available.");
        }
        if(product=='left_nav_cti'){
        const response = await window.client.request.invokeTemplate(
          "get_contact_list_crm",
          {
        context:{
          contactId:contactId
        }
      });
        console.log("Contact list response crm:", response);
        const apiContacts = JSON.parse(response.response);
        const apiContactsParsed=apiContacts.contacts || [];
        commit("GET_CONTACT_LIST", apiContactsParsed);
      }
      else {
      const response = await window.client.request.invokeTemplate(
          "get_contact_list",
          {
       
      });
        console.log("Contact list response desk:", response);
        const apiContacts = JSON.parse(response.response);
        const apiContactsParsed=apiContacts || [];
        commit("GET_CONTACT_LIST", apiContactsParsed);
      }
    }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      commit("GET_CONTACT_LIST", []);
    } finally {
      commit("SET_LOADING", false);
    }
 
  },
  async getcrmContactList({ commit }, contacts = null) {
    commit("SET_LOADING", true);
    try {
      if (contacts) {
        commit("GET_CRMCONTACT_LIST", contacts);
      } else {
        if (!window.client || !window.client.request) {
          throw new Error("Freshdesk client is not available.");
        }
        const response = await window.client.request.invokeTemplate(
          "get_crmcontact_list"
        );
        const apiContacts = JSON.parse(response.response);
        commit("GET_CRMCONTACT_LIST", apiContacts);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      commit("GET_CRMCONTACT_LIST", []);
    } finally {
      commit("SET_LOADING", false);
    }
  },

  // async createContact({ commit }, contactData) {
  //   try {
  //     if (!window.client || !window.client.request) {
  //       throw new Error("Freshdesk client is not available.");
  //     }
  //     const response = await window.client.request.invokeTemplate(
  //       "add_contact",
  //       {
  //         body: JSON.stringify(contactData),
  //       }
  //     );
  //     const createdContact = JSON.parse(response.response);
  //     commit("CREATE_CONTACT", createdContact);
  //   } catch (error) {
  //     console.error("Error creating contact:", error);
  //   }
  // },

  setLoading({ commit }, payload) {
    commit("SET_LOADING", payload);
  },

  pushContactList({ commit }, contact) {
    commit("PUSH_CONTACT_LIST", contact);
  },

  updatePageRoute({ commit }, route) {
    commit("SET_PAGE_ROUTE", route);
  },

  async getClientMethods({ commit }, client) {
    console.log("dispatching.....")
    try {
      const instanceContext = await client.instance.context();
      const freshchatAgentOrgAgentId = await client.data.get("loggedInUser");
      console.log("THIS IS FW AGENT DETAILS", freshchatAgentOrgAgentId);
      const data = await client.data.get("domainName");
      const iparams = await client.iparams.get();
      
      const methods = {
        interface: client.interface,
        location: instanceContext,
        data: {
          domainName: data?.domainName,
          freshdeskDomain: iparams?.domain
            ? `${iparams.domain}.freshdesk.com`
            : undefined,
        },
      };
      commit(
        "call/SET_FCRM_AGENT_NAME",
        freshchatAgentOrgAgentId.loggedInUser.display_name ||
          freshchatAgentOrgAgentId.loggedInUser.contact.name,
        { root: true }
      );
      commit(
        "call/SET_FRESHCHAT_AGENT_ORG_AGENT_ID",
        freshchatAgentOrgAgentId.loggedInUser.freshid_uuid ||
          freshchatAgentOrgAgentId.loggedInUser.org_agent_id,
        { root: true }
      );

      commit("SET_CLIENT_METHODS", methods);
    } catch (error) {
      console.error(" Failed to initialize client methods:", error);
    }
  },

  // UPDATED createTicketForCaller to accept dynamic payload
  async createTicketForCaller({ dispatch, state}, payload) {
    try {
      const contact = state.single_contact || {};

      // Get phone number from ongoing call or contact
      // const incomingPhone =
      //   rootState.call.current_call?.phoneNumber || contact.phone || "";

      const ticketData = {
        subject: payload.subject,
        description: payload.description,
        priority: payload.priority || 1,
        status: payload.status || 2,
        phone: incomingPhone,
        name: contact.name || "Unknown Caller",
      };

      console.log("Payload:", payload);

      console.log("Creating ticket with data:", ticketData);

      const response = await window.client.request.invokeTemplate(
        "create_ticket",
        {
          body: JSON.stringify(ticketData),
        }
      );

      const ticket = JSON.parse(response.response);
      console.log("Ticket created:", ticket);

      // Refresh ticket list for this phone number
      if (incomingPhone) {
        await dispatch("call/fetchTicketsByPhone", incomingPhone || "", {
          root: true,
        });
      }

      return ticket;
    } catch (err) {
      console.error("Error creating ticket:", err);
      throw err;
    }
  },

  async addNoteToTicket({ ticketId, noteBody }) {
    try {
      const response = await window.client.request.invokeTemplate(
        "add_ticket_note",
        {
          context: { ticket_id: ticketId },
          body: JSON.stringify({
            body: noteBody,
            private: false,
          }),
        }
      );
      const note = JSON.parse(response.response);
      console.log("Note added:", note);
      return note;
    } catch (err) {
      console.error("Error adding note:", err);
      throw err;
    }
  },
};

// const getters = {
//   contact_list: (state) => state.contact_list,
//   client_methods: (state) => state.client_methods,
//   loading: (state) => state.loading,
//   page_route: (state) => state.page_route,
// };

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};
