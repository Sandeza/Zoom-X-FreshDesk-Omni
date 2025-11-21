async function closeApp() {
  console.log("Testing");
  let currentLocation = null;
  console.log("Current Product:", locationType);
  if (
    locationType === "left_nav_cti" ||
    locationType === "conversation_user_info"
  ) {
    currentLocation = "phoneApp";
  } else {
    currentLocation = "softphone";
  }

  client.interface
    .trigger("hide", { id: currentLocation })
    .then(function () {
      console.info("Successfully closed the CTI app");
    })
    .catch(function (error) {
      console.error("Error: Failed to close the CTI app", error);
    });
}

let locationType = null;
// let currentPlatform = "zoom";

document.addEventListener("DOMContentLoaded", async function () {
  window.frsh_init().then(async function (client) {
    
    window.client = client;
    window.client.instance.resize({ height: "650px" });
    const context = await client.instance.context();
    locationType = context.location;
    console.log("FDK initialized. Current location:", locationType);
 ;
       const response12 = await window.client.data.get("currentProduct");
      console.log("Testing");
      console.log("Current Productxx:", response12);
      locationProduct = response12.currentProduct;
      console.log("Current Productpppp:", locationProduct);
  if(locationProduct==="freshsales"){
    freshdeskLogo.src = "styles/images/freshSalesLo.png"; // your CRM logo path
    freshdeskLogo.alt = "FreshSales CRM";
  }
 else if (locationProduct === "freshchat") {
   freshdeskLogo.src = "styles/images/freshChatLO.png"; // your CRM logo path
    freshdeskLogo.alt = "Freshworks CRM";
 
  } else {
    freshdeskLogo.src = "styles/images/freshdeskLogo.png";
    freshdeskLogo.alt = "Freshdesk";
  }
   })
  });
 

  // Set initial tab state
  document.getElementById("tab-interface").setAttribute("selected-tab", "zoom");
  document.querySelector('fw-tab-panel[name="zoom"]').style.display = "block";
  document.querySelector('fw-tab-panel[name="freshdesk"]').style.display =
    "none";

  // Set thumb slider to initial position (Zoom)
  const sliderThumb = document.getElementById("sliderThumb");
  if (sliderThumb) {
    sliderThumb.style.left = "6px";
  }
;

// Toggle between Zoom and Freshdesk
// Initialize state
let currentPlatform = null;
let toggleInProgress = false;

window.addEventListener("DOMContentLoaded", () => {
  const tabInterface = document.getElementById("tab-interface");
  currentPlatform = tabInterface.getAttribute("selected-tab") || "zoom";
  updateUI(currentPlatform);
  
});

function updateUI(platform) {
  const sliderThumb = document.getElementById("sliderThumb");
  const zoomPanel = document.querySelector('fw-tab-panel[name="zoom"]');
  const freshdeskPanel = document.querySelector('fw-tab-panel[name="freshdesk"]');
  const zoomLogo = document.getElementById("zoomLogo");
  const freshdeskLogo = document.getElementById("freshdeskLogo");
  const tabInterface = document.getElementById("tab-interface");

  if (platform === "freshdesk") {
    tabInterface.setAttribute("selected-tab", "freshdesk");
    sliderThumb.style.left = "calc(100% - 38px)";
    zoomPanel.style.display = "none";
    freshdeskPanel.style.display = "block";
    zoomLogo.classList.remove("active");
    freshdeskLogo.classList.add("active");
  } else {
    tabInterface.setAttribute("selected-tab", "zoom");
    sliderThumb.style.left = "6px";
    zoomPanel.style.display = "block";
    freshdeskPanel.style.display = "none";
    zoomLogo.classList.add("active");
    freshdeskLogo.classList.remove("active");
  }
}

window.togglePlatform = function () {
  if (toggleInProgress) return; // prevent spam clicks
  toggleInProgress = true;

  currentPlatform = currentPlatform === "zoom" ? "freshdesk" : "zoom";
  updateUI(currentPlatform);

  setTimeout(() => {
    toggleInProgress = false;
  }, 350); // matches CSS transition
};


// Zoom iframe initialization
window.addEventListener("load", () => {
  const zoom = document.getElementById("zoomCCP");
  if (zoom && zoom.contentWindow) {
    zoom.contentWindow.postMessage(
      {
        type: "zp-init-config",
        data: {
          enableSavingLog: true,
          enableAutoLog: true,
          enableContactSearching: true,
          enableContactMatching: true,
          notePageConfiguration: [
            {
              fieldName: "Disposition",
              fieldType: "select",
              selectOptions: [
                { label: "Intrested", value: "intrested" },
                { label: "Not Intrested", value: "not_intrested" },
                { label: "No Contact", value: "no_contact" },
              ],
              placeholder: "Select an option",
            },
            {
              fieldName: "Description",
              fieldType: "text",
              placeholder: "Enter notes",
            },
          ],
        },
      },
      "https://applications.zoom.us"
    );
  }
});

