import store from "../store";
import { setupCrmForCall } from './crmHandler';

export { invokeWithRetry };

// ============================================================================
// DEDUPLICATION TRACKING
// ============================================================================

const processedEvents = {}; // { callId: { eventType: true/false/processing } }
const callFragmentsCreated = {}; // { callId: { [eventType]: 'creating'|'created' } }
const callEventQueues = {}; // { callId: { eventType: eventData } }
const callEventTimers = {};
const processedCallEnds = new Set();
const callIdToConversation = {};
const callCreatePromises = {};
const eventProcessingState = {};
const callEndDeferralCount = {};
const voicemailDeferralCount = {};
const callEndWaitForVoicemail = {};

// Cache for frequently accessed DB values to avoid repeated API calls
let cachedChannelId = null;
let channelIdFetchPromise = null;

// Helper: Fetch channel ID once and cache it to avoid repeated DB calls
async function getCachedChannelId(client) {
  if (cachedChannelId) return cachedChannelId;
  
  if (channelIdFetchPromise) {
    return channelIdFetchPromise;
  }
  
  channelIdFetchPromise = (async () => {
    try {
      const DB_KEY = "Zoom_BYOT";
      const data = await client.db.get(DB_KEY);
      cachedChannelId = data?.zoomPhoneChannelId;
      console.log("[Handler] Cached channel ID:", cachedChannelId);
      return cachedChannelId;
    } catch (err) {
      console.warn("[Handler] Failed to fetch channel ID from DB:", err);
      return null;
    } finally {
      channelIdFetchPromise = null;
    }
  })();
  
  return channelIdFetchPromise;
}

// Deduplication for call logs to prevent duplicate entries
// Format: "callId_timestamp" to uniquely identify a call log
// Use localStorage for persistence across page refreshes
const PROCESSED_CALL_LOGS_KEY = "zoom_processed_call_logs";

function getProcessedCallLogs() {
  try {
    const stored = typeof localStorage !== "undefined" && localStorage.getItem(PROCESSED_CALL_LOGS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (e) {
    console.warn('[Handler] Failed to read processed call logs from localStorage:', e);
    return new Set();
  }
}

function saveProcessedCallLogs(logsSet) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PROCESSED_CALL_LOGS_KEY, JSON.stringify(Array.from(logsSet)));
    }
  } catch (e) {
    console.warn('[Handler] Failed to save processed call logs to localStorage:', e);
  }
}

let processedCallLogs = getProcessedCallLogs();

// Circuit breaker for rate limiting
let rateLimitWindow = {
  windowStart: Date.now(),
  requestCount: 0,
  isLimited: false
};

const EVENT_ORDER = [
  "zp-call-ringing-event",
  "zp-call-connected-event",
  "zp-call-voicemail-received-event",
  "zp-call-log-completed-event",
  "zp-call-recording-completed-event",
  "zp-call-missed-event",
  "zp-call-ended-event",
];

const CALL_ENDED_DELAY = 3000;
const EVENT_PROCESS_DELAY = 1000;
const RECORDING_WAIT_MS = 3000;


function hasFragment(callId, key) {
  return !!(callFragmentsCreated[callId] && callFragmentsCreated[callId][key] === 'created');
}

function reserveFragment(callId, key) {
  if (!callId || !key) return false;
  if (!callFragmentsCreated[callId]) callFragmentsCreated[callId] = {};
  const state = callFragmentsCreated[callId][key];
  if (state === 'created' || state === 'creating') return false;
  callFragmentsCreated[callId][key] = 'creating';
  return true;
}

function finalizeFragment(callId, key) {
  if (!callId || !key) return;
  if (!callFragmentsCreated[callId]) callFragmentsCreated[callId] = {};
  callFragmentsCreated[callId][key] = 'created';
}

function releaseReservation(callId, key) {
  try {
    if (!callId || !key) return;
    if (!callFragmentsCreated[callId]) return;
    if (callFragmentsCreated[callId][key] === 'creating') {
      delete callFragmentsCreated[callId][key];
    }
  } catch (e) { /* ignore */ }
}

function markFragmentCreated(callId, key) {
  finalizeFragment(callId, key);
}

// Helper: ensure the internal conversation id is stored in Vuex `conv_id`
function setStoreConvInternal(callId) {
  try {
    const conversation = callIdToConversation[callId];
    if (conversation && conversation.conversation_internal_id) {
      store.commit("call/SET_CONV", conversation.conversation_internal_id);
      // Also keep the explicit conversation_internal_id mutation in sync
      store.commit("call/SET_CONVERSATION_INTERNAL_ID", conversation.conversation_internal_id);
    }
  } catch (e) {
    console.warn('[Handler] Failed to set internal conversation id in store', e);
  }
}


function hasProcessed(callId, eventType) {
  return processedEvents[callId]?.[eventType] === true;
}

function markProcessed(callId, eventType) {
  if (!processedEvents[callId]) processedEvents[callId] = {};
  processedEvents[callId][eventType] = true;
}

function isEventProcessing(callId, eventType) {
  return eventProcessingState[`${callId}-${eventType}`] === true;
}

function markEventProcessing(callId, eventType) {
  eventProcessingState[`${callId}-${eventType}`] = true;
}

function clearEventProcessing(callId, eventType) {
  delete eventProcessingState[`${callId}-${eventType}`];
}



function checkRateLimit() {
  const now = Date.now();
  if (now - rateLimitWindow.windowStart > 60000) {
    rateLimitWindow = {
      windowStart: now,
      requestCount: 0,
      isLimited: false
    };
    return false;
  }
  if (rateLimitWindow.requestCount >= 45) {
    rateLimitWindow.isLimited = true;
    return true;
  }
  return rateLimitWindow.isLimited;
}

