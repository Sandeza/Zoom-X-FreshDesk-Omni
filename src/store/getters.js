// const getters = {
//   //common.js
//   contact_list: (state) => state.common.contact_list,
//   page_route: (state) => state.common.page_route,
//   home_tab: (state) => state.common.home_tab,
//   call_logs: (state) => state.callLogs.call_logs,
//   create_contact_phone_number: (state) =>
//     state.call.create_contact_phone_number,
// };
// export default getters;
const getters = {
  // ===== COMMON MODULE =====
  contact_list_crm:(state)=>state.common.contact_list_crm,
  contact_list: (state) => state.common.contact_list,
  page_route: (state) => state.common.page_route,
  fdk_client: (state) => state.common.fdk_client,
  client_methods: (state) => state.common.client_methods,
  event_type: (state) => state.common.event_type,
  home_tab: (state) => state.common.home_tab,

  // If you still use these from common (check components):
  freshdesk_ticket_list: (state) => state.call.freshdesk_ticket_list,
  freshdesk_caller_name_common: (state) => state.common.freshdesk_caller_name,
  freshdesk_caller_number_common: (state) =>
    state.common.freshdesk_caller_number,
  freshdesk_caller_contact_id_common: (state) =>
    state.common.freshdesk_caller_contact_id,

  // ===== CALL MODULE (Only used/valid ones) =====

  // Core Call State
  conv_id: (state) => state.call.conv_id,
  call_state: (state) => state.call.call_state,
  current_call: (state) => state.call.current_call,
  loading: (state) => state.call.loading,
  recording_url: (state) => state.call.recording_url,
  // Contact/Ticket
  contact_name: (state) => state.call.contact_name,
  ticket_id: (state) => state.common.ticket_id,
  single_contact: (state) => state.call.single_contact,
  contact_id: (state) => state.call.contact_id,
  selected_ticket_id: (state) => state.call.selected_ticket_id,
  create_contact_phone_number: (state) => state.call.create_contact_phone, // ensure name matches

  // Freshchat/CRM IDs
  freshchat_user_id: (state) => state.call.freshchat_user_id,
  crm_contact_id: (state) => state.call.crm_contact_id,
  conversation_id: (state) => state.call.conversation_id,

  // Conversation related
  incoming_call_frag_flag: (state) => state.call.incoming_call_frag_flag,
  channel_id: (state) => state.call.channel_id,
  app_id: (state) => state.call.app_id,
  conversation_agent_id: (state) => state.call.conversation_agent_id,
  fcrm_loggedin_agent_uuid: (state) => state.call.fcrm_loggedin_agent_uuid,
  fcrm_loggedin_agent_name: (state) => state.call.fcrm_loggedin_agent_name,
  freshsales_caller_mcr_id: (state) => state.call.freshsales_caller_mcr_id,
  conversation_details: (state) => state.call.conversation_details,
  org_contact_id: (state) => state.call.org_contact_id,
account_id: (state) => state.common.account_id,
  // Call logs (from call.js or callLogs module)
  call_logs: (state) => state.callLogs.call_logs,
  conversation_internal_id: (state) => state.call.conversation_internal_id,
  // ===== CALLLOGS module =====
  call_logs_module: (state) => state.callLogs.call_logs,
  main_agent_id: (state) => state.call.main_agent_id,
  call_id: (state) => state.call.call_id,
  call_ended_flag: (state) => state.call.call_ended_flag,
  recording_completed_flag: (state) => state.call.recording_completed_flag
};

export default getters;
 
 