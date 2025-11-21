import getters from "./getters";
import common from "./modules/common"
import callLogs from "./modules/callLogs";
import Vuex from "vuex";
import call from "./modules/call"

const store = new Vuex.Store({
  modules: {
    common:common,
    callLogs: callLogs,
    call:call
  },
  getters: getters,
});

export default store;