function recordApiCall() {
  rateLimitWindow.requestCount++;
}



async function invokeWithRetry(client, method, payload = {}, opts = {}) {
  // Increase retries for transient rate-limit responses and use a slightly
  // larger base delay so we don't immediately hit the same limit.
  const maxRetries = opts.maxRetries ?? 1; // Reduced to 3, fail fast on rate-limit
  const baseDelay = opts.baseDelay ?? 800;
  let attempt = 0;

  const fragmentKey = payload._fragmentKey;
  const callId = payload.call_id;
  delete payload._fragmentKey;

  if (fragmentKey && callId && hasFragment(callId, fragmentKey)) {
    console.log(`[Handler] Fragment ${fragmentKey} already exists for callId ${callId}, skipping API call`);
    return;
  }

  while (true) {
    // If rate limit is ALREADY active globally, fail fast (don't retry)
    if (checkRateLimit()) {
      console.log(`[Handler] Rate limit active globally, failing fast for ${method} on ${callId}`);
      const err = new Error("Rate limited globally");
      err.status = 429;
      throw err;
    }

    recordApiCall();

    try {
  const resp = await client.request.invoke(method, payload);
      const status = resp?.status;
      const msg = typeof resp?.message === "string" ? resp.message : JSON.stringify(resp?.message || "");
      const contains429 = msg && msg.includes('"status":429');

      if (status === 429 || contains429) {
        const err = new Error("Rate limited");
        err.status = 429;
        err.resp = resp;
        throw err;
      }

      // finalize reservation if fragmentKey present
      if (fragmentKey && callId) {
        try { finalizeFragment(callId, fragmentKey); } catch (e) { /* ignore */ }
      }
      return resp;
    } catch (err) {
      attempt++;

      // Detect rate-limit patterns
      const errMsg = String(err?.message || err?.resp?.message || err?.resp || "").toLowerCase();
      const isRateLimit = err?.status === 429 || (err?.resp?.status === 429) || errMsg.includes('"status":429') || errMsg.includes('exceeded limit') || errMsg.includes('50 requests per minute') || errMsg.includes('rate limit');

      const isDuplicateError = (err?.status === 400 && String(err?.message || "").toLowerCase().includes('pre-exists')) || (String(errMsg).includes('pre-exists'));

      if (isDuplicateError) {
        console.log(`[Handler] ${method} returned duplicate (pre-exists), skipping retry for ${callId}`);
        // Attempt to return the backend response (or a normalized wrapper) so callers
        // can inspect the conversation details from a "pre-exists" response and
        // populate per-call caches (callIdToConversation).
        try {
          const respSource = err?.resp || err || {};
          // Normalize message to a string so callers that do JSON.parse(resp.message)
          // continue to work. If respSource.message is already a string, keep it.
          let msg = respSource?.message ?? respSource?.response ?? respSource?.body ?? String(err?.message || "");
          if (msg && typeof msg !== "string") msg = JSON.stringify(msg);
          const normalized = { status: respSource?.status || 200, message: msg };
          return normalized;
        } catch (parseErr) {
          // Fallback: return whatever we have so caller can still inspect fields.
          return err.resp || err;
        }
      }

      // On rate-limit, fail immediately (don't retry)
      if (isRateLimit) {
        rateLimitWindow.isLimited = true;
        rateLimitWindow.windowStart = Date.now();
        console.warn(`[Handler] ${method} rate limited, failing fast for ${callId}`);
        throw err;
      }

      // For other errors, retry up to maxRetries
      if (attempt > maxRetries) {
        console.warn(`[Handler] ${method} exceeded max retries (${maxRetries})`);
        throw err;
      }

      // Exponential backoff for non-rate-limit errors only
      const jitter = Math.random() * 200;
      const delay = Math.min(5000, 500 * Math.pow(2, attempt - 1) + jitter);
      console.warn(`[Handler] ${method} failed — retry ${attempt}/${maxRetries} in ${Math.round(delay)}ms`);
      await new Promise((res) => setTimeout(res, delay));
      continue;
    }
  }
}

// Helper: detect backend method-not-allowed or HTTP 405 errors coming back in
// the wrapped response/message. We treat those as non-retryable but may want
// to mark the fragment to avoid retries in cases where backend endpoint isn't
// supported for the tenant/environment.
function isMethodNotAllowedError(err) {
  const msg = (err && (err.message || err.resp?.message || err?.resp?.response)) || "";
  if (!msg) return false;
  const lower = String(msg).toLowerCase();
  return lower.includes("method not allowed") || lower.includes("http 405") || lower.includes("\"status\":405");
}


export async function queueZoomEvent(client, event) {
  const callId = event.data?.callId;
  const eventType = event.type;
  if (!callId || !eventType) return;

  // PRIMARY CHECK: Is fragment already created?
  if (hasFragment(callId, eventType)) {
    console.log(`[Queue] Fragment ${eventType} already exists for callId ${callId}, skipping`);
    return;
  }

  // Is event already processed?
  if (hasProcessed(callId, eventType)) {
    console.log(`[Queue] Event ${eventType} already processed for callId ${callId}, skipping`);
    return;
  }

  // Is event currently being processed?
  if (isEventProcessing(callId, eventType)) {
    console.log(`[Queue] Event ${eventType} is currently processing for callId ${callId}, skipping`);
    return;
  }

  // Special check for call-ended event
  if (eventType === "zp-call-ended-event" && processedCallEnds.has(callId)) {
    console.log(`[Queue] Call end already handled for callId ${callId}, skipping`);
    return;
  }

  markEventProcessing(callId, eventType);

  if (!callEventQueues[callId]) callEventQueues[callId] = {};
  callEventQueues[callId][eventType] = event.data;

  console.log(`[Queue] Queued ${eventType} for callId ${callId}`);

  if (callEventTimers[callId]) clearTimeout(callEventTimers[callId]);

  const delay = eventType === "zp-call-ended-event" ? CALL_ENDED_DELAY : EVENT_PROCESS_DELAY;
  callEventTimers[callId] = setTimeout(() => flushQueue(client, callId), delay);
}

