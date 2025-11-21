import store from "../store";

export async function Ringingg(client,event) {
    const { type, data: callData } = event;
  const callId = callData.callId;

  let callType = callData.callType;
  const isInbound = !callType && (/inbound|incoming/i.test(callData.direction || callData.callDirection || ""));
  callType = callType || (isInbound ? "INCOMING" : "OUTGOING");

  const phone_no = isInbound
    ? (callData.caller?.number || callData.caller?.phoneNumber || callData.phone)
    : (callData.callee?.number || callData.callee?.phoneNumber || callData.phone);
  const phone = normalizePhoneNumber(phone_no);
  const name = isInbound
    ? (callData.caller?.name || callData.caller?.phoneNumber || callData.phone)
    : (callData.callee?.name || callData.callee?.phoneNumber || callData.phone);

  if (!phone) {
    console.warn("[Handler] No phone number in ringing event");
    return;
  }

  store.commit("call/SET_CURRENT_CALL", {
    ...callData,
    status: "ringing",
    phoneNumber: phone,
    callerName: name,
    time: new Date().toISOString(),
  });

      try {
       const crmResp = await client.request.invoke(
            "findOrCreateFullCrmContactByPhone",
            { phone, name }
          );
          const crmContact = JSON.parse(crmResp.message);
          console.log("[Handler] CRM contact response:", crmContact);
          console.log("[Handler] CRM contact:", crmContact.contact.mcr_id);
          console.log("[Handler] CRM contact first_name:", crmContact.contact.first_name, "name field:", crmContact.contact.name);

          console.log("crm contact id type", typeof crmContact.contact.mcr_id);
          console.log(
            "crm contact id-big int",
            BigInt(crmContact.contact.mcr_id).toString()
          );
          store.commit("call/SET_CRM_CONTACT_ID", crmContact);
          // Use name from CRM contact, preferring 'name' field over 'first_name', fall back to passed name
          const contactNameToSet = crmContact.contact.name || crmContact.contact.first_name || name || "Unknown";
          console.log("[Handler] Setting contact name to:", contactNameToSet);
          store.commit("call/SET_CONTACT_NAME", contactNameToSet);
          store.commit(
            "call/ORG_CONTACT_ID",
            BigInt(crmContact.contact.mcr_id).toString()
          );
        } catch (e) {
          console.error("[Handler] CRM contact error", e);
          // Fallback: use name from event data if CRM call fails
          console.log("[Handler] Setting fallback contact name to:", name);
          store.commit("call/SET_CONTACT_NAME", name || "Unknown");
    }
}
export async function callRingingFragment(client,event) {
  const { type, data } = event;
  const callId = data.callId;
   const isInbound = data.direction === "inbound";
  const callType = isInbound ? "INCOMING" : "OUTGOING";
  const appId = store.getters.app_id;
  
  // Use cached channel ID to avoid repeated DB calls
  const channelIdFromCache = await getCachedChannelId(client);
  const channelId = channelIdFromCache || store.getters.channel_id;
  
  console.log("Channel ID (cached):", channelId);
  const conversationId = store.getters.conversation_id;
  const magent = store.getters.main_agent_id;
  const agentId = store.getters.fcrm_loggedin_agent_uuid;
  const agentName = store.getters.fcrm_loggedin_agent_name;
  const orgContactId = store.getters.org_contact_id;
  store.commit("call/SET_CALL_DETAILS", data.callId);
  const phoneNumber = isInbound
    ? data.caller?.number || data.caller?.phoneNumber
    : data.callee?.number || data.callee?.phoneNumber;
  const callerName = isInbound
    ? data.caller?.name
    : data.callee?.name;
      const payload = {
          channelId,
          freshchatAgentOrgAgentId: agentId,
          freshchatAgentorgAgentName: agentName,
          call_id: data.callId,
          callerNumber: phoneNumber,
          callType,
          callStatus: "INITIATED",
          callLifeCycleEventType: isInbound ? "INCOMING_INITIATED" : "OUTGOING_INITIATED",
          mcr_id: orgContactId,
          
        };
        console.log("[Handler] createConversationFreshchat payload:", payload);
        const conv_id = await client.request.invoke("createConversationFreshchat", payload);
         let conversation = null;
                
                // Parse the response
                if (conv_id?.message) {
                  try {
                    conversation = JSON.parse(conv_id.message);
                  } catch (parseErr) {
                    console.warn("[Handler] Failed to parse conversation response:", parseErr);
                    conversation = null;
                  }
                }
                console.log("[Handlervic] Conversation created/ retrieved:", conversation);
        store.commit("call/SET_CONV", conversation.conversation_internal_id);
        store.commit("call/SET_CONVERSATION_ID", conversation.conversation_id);

}