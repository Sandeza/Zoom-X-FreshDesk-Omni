// store/modules/call.js

const state = {
  call_state: "ringing",
  call_id: "",
  call_log_id: "",
  call_time: "",
  call_event_type: "",
  call_direction: "inbound",
  call_duration: "",
  call_voicemail_url: "",
  call_enable_auto: false,
  call_recording_url: "",
  voice_mail_url: "",

  caller_number: "",
  caller_extension_number: "",
  caller_name: "Zoom Agent",
  caller_extension_id: "",
  caller_extension_type: "",

  callee_name: "Unknown Caller",
  callee_number: "",
  callee_extension_type: "",
  callee_extension_number: "",
  callee_id: "",

  freshdesk_user_name: "",
  freshdesk_user_phone: "",
  freshdesk_user_id: "",
  freshdesk_ticket_list: [],

  automatic_ticket_creation: false,
  recording_url_for_ticket: "",
  create_contact_phone: "",
  selected_ticket_id: 0,
  contact_id: "",
  freshchat_user_id: "",
  crm_contact_id: "",
  conversation_id: "",
  conversation_internal_id: "",
  org_contact_id: "",
  // conversation_id:"46ba2079-6b7e-486e-9bbd-6dcda21c7aa8",
  call_was_answered: false,

  current_call: null,
  is_calling: false,
  loading: false,
  call_logs: [],
  single_contact: null,
  incoming_call_frag_flag: false,
  app_id: "",
  recording_url: "",

  conversation_agent_id: null,
  main_agent_id: "",
  fcrm_loggedin_agent_uuid: null,
  fcrm_loggedin_agent_name: null,
  freshsales_caller_mcr_id: null,
  conversation_details: "",
  contact_name: "",
  // channel_id: "99269469-20c3-4eaa-a196-8e5e4cde9031",
  channel_id: "",
  call_ended_flag: false,
  recording_completed_flag:false
};

const mutations = {
  SET_CONTACT_NAME(state, name) {
    state.contact_name = name;
    console.log("SET_CONTACT_NAME", name);
  },
  SET_RECORDING_COMPLETED_FLAG(state, value) {
    state.recording_completed_flag = value;
  },
  SET_CONVERSATION_FUID(state, id) {
    state.main_agent_id = id;
    console.log("SET_CONVERSATION_FUID", id);
  },
  SET_CALL_ENDED_FLAG(state, value) {
    state.call_ended_flag = value;
  },
  SET_CALL_DETAILS(state, data) {
    state.call_id = data;
  },
  //     (state.call_event_type = data.rawEvent.type),
  //     (state.call_direction = data.direction),
  //     (state.call_recording_url = data.recordingUrl),
  //     (state.call_voicemail_url = data.voicemail || ""),
  //     (state.caller_number = data.caller.phoneNumber),
  //     // state.caller_extension_id=data.caller.extensionId||"",
  //     // state.caller_extension_number=data,
  //     (state.caller_extension_type = data.extensionType),
  //     (state.callee_name = data.callee.name),
  //     (state.callee_number = data.callee.phoneNumber),
  //     (state.callee_extension_number = data.callee.extensionNumber),
  //     (state.callee_extension_type = data.callee.extensionType);
  //   console.log("SET_CALL_DETAILS", data, data.rawEvent);
  // },
  SET_CHANNEL_ID(state, channelId) {
    state.channel_id = channelId;
    console.log("SET_CHANNEL_ID", channelId);
  },
  ORG_CONTACT_ID(state, org_contact_id) {
    state.org_contact_id = org_contact_id;
    console.log("SET_org_contact_ID", org_contact_id);
  },
  SET_CALL_WAS_ANSWERED(state, value) {
    state.call_was_answered = value;
  },
  SET_SINGLE_CONTACT(state, contact) {
    state.single_contact = contact;
    console.log("SET_SINGLE_CONTACT", contact);
  },
  SET_CONTACT_ID(state, id) {
    state.contact_id = id;
    console.log("SET_CONTACT_ID", id);
  },
  SET_FRESHCHAT_USER_ID(state, id) {
    state.freshchat_user_id = id;
    console.log("SET_FRESHCHAT_USER_ID", id);
  },
  SET_CRM_CONTACT_ID(state, id) {
    state.crm_contact_id = id;
    console.log("SET_CRM_CONTACT_ID", id);
  },
  SET_CONVERSATION_ID(state, id) {
    state.conversation_id = id;
    console.log("SET_CONVERSATION_ID", id);
  },
  SET_CONVERSATION_INTERNAL_ID(state, id) {
    state.conversation_internal_id = id;
    console.log("SET_CONVERSATION_INTERNAL_ID", id);
  },
  SET_CONVERSATION_AGENT_ID(state, id) {
    state.conversation_agent_id = id;
    console.log("SET_CONVERSATION_AGENT_ID", id);
  },
  SET_CONVERSATION_DETAILS(state, data) {
    state.conversation_details = data;
    console.log("SET_CONVERSATION_DETAILS", data);
  },
  SET_CONVERSATION_APPID(state, data) {
    state.app_id = data;
    console.log("SET_CONVERSATION_APPID", data);
  },
  SET_CURRENT_CALL(state, call) {
    state.current_call = call;
    state.is_calling = !!call;
    
  },
  CLEAR_CURRENT_CALL(state) {
    state.current_call = null;
    state.is_calling = false;
    state.conversation_id = null;
    console.log("CLEAR_CURRENT_CALL");
  },
  ADD_CALL_LOG(state, log) {
    state.call_logs.unshift(log);
    if (state.call_logs.length > 50) state.call_logs.pop();
  },
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  SET_FRESHDESK_TICKETS(state, tickets) {
    state.freshdesk_ticket_list = tickets;
  },
  SET_SELECTED_TICKET(state, ticketId) {
    state.selected_ticket_id = ticketId;
  },
  SET_INCOMING_CALL_FRAG_FLAG(state, flag) {
    state.incoming_call_frag_flag = flag;
  },
  SET_CHANNEL_ID(state, channelId) {
    state.channel_id = channelId;
    console.log("SET_CHANNEL_ID", channelId);
  },
  SET_FCRM_AGENT_NAME(state, name) {
    state.fcrm_loggedin_agent_name = name;
    console.log("SET_FCRM_AGENT_NAME", name);
  },
  SET_FRESHCHAT_AGENT_ORG_AGENT_ID(state, uuid) {
    state.fcrm_loggedin_agent_uuid = uuid;
    console.log("SET_FRESHCHAT_AGENT_ORG_AGENT_ID", uuid);
  },
  SET_FRESHSALES_CALLER_MCR_ID(state, mcr_id) {
    state.freshsales_caller_mcr_id = mcr_id;
    console.log("SET_FRESHSALES_CALLER_MCR_ID", mcr_id);
  },
  SET_RECORDING_URL(state, url) {
    state.recording_url = url;
    
  },
};