async function flushQueue(client, callId) {
  const queue = callEventQueues[callId];
  if (!queue) return;

  const voicemailPending = queue["zp-call-voicemail-received-event"] && !hasProcessed(callId, "zp-call-voicemail-received-event");
  const callEndPending = queue["zp-call-ended-event"] && !hasProcessed(callId, "zp-call-ended-event");

  const processingEvents = new Set();

  if (callEndPending && voicemailPending) {
    voicemailDeferralCount[callId] = (voicemailDeferralCount[callId] || 0) + 1;
    if (voicemailDeferralCount[callId] <= 3) {
      console.log(`[Queue] Deferring call-ended event for callId ${callId} until voicemail processed (deferral ${voicemailDeferralCount[callId]})`);
      setTimeout(() => flushQueue(client, callId), 1000);
      return;
    } else {
      console.log(`[Queue] Max voicemail deferrals reached for callId ${callId}, proceeding with call-end`);
    }
  }

  const recordingPendingInQueue = !!queue["zp-call-recording-completed-event"];
  const recordingProcessed = hasProcessed(callId, "zp-call-recording-completed-event");
  // Only defer call-ended for recording if the call-end is NOT a rejected call.
  // Rejected calls should wait for voicemail (handled above) and should NOT be
  // delayed by recording arrival. Check the queued call-ended event payload for
  // the result field.
  const queuedCallEnd = queue["zp-call-ended-event"];
  const callEndIsRejected = queuedCallEnd && queuedCallEnd.result === "rejected";
  if (!callEndIsRejected && callEndPending && !recordingPendingInQueue && !recordingProcessed) {
    callEndDeferralCount[callId] = (callEndDeferralCount[callId] || 0) + 1;
    if (callEndDeferralCount[callId] <= 3) {
      console.log(`[Queue] Deferring call-ended event for callId ${callId} to wait for recording (deferral ${callEndDeferralCount[callId]})`);
      setTimeout(() => flushQueue(client, callId), RECORDING_WAIT_MS);
      return;
    } else {
      console.log(`[Queue] Max deferrals reached for callId ${callId}, proceeding with call-end`);
    }
  }

  // Process events in order
  for (const type of EVENT_ORDER) {
    if (queue[type] && !hasProcessed(callId, type) && !processingEvents.has(type)) {
      processingEvents.add(type);
      try {
        // Triple-check: is fragment already created or event already processed?
        if (hasFragment(callId, type) || hasProcessed(callId, type)) {
          console.log(`[Queue] Event ${type} already handled for callId ${callId}, skipping`);
          continue;
        }

        // Let the main processor decide whether the event is marked processed
        // (it will set processedEvents[callId][type] = true only when a fragment
        // was actually created). Do NOT unconditionally mark processed here.
        await processZoomPhoneEvent(client, { type, data: queue[type] });
      } catch (err) {
        console.error(`[Queue] Error processing ${type} for callId ${callId}`, err);
      } finally {
        // Always clear the processing flag so failed events can be retried.
        try { clearEventProcessing(callId, type); } catch (e) { /* ignore */ }
        processingEvents.delete(type);
      }
    }
  }

  // Cleanup
  delete callEventQueues[callId];
  if (callEventTimers[callId]) {
    clearTimeout(callEventTimers[callId]);
    delete callEventTimers[callId];
  }

  setTimeout(() => {
    try {
      delete processedEvents[callId];
      delete callEndDeferralCount[callId];
      delete voicemailDeferralCount[callId];
      processedCallEnds.delete(callId);
      delete callFragmentsCreated[callId];
      // clear per-call event flags stored in Vuex
      try { store.dispatch("call/clearCallEventFlags", callId); } catch (e) { /* ignore */ }
      EVENT_ORDER.forEach(type => clearEventProcessing(callId, type));
    } catch(e) {
      console.warn('[Queue] Error during cleanup:', e);
    }
  }, 60000);
}

// ============================================================================
// MAIN EVENT PROCESSOR - PRIMARY DEDUPLICATION POINT
// ============================================================================

