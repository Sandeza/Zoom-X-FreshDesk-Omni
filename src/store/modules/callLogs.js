let client; // Freshworks app client
const DB_KEY = "Zoom_BYOT12";

(async function init() {
  try {
    client = await app.initialized();
  } catch (err) {
    console.error("Failed to init Freshworks client in callLogs.js", err);
  }
})();

const state = {
  call_logs: [],
};

const mutations = {
  SET_CALL_LOGS(state, logs) {
    state.call_logs = logs;
  },
};

const actions = {
  // Ensure DB key exists, return current logs
  async ensureDbExists({ commit }) {
    const [err, data] = await to(client.db.get(DB_KEY));
    if (err && err.status === 404) {
      await client.db.set(DB_KEY, { logs: [] });
      console.log(`CallLogs DB created: ${DB_KEY}`);
      commit("SET_CALL_LOGS", []);
      return [];
    }
    if (err) {
      console.error("Error reading CallLogs DB:", err);
      commit("SET_CALL_LOGS", []);
      return [];
    }
    commit("SET_CALL_LOGS", data.logs || []);
    return data.logs || [];
  },

  // Fetch logs from DB
  async fetchCallLogs({ commit }) {
    const [err, data] = await to(client.db.get(DB_KEY));
    if (err && err.status === 404) {
      commit("SET_CALL_LOGS", []);
      return [];
    }
    if (err) {
      console.error(" Error fetching logs from DB:", err);
      commit("SET_CALL_LOGS", []);
      return [];
    }
    commit("SET_CALL_LOGS", data.logs || []);
    console.log(" Call logs fetched from DB:", data || []);
    return data.logs || [];
  },

  // Add a new log to DB
  async addCallLog({ dispatch }, log) {
    console.log(log);
    const logs = await dispatch("fetchCallLogs");
    // console.log("loggggggggs",logs)
    logs.unshift(log);
    if (logs.length > 50) logs.pop();
    // console.log("logggggs",logs)
    await client.db.set(DB_KEY, { logs });
    dispatch("fetchCallLogs"); // refresh Vuex state
    console.log("✅ Call log added to DB");
  },

  // Replace all logs in DB
  async setCallLogs({ commit }, logs) {
    await client.db.set(DB_KEY, { logs });
    commit("SET_CALL_LOGS", logs);
  },
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
};

// Utility to simplify async/await error handling
function to(promise) {
  return promise.then((data) => [null, data]).catch((err) => [err]);
}