const actions = {
  setConversationId({ commit }, id) {
    commit("SET_CONVERSATION_ID", id);
  },
  setRecordingCompletedFlag({ commit }, value) {
    commit("SET_RECORDING_COMPLETED_FLAG", value);
  },
  /**
   * Called by handler.js after an incoming call event.
   * Just updates state and (optionally) triggers callLogs update.
   */
  setCallEndedFlag({ commit }, value) {
    commit("SET_CALL_ENDED_FLAG", value);
  },
  setConversationInternalId({ commit }, id) {
    commit("SET_CONVERSATION_INTERNAL_ID", id);
  },
  setRecordingUrl({ commit, dispatch }, callData) {
    commit("SET_RECORDING_URL", callData);
  },
  handleIncomingCallFromHandler(
    { commit, dispatch },
    { phone, name, callType, logEntry }
  ) {
    commit("SET_CURRENT_CALL", {
      status: callType,
      phoneNumber: phone,
      callerName: name,
      time: new Date().toISOString(),
    });
    // if (logEntry) {
    //   dispatch("callLogs/addCallLog", logEntry, { root: true });
    // }
  },

  // clearCurrentCall({ commit }) {
  //   commit("CLEAR_CURRENT_CALL");
  // },

  setLoading({ commit }, value) {
    commit("SET_LOADING", value);
  },
};

const getters = {
  current_call: (state) => state.current_call,
  is_calling: (state) => state.is_calling,
  call_logs: (state) => state.call_logs,
  single_contact: (state) => state.single_contact,
  contact_id: (state) => state.contact_id,
  freshchat_user_id: (state) => state.freshchat_user_id,
  conversation_id: (state) => state.conversation_id,
  incoming_call_frag_flag: (state) => state.incoming_call_frag_flag,
  // channel_id: (state) => state.channel_id,
  fcrm_loggedin_agent_uuid: (state) => state.fcrm_loggedin_agent_uuid,
  fcrm_loggedin_agent_name: (state) => state.fcrm_loggedin_agent_name,
  contact_name: (state) => state.contact_name,
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters,
};
