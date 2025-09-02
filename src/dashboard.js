import { supabase, getCurrentUser } from "./supabase-client.js";
import { showToast, formatDate, getVaccineStatus } from "./utils.js";

class Dashboard {
  constructor() {
    this.records = [];
    this.reminders = [];
    this.filteredRecords = [];
    this.currentUser = null;
    this.currentUserRole = "user"; // Default to most restrictive role
    this.isInitialized = false;
  }

  // ===========================
  // INITIALIZATION
  // ===========================
  async init() {
    try {
      // Get current user and role first
      await this.loadUserData();
      
      // Load vaccination data based on role
      await this.loadVaccinationData();
      
      // Setup UI based on role
      this.setupRoleBasedUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Update dashboard
      this.updateStats();
      this.renderRecords();
      this.renderReminders();
      
      this.isInitialized = true;
      console.log(`Dashboard initialized for ${this.currentUserRole} role`);
    } catch (error) {
      console.error("Dashboard initialization error:", error);
      showToast("Error initializing dashboard", "error");
    }
  }

  // ===========================
  // USER DATA LOADING
  // ===========================
  async loadUserData() {
    try {
      // Get current authenticated user
      this.currentUser = await getCurrentUser();
      if (!this.currentUser) {
        throw new Error("No authenticated user found");
      }

      // Fetch user profile with role information
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", this.currentUser.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        // Default to user role if profile fetch fails
        this.currentUserRole = "user";
      } else {
        this.currentUserRole = profile?.role || "user";
      }

      // Update user display name in header
      const userNameElem = document.getElementById("user-name");
      if (userNameElem) {
        userNameElem.textContent = profile?.full_name || this.currentUser.email.split("@")[0];
      }

      console.log(`User role detected: ${this.currentUserRole}`);
    } catch (error) {
      console.error("Error loading user data:", error);
      this.currentUserRole = "user"; // Fail safe to most restrictive role
    }
  }

  // ===========================
  // VACCINATION DATA LOADING
  // ===========================
  async loadVaccinationData() {
    try {
      if (!this.currentUser) return;

      // Load vaccination records based on role
      let recordsQuery = supabase
        .from("vaccination_records")
        .select("*")
        .order("date_given", { ascending: false });

      // Users can only see their own records, admins can see all
      if (this.currentUserRole === "user") {
        recordsQuery = recordsQuery.eq("user_id", this.currentUser.id);
      }

      const { data: records, error: recordsError } = await recordsQuery;
      if (recordsError) throw recordsError;

      this.records = records || [];
      this.filteredRecords = [...this.records];

      // Load reminders based on role
      let remindersQuery = supabase
        .from("reminders")
        .select(`
          *,
          vaccination_records(vaccine_name, dose_number)
        `)
        .eq("sent", false)
        .order("due_date", { ascending: true });

      // Users can only see their own reminders, admins can see all
      if (this.currentUserRole === "user") {
        remindersQuery = remindersQuery.eq("user_id", this.currentUser.id);
      }

      const { data: reminders, error: remindersError } = await remindersQuery;
      if (remindersError) throw remindersError;

      this.reminders = reminders || [];

      console.log(`Loaded ${this.records.length} records and ${this.reminders.length} reminders`);
    } catch (error) {
      console.error("Error loading vaccination data:", error);
      showToast("Error loading vaccination data", "error");
      this.records = [];
      this.reminders = [];
      this.filteredRecords = [];
    }
  }

  // ===========================
  // ROLE-BASED UI SETUP
  // ===========================
  setupRoleBasedUI() {
    // Admin controls visibility
    const addVaccineBtn = document.getElementById("add-vaccine-btn");
    const viewRemindersBtn = document.getElementById("view-reminders-btn");

    if (this.currentUserRole === "admin") {
      // Show all admin controls
      if (addVaccineBtn) {
        addVaccineBtn.style.display = "inline-flex";
        addVaccineBtn.innerHTML = '<i class="fas fa-plus"></i> Add Vaccination Record';
      }
      if (viewRemindersBtn) {
        viewRemindersBtn.style.display = "inline-flex";
      }
    } else {
      // Hide admin-only controls for regular users
      if (addVaccineBtn) {
        addVaccineBtn.style.display = "none";
      }
      if (viewRemindersBtn) {
        viewRemindersBtn.style.display = "inline-flex";
      }
    }

    // Update page title based on role
    const headerTitle = document.querySelector(".header .logo h1");
    if (headerTitle && this.currentUserRole === "admin") {
      headerTitle.textContent = "VaxTracker Admin";
    }
  }

  // ===========================
  // EVENT LISTENERS SETUP
  // ===========================
  setupEventListeners() {
    // Search functionality (available to all users)
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filterRecords(e.target.value);
      });
    }

    // Add vaccine button (admin only)
    const addVaccineBtn = document.getElementById("add-vaccine-btn");
    if (addVaccineBtn) {
      addVaccineBtn.addEventListener("click", () => {
        if (!this.checkAdminPermission("add vaccines")) return;
        window.modals.openModal("add-vaccine-modal");
      });
    }

    // View reminders button (all users)
    const viewRemindersBtn = document.getElementById("view-reminders-btn");
    if (viewRemindersBtn) {
      viewRemindersBtn.addEventListener("click", () => {
        window.modals.openModal("reminders-modal");
      });
    }

    // Custom vaccine input toggles
    this.setupCustomVaccineToggles();
  }

  setupCustomVaccineToggles() {
    // Add vaccine form custom input toggle
    const vaccineNameSelect = document.getElementById("vaccine-name");
    if (vaccineNameSelect) {
      vaccineNameSelect.addEventListener("change", (e) => {
        this.toggleCustomVaccineInput(
          "custom-vaccine-group",
          "custom-vaccine-name",
          e.target.value
        );
      });
    }

    // Edit vaccine form custom input toggle
    const editVaccineNameSelect = document.getElementById("edit-vaccine-name");
    if (editVaccineNameSelect) {
      editVaccineNameSelect.addEventListener("change", (e) => {
        this.toggleCustomVaccineInput(
          "edit-custom-vaccine-group",
          "edit-custom-vaccine-name",
          e.target.value
        );
      });
    }
  }

  toggleCustomVaccineInput(groupId, inputId, value) {
    const group = document.getElementById(groupId);
    const input = document.getElementById(inputId);

    if (!group || !input) return;

    if (value === "Other") {
      group.style.display = "block";
      input.required = true;
      input.focus();
    } else {
      group.style.display = "none";
      input.required = false;
      input.value = "";
    }
  }

  // ===========================
  // PERMISSION CHECKING
  // ===========================
  checkAdminPermission(action) {
    if (this.currentUserRole !== "admin") {
      showToast(`Only administrators can ${action}`, "error");
      return false;
    }
    return true;
  }

  checkUserPermission(userId) {
    // Users can only access their own data, admins can access all data
    if (this.currentUserRole === "admin") return true;
    return this.currentUser && this.currentUser.id === userId;
  }

  // ===========================
  // STATISTICS UPDATE
  // ===========================
  updateStats() {
    const totalVaccines = this.records.length;
    
    // Calculate up-to-date records (no next due date or future due date)
    const upToDate = this.records.filter(record => {
      return !record.next_due || new Date(record.next_due) > new Date();
    }).length;

    // Calculate upcoming reminders (due within 30 days)
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const upcomingReminders = this.reminders.filter(reminder => {
      const dueDate = new Date(reminder.due_date);
      return dueDate >= today && dueDate <= thirtyDaysFromNow;
    }).length;

    // Calculate overdue reminders
    const overdue = this.reminders.filter(reminder => {
      return new Date(reminder.due_date) < today;
    }).length;

    // Update DOM elements
    this.updateStatElement("total-vaccines", totalVaccines);
    this.updateStatElement("up-to-date", upToDate);
    this.updateStatElement("upcoming-reminders", upcomingReminders);
    this.updateStatElement("overdue", overdue);
  }

  updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  // ===========================
  // SEARCH AND FILTERING
  // ===========================
  filterRecords(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredRecords = [...this.records];
    } else {
      this.filteredRecords = this.records.filter(record => 
        record.vaccine_name.toLowerCase().includes(term)
      );
    }
    
    this.renderRecords();
  }

  // ===========================
  // RECORDS RENDERING
  // ===========================
  renderRecords() {
    const container = document.getElementById("records-container");
    if (!container) return;

    // Show loading state
    if (!this.isInitialized) {
      container.innerHTML = `
        <div class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          Loading vaccination records...
        </div>
      `;
      return;
    }

    // Show empty state if no records
    if (this.filteredRecords.length === 0) {
      container.innerHTML = this.getEmptyRecordsHTML();
      return;
    }

    // Render records with role-based actions
    container.innerHTML = this.filteredRecords
      .map(record => this.renderRecordCard(record))
      .join("");
  }

  getEmptyRecordsHTML() {
    const isAdmin = this.currentUserRole === "admin";
    return `
      <div class="empty-state">
        <i class="fas fa-syringe"></i>
        <h3>No vaccination records found</h3>
        <p>
          ${isAdmin 
            ? "Start by adding vaccination records for users." 
            : "No vaccination records have been added to your account yet."
          }
        </p>
        ${isAdmin 
          ? '<button class="btn btn-primary" onclick="window.modals.openModal(\'add-vaccine-modal\')"><i class="fas fa-plus"></i> Add First Record</button>'
          : '<p style="margin-top: 16px; color: #9ca3af;">Contact your administrator to add vaccination records.</p>'
        }
      </div>
    `;
  }

  renderRecordCard(record) {
    const status = getVaccineStatus(record.next_due);
    const isAdmin = this.currentUserRole === "admin";
    
    return `
      <div class="record-card" data-id="${record.id}">
        <div class="record-header">
          <div class="record-title">
            <i class="fas fa-syringe"></i>
            ${record.vaccine_name}
            <span class="dose-badge">Dose ${record.dose_number}</span>
          </div>
          ${isAdmin ? this.renderAdminActions(record.id) : ""}
        </div>
        <div class="record-details">
          <div class="record-detail">
            <i class="fas fa-calendar"></i>
            Given: ${formatDate(record.date_given)}
          </div>
          ${record.next_due ? `
            <div class="record-detail">
              <i class="fas fa-clock"></i>
              Next Due: ${formatDate(record.next_due)}
            </div>
          ` : ""}
          <div class="record-detail">
            <span class="status-badge status-${status.class}">${status.text}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderAdminActions(recordId) {
    return `
      <div class="record-actions">
        <button 
          class="btn-icon" 
          onclick="window.dashboard.editRecord('${recordId}')" 
          title="Edit Record"
          aria-label="Edit vaccination record"
        >
          <i class="fas fa-edit"></i>
        </button>
        <button 
          class="btn-icon btn-danger" 
          onclick="window.dashboard.deleteRecord('${recordId}')" 
          title="Delete Record"
          aria-label="Delete vaccination record"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  }

  // ===========================
  // REMINDERS RENDERING
  // ===========================
  renderReminders() {
    const container = document.getElementById("reminders-container");
    if (!container) return;

    if (this.reminders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-bell"></i>
          <h3>No upcoming reminders</h3>
          <p>
            ${this.currentUserRole === "admin" 
              ? "No reminders are currently scheduled for any users." 
              : "You're all caught up with your vaccinations!"
            }
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.reminders
      .map(reminder => this.renderReminderCard(reminder))
      .join("");
  }

  renderReminderCard(reminder) {
    const isOverdue = new Date(reminder.due_date) < new Date();
    const vaccineName = reminder.vaccination_records?.vaccine_name || "Unknown Vaccine";
    const doseNumber = reminder.vaccination_records?.dose_number || 1;
    
    return `
      <div class="reminder-card ${isOverdue ? "overdue" : ""}">
        <div class="reminder-info">
          <h4>${vaccineName} - Dose ${doseNumber}</h4>
          <p>
            ${isOverdue ? "Overdue since" : "Due on"} ${formatDate(reminder.due_date)}
          </p>
        </div>
        <div class="reminder-status">
          <span class="reminder-badge ${isOverdue ? "overdue" : "upcoming"}">
            ${isOverdue ? "OVERDUE" : "UPCOMING"}
          </span>
        </div>
      </div>
    `;
  }

  // ===========================
  // CRUD OPERATIONS (ADMIN ONLY)
  // ===========================
  
  // ADD VACCINATION RECORD
  async addRecord(formData) {
    if (!this.checkAdminPermission("add vaccination records")) return;

    try {
      // Validate form data
      if (!this.validateVaccineFormData(formData)) {
        showToast("Please fill in all required fields", "error");
        return;
      }

      // Insert vaccination record
      const { data: newRecord, error: recordError } = await supabase
        .from("vaccination_records")
        .insert([{
          user_id: this.currentUser.id, // For now, admin adds to their own account
          vaccine_name: formData.vaccine_name,
          dose_number: parseInt(formData.dose_number),
          date_given: formData.date_given,
          next_due: formData.next_due || null,
        }])
        .select()
        .single();

      if (recordError) throw recordError;

      // Create reminder if next due date is provided
      if (formData.next_due && newRecord) {
        const { error: reminderError } = await supabase
          .from("reminders")
          .insert([{
            user_id: this.currentUser.id,
            record_id: newRecord.id,
            due_date: formData.next_due,
          }]);

        if (reminderError) {
          console.error("Error creating reminder:", reminderError);
          // Don't fail the entire operation for reminder creation failure
        }
      }

      // Refresh data and UI
      await this.refreshDashboard();
      showToast("Vaccination record added successfully!", "success");
      window.modals.closeModal("add-vaccine-modal");

    } catch (error) {
      console.error("Error adding vaccination record:", error);
      showToast("Error adding vaccination record", "error");
    }
  }

  // EDIT VACCINATION RECORD
  async editRecord(recordId) {
    if (!this.checkAdminPermission("edit vaccination records")) return;

    try {
      const record = this.records.find(r => r.id === recordId);
      if (!record) {
        showToast("Record not found", "error");
        return;
      }

      // Populate edit form with current data
      this.populateEditForm(record);
      
      // Open edit modal
      window.modals.openModal("edit-vaccine-modal");

    } catch (error) {
      console.error("Error preparing edit form:", error);
      showToast("Error loading record for editing", "error");
    }
  }

  populateEditForm(record) {
    const elements = {
      recordId: document.getElementById("edit-record-id"),
      vaccineName: document.getElementById("edit-vaccine-name"),
      doseNumber: document.getElementById("edit-dose-number"),
      dateGiven: document.getElementById("edit-date-given"),
      nextDue: document.getElementById("edit-next-due"),
      customGroup: document.getElementById("edit-custom-vaccine-group"),
      customName: document.getElementById("edit-custom-vaccine-name")
    };

    // Set basic values
    if (elements.recordId) elements.recordId.value = record.id;
    if (elements.doseNumber) elements.doseNumber.value = record.dose_number;
    if (elements.dateGiven) elements.dateGiven.value = record.date_given;
    if (elements.nextDue) elements.nextDue.value = record.next_due || "";

    // Handle vaccine name (standard vs custom)
    const standardVaccines = [
      "COVID-19", "Influenza", "Hepatitis B", "MMR", "Tdap", 
      "HPV", "Pneumococcal", "Meningococcal", "Varicella", "Shingles"
    ];

    if (standardVaccines.includes(record.vaccine_name)) {
      if (elements.vaccineName) elements.vaccineName.value = record.vaccine_name;
      if (elements.customGroup) elements.customGroup.style.display = "none";
      if (elements.customName) {
        elements.customName.value = "";
        elements.customName.required = false;
      }
    } else {
      // Custom vaccine
      if (elements.vaccineName) elements.vaccineName.value = "Other";
      if (elements.customGroup) elements.customGroup.style.display = "block";
      if (elements.customName) {
        elements.customName.value = record.vaccine_name;
        elements.customName.required = true;
      }
    }
  }

  // UPDATE VACCINATION RECORD
  async updateRecord(formData) {
    if (!this.checkAdminPermission("update vaccination records")) return;

    try {
      const recordId = document.getElementById("edit-record-id")?.value;
      if (!recordId) {
        showToast("Record ID not found", "error");
        return;
      }

      // Validate form data
      if (!this.validateVaccineFormData(formData)) {
        showToast("Please fill in all required fields", "error");
        return;
      }

      // Update vaccination record
      const { error: updateError } = await supabase
        .from("vaccination_records")
        .update({
          vaccine_name: formData.vaccine_name,
          dose_number: parseInt(formData.dose_number),
          date_given: formData.date_given,
          next_due: formData.next_due || null,
        })
        .eq("id", recordId);

      if (updateError) throw updateError;

      // Handle reminder updates
      await this.updateRecordReminder(recordId, formData.next_due);

      // Refresh data and UI
      await this.refreshDashboard();
      showToast("Vaccination record updated successfully!", "success");
      window.modals.closeModal("edit-vaccine-modal");

    } catch (error) {
      console.error("Error updating vaccination record:", error);
      showToast("Error updating vaccination record", "error");
    }
  }

  async updateRecordReminder(recordId, nextDueDate) {
    try {
      // Check for existing reminder
      const { data: existingReminder } = await supabase
        .from("reminders")
        .select("id")
        .eq("record_id", recordId)
        .single();

      if (nextDueDate) {
        if (existingReminder) {
          // Update existing reminder
          await supabase
            .from("reminders")
            .update({ due_date: nextDueDate })
            .eq("record_id", recordId);
        } else {
          // Create new reminder
          await supabase
            .from("reminders")
            .insert([{
              user_id: this.currentUser.id,
              record_id: recordId,
              due_date: nextDueDate,
            }]);
        }
      } else if (existingReminder) {
        // Remove reminder if no next due date
        await supabase
          .from("reminders")
          .delete()
          .eq("record_id", recordId);
      }
    } catch (error) {
      console.error("Error updating reminder:", error);
      // Don't fail the main operation for reminder errors
    }
  }

  // DELETE VACCINATION RECORD
  deleteRecord(recordId) {
    if (!this.checkAdminPermission("delete vaccination records")) return;

    // Store record ID for confirmation and open delete modal
    window.modals.currentDeleteId = recordId;
    window.modals.openModal("delete-modal");
  }

  async confirmDelete() {
    if (!this.checkAdminPermission("delete vaccination records")) return;

    try {
      const recordId = window.modals.currentDeleteId;
      if (!recordId) {
        showToast("No record selected for deletion", "error");
        return;
      }

      // Delete the vaccination record (reminders will be deleted via cascade)
      const { error } = await supabase
        .from("vaccination_records")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      // Refresh data and UI
      await this.refreshDashboard();
      showToast("Vaccination record deleted successfully!", "success");
      window.modals.closeModal("delete-modal");
      window.modals.currentDeleteId = null;

    } catch (error) {
      console.error("Error deleting vaccination record:", error);
      showToast("Error deleting vaccination record", "error");
    }
  }

  // ===========================
  // FORM VALIDATION
  // ===========================
  validateVaccineFormData(formData) {
    if (!formData.vaccine_name || !formData.dose_number || !formData.date_given) {
      return false;
    }

    // Validate dose number is positive integer
    const doseNum = parseInt(formData.dose_number);
    if (isNaN(doseNum) || doseNum < 1) {
      showToast("Dose number must be a positive integer", "error");
      return false;
    }

    // Validate date is not in the future
    const givenDate = new Date(formData.date_given);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (givenDate > today) {
      showToast("Date given cannot be in the future", "error");
      return false;
    }

    // Validate next due date is after given date
    if (formData.next_due) {
      const nextDueDate = new Date(formData.next_due);
      if (nextDueDate <= givenDate) {
        showToast("Next due date must be after the date given", "error");
        return false;
      }
    }

    return true;
  }

  // ===========================
  // UTILITY METHODS
  // ===========================
  async refreshDashboard() {
    try {
      await this.loadVaccinationData();
      this.updateStats();
      this.renderRecords();
      this.renderReminders();
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
      showToast("Error refreshing data", "error");
    }
  }

  // Public method to get current user role (for external access)
  getCurrentUserRole() {
    return this.currentUserRole;
  }

  // Public method to check if current user is admin
  isAdmin() {
    return this.currentUserRole === "admin";
  }

  // Public method to get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // ===========================
  // CLEANUP
  // ===========================
  destroy() {
    // Clean up event listeners and reset state
    this.records = [];
    this.reminders = [];
    this.filteredRecords = [];
    this.currentUser = null;
    this.currentUserRole = "user";
    this.isInitialized = false;
  }
}

export default Dashboard;