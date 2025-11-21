<template>
  <div class="create-note-container">
    <!-- Header -->
    <div class="note-header">
      <h3>Add Note to Ticket -{{ ticketData.id }}</h3>
      <button class="close-btn" @click="closeNoteUI">×</button>
    </div>

    <!-- Ticket Info -->
    <div class="note-ticket-info">
      <strong>{{ ticketData.subject }}</strong>
      <span class="ticket-meta">
        🕒 {{ createdAtDate.toLocaleString() }}
        • 📌 {{ ticketStatus }}
      </span>
    </div>

    <!-- Textarea -->
    <textarea
      v-model="noteContent"
      class="note-textarea"
      placeholder="✍️ Write your note here..."
    ></textarea>

    <!-- Footer -->
    <div class="note-footer">
      <label class="checkbox-label">
        <input type="checkbox" v-model="isPrivate" />
        <span>Private Note</span>
      </label>

      <button class="add-note-btn" @click="saveNote">
        ➕ Add Note
      </button>
    </div>
  </div>
</template>


<script>
import { mapGetters, mapMutations } from "vuex";
import { addNoteToTicket } from "../../apis/handler";

// const home_tab = computed(() => store.getters.home_tab);

export default {
  data() {
    const ticketData = this.$store.getters.ticket_id;
    return {
      tickets: [], // your ticket list
      activeTicket: null, // selected ticket for adding note
      noteContent: "",
      isPrivate: false,
      showNoteUI: false,
      ticketData,
      createdAtDate: new Date(ticketData.created_at),
      statusMap: {
        2: "Open",
        3: "Pending",
        4: "Resolved",
        5: "Closed",
      },
    };
  },
  async mounted() {
    console.log("mounted addnotes");
    console.log(JSON.stringify(this.ticketData));
    console.log(this.ticketData.created_at);
    // datey="2025-08-28T06:14:45Z";
    // console.log(datey.toLocaleString());
  },
  computed: {
    ...mapGetters(["page_route"]),
    ticketStatus() {
      return this.statusMap[this.ticketData.status] || "Unknown";
    },
  },
  methods: {
    // Triggered when "Add Note" is clicked from ticket list
    setNotes(ticketId) {
      const ticket = this.tickets.find((t) => t.id === ticketId);
      if (ticket) {
        this.activeTicket = ticket;
        this.noteContent = "";
        this.isPrivate = false;
        this.showNoteUI = true;
      }
    },

    // Close note UI
    closeNoteUI() {
      this.$store.commit("common/SET_PAGE_ROUTE", "call");
    },

    // Save note (replace with  Freshdesk API call)
    async saveNote() {
      console.log("Private?", this.isPrivate);
      console.log("data", this.ticketData);
      addNoteToTicket(client, this.ticketData.id,this.noteContent, this.isPrivate);
      if (!this.noteContent.trim()) {
        alert("Please enter a note before saving.");
        return;
      }
      this.closeNoteUI();

      // try {
       
      //   // await this.addNoteToFreshdesk(this.ticketData.id, 
      //   //  this.noteContent,
      //   //    this.isPrivate
      //   // );

      //   alert("Note added successfully!");

      //   // Close after saving
      //   
      // } catch (error) {

      //   console.error("Error saving note:", error);
      //   alert("Failed to save note. Please try again.");
      // }
    },
  },
};
</script>

<style scoped>
.create-note-container {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 500px;
  margin: auto;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 6px;
}

.note-header h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.close-btn {
  background: #f9fafb;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
}

.close-btn:hover {
  background: #f3f4f6;
}

.note-ticket-info {
  font-size: 0.9rem;
  color: #374151;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ticket-meta {
  font-size: 0.8rem;
  color: #6b7280;
}

.note-textarea {
  width: 100%;
  min-height: 110px;
  resize: vertical;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.note-textarea:focus {
  border-color: #2563eb;
  box-shadow: 0px 0px 0px 2px rgba(37, 99, 235, 0.25);
}

.note-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #374151;
}

.add-note-btn {
  background-color: #2563eb;
  color: white;
  padding: 7px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.add-note-btn:hover {
  background-color: #1d4ed8;
  transform: translateY(-1px);
}

</style>
