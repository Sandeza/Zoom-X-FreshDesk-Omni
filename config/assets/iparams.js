// You must call setCurrentModule('freshdesk') or setCurrentModule('freshsales') whenever you toggle modules in your UI.

let currentModule = "freshdesk"; // Default, or update in your showModule() handler
function showInlineError(id, message) {
  document.getElementById(id).innerText = message;
   document.getElementById(id+"_copy").innerText = message;
}
function clearInlineErrors() {
  document.querySelectorAll(".error-text").forEach(el => el.innerText = "");
}


function setCurrentModule(module) {
  currentModule = module;
}

// Load config values into input fields
function getConfigs(configs) {
  const emailField = document.getElementById("email_id");
  if (emailField) emailField.value = configs.email_id || "";

  if (currentModule === "freshdesk") {
    const ddomainField = document.getElementById("d_domain");
    const dapiKeyField = document.getElementById("d_api_key");
    const cdomainField = document.getElementById("c_domain");
    const capiKeyField = document.getElementById("c_api_key");
    const crmdomainField = document.getElementById("crm_domain");
    const crmapiKeyField = document.getElementById("crm_api_key");

    if (ddomainField) ddomainField.value = configs.d_domain || "";
    if (dapiKeyField) dapiKeyField.value = configs.d_api_key || "";
    if (cdomainField) cdomainField.value = configs.c_domain || "";
    if (capiKeyField) capiKeyField.value = configs.c_api_key || "";
    if (crmdomainField) crmdomainField.value = configs.crm_domain || "";
    if (crmapiKeyField) crmapiKeyField.value = configs.crm_api_key || "";
  } else if (currentModule === "freshsales") {
    const cdomainField = document.getElementById("c_domain");
    const capiKeyField = document.getElementById("c_api_key");
    const crmdomainField = document.getElementById("crm_domain");
    const crmapiKeyField = document.getElementById("crm_api_key");

    if (cdomainField) cdomainField.value = configs.c_domain || "";
    if (capiKeyField) capiKeyField.value = configs.c_api_key || "";
    if (crmdomainField) crmdomainField.value = configs.crm_domain || "";
    if (crmapiKeyField) crmapiKeyField.value = configs.crm_api_key || "";
  }
}

// Save config values from input fields
function postConfigs() {
  const emailField = document.getElementById("email_id");
  let config = {
    __meta: {
      secure: ["d_api_key", "c_api_key", "crm_api_key"]
    },
    email_id: emailField?.value.trim() || ""
  };

  if (currentModule === "freshdesk") {
    config.d_domain = document.getElementById("d_domain")?.value.trim() || "";
    config.d_api_key = document.getElementById("d_api_key")?.value.trim() || "";
    config.c_domain = document.getElementById("c_domain")?.value.trim() || "";
    config.c_api_key = document.getElementById("c_api_key")?.value.trim() || "";
    config.crm_domain = document.getElementById("crm_domain")?.value.trim() || "";
    config.crm_api_key = document.getElementById("crm_api_key")?.value.trim() || "";
  } else if (currentModule === "freshsales") {
    config.c_domain = document.getElementById("c_domain")?.value.trim() || "";
    config.c_api_key = document.getElementById("c_api_key")?.value.trim() || "";
    config.crm_domain = document.getElementById("crm_domain")?.value.trim() || "";
    config.crm_api_key = document.getElementById("crm_api_key")?.value.trim() || "";
    config.d_domain = "";
    config.d_api_key = "";
  }
  return config;
}

// Email validation helper
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test((email || "").trim());
}

// Validate required fields depending on module
function validate() {

   clearInlineErrors(); 
  const emailField = document.getElementById("email_id");
  if (!emailField?.value) {
    showInlineError("emailError", "Email ID is required!");
    emailField?.focus();
    

    return false;
  }
  if (!isValidEmail(emailField.value)) {
    showInlineError("emailError", "Please enter a valid Email ID!");
    emailField.focus();
    return false;
  }

  if (currentModule === "freshdesk") {
    const ddomainField = document.getElementById("d_domain");
    const dapiKeyField = document.getElementById("d_api_key");
    const cdomainField = document.getElementById("c_domain");
    const capiKeyField = document.getElementById("c_api_key");
    const crmdomainField = document.getElementById("crm_domain");
    const crmapiKeyField = document.getElementById("crm_api_key");

    if (
     
      !cdomainField?.value ||
      !capiKeyField?.value ||
      !crmdomainField?.value ||
      !crmapiKeyField?.value
    ) {
      showInlineError("emailError", "Please fill all the required fields");
      return false;
    }
  } else if (currentModule === "freshsales") {
    const cdomainField = document.getElementById("c_domain");
    const capiKeyField = document.getElementById("c_api_key");
    const crmdomainField = document.getElementById("crm_domain");
    const crmapiKeyField = document.getElementById("crm_api_key");

    if (
      !cdomainField?.value ||
      !capiKeyField?.value ||
      !crmdomainField?.value ||
      !crmapiKeyField?.value
    ) {
      showInlineError("emailError", "Please fill all the required fields");
      return false;
    }
  }
  return true;
}

