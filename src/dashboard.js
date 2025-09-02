import { supabase, getCurrentUser } from "./supabase-client.js";
import { showToast, formatDate, getVaccineStatus } from "./utils.js";

class Dashboard {
  constructor() {
    this.records = [];
    this.reminders = [];
    this.filteredRecords = [];
    this.currentUserRole = "user"; // default role
  }

  async init() {
    await this.loadData();
    this.currentUserRole = await this.getUserRole();

    // Show/hide admin controls
    const adminControls = document.getElementById("admin-controls");
    if (adminControls) {
      adminControls.style.display =
        this.currentUserRole === "admin" ? "block" : "none";
    }

    this.setupEventListeners();
    this.updateStats();
    this.renderRecords();
    this.renderReminders();
  }

  async getUserRole() {
    const user = await getCurrentUser();
    if (!user) return "user";

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile) return "user";
    return profile.role;
  }

  setupEventListeners() {
    // Search functionality
    document.getElementById("search-input")?.addEventListener("input", (e) => {
      this.filterRecords(e.target.value);
    });

    // Admin-only: Add vaccine
    document
      .getElementById("add-vaccine-btn")
      ?.addEventListener("click", () => {
        if (this.currentUserRole !== "admin") {
          showToast("Only admins can add vaccines!", "error");
          return;
        }
        window.modals.openModal("add-vaccine-modal");
      });

    // View reminders modal (all users)
    document
      .getElementById("view-reminders-btn")
      ?.addEventListener("click", () => {
        window.modals.openModal("reminders-modal");
      });

    // Vaccine name change handlers for custom input
    document
      .getElementById("vaccine-name")
      ?.addEventListener("change", (e) =>
        this.toggleCustomVaccineInput(
          "custom-vaccine-group",
          "custom-vaccine-name",
          e.target.value
        )
      );

    document
      .getElementById("edit-vaccine-name")
      ?.addEventListener("change", (e) =>
        this.toggleCustomVaccineInput(
          "edit-custom-vaccine-group",
          "edit-custom-vaccine-name",
          e.target.value
        )
      );
  }

  toggleCustomVaccineInput(groupId, inputId, value) {
    const group = document.getElementById(groupId);
    const input = document.getElementById(inputId);

    if (value === "Other") {
      group.style.display = "block";
      input.required = true;
    } else {
      group.style.display = "none";
      input.required = false;
      input.value = "";
    }
  }

  async loadData() {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Vaccination records filtered by current user
      const { data: records, error: recordsError } = await supabase
        .from("vaccination_records")
        .select("*")
        .eq("user_id", user.id)
        .order("date_given", { ascending: false });

      if (recordsError) throw recordsError;
      this.records = records || [];
      this.filteredRecords = [...this.records];

      // Upcoming reminders filtered by current user
      const { data: reminders, error: remindersError } = await supabase
        .from("reminders")
        .select(`*, vaccination_records(vaccine_name, dose_number)`)
        .eq("user_id", user.id)
        .eq("sent", false)
        .order("due_date", { ascending: true });

      if (remindersError) throw remindersError;
      this.reminders = reminders || [];
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("Error loading data", "error");
    }
  }

  updateStats() {
    const totalVaccines = this.records.length;
    const upToDate = this.records.filter(
      (r) => !r.next_due || new Date(r.next_due) > new Date()
    ).length;
    const upcomingReminders = this.reminders.filter((r) => {
      const due = new Date(r.due_date);
      const today = new Date();
      const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      return due >= today && due <= in30Days;
    }).length;
    const overdue = this.reminders.filter(
      (r) => new Date(r.due_date) < new Date()
    ).length;

    document.getElementById("total-vaccines").textContent = totalVaccines;
    document.getElementById("up-to-date").textContent = upToDate;
    document.getElementById("upcoming-reminders").textContent =
      upcomingReminders;
    document.getElementById("overdue").textContent = overdue;
  }

  filterRecords(term) {
    const search = term.toLowerCase().trim();
    this.filteredRecords = search
      ? this.records.filter((r) =>
          r.vaccine_name.toLowerCase().includes(search)
        )
      : [...this.records];
    this.renderRecords();
  }

  renderRecords() {
    const container = document.getElementById("records-container");
    if (!container) return;

    if (this.filteredRecords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-syringe"></i>
          <h3>No vaccination records found</h3>
          <p>${
            this.currentUserRole === "user"
              ? "Please contact admin if records are missing."
              : "Start by adding your first vaccination record."
          }</p>
        </div>`;
      return;
    }

    container.innerHTML = this.filteredRecords
      .map((r) => {
        const status = getVaccineStatus(r.next_due);
        return `
        <div class="record-card" data-id="${r.id}">
          <div class="record-header">
            <div class="record-title">
              <i class="fas fa-syringe"></i> ${
                r.vaccine_name
              } <span class="dose-badge">Dose ${r.dose_number}</span>
            </div>
            ${
              this.currentUserRole === "admin"
                ? `<div class="record-actions">
                     <button class="btn-icon" onclick="window.dashboard.editRecord('${r.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                     <button class="btn-icon btn-danger" onclick="window.dashboard.deleteRecord('${r.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                   </div>`
                : ""
            }
          </div>
          <div class="record-details">
            <div class="record-detail"><i class="fas fa-calendar"></i> Given: ${formatDate(
              r.date_given
            )}</div>
            ${
              r.next_due
                ? `<div class="record-detail"><i class="fas fa-clock"></i> Next Due: ${formatDate(
                    r.next_due
                  )}</div>`
                : ""
            }
            <div class="record-detail"><span class="status-badge status-${
              status.class
            }">${status.text}</span></div>
          </div>
        </div>`;
      })
      .join("");
  }

  renderReminders() {
    const container = document.getElementById("reminders-container");
    if (!container) return;

    if (!this.reminders.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-bell"></i>
          <h3>No upcoming reminders</h3>
          <p>You're all caught up!</p>
        </div>`;
      return;
    }

    container.innerHTML = this.reminders
      .map((r) => {
        const overdue = new Date(r.due_date) < new Date();
        const name = r.vaccination_records?.vaccine_name || "Unknown Vaccine";
        const dose = r.vaccination_records?.dose_number || 1;
        return `
        <div class="reminder-card ${overdue ? "overdue" : ""}">
          <div class="reminder-info">
            <h4>${name} - Dose ${dose}</h4>
            <p>${overdue ? "Overdue since" : "Due on"} ${formatDate(
          r.due_date
        )}</p>
          </div>
          <div class="reminder-date">${overdue ? "OVERDUE" : "UPCOMING"}</div>
        </div>`;
      })
      .join("");
  }

  // Admin functions (add/edit/delete)
  async addRecord(formData) {
    if (this.currentUserRole !== "admin")
      return showToast("Only admins can add vaccines!", "error");
    try {
      const user = await getCurrentUser();
      const { data, error } = await supabase
        .from("vaccination_records")
        .insert([
          {
            user_id: user.id,
            vaccine_name: formData.vaccine_name,
            dose_number: parseInt(formData.dose_number),
            date_given: formData.date_given,
            next_due: formData.next_due || null,
          },
        ])
        .select();

      if (error) throw error;

      if (formData.next_due && data[0]) {
        await supabase
          .from("reminders")
          .insert([
            {
              user_id: user.id,
              record_id: data[0].id,
              due_date: formData.next_due,
            },
          ]);
      }

      await this.loadData();
      this.updateStats();
      this.renderRecords();
      this.renderReminders();
      showToast("Vaccination record added successfully!", "success");
      window.modals.closeModal("add-vaccine-modal");
    } catch (err) {
      console.error(err);
      showToast("Error adding vaccination record", "error");
    }
  }

  async editRecord(recordId) {
    if (this.currentUserRole !== "admin")
      return showToast("Only admins can edit vaccines!", "error");
    const record = this.records.find((r) => r.id === recordId);
    if (!record) return;

    document.getElementById("edit-record-id").value = record.id;
    document.getElementById("edit-vaccine-name").value = record.vaccine_name;
    document.getElementById("edit-dose-number").value = record.dose_number;
    document.getElementById("edit-date-given").value = record.date_given;
    document.getElementById("edit-next-due").value = record.next_due || "";

    if (
      ![
        "COVID-19",
        "Influenza",
        "Hepatitis B",
        "MMR",
        "Tdap",
        "HPV",
        "Pneumococcal",
        "Meningococcal",
        "Varicella",
        "Shingles",
      ].includes(record.vaccine_name)
    ) {
      document.getElementById("edit-vaccine-name").value = "Other";
      document.getElementById("edit-custom-vaccine-group").style.display =
        "block";
      document.getElementById("edit-custom-vaccine-name").value =
        record.vaccine_name;
      document.getElementById("edit-custom-vaccine-name").required = true;
    }

    window.modals.openModal("edit-vaccine-modal");
  }

  async updateRecord(formData) {
    if (this.currentUserRole !== "admin")
      return showToast("Only admins can update vaccines!", "error");

    try {
      const recordId = document.getElementById("edit-record-id").value;
      const { error } = await supabase
        .from("vaccination_records")
        .update({
          vaccine_name: formData.vaccine_name,
          dose_number: parseInt(formData.dose_number),
          date_given: formData.date_given,
          next_due: formData.next_due || null,
        })
        .eq("id", recordId);
      if (error) throw error;

      const { data: existingReminder } = await supabase
        .from("reminders")
        .select("id")
        .eq("record_id", recordId)
        .single();

      if (formData.next_due) {
        if (existingReminder)
          await supabase
            .from("reminders")
            .update({ due_date: formData.next_due })
            .eq("record_id", recordId);
        else {
          const user = await getCurrentUser();
          await supabase
            .from("reminders")
            .insert([
              {
                user_id: user.id,
                record_id: recordId,
                due_date: formData.next_due,
              },
            ]);
        }
      } else if (existingReminder)
        await supabase.from("reminders").delete().eq("record_id", recordId);

      await this.loadData();
      this.updateStats();
      this.renderRecords();
      this.renderReminders();
      showToast("Vaccination record updated successfully!", "success");
      window.modals.closeModal("edit-vaccine-modal");
    } catch (err) {
      console.error(err);
      showToast("Error updating vaccination record", "error");
    }
  }

  deleteRecord(recordId) {
    if (this.currentUserRole !== "admin")
      return showToast("Only admins can delete vaccines!", "error");
    window.modals.currentDeleteId = recordId;
    window.modals.openModal("delete-modal");
  }

  async confirmDelete() {
    if (this.currentUserRole !== "admin")
      return showToast("Only admins can delete vaccines!", "error");

    try {
      const recordId = window.modals.currentDeleteId;
      if (!recordId) return;

      const { error } = await supabase
        .from("vaccination_records")
        .delete()
        .eq("id", recordId);
      if (error) throw error;

      await this.loadData();
      this.updateStats();
      this.renderRecords();
      this.renderReminders();
      showToast("Vaccination record deleted successfully!", "success");
      window.modals.closeModal("delete-modal");
    } catch (err) {
      console.error(err);
      showToast("Error deleting vaccination record", "error");
    }
  }
}

export default Dashboard;
