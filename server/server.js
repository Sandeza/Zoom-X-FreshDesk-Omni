const DB_KEY = "Zoom_BYOT";
const convId = "";
async function getInstallerDetails(params) {
  console.log("on app install payload",params)
    try{
        const appDetails = {}
        appDetails.name = "Zoom_BYOT"
        appDetails.domain = params.iparams.crm_domain
        appDetails.time = params.timestamp
        appDetails.account_id = params.iparams.account_id
        appDetails.region = params.region
        appDetails.email = params.iparams.email_id
        console.log("appDetails",appDetails)
 
        const response = await $request.invokeTemplate(
        "goToOnappinstallApi",
        {
            body: JSON.stringify({
            eventType: "onAppInstallCallback",
            appDetails: appDetails
            }),
        }
        );
        console.log("this is getInstallerDetails  dataResponse ", response)
        
    }catch(error){
      console.log("getInstallerDetails error",error)
    }
 
}
exports = {
  saveCallNotes: async function (args) {  
    console.log("Saving call notes in server:", args);
     data = {
     
        description: args.notes,
        targetable_type: 'Contact',
        targetable_id: args.contactId,
     
    }
    try {
    const result = await $request.invokeTemplate(
        "saveCallNotes",
        {
          body: JSON.stringify({ description: args.notes, targetable_type: 'Contact', targetable_id: args.contactId }),
        }
      );
      console.log("Call notes saved result:", result);
    } catch (error) {
      console.error("Error saving call notes:", error);
    }
   },
  voiceMailInFChat: async function (options) {
    console.log("Updating voicemail from user", options);

    try {
      const payload = {
        app_id: options.appId,
        actor_type: "user",
        org_actor_id: options.orgContactId,
        channel_id: options.channelId,
        message_type: "normal",
        message_parts: [
          {
            call: {
              call_id: options.call_id,
              phone_number: options.phoneNumber,
              call_provider: "Zoom Phone",
              call_type: "INCOMING",
              call_status: "VOICE_MAIL",
              call_life_cycle_event_type: "VOICE_MAIL_DROP",
              call_duration: "0",
              recording_available: "true",
              recording_playable: "false",
              recording_link: options.voicemail_link,
              callback_available:"true"

            },
          },
        ],
        users: [
          {
            org_contact_id: options.orgContactId,
          },
        ],
      };

      console.log(
        "Conversation updated successfully ",
        JSON.stringify(payload)
      );

      const result = await $request.invokeTemplate(
        "onUpdateRecordingsInFChatConvo",
        {
          context: { conversationId: options.conversationId },
          body: JSON.stringify(payload),
        }
      );

      console.log("✅ Conversation updated successfully:", result);
      renderData({ status: 200, message: "Conversation updated successfully" });
    } catch (error) {
      console.error("❌ Error in getFreshchatAgents server function:", error);
      return { status: 400, message: error.result };
    }
  },

  getAccountId: async function () {
    // console.log("Fetching freshchat users");
    try {
      const response = await $request.invokeTemplate(
        "getFreshchatAccountDetails",
        {}
      );
      // console.log("✅ Freshchat users fetched:", response);
      renderData({ status: 200, message: response.response });
    } catch (error) {
      // console.error("❌ Error fetching freshchat users:", error);
      renderData({ status: 200, message: response.response });
    }
  },

  onAddPrivateNotesInFreshchat: async function (options) {
    // console.log("📝 Adding private note:", options);
    // const disposition = options.notesData.Disposition
    //   ? options.notesData.Disposition
    //   : "no Disposition";
    try {
      const payload = {
        message_parts: [
          {
            text: {
              content: `<html>${options.notes}</html>`,
            },
          },
        ],
        message_type: "private",
        actor_type: "agent",
        actor_id: options.agentId,
      };
      // console.log("Payload to Freshchat API:", JSON.stringify(payload));
      const result = await $request.invokeTemplate(
        "onAddPrivateNotesInFreshchat",
        {
          context: {
            conversationId: options.conversationId,
          },

          body: JSON.stringify(payload),
        }
      );

      // console.log("✅ Private note added:", result);
      renderData({ status: 200, message: result.response });
    } catch (error) {
      // console.error("❌ Error adding private note:", error);
      renderData({ status: 400, message: JSON.stringify(error) });
    }
  },
  listAgents: async function (args) {
    // console.log("LosttheAgent");
    try {
      const resp = await $request.invokeTemplate("listAgents", {
        context: {
          role_id: args.role_id === "ADMIN",
          login_status: args.login_status === true,
        },
      });
      // const result = resp.response;
      // console.log("agentData", JSON.parse(result));
      renderData({ status: 200, message: resp.response });
    } catch (err) {
      // console.error("[SERVER] listAgents error:", err);
      renderData({ status: 400, message: String(err) });
    }
  },

  onAppInstallHandler: async function (params) {
    // console.log(" App installed  ensuring Zoom-Phone channel exists");
    await getInstallerDetails(params)
    try {
      // Call request template to get Freshchat channels
      const response = await $request.invokeTemplate(
        "OnGetFreshChatChannel",
        {}
      );
      // console.log(" Raw Channels API response:", response);

      // Parse channels object
      const parsed = JSON.parse(response.response);
      const channels = parsed.channels || [];
      console.log(" Parsed Channels Array:", channels);

      // Check if Zoom-Phone channel exists
      let zoomChannel = channels.find((c) => c.name === "Zoom-Phone");

      if (!zoomChannel) {
        console.log(" Creating Zoom-Phone channel...");
        const createResp = await $request.invokeTemplate(
          "OnCreateFreshChatChannel",
          {
            body: JSON.stringify({
              name: "Zoom-Phone",
              source: "PHONE",

              channel_type: "PRIVATE",
            }),
          }
        );
        zoomChannel = JSON.parse(createResp.response).channel; // ✅ fix: channel object
        console.log("✅ Created Zoom-Phone channel:", zoomChannel);
      } else {
        console.log("ℹ️ Zoom-Phone channel already exists:", zoomChannel);
      }

      // Save channel info in DB
      await $db.set(DB_KEY, {
        zoomPhoneChannelId: zoomChannel.id,
        createdAt: Date.now(),
      });
      console.log("📂 Current DB entries:", await $db.get(DB_KEY));
    } catch (err) {
      console.error("❌ Error during app install:", err);
    }
    renderData();
    // const dbData = await $db.get(DB_KEY);
    // const channelId = dbData.zoomPhoneChannelId;
    // renderData(null, { channelId: channelId });
  },
  // -------------------------
  // App Uninstall
  // -------------------------
  onAppUninstallHandler: async function () {
    console.log(
      "🗑️ App uninstall  clearing DB entry but keeping zoom_byot key"
    );

    try {
      // Use DB_KEY variable, not string
      await $db.set(DB_KEY, {
        zoomPhoneChannelId: null,
        createdAt: null,
      });

      // Log current DB to confirm
      const data = await $db.get(DB_KEY);
      console.log("📂 Current DB entries after uninstall:", data);
    } catch (err) {
      console.error("❌ Error clearing DB entry:", err);
    }
    renderData();
  },
  // --- CALL RELATED FUNCTIONS (from call.js) ---

  findOrCreateFreshdeskContact: async function (args) {
    // console.log("[FIND_OR_CREATE_FRESHDESK_CONTACT] args:", args);
    try {
      // console.log("[FD_CONTACT] Searching Freshdesk by phone:", args.phone);
      const resp = await $request.invokeTemplate("search_user_by_phone", {
        context: { phone_number: args.phone },
      });
      // console.log("[FD_CONTACT] Search response raw:", resp.response);

      const contacts = JSON.parse(resp.response);
     // console.log("[FD_CONTACT] Parsed contacts:", contacts);

      if (contacts.length) {
        // Contact found, now fetch tickets for this contact
        const contact = contacts[0];
        // console.log("[FD_CONTACT] Found existing contact:", contact);

        // Fetch tickets for this contact
        const ticketsResp = await $request.invokeTemplate("list_user_tickets", {
          context: { contact_id: contact.id },
        });
        const tickets = JSON.parse(ticketsResp.response);
      // console.log("[FD_CONTACT] Tickets for contact:", tickets);

        // Return both contact and tickets
        renderData({
          status: 200,
          message: JSON.stringify({ contact, tickets }),
        });
        return;
      }

      // No contact found, return empty contact and tickets
      // console.log("[FD_CONTACT] No existing contact found.");
      renderData({
        status: 200,
        message: JSON.stringify({ contact: null, tickets: [] }),
      });
    } catch (err) {
      // console.error("[FD_CONTACT] ERROR:", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },

 findOrCreateFullCrmContactByPhone: async function (args) {
    // console.log("[CRM_CONTACT] args:", args);
    try {
      // console.log("[CRM_CONTACT] Searching CRM by phone:", args.phone);
      const contactsResp = await $request.invokeTemplate("search_crm_contact", {
        body: JSON.stringify({
          filter_rule: [
            { attribute: "mobile_number", operator: "is", value: args.phone },
          ],
        }),
      });
    console.log("[CRM_CONTACT] Search response raw:", contactsResp.response);

      const data = JSON.parse(contactsResp.response);
      // console.log("[CRM_CONTACT] Parsed data:", data);
      let finalData = data; // keep same variable name usage

    if (!data.contacts || data.contacts.length === 0) {
      console.log("[CRM_CONTACT] No contacts found with mobile_number, trying work_number",data);
      const workSearchResp = await $request.invokeTemplate("search_crm_contact", {
        body: JSON.stringify({
          filter_rule: [
            { attribute: "work_number", operator: "is", value: "+" + args.phone },
          ],
        }),
      });

      const workData = JSON.parse(workSearchResp.response);

      if (workData.contacts && workData.contacts.length > 0) {
        finalData = workData; // override with work_number results
      }
    }
   
    console.log("[CRM_CONTACT] Final search data:", finalData);
      if (finalData.contacts && finalData.contacts.length) {
        // console.log("[CRM_CONTACT] Found contact:", finalData.contacts[0]);
        const contactId = finalData.contacts[0].id;
        // console.log("[CRM_CONTACT] Fetching full details for ID:", contactId);

        const fullContactResp = await $request.invokeTemplate(
          "get_crm_contact_by_id",
          {
            context: { contact_id: contactId },
          }
        );
      console.log(
        "[CRM_CONTACT] Full contact details:",
          fullContactResp.response
        );

        renderData({ status: 200, message: fullContactResp.response });
        return;
      }

      // console.log("[CRM_CONTACT] No contact found. Creating...");
      const newContactResp = await $request.invokeTemplate("create_contact", {
        body: JSON.stringify({
          contact: {
            first_name:args.phone||args.name,
            mobile_number: args.phone,
          },
        }),
      });
      
      console.log(
        "[CRM_CONTACT] Create response raw:",
        newContactResp.response
      );

      const newContact = JSON.parse(newContactResp.response);
      // console.log("[CRM_CONTACT] Created contact:", newContact);

      const id =
        newContact?.id ||
        newContact?.org_contact_id ||
        newContact?.mcr_id ||
        newContact?.contact?.id;
      // console.log("[CRM_CONTACT] Resolved contact ID:", id);

      if (!id)
        throw new Error("Created CRM contact but could not determine ID");

      // console.log("[CRM_CONTACT] Fetching details for new ID:", id);
      const fetched = await $request.invokeTemplate("get_crm_contact_by_id", {
        context: { contact_id: id },
      });
      // console.log("[CRM_CONTACT] New contact details:", fetched.response);

      renderData({ status: 200, message: fetched.response });
    } catch (err) {
      // console.error("[CRM_CONTACT] ERROR:", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },


  getFreshchatUserIdFromCrm: async function (args) {
    // console.log("[FRESHCHAT_USER] args:", args);

    // Delay helper compatible with restricted environment
    function delay(ms) {
      return new Promise((resolve) => {
        if (typeof setTimeout === "function") {
          setTimeout(resolve, ms);
        } else {
          // No native setTimeout, resolve immediately
          resolve();
        }
      });
    }

    // Retry search function with delay between attempts
    async function retrySearch(phone, attempts = 10, delayMs = 3000) {
      for (let i = 0; i < attempts; i++) {
        const resp = await $request.invokeTemplate("freshchat_userid", {
          context: { phone },
        });
        const data = JSON.parse(resp.response);
        if (data.users && data.users.length > 0) {
          return data.users[0];
        }
        // console.log(
        //   `[FRESHCHAT_USER] Retry #${
        //     i + 1
        //   }: User not found, retrying after delay...`
        // );
        await delay(delayMs);
      }
      return null;
    }

    try {
      // console.log(
      //   "[FRESHCHAT_USER] Searching Freshchat user by phone:",
      //   args.phone
      // );

      // Initial search
      let user = await retrySearch(args.phone);

      if (user) {
        // console.log("[FRESHCHAT_USER] Found existing user:", user);
        renderData({ status: 200, message: JSON.stringify(user) });
        return;
      }

      // No user found, create one
      const payload = {
        phone: args.phone,
        first_name: args.name,
      };
      // console.log("[FRESHCHAT_USER] Creating user with payload:", payload);

      const createResp = await $request.invokeTemplate("create_user", {
        body: JSON.stringify(payload),
      });
      // console.log("[FRESHCHAT_USER] Create response raw:", createResp.response);

      // Wait before retrying the search
      await delay(1500);

      // Search again after creation
      user = await retrySearch(args.phone);

      if (user) {
        // console.log("[FRESHCHAT_USER] Found user after creation:", user);
        renderData({ status: 200, message: JSON.stringify(user) });
      } else {
        // console.log(
        //   "[FRESHCHAT_USER] Still no user after creation, returning create response"
        // );
        renderData({ status: 200, message: createResp.response });
      }
    } catch (err) {
      // console.error("[FRESHCHAT_USER] ERROR:", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },

  createConversationFreshchat: async function (options) {
    console.log("[Server] createConversationFreshchat called", options);
    try {
      const data = {
        channel_id: options.channelId,
        assigned_org_agent_id: options.freshchatAgentOrgAgentId,
        ext_entity_meta: {
          type: "PHONE",
          ext_id: options.call_id,
          meta: {
            call_id: options.call_id,
            phone_number: options.callerNumber,
            call_provider: "ZOOM_PHONE",
            call_type: options.callType,
            call_status: options.callStatus,
            call_life_cycle_event_type: options.callLifeCycleEventType,
            call_duration: null,
            picked_org_agent: {
              type: "AGENT",
              label: options.freshchatAgentorgAgentName,
              id: options.freshchatAgentOrgAgentId,
            },
          },
        },
        users: [
          {
            org_contact_id: options.mcr_id,
          },
        ],
      };
      console.log("[Server] createConversationFreshchat payload:", data);

      const response = await $request.invokeTemplate("create_conversation", {
        body: JSON.stringify(data),
      });
      const result = JSON.parse(response.response);
      // convId=result.conversation_id;
      // console.log("convId from server",convId)
      console.log("[Server] createConversationFreshchat response:", result);
      renderData({ status: 200, message: JSON.stringify(result) });
    } catch (err) {
      // Check if error is "pre-exists" type
      const errMsg = String(err?.message || err?.response || "").toLowerCase();
      if (errMsg.includes('pre-exists') && options.call_id) {
        console.log("[Server] Conversation pre-exists for call_id:", options.call_id);
        console.log("[Server] Returning pre-exists response with call details so client can cache them");
        // Return a response that indicates pre-exists but includes the call details
        // so the client can cache the conversation info
        renderData({ 
          status: 200, 
          message: JSON.stringify({
            pre_exists: true,
            convo:result,
            call_id: options.call_id,
            channel_id: options.channelId,
            assigned_agent_id: options.freshchatAgentOrgAgentId
          })
        });
      } else {
        console.error("[Server] createConversationFreshchat error", err);
        renderData({ status: 400, message: JSON.stringify(err) });
      }
    }
  },

  /**
   * Update an existing Freshchat conversation with call details.
   */
  updateConversationInFreshchat: async function (options) {
    console.log(
      ".....[Server] updateConversationInFreshchat received:",
      options
    );

    try {
      // Map the handler's flat message into the nested payload
      // Use AIRCALL_CTI if you want chat features to appear, per the PDF recommendation
      const data = {
        channel_id: options.channelId,
        assigned_org_agent_id: options.freshchatAgentOrgAgentId,
        ext_entity_meta: {
          type: "PHONE",
          ext_id: options.call_id,
          meta: {
            call_id: options.call_id,
            phone_number: options.callerNumber,
            call_provider: "ZOOM_CTI", // use this for Freshchat fragment support!
            call_type: options.callType,
            call_status: options.callStatus,
            call_life_cycle_event_type: options.callLifeCycleEventType,
            call_duration: 0, // never use null, always 0
            picked_org_agent: {
              type: "AGENT",
              label: options.freshchatAgentorgAgentName,
              id: options.freshchatAgentOrgAgentId,
            },
          },
        },
        users: [{ org_contact_id: options.mcr_id }],
      };

      // Always log the full nested payload
      // const bodyJson = JSON.stringify(data, null, 2);
      console.log("[Server] updateConversationInFreshchat full payload:", data);
      // console.log("[Server] updateConversationInFreshchat payload: ", options);
      console.log("Payload to Freshchat API ::", options.body);

      const response = await $request.invokeTemplate(
        "onUpdateConversationInFchat",
        {
          context: { conversationId: options.conversationId },
          body: JSON.stringify(data),
        }
      );

      const result = JSON.parse(response.response);
      console.log("[Server] updateConversationInFreshchat response:", result);

      renderData({ status: 200, message: JSON.stringify(result) });
    } catch (err) {
      console.error("[Server] updateConversationInFreshchat error:", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },

  /**
   * Add call recordings to a Freshchat conversation.
   */
  updateRecordingsInFreshChatConvo: async function (options) {
    console.log("...[Server] updateRecordingsInFreshChatConvo called", options);
    try {
      // let recordingData = {
      //   app_id: options.conversationAppId,
      //   actor_type: options.actor_type,
      //   org_actor_id: options.mcr_id,
      //   channel_id: options.channelId,
      //   message_type: "normal",
      //   message_parts: [
      //     {
      //       call: {
      //         call_id: options.call_id,
      //         phone_number: options.callerNumber,
      //         call_provider: "DIALPAD_CTI",
      //         call_type: options.callType,
      //         call_status: options.callStatus,
      //         call_life_cycle_event_type: options.call_life_cycle_event_type,
      //         call_duration: options.call_duration || 0,
      //         recording_available: "true",
      //         recording_playable: "false",
      //         recording_link: options.recording_link,
      //         picked_org_agent: {
      //           type: "AGENT",
      //           label: options.freshchatAgentorgAgentName,
      //           id: options.freshchatAgentOrgAgentId
      //         }
      //       }
      //     }
      //   ]
      // };
      const recordingPayload = {
        message_parts: [
          {
            call: {
              call_id: options.call_id,
              phone_number: options.callerNumber,
              call_provider: "Zoom Phone",
              call_type: options.callType,
              call_status: "COMPLETED",
              call_life_cycle_event_type: "CALL_RECORDING_AVAILABLE",
              call_duration: 60,
              recording_available: true,
              recording_playable: false,
              recording_link: options.recording_link,
              picked_org_agent: {
                type: "AGENT",
                id: options.freshchatAgentOrgAgentId,
                label: options.freshchatAgentorgAgentName,
              },
            },
          },
        ],
        message_type: "normal",
        actor_type: "agent",
        actor_id: options.freshchatAgentOrgAgentId,
      };
      console.log(
        "[Server] updateRecordingsInFreshChatConvo payload:",
        JSON.stringify(recordingPayload)
      );
      console.log("Payload to Freshchat API :", options);

      const response = await $request.invokeTemplate(
        "onUpdateRecordingsInFChatConvo",
        {
          context: { conversationId: options.conversationId },
          body: JSON.stringify(recordingPayload),
        }
      );
      const result = JSON.parse(response.response);
      console.log(
        "[Server] updateRecordingsInFreshChatConvo response:",
        result
      );
      renderData({ status: 200, message: JSON.stringify(result) });
    } catch (err) {
      console.error("[Server] updateRecordingsInFreshChatConvo error", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },

  /**
   * Update a Freshchat conversation for a missed call.
   */


  updateCallAgentPicked: async function (options) {
    console.log(" Updating conversation on agent picked up:", options);

    try {
      // Decide call type
      // const isIncoming = data.callDirection === "INCOMING_CALL";
      // const conversationId = options.conversationId;
      const payload = {
        channel_id: options.channelId,
        assigned_org_agent_id: options.freshchatAgentOrgAgentId,
        ext_entity_meta: {
          type: "PHONE",
          ext_id: options.call_id, // same as call_id below
          meta: {
            call_id: options.call_id,
            phone_number: options.callerNumber,
            call_provider: "Zoom Phone",
            call_type: options.callType,
            call_status: options.callStatus,
            call_life_cycle_event_type: options.callLifeCycleEventType,
            picked_org_agent: {
              type: "AGENT",
              id: options.mainagentid,
              label: options.freshchatAgentorgAgentName,
            },
          },
        },
        users: [
          {
            org_contact_id: options.mcr_id,
          },
        ],
      };

      console.log("📤 Payload to Freshchat template:", payload);

      const result = await $request.invokeTemplate(
        "onUpdateConversationInFchat",
        {
          context: { conversationId: options.conversationId },
          body: JSON.stringify(payload),
        }
      );

      console.log("✅ Conversation updated successfully:", result);
      renderData({ status: 200, message: "Conversation updated successfully" });
    } catch (error) {
      console.error("❌ Error updating conversation:", error);
      renderData({ status: 400, message: JSON.stringify(error) });
    }
  },
  updateCallEnd: async function (options) {
    console.log("call ended options", options);
    try {
      const callEndedPayload = {
        channel_id: options.channel_id,
        assigned_org_agent_id: options.assigned_org_agent_id,
        ext_entity_meta: {
          type: "PHONE",
          ext_id: options.call_id,
          meta: {
            call_id: options.call_id,
            phone_number: options.phone_number,
            call_provider: "Zoom Phone",
            call_type: options.call_type,
            call_status: options.call_status,
            call_life_cycle_event_type: options.call_life_cycle_event_type,
            call_duration: 60,
            picked_org_agent: {
              type: "AGENT",
              id: options.agentid,
              label: options.label,
            },
          },
        },
        users: [{ org_contact_id: options.orgContactId }],
      };
      console.log("payload for call end", callEndedPayload);
      const callEndedResult = await $request.invokeTemplate(
        "onUpdateConversationInFchat",
        {
          context: { conversationId: options.conversationId }, // same hardcoded convoId
          body: JSON.stringify(callEndedPayload),
        }
      );

      console.log("✅ Call Ended logged after missed call:", callEndedResult);

      renderData({
        status: 200,
        message: "Call Ended sequence completed",
      });
    } catch (error) {
      console.error("❌call ended sequence:", error);
      renderData({ status: 400, message: JSON.stringify(error) });
    }
  },
    updateCallEndvoice: async function (options) {
    console.log("call ended options", options);
    try {
      const callEndedPayload = {
        channel_id: options.channel_id,
        assigned_org_agent_id: options.assigned_org_agent_id,
        ext_entity_meta: {
          type: "PHONE",
          ext_id: options.call_id+Date.now(),
          meta: {
            call_id: options.call_id,
            phone_number: options.phone_number,
            call_provider: "Zoom Phone",
            call_type:"INCOMING",
            call_status: options.call_status,
            call_life_cycle_event_type: options.call_life_cycle_event_type,
            call_duration: 60,
            picked_org_agent: {
              type: "AGENT",
              id: options.agentid,
              label: options.label,
            },
          },
        },
        users: [{ org_contact_id: options.orgContactId }],
      };
      console.log("payload for call end", callEndedPayload);
      const callEndedResult = await $request.invokeTemplate(
        "callEndedNotifiFchat",
        {
          context: { conversationId: options.conversationId }, // same hardcoded convoId
          body: JSON.stringify(callEndedPayload),
        }
      );

      console.log("✅ Call Ended logged after voicemail :", callEndedResult);

      renderData({
        status: 200,
        message: "Call Ended sequence completed",
      });
    } catch (error) {
      console.error("❌call ended sequence:", error);
      renderData({ status: 400, message: JSON.stringify(error) });
    }
  },
  missedCallCreateConvoFchat: async function (options) {
    console.log("[Server] missedCallCreateConvoFchat called ", options);
    try {
      
      const actorType = options.call_type === "INCOMING" ? "user" : "agent";
      const actorId =
        options.call_type === "INCOMING"
          ? options.orgContactId
          : options.agentId;
      const missedCallPayload = {
        message_parts: [
          {
            call: {
              call_id: options.call_id ,
              phone_number: options.phone_number,
              call_provider: "Zoom Phone",
              call_type: options.call_type || "INCOMING",
              call_status: "MISSED_CALL",
              call_life_cycle_event_type:
                options.call_life_cycle_event_type || "MISSED_CALL",
              call_duration: 0,
              picked_org_agent: {
                type: "AGENT",
                id: options.agentId,
              },
            },
          },
        ],
        message_type: "normal",
        actor_type: actorType,
        org_actor_id: actorId,
      };
      console.log("payload for missed call", JSON.stringify(missedCallPayload));
      console.log("DAta", JSON.stringify(options.conversationId));
      const missedResult = await $request.invokeTemplate(
        "missedCallCreateConvoFchat",
        {
          context: { conversationId: options.conversationId }, // hardcoded convoId
          body: JSON.stringify(missedCallPayload),
        }
      );

      console.log("✅ Missed call logged:", missedResult);

      // ------------------ Step 2: Hardcoded Call Ended ------------------

      const callEndedPayload = {
        channel_id: options.channel_id,
        assigned_org_agent_id: options.assigned_org_agent_id,
        ext_entity_meta: {
          type: "PHONE",
          ext_id: options.call_id,
          meta: {
            call_id: options.call_id,
            phone_number: options.phone_number,
            call_provider: "Zoom Phone",
            call_type: options.call_type,
            call_status: options.call_status,
            call_life_cycle_event_type: options.call_life_cycle_event_type,
            call_duration: 60,
            picked_org_agent: {
              type: "AGENT",
              id: options.agentid,
              label: options.label,
            },
          },
        },
        users: [{ org_contact_id: options.orgContactId }],
      };
      console.log("payload for call end", callEndedPayload);
      const callEndedResult = await $request.invokeTemplate(
        "onUpdateConversationInFchat",
        {
          context: { conversationId: options.conversationId }, // same hardcoded convoId
          body: JSON.stringify(callEndedPayload),
        }
      );

      console.log("✅ Call Ended logged after missed call:", callEndedResult);

      renderData({
        status: 200,
        message: "Hardcoded Missed call + Call Ended sequence completed",
      });
    } catch (error) {
      console.error("❌ Error in missed call + call ended sequence:", error);
      renderData({ status: 400, message: JSON.stringify(error) });
    }
  },

  /**
   * Update a Freshchat conversation with voicemail recording.
   */
  updateVoiceMailRecording: async function (options) {
    console.log("[Server] updateVoiceMailRecording called", options);
    try {
      const data = {
        app_id: options.conversationAppId,
        actor_type: "user",
        org_actor_id: options.mcr_id,
        channel_id: options.channelId,
        message_type: "normal",
        message_parts: [
          {
            call: {
              call_id: options.call_id,
              phone_number: options.callerNumber,
              call_provider: "ZOOM_PHONE",
              call_type: options.callType,
              call_status: options.call_status,
              call_life_cycle_event_type: options.call_life_cycle_event_type,
              call_duration: 0,
              recording_available: "true",
              recording_playable: "false",
              recording_link: options.voicemail_link,
            },
          },
        ],
      };
      console.log("[Server] updateVoiceMailRecording payload:", data);

      const response = await $request.invokeTemplate(
        "onUpdateVoiceMailRecording",
        {
          context: { conversationId: options.conversationId },
          body: JSON.stringify(data),
        }
      );
      const result = JSON.parse(response.response);
      console.log("[Server] updateVoiceMailRecording response:", result);
      renderData({ status: 200, message: JSON.stringify(result) });
    } catch (err) {
      console.error("[Server] updateVoiceMailRecording error", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },

  fetchTicketsByPhone: async function (args) {
    // console.log("[FETCH_TICKETS] args:", args);
    try {
      // console.log("[FETCH_TICKETS] Searching contact by phone:", args.phone);
      const resp = await $request.invokeTemplate("search_user_by_phone", {
        context: { phone_number: args.phone },
      });
      // console.log("[FETCH_TICKETS] Search response raw:", resp.response);

      const contacts = JSON.parse(resp.response);
      // console.log("[FETCH_TICKETS] Parsed contacts:", contacts);

      let contact = contacts.length ? contacts[0] : null;
      if (!contact) {
        // console.log("[FETCH_TICKETS] No contact found, creating...");
        // const createResp = await $request.invokeTemplate("add_contact", {
        //   body: JSON.stringify({ name: args.phone, phone: args.phone }),
        // });
        // console.log(
        //   "[FETCH_TICKETS] Create contact response:",
        //   createResp.response
        // );

        contact = JSON.parse(createResp.response);
      }

      // console.log("[FETCH_TICKETS] Fetching tickets for contact:", contact.id);
      const ticketsResp = await $request.invokeTemplate("list_user_tickets", {
        context: { contact_id: contact.id },
      });
      // console.log(
      //   "[FETCH_TICKETS] Tickets response raw:",
      //   ticketsResp.response
      // );

      const tickets = JSON.parse(ticketsResp.response);
      // console.log("[FETCH_TICKETS] Parsed tickets:", tickets);

      renderData({
        status: 200,
        message: JSON.stringify({ contact, tickets }),
      });
    } catch (err) {
      // console.error("[FETCH_TICKETS] ERROR:", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },

  // --- COMMON / CONTACT MANAGEMENT (from common.js) ---

  getContactList: async function () {
    // console.log("[GET_CONTACT_LIST] called");
    try {
      const resp = await $request.invokeTemplate("get_contact_list");
      // console.log("[GET_CONTACT_LIST] Response raw:", resp.response);

      const contacts = JSON.parse(resp.response);
      // console.log("[GET_CONTACT_LIST] Parsed contacts:", contacts);

      renderData({ status: 200, message: JSON.stringify(contacts) });
    } catch (err) {
      // console.error("[GET_CONTACT_LIST] ERROR:", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },

  addContact: async function (args) {
    // console.log("[ADD_CONTACT] args:", args);
    try {
      const body = { name: args.name, phone: args.phone, email: args.email };
      // console.log("[ADD_CONTACT] Payload:", body);

      const response = await $request.invokeTemplate("add_contact", {
        body: JSON.stringify(body),
      });
      // console.log("[ADD_CONTACT] Response raw:", response.response);

      renderData({ status: 200, message: response.response });
    } catch (error) {
      console.error("[ADD_CONTACT] ERROR:", error);
      renderData({ status: 400, message: JSON.stringify(error) });
    }
  },

  createTicketForCaller: async function (args) {
    // console.log("[CREATE_TICKET_FOR_CALLER] args:", args);
    try {
      const ticketData = {
        subject: args.subject,
        description: args.description,
        priority: args.priority || 1,
        status: args.status || 2,
        phone: args.phone,
        name: args.name,
      };
      // console.log("[CREATE_TICKET_FOR_CALLER] Payload:", ticketData);

      const resp = await $request.invokeTemplate("create_ticket", {
        body: JSON.stringify(ticketData),
      });
      console.log("[CREATE_TICKET_FOR_CALLER] Response raw:", resp.response);

      renderData({ status: 200, message: resp.response });
    } catch (err) {
      console.error("[CREATE_TICKET_FOR_CALLER] ERROR:", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },

  addNoteToTicket: async function (args) {
    console.log("[ADD_NOTE] args:", args);
    try {
      const resp = await $request.invokeTemplate("add_ticket_note", {
        context: { ticket_id: args.ticketId },
        body: JSON.stringify({ body: args.noteBody, private: args.isPrivate }),
      });
      console.log("[ADD_NOTE] Response raw:", resp.response);

      renderData({ status: 200, message: resp.response });
    } catch (err) {
      console.log("[ADD_NOTE] ERROR:", args);
      console.error("[ADD_NOTE] ERROR:", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },

  // --- CALL LOGS (from callLogs.js) ---

  fetchCallLogs: async function () {
    // console.log("[FETCH_CALL_LOGS] called");
    try {
      const data = await $db.get("Zoom_cti_call_logs");
      // console.log("[FETCH_CALL_LOGS] DB data:", data);

      renderData({ status: 200, message: JSON.stringify(data.logs || []) });
    } catch (err) {
      if (err.status === 404) {
        // console.log("[FETCH_CALL_LOGS] No DB, setting empty logs");
        await $db.set("Zoom_cti_call_logs", { logs: [] });
        renderData({ status: 200, message: JSON.stringify([]) });
      } else {
        // console.error("[FETCH_CALL_LOGS] ERROR:", err);
        renderData({ status: 400, message: JSON.stringify(err) });
      }
    }
  },

  addCallLog: async function (args) {
    // console.log("[ADD_CALL_LOG] args:", args);
    try {
      let data;
      try {
        data = await $db.get("Zoom_cti_call_logs");
        // console.log("[ADD_CALL_LOG] Existing DB data:", data);
      } catch (err) {
        if (err.status === 404) {
          // console.log("[ADD_CALL_LOG] No DB exists, creating...");
          data = { logs: [] };
        } else throw err;
      }

      const logs = data.logs || [];
      logs.unshift(args);
      if (logs.length > 15) logs.pop();
      // console.log("[ADD_CALL_LOG] Final logs array:", logs);

      await $db.set("Zoom_cti_call_logs", { logs });
      // console.log("[ADD_CALL_LOG] DB updated");

      renderData({ status: 200, message: JSON.stringify(logs) });
    } catch (err) {
      console.error("[ADD_CALL_LOG] ERROR:", err);
      renderData({ status: 400, message: JSON.stringify(err) });
    }
  },
};