export async function processZoomPhoneEvent(client, event) {
  const { type, data } = event;
  const callId = data.callId;

  
  try {
    const flagKey = `${callId}_${type}`;
    const flags = store.state?.call?.call_event_flags || {};
    if (flags[flagKey]) {
      console.log(`[Handler] ${type} already processed for ${callId}, SKIPPING.`);
      return;
    }
    // Set flag immediately to block concurrent/duplicate events
    store.dispatch("call/setCallEventFlag", { callId, eventType: type, value: true });
  } catch (e) {
    // If store unavailable, log and proceed (graceful fallback)
    console.warn('[Handler] Failed to access/mark vuex call_event_flags', e);
  }

  recordApiCall();
  console.log("[Zoom Event]", type);

  // Prepare context
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

  let fragmentCreated = false;

  try {
    switch (type) {
      case "zp-call-ringing-event": {
        // Handle ringing event - create conversation
        const isTransfer = data.callId?.includes("_1");
        const isWarm = data.callId?.includes("warm");
        store.dispatch("call/setCallEndedFlag", false);
        store.dispatch("call/setRecordingCompletedFlag", false);

        if (isTransfer) {
          const transferPayload = {
            channelId,
            freshchatAgentOrgAgentId: agentId,
            freshchatAgentorgAgentName: agentName,
            call_id: data.callId,
            callerNumber: phoneNumber,
            callType,
            callStatus: "COMPLETED",
            callLifeCycleEventType: "COLD_TRANSFER",
            mcr_id: orgContactId,
          };
          console.log("[Handler] Creating transfer call fragment:", transferPayload);
          await invokeWithRetry(client, "createConversationFreshchat", transferPayload);
        }

        if (isWarm) {
          const connectedPayload = {
            conversationId: callIdToConversation[callId]?.conversation_id || conversationId || store.getters.conversation_id,
            channelId,
            callType: callType,
            callStatus: "ON_HOLD",
            callLifeCycleEventType: "WARM_TRANSFER",
            call_id: data.callId,
            callerNumber: data.callee?.phoneNumber || phoneNumber,
            mcr_id: orgContactId,
            freshchatAgentOrgAgentId: agentId,
            freshchatAgentorgAgentName: agentName,
          };
          console.log("[Handler] Creating call connected fragment for warm transfer:", connectedPayload);
          await invokeWithRetry(client, "createConversationFreshchat", connectedPayload);
        }

        // Normal ringing payload
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
          _fragmentKey: "zp-call-ringing-event",
        };
        console.log("[Handler] createConversationFreshchat payload:", payload);

        if (callIdToConversation[callId]) {
          const conversation = callIdToConversation[callId];
          console.log(`[Handler] Conversation already exists for callId ${callId}, reusing.`);
           console.log("vvconversation",conversation);
          try {
            store.commit("call/SET_CONVERSATION_APPID", conversation.app_id);
            store.commit("call/SET_CONVERSATION_FUID", conversation.assigned_agent_id);
            store.commit("call/SET_CONVERSATION_ID", conversation.conversation_id);
            if(conversation.conversation_internal_id!==undefined||null||""){
            store.commit("call/SET_CONV", conversation.conversation_internal_id);
            }
            store.commit("call/SET_CONVERSATION_INTERNAL_ID", conversation.conversation_internal_id);
          } catch (e) {
            console.warn("[Handler] Failed to set stored conversation in store", e);
          }
        } else {
          if (callCreatePromises[callId]) {
            try {
              const conversation = await callCreatePromises[callId];
              console.log("vvconversation",conversation);
              if (conversation) {
                store.commit("call/SET_CONVERSATION_APPID", conversation.app_id);
                store.commit("call/SET_CONVERSATION_FUID", conversation.assigned_agent_id);
                store.commit("call/SET_CONVERSATION_ID", conversation.conversation_id);
                if(conversation.conversation_internal_id!==undefined||null||""){
            store.commit("call/SET_CONV", conversation.conversation_internal_id);
            }
                store.commit("call/SET_CONVERSATION_INTERNAL_ID", conversation.conversation_internal_id);
              }
            } catch (e) {
              console.warn("[Handler] Existing createConversation promise failed", e);
            }
          } else {
            callCreatePromises[callId] = (async () => {
              try {
                const conv_id = await client.request.invoke( "createConversationFreshchat", payload);
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
                
                // Check if this is a pre-exists response
                if (conversation?.pre_exists === true) {
                  console.log("[Handler] Conversation pre-exists for callId", callId);
                  // Use existing conversation from store since backend doesn't return full details
                  const existingConv = store.getters.conversation_id;
                  if (existingConv) {
                    conversation = {
                      conversation_id: existingConv,
                      conversation_internal_id: store.getters.conv_id,
                      assigned_agent_id: store.getters.main_agent_id,
                      app_id: store.getters.app_id,
                    };
                    console.log("[Handler] Using cached conversation details from store");
                  } else {
                    // If no cached details, create a minimal object
                    conversation = {
                      conversation_id: '',
                      conversation_internal_id: 0,
                      call_id: callId,
                    };
                    console.log("[Handler] Pre-exists but no cached details, will use empty for now");
                  }
                  markFragmentCreated(callId, "zp-call-ringing-event");
                }
                
                console.log("?????????????Conversation created:", conversation);
                if(conversation && conversation.conversation_internal_id!==undefined||null||""){
            store.commit("call/SET_CONV", conversation.conversation_internal_id);
            }
                if (conversation && (conversation.conversation_id || conversation.pre_exists)) {
                  callIdToConversation[callId] = conversation;
                  console.log("[Handler] createConversationFreshchat response:", conversation);
                  fragmentCreated = true;
                  // record that the ringing fragment was created so duplicates skip
                  markFragmentCreated(callId, "zp-call-ringing-event");
                } else {
                  console.log("[Handler] No conversation data returned, marking fragment as created");
                  markFragmentCreated(callId, "zp-call-ringing-event");
                }
                return conversation;
              } catch (err) {
                console.warn(`[Handler] createConversation failed for callId ${callId}:`, err);
                return null;
              } finally {
                delete callCreatePromises[callId];
              }
            })();

            try {
              const conversation = await callCreatePromises[callId];
              if (conversation) {
                store.commit("call/SET_CONVERSATION_APPID", conversation.app_id);
                store.commit("call/SET_CONVERSATION_FUID", conversation.assigned_agent_id);
                store.commit("call/SET_CONVERSATION_ID", conversation.conversation_id);

                 if(conversation.conversation_internal_id!==undefined||null||""){
            store.commit("call/SET_CONV", conversation.conversation_internal_id);
            }
                store.commit("call/SET_CONVERSATION_INTERNAL_ID", conversation.conversation_internal_id);
                fragmentCreated = true;
                markFragmentCreated(callId, "zp-call-ringing-event");
              }
            } catch (e) {
              console.warn("[Handler] createConversation promise rejected", e);
            }
          }
        }
        if (callIdToConversation[callId]) {
          fragmentCreated = true;
        }
        break;
      }

      case "zp-call-connected-event": {
        // Ensure internal conversation id stored in Vuex if available
        setStoreConvInternal(callId);

        const payload = {
          conversationId: callIdToConversation[callId]?.conversation_id || conversationId || store.getters.conversation_id,
          mainagentid: callIdToConversation[callId]?.assigned_agent_id || magent || store.getters.main_agent_id,
          channelId: channelId || "",
          callType: callType || "",
          callStatus: "IN_PROGRESS",
          callLifeCycleEventType: isInbound ? "INCOMING_AGENT_ASSIGNED" : "OUTGOING_AGENT_ASSIGNED",
          call_id: data.callId || "",
          callerNumber: phoneNumber || "",
          mcr_id: orgContactId || "",
          freshchatAgentOrgAgentId: agentId || "",
          freshchatAgentorgAgentName: agentName || "",
          _fragmentKey: "zp-call-connected-event"
        };
        console.log("[Handler] updateCallAgentPicked payload:", payload);
        if (!payload.call_id) {
          console.error("Missing call_id in call connected payload!");
          break;
        }
        if(!payload.conversationId) {
          console.error("Missing conversationId in call connected payload!");
          break;
        }
        if (!payload.callLifeCycleEventType) {
          console.error("Missing callLifeCycleEventType in call connected payload!");
          break;
        }
  await client.request.invoke("updateCallAgentPicked", payload);
  fragmentCreated = true;
  markFragmentCreated(callId, "zp-call-connected-event");
        break;
      }

      case "zp-call-ended-event": {
        if (processedCallEnds.has(callId)) {
          console.log(`[Handler] Call end already processed for ${callId}, skipping`);
          break;
        }
        const result = data.result;
        // Ensure internal conversation id stored in Vuex if available
        setStoreConvInternal(callId);

        const callEndedPayload = {
          conversationId: callIdToConversation[callId]?.conversation_id || conversationId || store.getters.conversation_id,
          channel_id: channelId,
          assigned_org_agent_id: agentId,
          type: "PHONE",
          ext_id: data.callId,
          call_id: data.callId,
          phone_number: phoneNumber,
          call_provider: "Zoom Phone",
          call_type: callType,
          call_status: "COMPLETED",
          call_life_cycle_event_type: "CALL_ENDS",
          call_duration: data.duration || 0,
          agentId,
          label: agentName,
          orgContactId,
          _fragmentKey: "zp-call-ended-event",
        };
        console.log("[Handler] Call ended payload:", callEndedPayload);
        if (!callEndedPayload.conversationId) {
          console.error("Missing conversationId in call ended payload!");
          break;
        }
        if (result == "missed") {
          // Reserve the call-ended fragment to avoid concurrent missed-call creators
          const reserved = reserveFragment(callId, "zp-call-ended-event");
          if (!reserved) {
            console.log(`[Handler] Another process is creating missed-call fragment for ${callId}, skipping`);
            break;
          }
          try {
            await client.request.invoke("missedCallCreateConvoFchat", callEndedPayload);
            // invokeWithRetry finalizes fragment on success; mark processed
            processedCallEnds.add(callId);
          } catch (err) {
            console.error(`[Handler] missedCallCreateConvoFchat failed for ${callId}:`, err);
            if (isMethodNotAllowedError(err)) {
              console.warn(`[Handler] missedCallCreateConvoFchat returned 405; marking fragment to avoid retry for ${callId}`);
              markFragmentCreated(callId, "zp-call-ended-event");
              processedCallEnds.add(callId);
            } else {
              // Release reservation so another attempt can proceed later
              releaseReservation(callId, "zp-call-ended-event");
              throw err;
            }
          }
        } else if (result == "rejected") {
          // For rejected calls, defer call-end fragment until voicemail arrives
          console.log(`[Handler] Call ${callId} rejected - deferring call-end until voicemail (if any)`);
            // Mark that we're waiting for voicemail for this call. Use a flag so
            // voicemail handler knows a deferred call-end may need to be created.
            callEndWaitForVoicemail[callId] = true;
            // Fallback: if no voicemail arrives in 2 minutes, create call-end fragment.
            // Reserve the call-end fragment before attempting creation to avoid races
            // with a concurrent voicemail handler.
            setTimeout(async () => {
              if (callEndWaitForVoicemail[callId] && !processedCallEnds.has(callId)) {
                console.log(`[Handler] No voicemail received for rejected call ${callId} after timeout - creating call end fragment`);
                // Try to reserve the call-end fragment. If another flow (voicemail)
                // already reserved/created it, skip creating here.
                const reserved = reserveFragment(callId, "zp-call-ended-event");
                if (!reserved) {
                  console.log(`[Handler] Call-end fragment already being created for ${callId}, skipping fallback creation`);
                  try { delete callEndWaitForVoicemail[callId]; } catch(e){}
                  return;
                }
                try {
                  await client.request.invoke("updateCallEnd", callEndedPayload);
                  processedCallEnds.add(callId);
                } catch (err) {
                  console.error(`[Handler] updateCallEnd (fallback) failed for ${callId}:`, err);
                  // On non-retryable failures, release the reservation so other attempts
                  // can proceed later.
                  if (!isMethodNotAllowedError(err)) {
                    releaseReservation(callId, "zp-call-ended-event");
                  } else {
                    // mark as created to avoid future retries on 405
                    markFragmentCreated(callId, "zp-call-ended-event");
                    processedCallEnds.add(callId);
                  }
                } finally {
                  try { delete callEndWaitForVoicemail[callId]; } catch(e){}
                }
              }
            }, 120000);
        } else if (result == "ended") {
          try {
            await client.request.invoke("updateCallEnd", callEndedPayload);
            // mark fragment so duplicates skip
            markFragmentCreated(callId, "zp-call-ended-event");
            // Mark as processed only after successful update
            processedCallEnds.add(callId);
          } catch (err) {
            console.error(`[Handler] updateCallEnd failed for ${callId}:`, err);
            if (isMethodNotAllowedError(err)) {
              console.warn(`[Handler] updateCallEnd returned 405; marking fragment to avoid retry for ${callId}`);
              fragmentCreated = true;
              processedCallEnds.add(callId);
            } else throw err;
          }
        }

        fragmentCreated = true;
        if (callIdToConversation[callId]) {
          setTimeout(() => {
            try {
              delete callIdToConversation[callId];
            } catch (e) {}
          }, 1000 * 60 * 5);
        }
        break;
      }

      case "zp-call-recording-completed-event": {
        // Ensure internal conversation id stored in Vuex if available
        setStoreConvInternal(callId);

        const payload = {
          conversationId: callIdToConversation[callId]?.conversation_id || conversationId || store.getters.conversation_id,
          channelId,
          callType,
          callStatus: "COMPLETED",
          call_life_cycle_event_type: "CALL_RECORDING_AVAILABLE",
          call_id: data.callId,
          callerNumber: phoneNumber,
          mcr_id: orgContactId,
          recording_link: data.recordingUrl,
          freshchatAgentOrgAgentId: callIdToConversation[callId]?.assigned_agent_id || magent || store.getters.main_agent_id,
          freshchatAgentorgAgentName: agentName,
          _fragmentKey: "zp-call-recording-completed-event"
        };
        if (!payload.conversationId) {
          console.error("Missing conversationId in recording completed payload!");
          break;
        }
        console.log("[Handler] updateRecordingsInFreshChatConvo payload:", payload);
        // Reserve recording fragment to prevent duplicates
        if (!reserveFragment(callId, "zp-call-recording-completed-event")) {
          console.log(`[Handler] Recording fragment already being created for ${callId}, skipping`);
          break;
        }
        try {
          await client.request.invoke("updateRecordingsInFreshChatConvo", payload);
          fragmentCreated = true;
          // finalize happens in invokeWithRetry; ensure recorded
          finalizeFragment(callId, "zp-call-recording-completed-event");
        } catch (err) {
          console.error(`[Handler] updateRecordingsInFreshChatConvo failed for ${callId}:`, err);
          if (isMethodNotAllowedError(err)) {
            console.warn(`[Handler] updateRecordingsInFreshChatConvo returned 405; marking fragment to avoid retry for ${callId}`);
            markFragmentCreated(callId, "zp-call-recording-completed-event");
          } else {
            releaseReservation(callId, "zp-call-recording-completed-event");
            throw err;
          }
        }
        break;
      }

      case "zp-call-voicemail-received-event": {
        // Ensure internal conversation id stored in Vuex if available
        setStoreConvInternal(callId);

        const freshConversationId = callIdToConversation[callId]?.conversation_id || store.getters.conversation_id;
        const voicemailPayload = {
          appId,
          conversationId: freshConversationId,
          channelId,
          voicemail_link: data.voicemailUrl,
          call_duration: 0,
          callType,
          call_status: "MISSED_CALL",
          call_life_cycle_event_type: "VOICEMAIL_RECEIVED",
          call_id: data.callId,
          phoneNumber,
          orgContactId,
          _fragmentKey: "zp-call-voicemail-received-event",
        };
        if (!voicemailPayload.conversationId) {
          console.error("Missing conversationId in voicemail payload!");
          break;
        }
        // Reserve voicemail fragment to avoid duplicates
        const vmReserved = reserveFragment(callId, "zp-call-voicemail-received-event");
        if (!vmReserved) {
          console.log(`[Handler] Voicemail fragment already being created for ${callId}, skipping`);
          break;
        }

        try {
          await client.request.invoke("voiceMailInFChat", voicemailPayload);
          console.log("[Handler] voiceMailInFChat response success");
          fragmentCreated = true;
          finalizeFragment(callId, "zp-call-voicemail-received-event");
        } catch (err) {
          console.error(`[Handler] voiceMailInFChat failed for ${callId}:`, err);
          if (isMethodNotAllowedError(err)) {
            console.warn(`[Handler] voiceMailInFChat returned 405; marking fragment to avoid retry for ${callId}`);
            markFragmentCreated(callId, "zp-call-voicemail-received-event");
          } else {
            releaseReservation(callId, "zp-call-voicemail-received-event");
            throw err;
          }
        }

        // Only update call-end if NOT already processed
        if (!processedCallEnds.has(callId)) {
          console.log(`[Handler] Call-end not yet processed for voicemail; updating call-end for ${callId}`);
          const callEndedPayload = {
            conversationId: freshConversationId,
            channel_id: channelId,
            assigned_org_agent_id: agentId,
            type: "PHONE",
            ext_id: data.callId,
            call_id: data.callId,
            phone_number: phoneNumber,
            call_provider: "Zoom Phone",
            call_type: callType,
            call_status: "COMPLETED",
            call_life_cycle_event_type: "CALL_ENDS",
            call_duration: data.duration || 0,
            agentId,
            label: agentName,
            orgContactId,
            _fragmentKey: "zp-call-ended-event",
          };
          // Reserve call-end fragment to avoid race with other handlers
          const reservedCE = reserveFragment(callId, "zp-call-ended-event");
          if (!reservedCE) {
            console.log(`[Handler] Another process is creating call-end fragment for ${callId}, skipping update from voicemail`);
          } else {
            try {
              await client.request.invoke("updateCallEnd", callEndedPayload);
              console.log("[Handler] updateCallEnd (from voicemail) response success");
              // mark call-end fragment and mark processed
              finalizeFragment(callId, "zp-call-ended-event");
              processedCallEnds.add(callId);
              // Clear any deferred flag for this call
              try { delete callEndWaitForVoicemail[callId]; } catch (e) { /* ignore */ }
            } catch (err) {
              console.error(`[Handler] updateCallEnd (from voicemail) failed for ${callId}:`, err);
              if (isMethodNotAllowedError(err)) {
                console.warn(`[Handler] updateCallEnd (from voicemail) returned 405; marking as processed for ${callId}`);
                processedCallEnds.add(callId);
              } else {
                releaseReservation(callId, "zp-call-ended-event");
                throw err;
              }
            }
          }
        } else {
          console.log(`[Handler] Call-end already processed for ${callId}, skipping redundant update from voicemail handler`);
        }
        break;
      }

      case "zp-call-log-completed-event": {
        const contact_name = store.getters.contact_name
        console.log("Contact Name from store:", contact_name);
        // Check if call log fragment already created for this callId to prevent duplicate logs
        if (hasFragment(callId, "zp-call-log-completed-event")) {
          console.log(`[Handler] Call log fragment already created for ${callId}, skipping duplicate`);
          fragmentCreated = true;
          break;
        }

        function formatDateTime24(dateTime) {
  const date = new Date(dateTime);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '');
}
        const logPayload = {
          callId,
          callerName: contact_name || callerName ,
          callerNumber: phoneNumber,
          callDirection: callType.toLowerCase(),
          direction:data.result,
          callTimeStamp: formatDateTime24(data.dateTime),
          // callDuration: data.duration,
          _fragmentKey: "zp-call-log-completed-event",
        };
        console.log("[Handler] Adding call log with payload:", logPayload);
        await addCallLog(client, logPayload);
        // Mark the call log fragment as created to prevent reprocessing on subsequent queue flushes
        markFragmentCreated(callId, "zp-call-log-completed-event");
        fragmentCreated = true;
        break;
      }

      default:
        console.warn("[Handler] No handler for Zoom event type", type);
        break;
    }
  } catch (err) {
    console.error(`[Handler] Error processing ${type} for callId ${callId}:`, err);
  } finally {
    // Fragment marking is now at event level, tracked via Vuex flag
    if (fragmentCreated) {
      console.log(`[Handler] Successfully processed ${type} for ${callId}`);
    } else {
      console.log(`[Handler] Event ${type} failed for ${callId}, flag will remain set until cleanup`);
    }
  }
}



