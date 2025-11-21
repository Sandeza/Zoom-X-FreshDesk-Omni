<template>
  <div class="create-contact-container">
    <div class="contact-card">
      <h3 class="form-title">Create Contact</h3>

      <b-form @submit="onSubmit" @reset="onReset" v-if="show">
        <b-form-group label="Name" label-for="name">
          <div class="input-with-icon">
            <b-form-input
              id="name"
              v-model="form.name"
              placeholder="Enter name"
              :state="nameValidation"
            />
            <i class="fa-solid fa-user"></i>
          </div>
        </b-form-group>

        <b-form-group label="Mobile" label-for="mobile">
          <b-form-input
            id="mobile"
            v-model="form.create_contact_phone_number"
            placeholder="Mobile Number"
            :state="phoneNumberValidation"
          />
        </b-form-group>

        <b-form-group label="Email Address" label-for="email">
          <b-form-input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="Email(Optional)"
            :class="{ 'optional-yellow': !form.email }"
            :state="emailValidation"
          />
        </b-form-group>

        <div class="button-row">
          <button
            type="button"
            class="btn-save"
            @click="saveContact()"
            :disabled="!saveContactValidation"
          >
            Add
          </button>
          <button type="button" class="btn-cancel" @click="cancel()">
            Cancel
          </button>
        </div>
      </b-form>
    </div>
  </div>
</template>

<script>
import { useStore } from "vuex";
import { mapGetters } from "vuex";

// import store from "@/store";
// import { mapGetters } from "vuex";
export default {
  name: "CreateContact",
  data() {
    return {
      form: {
        email: "",
        name: "",
        create_contact_phone_number: "",
        checked: [],
      },
      show: true,
      buttonStatus: true,
    };
  },
  mounted() {
    if (this.create_contact_phone_number) {
      this.form.create_contact_phone_number = this.create_contact_phone_number;
    }
  },
  computed: {
    ...mapGetters(["create_contact_phone_number"]),
    ...mapGetters(["page_route"]),
    nameValidation() {
      return this.form.name.length > 2 && this.form.name.length < 30;
    },
    phoneNumberValidation() {
      return (
        this.form.create_contact_phone_number.length > 9 &&
        this.form.create_contact_phone_number.length < 16
      );
    },

    emailValidation() {
      if (!this.form.email) return null; // Neutral for validation logic
      const regexEmail = /\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*/;
      return regexEmail.test(this.form.email);
    },

    saveContactValidation() {
      return (
        this.phoneNumberValidation !== false && this.nameValidation !== false
      );
    },
  },
  methods: {
    onSubmit(event) {
      event.preventDefault();
      alert(JSON.stringify(this.form));
    },
    onReset(event) {
      event.preventDefault();
      // Reset our form values
      this.form.email = "";
      this.form.name = "";
      this.form.phoneNumber = "";
      this.form.checked = [];
      // Trick to reset/clear native browser form validation state
      this.show = false;
      this.$nextTick(() => {
        this.show = true;
      });
      store.dispatch("common/updatePageRoute", "home");
    },
    saveContact() {
      console.log(this.create_contact_phone_number);
      if (!this.saveContactValidation) {
        console.log("Invalid form details");
        return;
      }

      const client = window.client;

      const contactPayload = {
        name: this.form.name,
        phone: this.form.create_contact_phone_number,
        email: this.form.email,
      };

      client.request
        .invokeTemplate("create_contact", {
          body: JSON.stringify(contactPayload),
          headers: {
            "Content-Type": "application/json",
          },
        })
        .then((res) => {
          console.log(" Contact created successfully:", res.response);
          this.$store.dispatch("common/updatePageRoute", "home");
        })
        .catch((error) => {
          console.error(" Error creating contact:", error);
        });
    },
    cancel() {
      console.log("cancel notes clicked");
      this.$store.dispatch("common/updatePageRoute", "home");
    },
  },
};
</script>

<style>
.create-contact-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.contact-card {
  background: white;
  border-radius: 10px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.form-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  text-align: center;
}

.input-with-icon {
  position: relative;
}
.input-with-icon input {
  padding-left: 30px;
}
.input-with-icon i {
  position: absolute;
  top: 50%;
  left: 8px;
  transform: translateY(-50%);
  color: #aaa;
}

.button-row {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-save,
.btn-cancel {
  flex: 1;
  height: 36px;
  border: none;
  border-radius: 5px;
  font-weight: 500;
  cursor: pointer;
}

.btn-save {
  background-color: #307bd7;
  color: #fff;
}
.btn-save:hover {
  background-color: #2d6dba;
}

.btn-cancel {
  background-color: #f1f1f1;
  color: #333;
}
.btn-cancel:hover {
  background-color: #e4e4e4;
}
.optional-yellow {
  border: 1px solid #ffcc00 !important; /* yellow */
  box-shadow: 0 0 0 0.2rem rgba(255, 204, 0, 0.25) !important; /* light yellow glow */
}
</style>