// Dynamically set links for API key help
async function initializeAppClient() {
  try {
    const client = await app.initialized();
    window.client = client;
    // You may want to use different URLs for different modules
    const {
      url: baseUrl
    } = client.context.productContext || { url: "" };

    // Fill these appropriately based on the loaded module context.
    const links = {
      apiKeyLinkfreshdeskapi: baseUrl ? `${baseUrl}/sales/personal-settings/api-settings` : "https://support.freshdesk.com/support/solutions/articles/215517",
      apiKeyLinkfreshchatapi: baseUrl ? `${baseUrl}/sales/personal-settings/api-settings` : "https://support.freshchat.com/support/solutions/articles/215517",
      apiKeyLinkcrmapi: baseUrl ? `${baseUrl}/sales/personal-settings/api-settings` : "https://support.myfreshworks.com/support/solutions/articles/50000000308"
    };

    Object.entries(links).forEach(([id, href]) => {
      const el = document.getElementById(id);
      if (el) el.setAttribute("href", href);
    });
  } catch (error) {
    // App context not ready, fallback static URLs
    document.getElementById("apiKeyLinkfreshdeskapi")?.setAttribute("href", "https://support.freshdesk.com/support/solutions/articles/215517");
    document.getElementById("apiKeyLinkfreshchatapi")?.setAttribute("href", "https://support.freshchat.com/support/solutions/articles/215517");
    document.getElementById("apiKeyLinkcrmapi")?.setAttribute("href", "https://support.myfreshworks.com/support/solutions/articles/50000000308");
    console.error("Failed to initialize app client:", error);
  }
}
function syncFwInputs(source, target) {
  if (!source || !target) return;

  // Sync source → target
  source.addEventListener("fwInput", () => {
    const value = source.value;
    target.value = value;                     // Updates fw-input property
    updateShadowInput(target, value);         // Updates visible text
  });

  // Optional: sync target → source
  target.addEventListener("fwInput", () => {
    const value = target.value;
    source.value = value;
    updateShadowInput(source, value);
  });
}

// Helper to update Shadow DOM of fw-input
function updateShadowInput(fwInput, value) {
  const shadowInput = fwInput.shadowRoot?.querySelector("input");
  if (shadowInput) shadowInput.value = value;
}

// Make sure this runs after the DOM is loaded:
document.addEventListener("DOMContentLoaded", initializeAppClient);
document.addEventListener("DOMContentLoaded", function () {
  // const emailField = document.getElementById("email_id");
   const mainEmail = document.getElementById("email_id");
  const copyEmail = document.getElementById("email_id_copy");
  const cmaindomain=document.getElementById("c_domain");
  const cmainapikey=document.getElementById("c_api_key");
  const crmmaindomain=document.getElementById("crm_domain");
  const crmmainapikey=document.getElementById("crm_api_key");
  const cdomainField = document.getElementById("c_domain_copy");
  const capiKeyField = document.getElementById("c_api_key_copy");
  const crmdomainField = document.getElementById("crm_domain_copy");
  const crmapiKeyField = document.getElementById("crm_api_key_copy");    
  syncFwInputs(
  document.getElementById("c_domain"),
  document.getElementById("c_domain_copy")
);

syncFwInputs(
  document.getElementById("c_api_key"),
  document.getElementById("c_api_key_copy")
);

syncFwInputs(
  document.getElementById("crm_domain"),
  document.getElementById("crm_domain_copy")
);

syncFwInputs(
  document.getElementById("crm_api_key"),
  document.getElementById("crm_api_key_copy")
);


  if (mainEmail && copyEmail) {
    // When typing in the first input
    mainEmail.addEventListener("fwInput", (e) => {
      copyEmail.value = e.target.value;
    });

    // Optional: If you want the sync BOTH WAYS
    copyEmail.addEventListener("fwInput", (e) => {
      mainEmail.value = e.target.value;
    });
  }
});

// In your HTML page, whenever you change the module (form) visibility, update currentModule:
window.showModule = function (moduleName) {
  document.getElementById("freshdeskModule").style.display =
    moduleName === "freshdesk" ? "block" : "none";
  document.getElementById("freshsalesModule").style.display =
    moduleName === "freshsales" ? "block" : "none";
  document.getElementById("btn-freshdesk").classList.toggle('active', moduleName === "freshdesk");
  document.getElementById("btn-freshsales").classList.toggle('active', moduleName === "freshsales");
  setCurrentModule(moduleName);
};