export async function addNotes(notes) {
  // const callId = notes.data?.callId;
  let conversationId = store.getters.conversation_id;
  // if (callIdToConversation[callId]?.conversation_id) {
  //   conversationId = callIdToConversation[callId].conversation_id;
  // }
  const agentId = store.getters.main_agent_id;
  // const { notesData } = notes.data;
  console.log("Notes saved:",  notes, agentId, conversationId);
  const data = {
    
    agentId,
    notes,
    conversationId,
  };
  await invokeWithRetry(client, "onAddPrivateNotesInFreshchat", data);
}

export async function fetchTicketsForUser(client, phone, name = "") {
  try {
    const resp = await invokeWithRetry(client, "fetchTicketsByPhone", { phone, name });
    if (resp.status === 200) {
      const { contact, tickets } = JSON.parse(resp.message);
      store.commit("call/SET_SINGLE_CONTACT", contact);
      store.commit("call/SET_CONTACT_ID", contact.id);
      store.commit("call/SET_FRESHDESK_TICKETS", tickets || []);
      return { contact, tickets };
    } else {
      store.commit("call/SET_FRESHDESK_TICKETS", []);
      return { contact: null, tickets: [] };
    }
  } catch (err) {
    console.error("[Handler] Error fetching tickets for user:", err);
    store.commit("call/SET_FRESHDESK_TICKETS", []);
    return { contact: null, tickets: [] };
  }
}

