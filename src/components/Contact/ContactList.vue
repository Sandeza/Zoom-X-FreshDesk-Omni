<template>
  <div>
    <div class="contact-search">
      <b-form-input
        v-model="contactSearch"
        class="contact-input-search"
        size="sm"
        placeholder="Search contacts..."
      />
    </div>

    <div class="contact-call-list">
      <div v-if="filteredContacts.length > 0">
        <b-table
          hover
          :items="filteredContacts"
          :fields="fields"
          show-header="false"
          
        >
          <template #cell(contacts)="row">
            <div id="contact-list-rows" @click="contactRedirection(row)">
              <h6 class="contact-name">
                <a href="#">
                  <font-awesome-icon
                    icon="fa-solid fa-user"
                    class="contact-icon"
                  />
                  {{ row.item.name || row.item.first_name}}
                </a>
              </h6>

              <h6 class="contact-number">
                <font-awesome-icon
                  icon="fa-solid fa-mobile"
                  class="number-icon"
                />
                {{ row.item.phone ||row.item.work_number||row.item.mobile_number }}
              </h6>

              <!-- ✅ Only show email if present -->
              <h6
                v-if="row.item.email"
                class="contact-email"
              >
                <font-awesome-icon
                  icon="fa-solid fa-envelope"
                  class="mail-icon"
                />
                {{ row.item.email }}
              </h6>
            </div>
          </template>

          <template #cell(call)="row">
            <button
              class="call-btn"
              @click="contactRedirectionAndMakeOutboundCall(row)"
            >
              <font-awesome-icon icon="phone" size="sm" />
            </button>
          </template>
        </b-table>
      </div>

      <div v-else>
        <h3 id="no-contacts-found">No Contacts Found</h3>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useStore } from "vuex";

export default {
  name: "ContactList",
  setup() {
    const store = useStore();
    const contactSearch = ref("");

    const fields = [
      { key: "contacts", label: "" },
      { key: "call", label: "" },
    ];

    const zoom = document.getElementById("zoomCCP");
    const currentProduct = computed(() => store.getters.current_product);
    const contactList = computed(() => store.getters.contact_list);
    const crmcontactlist =computed(()=>store.getters.contact_list_crm)
    console.log("crmcontact",crmcontactlist)
    
    // // ✅ Filter: only contacts with phone numbers + search match
    // const filteredContacts = computed(() => {
    //   const keyword = contactSearch.value.toLowerCase();
    //   return contactList.value.filter((contact) => {
    //     const hasPhone = contact.phone && contact.phone.trim() !== "";
    //     const matchesSearch =
    //       contact.name?.toLowerCase().includes(keyword) ||
    //       contact.phone?.toLowerCase().includes(keyword) ||
    //       contact.email?.toLowerCase().includes(keyword);

    //     return hasPhone && matchesSearch;
    //   });
    // });
//      const filteredContacts = computed(() => {
//   const keyword = contactSearch.value.toLowerCase();
 
//   // if search box empty, show all contacts
//   if (!keyword) return contactList.value;
 
//   return contactList.value.filter((contact) => {
//     const name = (contact.name || contact.first_name || "").toLowerCase();
//     const phone = (contact.phone || contact.work_number || "").toString().toLowerCase();
//     const email = (contact.email || "").toLowerCase();
 
//     return name.includes(keyword) || phone.includes(keyword) || email.includes(keyword);
//   });
// });
const filteredContacts = computed(() => {
  const keyword = contactSearch.value.toLowerCase();

  // Only include contacts with phone number or work_number (not empty)
  const contactsWithPhone = contactList.value.filter((contact) => {
    const phone = contact.phone || contact.work_number||contact.mobile_number;
    return phone && phone.toString().trim() !== "";
  });

  if (!keyword) return contactsWithPhone;

  return contactsWithPhone.filter((contact) => {
    const name = (contact.name || contact.first_name || "").toLowerCase();
    const phone = (contact.phone || contact.work_number ||contact.mobile_number|| "").toString().toLowerCase();
    const email = (contact.email || "").toLowerCase();

    return (
      name.includes(keyword) || phone.includes(keyword) || email.includes(keyword)
    );
  });
});


    const contactRedirection = (row) => {};

    const contactRedirectionAndMakeOutboundCall = (row) => {
      zoom.contentWindow.postMessage(
        {
          type: "zp-make-call",
          data: {
            number: row.item.phone||row.item.work_number||row.item.mobile_number,
          },
        },
        "https://applications.zoom.us"
      );
      console.log("outbound call initiated!!");
      if (typeof window.togglePlatform === "function") {
        window.togglePlatform();
      } else {
        console.log("togglePlatform is not available.");
      }
    };

    onMounted(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    return {
      contactSearch,
      contactList,
      filteredContacts,
      fields,
      contactRedirection,
      contactRedirectionAndMakeOutboundCall,
    };
  },
};
</script>

<style scoped>
.no-contacts-found {
  text-align: center;
  margin-top: 20px;
}
a {
  color: black;
  text-decoration: none;
}
.contact-search {
  position: relative;
}
.contact-input-search {
  position: relative;
  width: 320px;
  margin-top: 5px;
  margin-left: 5px;
}

#contact-list-rows {
  text-align: left;
}
.contact-name {
  font-size: medium;
}
.contact-number {
  font-size: small;
}
.contact-email {
  font-size: small;
}
.contact-icon {
  padding-right: 10px;
  color: #636e72;
}
.number-icon {
  padding-right: 5px;
  color: #636e72;
}
.mail-icon {
  padding-right: 3px;
  color: #636e72;
}
.call-btn {
  background-color: transparent;
  margin-top: 20px;
  border-style: none;
  border-radius: 6px;
}
.call-btn:hover {
  color: #0e72ed !important;
}
</style>
