<template>
  <div class="create-ticket-wrapper">
    <!-- Header with close -->
    <div class="header">
      <h3>Create New Ticket</h3>
      <button class="close-btn" @click="closeForm">×</button>
    </div>
    <div class="form-group">
      <input
        type="text"
        :value="subject"
        @input="onSubjectInput"
        placeholder="Enter ticket subject"
        class="native-input"
      />
    </div>
    <div class="form-group">
      <label for="statusSelect">Status</label>
      <select id="statusSelect" v-model="status" class="native-select">
        <option value="2">Open</option>
        <option value="3">Pending</option>
        <option value="4">Resolved</option>
        <option value="5">Closed</option>
      </select>
    </div>
    <div class="form-group">
      <label for="prioritySelect">Priority</label>
      <select id="prioritySelect" v-model="priority" class="native-select">
        <option value="1">Low</option>
        <option value="2">Medium</option>
        <option value="3">High</option>
        <option value="4">Urgent</option>
      </select>
    </div>
    <div class="form-group">
      <textarea
        :value="description"
        @input="onDescriptionInput"
        placeholder="Describe the issue"
        class="native-textarea"
      ></textarea>
    </div>
    <button @click="closeForm" :disabled="loading" class="native-btn-cancel">
      Cancel
    </button>
    <button @click="submitTicket" :disabled="loading" class="native-btn">
      Create Ticket
    </button>

 
    <p v-if="message" class="success-message">{{ message }}</p>
    <p v-if="error" class="error-message">{{ error }}</p>
  </div>
</template>
 
<script>
import { createTicketForActiveCall } from "../../apis/handler";
 
export default {
  data() {
    return {
      subject: "",
      description: "",
      priority: "1",
      status: "2",
      loading: false,
      message: "",
      error: "",
    };
  },
  methods: {
    onSubjectInput(e) {
      this.subject = e.target.value;
    },
    onDescriptionInput(e) {
      this.description = e.target.value;
    },
    closeForm() {
      this.$store.commit("common/SET_PAGE_ROUTE", "call");
    },
    async submitTicket() {
      if (!this.subject.trim()) {
        this.error = "Subject is required.";
        return;
      }
      if (!this.description.trim()) {
        this.error = "Description is required.";
        return;
      }
      this.loading = true;
      this.message = "";
      this.error = "";
      try {
        const payload = {
          subject: this.subject,
          description: this.description,
          priority: Number(this.priority),
          status: Number(this.status),
        };
        await createTicketForActiveCall(client, payload);
        this.message = "Ticket created successfully!";
        this.closeForm();
        this.subject = "";
        this.description = "";
        this.priority = "1";
        this.status = "2";
      } catch (err) {
        this.error = "Failed to create ticket.";
        console.error(err);
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
 
<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.create-ticket-wrapper {
  padding: 16px;
}
.form-group {
  margin-bottom: 16px;
}
.success-message {
  color: green;
  margin-top: 12px;
}
.error-message {
  color: red;
  margin-top: 12px;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}
.native-input,
.native-select,
.native-textarea {
  width: 100%;
  padding: 8px;
  margin-top: 4px;
  border-radius: 4px;
  border: 1px solid #ccc;
  box-sizing: border-box;
}
.native-btn {
  padding: 8px 16px;
  background: #0e72ed;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.native-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.native-btn-cancel {
  padding: 8px 16px;
  margin-right: 8px;
  background: #ca1414;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
 
 