export function initEventHandlers(client) {
  console.log("[Handler] Initializing event handlers...");
  client.events.on("ZOOM_PHONE_EVENT", (event) => {
    queueZoomEvent(client, event);
  });
  client.events.on("REFRESH_CONTACTS", () => {
    console.log("[Handler] REFRESH_CONTACTS");
    fetchContactList(client);
  });
  client.events.on("CALL_LOG_EVENT", (logEntry) => {
    console.log("[Handler] CALL_LOG_EVENT", logEntry);
    addCallLog(client, logEntry);
  });
}

export async function fetchContactList(client) {
  try {
    const result = await invokeWithRetry(client, "getContactList", {});
    if (result.status === 200) {
      const contacts = JSON.parse(result.message);
      store.dispatch("common/setContactList", contacts);
    } else {
      store.dispatch("common/setContactList", []);
    }
  } catch (err) {
    console.error("[Handler] Error fetching contact list:", err);
    store.dispatch("common/setContactList", []);
  }
}

export async function fetchcrmContactList(client) {
  try {
    const result = await invokeWithRetry(client, "getContactList", {});
    if (result.status === 200) {
      const contacts = JSON.parse(result.message);
      store.dispatch("common/setContactList", contacts);
    } else {
      store.dispatch("common/setContactList", []);
    }
  } catch (err) {
    console.error("[Handler] Error fetching contact list:", err);
    store.dispatch("common/setContactList", []);
  }
}

export async function findOrCreateFreshdeskContact(client, phone, name) {
  const normalPhone = normalizePhoneNumber(phone);
  const resp = await invokeWithRetry(client, "findOrCreateFreshdeskContact", { phone: normalPhone, name });
  return JSON.parse(resp.message);
}

function normalizePhoneNumber(phone) {
  if (!phone) return "";
  return phone.startsWith("+") ? phone.substring(1) : phone;
}

export async function handleRingingEvent(client, event) {
  const { type, data: callData } = event;
  const callId = callData.callId;
  // store.commit("call/SET_CONTACT_NAME", "")
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
          console.log("[Handler] CRM contact:", crmContact.contact.mcr_id);
          console.log("[Handler] CRM contact first_name:", crmContact.contact.first_name, "name field:", crmContact.contact.last_name,"display_name:",crmContact.contact.display_name);

          console.log("crm contact id type", typeof crmContact.contact.mcr_id);
          console.log(
            "crm contact id-big int",
            BigInt(crmContact.contact.mcr_id).toString()
          );
          store.commit("call/SET_CRM_CONTACT_ID", crmContact);
          // Use name from CRM contact, preferring 'name' field over 'first_name', fall back to passed name
          const contactNameToSet =  crmContact.contact.first_name ||crmContact.contact.last_name||crmContact.contact.display_name|| "Unknown";
          console.log("[Handler] Setting contact name to:",  crmContact.contact.first_name,crmContact.contact.last_name,crmContact.contact.display_name);
          store.commit("call/SET_CONTACT_NAME", crmContact.contact.display_name|| crmContact.contact.first_name ||crmContact.contact.last_name);
          store.commit(
            "call/ORG_CONTACT_ID",
            BigInt(crmContact.contact.mcr_id).toString()
          );
        } catch (e) {
          console.error("[Handler] CRM contact error", e);
          // Fallback: use name from event data if CRM call fails
          console.log("[Handler] Setting fallback contact name to:", name);
          // store.commit("call/SET_CONTACT_NAME", name || "Unknown");
    }

  if (type === "zp-call-ringing-event") {
   
    // await setupCrmForCall(client, callId, phone, name);

    // Also attempt to find or create a full CRM contact by phone so the
    // server-side CRM record is available during the call flow. This will
    // populate the org_contact_id in Vuex when successful.
    
  }

  if (hasFragment(callId, type)) {
    console.log(`[Handler] Fragment ${type} already exists for ${callId}, skipping`);
    return;
  }

  const baseEvent = {
    callId,
    caller: isInbound ? { phoneNumber: phone, name } : {},
    callee: !isInbound ? { phoneNumber: phone, name } : {},
    direction: isInbound ? "inbound" : "outbound",
  };

  const eventData = { ...baseEvent, ...callData };
  await queueZoomEvent(client, { type, data: eventData, _fragmentKey: type });
}

export async function addCallLog(client, logEntry) {
  try {
    // Deduplication: use callId + timestamp to uniquely identify a call log.
    // This prevents duplicate logs even if the same phone number calls at the same time
    // on different call sessions. The key differentiator is the callId.
    const logKey = logEntry.callId 
     
    
    if (processedCallLogs.has(logKey)) {
      console.log(`[Handler] Call log already processed (deduplicated):`, logKey);
      return;
    }
    processedCallLogs.add(logKey);
    // Persist to localStorage so deduplication survives page refreshes
    saveProcessedCallLogs(processedCallLogs);

    const result = await invokeWithRetry(client, "addCallLog", logEntry);
    if (result.status === 200) {
      const logs = JSON.parse(result.message);
      store.commit("callLogs/SET_CALL_LOGS", logs);
      console.log(`[Handler] Call log added successfully for ${logKey}`);
      
      // Clear the log entry payload to prevent accidental reuse/reprocessing
      // This ensures the payload cannot be processed again if the function is called again
      Object.keys(logEntry).forEach(key => delete logEntry[key]);
    }
  } catch (err) {
    console.error("[Handler] Failed to add call log:", err);
    // On error, remove from processed set so it can be retried later
    const logKey = logEntry.callId 
     
    processedCallLogs.delete(logKey);
    saveProcessedCallLogs(processedCallLogs);
  }
}

export async function fetchCallLogs(client) {
  try {
    const result = await invokeWithRetry(client, "fetchCallLogs", {});
    if (result.status === 200) {
      const logs = JSON.parse(result.message);
      store.commit("callLogs/SET_CALL_LOGS", logs);
    }
  } catch (err) {
    console.error("[Handler] Failed to fetch call logs:", err);
  }
}

export async function createTicketForActiveCall(client, payload) {
  console.log("the payload in create ticket");
  try {
    const resp = await invokeWithRetry(client, "createTicketForCaller", {
      subject: payload.subject,
      description: payload.description,
      priority: payload.priority,
      status: payload.status,
      phone: store.state.call.current_call?.phoneNumber || store.state.common.single_contact.phone,
      name: store.state.common.single_contact.name || store.state.call.current_call?.phoneNumber || store.state.call.current_call?.callerName,
    });
    console.log("[Handler] Ticket create resp:", resp);
  } catch (err) {
    console.error("[Handler] Error creating ticket:", err);
  }
}

export async function addNoteToTicket(client, ticketId, noteBody, isPrivate) {
  try {
    const resp = await invokeWithRetry(client, "addNoteToTicket", { ticketId, noteBody, isPrivate });
    return JSON.parse(resp.message);
  } catch (err) {
    console.error("[Handler] Error adding note to ticket:", err);
    throw err;
  }
}
