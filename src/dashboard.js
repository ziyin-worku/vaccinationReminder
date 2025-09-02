import { supabase, getCurrentUser } from "./supabase-client.js";
import { showToast, formatDate, getVaccineStatus, debounce } from "./utils.js";

class Dashboard {
  constructor() {
    this.records = [];
    this.reminders = [];
    this.filteredRecords = [];
    this.currentUser = null;
    this.currentUserRole = "user"; // Default to most restrictive role
    this.isInitialized = false;
    this.searchDebounced = debounce((term) => this.performSearch(term), 300);
  }

  // ===========================
  // INITIALIZATION
  // ===========================
  async init() {
    try {
      console.log("Initializing dashboard...");
      
      // Step 1: Load user data and detect role
      await this.loadUserData();
      
      // Step 2: Load vaccination data based on role
      await this.loadVaccinationData();
      
      // Step 3: Setup UI based on role permissions
      this.setupRoleBasedUI();
      
      // Step 4: Setup event listeners
      this.setupEventListeners();
      
      // Step 5: Render initial data
      this.updateStats();
      this.renderRecords();
      this.renderReminders();
      
      this.isInitialized = true;
      console.log(`Dashboard initialized successfully for role: ${this.currentUserRole}`);
      
    } catch (error) {
      console.error("Dashboard initialization error:", error);
      showToast("Error initializing dashboard", "error");
      this.handleInitializationError();
    }
  }

  // ===========================
  // USER DATA & ROLE DETECTION
  // ===========================
  async loadUserData() {
    try {
      // Get current authenticated user
      this.currentUser = await getCurrentUser();
      if (!this.currentUser) {
        throw new Error("No authenticated user found");
      }

      console.log("Current user ID:", this.currentUser.id);

      // Fetch user profile with role information from profiles table
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, role, email")
        .eq("id", this.currentUser.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        // If profile doesn't exist, create it with default user role
        await this.createUserProfile();
        this.currentUserRole = "user";
      } else {
        this.currentUserRole = profile?.role || "user";
        console.log("User role detected:", this.currentUserRole);
      }

      // Update user display name in header
      this.updateUserDisplayName(profile);
      
    } catch (error) {
      console.error("Error loading user data:", error);
      this.currentUserRole = "user"; // Fail safe to most restrictive role
      throw error;
    }
  }

  async createUserProfile() {
    try {
      const { error } = await supabase
        .from("profiles")
        .insert([{
          id: this.currentUser.id,
          email: this.currentUser.email,
          full_name: "",
          role: "user"
        }]);

      if (error) {
        console.error("Error creating user profile:", error);
      } else {
        console.log("User profile created with default role");
      }
    } catch (error) {
      console.error("Error in createUserProfile:", error);
    }
  }

  updateUserDisplayName(profile) {
    const userNameElem = document.getElementById("user-name");
    if (userNameElem) {
      const displayName = profile?.full_name || 
                         this.currentUser.email.split("@")[0] || 
                         "User";
      userNameElem.textContent = displayName;
    }
  }

  // ===========================
  // VACCINATION DATA LOADING
  // ===========================
  async loadVaccinationData() {
    try {
      if (!this.currentUser) {
        throw new Error("No current user available");
      }

      console.log(`Loading vaccination data for role: ${this.currentUserRole}`);

      // Load vaccination records based on role
      await this.loadVaccinationRecords();
      
      // Load reminders based on role
      await this.loadReminders();

      console.log(`Loaded ${this.records.length} records and ${this.reminders.length} reminders`);
      
    } catch (error) {
      console.error("Error loading vaccination data:", error);
      showToast("Error loading vaccination data", "error");
      this.records = [];
      this.reminders = [];
      this.filteredRecords = [];
    }
  }

  async loadVaccinationRecords() {
    try {
      let recordsQuery = supabase
        .from("vaccination_records")
        .select(`
          *,
          profiles!vaccination_records_user_id_fkey(full_name, email)
        `)
        .order("date_given", { ascending: false });

      // Apply role-based filtering
      if (this.currentUserRole === "user") {
        // Users can only see their own records
        recordsQuery = recordsQuery.eq("user_id", this.currentUser.id);
        console.log("Filtering records for user:", this.currentUser.id);
      } else if (this.currentUserRole === "admin") {
        // Admins can see all records
        console.log("Loading all records for admin");
      }

      const { data: records, error: recordsError } = await recordsQuery;
      
      if (recordsError) {
        console.error("Error loading vaccination records:", recordsError);
        throw recordsError;
      }

      this.records = records || [];
      this.filteredRecords = [...this.records];
      
      console.log(`Loaded ${this.records.length} vaccination records`);
      
    } catch (error) {
      console.error("Error in loadVaccinationRecords:", error);
      this.records = [];
      this.filteredRecords = [];
    }
  }

  async loadReminders() {
    try {
      let remindersQuery = supabase
        .from("reminders")
        .select(`
          *,
          vaccination_records(vaccine_name, dose_number),
          profiles!reminders_user_id_fkey(full_name, email)
        `)
        .eq("sent", false)
        .order("due_date", { ascending: true });

      // Apply role-based filtering
      if (this.currentUserRole === "user") {
        // Users can only see their own reminders
        remindersQuery = remindersQuery.eq("user_id", this.currentUser.id);
        console.log("Filtering reminders for user:", this.currentUser.id);
      } else if (this.currentUserRole === "admin") {
        // Admins can see all reminders
        console.log("Loading all reminders for admin");
      }

      const { data: reminders, error: remindersError } = await remindersQuery;
      
      if (remindersError) {
        console.error("Error loading reminders:", remindersError);
        throw remindersError;
      }

      this.reminders = reminders || [];
      
      console.log(`Loaded ${this.reminders.length} reminders`);
      
    } catch (error) {
      console.error("Error in loadReminders:", error);
      this.reminders = [];
    }
  }

  // ===========================
  // ROLE-BASED UI SETUP
  // ===========================
  setupRoleBasedUI() {
    console.log(`Setting up UI for role: ${this.currentUserRole}`);
    
    // Get UI elements
    const addVaccineBtn = document.getElementById("add-vaccine-btn");
    const viewRemindersBtn = document.getElementById("view-reminders-btn");
    const headerTitle = document.querySelector(".header .logo h1");

    if (this.currentUserRole === "admin") {
      // ADMIN: Show all controls
      if (addVaccineBtn) {
        addVaccineBtn.style.display = "inline-flex";
        addVaccineBtn.innerHTML = '<i class="fas fa-plus"></i> Add Vaccination Record';
      }
      if (viewRemindersBtn) {
        viewRemindersBtn.style.display = "inline-flex";
      }
      if (headerTitle) {
        headerTitle.textContent = "VaxTracker Admin";
      }
      
      console.log("Admin UI controls enabled");
      
    } else {
      // USER: Hide admin controls, show read-only interface
      if (addVaccineBtn) {
        addVaccineBtn.style.display = "none";
      }
      if (viewRemindersBtn) {
        viewRemindersBtn.style.display = "inline-flex";
      }
      if (headerTitle) {
        headerTitle.textContent = "VaxTracker";
      }
      
      console.log("User UI controls set to read-only");
    }

    // Update action buttons container visibility
    const actionButtons = document.querySelector(".action-buttons");
    if (actionButtons) {
      const visibleButtons = actionButtons.querySelectorAll('.btn:not([style*="display: none"])');
      if (visibleButtons.length === 0) {
        actionButtons.style.display = "none";
      } else {
        actionButtons.style.display = "flex";
      }
    }
  }

  // ===========================
  // EVENT LISTENERS SETUP
  // ===========================
  setupEventListeners() {
    // Search functionality (available to all users)
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      // Remove existing listeners to prevent duplicates
      searchInput.removeEventListener("input", this.searchDebounced);
      searchInput.addEventListener("input", (e) => {
        this.searchDebounced(e.target.value);
      });
    }

    // Add vaccine button (admin only)
    const addVaccineBtn = document.getElementById("add-vaccine-btn");
    if (addVaccineBtn) {
      addVaccineBtn.removeEventListener("click", this.handleAddVaccineClick);
      this.handleAddVaccineClick = () => {
        if (!this.checkAdminPermission("add vaccination records")) return;
        window.modals?.openModal("add-vaccine-modal");
      };
      addVaccineBtn.addEventListener("click", this.handleAddVaccineClick);
    }

    // View reminders button (all users)
    const viewRemindersBtn = document.getElementById("view-reminders-btn");
    if (viewRemindersBtn) {
      viewRemindersBtn.removeEventListener("click", this.handleViewRemindersClick);
      this.handleViewRemindersClick = () => {
        window.modals?.openModal("reminders-modal");
      };
      viewRemindersBtn.addEventListener("click", this.handleViewRemindersClick);
    }

    // Setup custom vaccine input toggles for forms
    this.setupCustomVaccineToggles();
  }

  setupCustomVaccineToggles() {
    // Add vaccine form custom input toggle
    const vaccineNameSelect = document.getElementById("vaccine-name");
    if (vaccineNameSelect) {
      vaccineNameSelect.removeEventListener("change", this.handleVaccineNameChange);
      this.handleVaccineNameChange = (e) => {
        this.toggleCustomVaccineInput(
          "custom-vaccine-group",
          "custom-vaccine-name",
          e.target.value
        );
      };
      vaccineNameSelect.addEventListener("change", this.handleVaccineNameChange);
    }

    // Edit vaccine form custom input toggle
    const editVaccineNameSelect = document.getElementById("edit-vaccine-name");
    if (editVaccineNameSelect) {
      editVaccineNameSelect.removeEventListener("change", this.handleEditVaccineNameChange);
      this.handleEditVaccineNameChange = (e) => {
        this.toggleCustomVaccineInput(
          "edit-custom-vaccine-group",
          "edit-custom-vaccine-name",
          e.target.value
        );
      };
      editVaccineNameSelect.addEventListener("change", this.handleEditVaccineNameChange);
    }
  }

  toggleCustomVaccineInput(groupId, inputId, value) {
    const group = document.getElementById(groupId);
    const input = document.getElementById(inputId);

    if (!group || !input) return;

    if (value === "Other") {
      group.style.display = "block";
      input.required = true;
      setTimeout(() => input.focus(), 100);
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
      showToast(`Access denied: Only administrators can ${action}`, "error");
      return false;
    }
    return true;
  }

  checkUserDataAccess(userId) {
    // Users can only access their own data, admins can access all data
    if (this.currentUserRole === "admin") return true;
    
    const hasAccess = this.currentUser && this.currentUser.id === userId;
    if (!hasAccess) {
      showToast("Access denied: You can only view your own data", "error");
    }
    return hasAccess;
  }

  // ===========================
  // SEARCH AND FILTERING
  // ===========================
  performSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredRecords = [...this.records];
    } else {
      this.filteredRecords = this.records.filter(record => 
        record.vaccine_name.toLowerCase().includes(term) ||
        (record.profiles?.full_name && record.profiles.full_name.toLowerCase().includes(term)) ||
        (record.profiles?.email && record.profiles.email.toLowerCase().includes(term))
      );
    }
    
    this.renderRecords();
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
  // RECORDS RENDERING
  // ===========================
  renderRecords() {
    const container = document.getElementById("records-container");
    if (!container) return;

    // Show loading state during initialization
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
    const searchInput = document.getElementById("search-input");
    const hasSearchTerm = searchInput && searchInput.value.trim();
    
    if (hasSearchTerm) {
      return `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h3>No records found</h3>
          <p>No vaccination records match your search criteria.</p>
          <button class="btn btn-secondary" onclick="document.getElementById('search-input').value = ''; window.dashboard.performSearch('');">
            <i class="fas fa-times"></i> Clear Search
          </button>
        </div>
      `;
    }
    
    return `
      <div class="empty-state">
        <i class="fas fa-syringe"></i>
        <h3>No vaccination records found</h3>
        <p>
          ${isAdmin 
            ? "No vaccination records have been added to the system yet." 
            : "You don't have any vaccination records yet."
          }
        </p>
        ${isAdmin 
          ? '<button class="btn btn-primary" onclick="window.modals?.openModal(\'add-vaccine-modal\')"><i class="fas fa-plus"></i> Add First Record</button>'
          : '<p style="margin-top: 16px; color: #9ca3af; font-size: 14px;">Contact your administrator to add vaccination records to your account.</p>'
        }
      </div>
    `;
  }

  renderRecordCard(record) {
    const status = getVaccineStatus(record.next_due);
    const isAdmin = this.currentUserRole === "admin";
    
    // For admin view, show user information if available
    const userInfo = isAdmin && record.profiles ? 
      `<div class="record-user-info">
        <i class="fas fa-user"></i>
        ${record.profiles.full_name || record.profiles.email}
      </div>` : "";
    
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
        ${userInfo}
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
    const modalContainer = document.getElementById("reminders-list");
    
    // Update both containers (dashboard section and modal)
    const reminderHTML = this.getReminderHTML();
    
    if (container) container.innerHTML = reminderHTML;
    if (modalContainer) modalContainer.innerHTML = reminderHTML;
  }

  getReminderHTML() {
    if (this.reminders.length === 0) {
      return `
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
    }

    return this.reminders
      .map(reminder => this.renderReminderCard(reminder))
      .join("");
  }

  renderReminderCard(reminder) {
    const isOverdue = new Date(reminder.due_date) < new Date();
    const vaccineName = reminder.vaccination_records?.vaccine_name || "Unknown Vaccine";
    const doseNumber = reminder.vaccination_records?.dose_number || 1;
    const isAdmin = this.currentUserRole === "admin";
    
    // For admin view, show user information if available
    const userInfo = isAdmin && reminder.profiles ? 
      `<div class="reminder-user">
        <i class="fas fa-user"></i>
        ${reminder.profiles.full_name || reminder.profiles.email}
      </div>` : "";
    
    return `
      <div class="reminder-card ${isOverdue ? "overdue" : ""}">
        <div class="reminder-info">
          <h4>${vaccineName} - Dose ${doseNumber}</h4>
          ${userInfo}
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
        return;
      }

      console.log("Adding vaccination record:", formData);

      // Insert vaccination record (admin adds to their own account for now)
      const { data: newRecord, error: recordError } = await supabase
        .from("vaccination_records")
        .insert([{
          user_id: this.currentUser.id,
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
        await this.createReminder(newRecord.id, formData.next_due);
      }

      // Refresh data and UI
      await this.refreshDashboard();
      showToast("Vaccination record added successfully!", "success");
      window.modals?.closeModal("add-vaccine-modal");

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

      // Check if admin can edit this specific record
      if (!this.checkUserDataAccess(record.user_id)) return;

      // Populate edit form with current data
      this.populateEditForm(record);
      
      // Open edit modal
      window.modals?.openModal("edit-vaccine-modal");

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
        return;
      }

      console.log("Updating vaccination record:", recordId, formData);

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
      window.modals?.closeModal("edit-vaccine-modal");

    } catch (error) {
      console.error("Error updating vaccination record:", error);
      showToast("Error updating vaccination record", "error");
    }
  }

  // DELETE VACCINATION RECORD
  deleteRecord(recordId) {
    if (!this.checkAdminPermission("delete vaccination records")) return;

    try {
      const record = this.records.find(r => r.id === recordId);
      if (!record) {
        showToast("Record not found", "error");
        return;
      }

      // Check if admin can delete this specific record
      if (!this.checkUserDataAccess(record.user_id)) return;

      // Store record ID for confirmation and open delete modal
      window.modals.currentDeleteId = recordId;
      window.modals?.openModal("delete-modal");
      
    } catch (error) {
      console.error("Error preparing delete operation:", error);
      showToast("Error preparing delete operation", "error");
    }
  }

  async confirmDelete() {
    if (!this.checkAdminPermission("delete vaccination records")) return;

    try {
      const recordId = window.modals?.currentDeleteId;
      if (!recordId) {
        showToast("No record selected for deletion", "error");
        return;
      }

      console.log("Deleting vaccination record:", recordId);

      // Delete the vaccination record (reminders will be deleted via cascade)
      const { error } = await supabase
        .from("vaccination_records")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      // Refresh data and UI
      await this.refreshDashboard();
      showToast("Vaccination record deleted successfully!", "success");
      window.modals?.closeModal("delete-modal");
      if (window.modals) window.modals.currentDeleteId = null;

    } catch (error) {
      console.error("Error deleting vaccination record:", error);
      showToast("Error deleting vaccination record", "error");
    }
  }

  // ===========================
  // REMINDER MANAGEMENT
  // ===========================
  async createReminder(recordId, dueDate) {
    try {
      const { error } = await supabase
        .from("reminders")
        .insert([{
          user_id: this.currentUser.id,
          record_id: recordId,
          due_date: dueDate,
        }]);

      if (error) {
        console.error("Error creating reminder:", error);
        // Don't fail the entire operation for reminder creation failure
      } else {
        console.log("Reminder created successfully");
      }
    } catch (error) {
      console.error("Error in createReminder:", error);
    }
  }

  async updateRecordReminder(recordId, nextDueDate) {
    try {
      // Check for existing reminder
      const { data: existingReminder } = await supabase
        .from("reminders")
        .select("id")
        .eq("record_id", recordId)
        .eq("sent", false)
        .single();

      if (nextDueDate) {
        if (existingReminder) {
          // Update existing reminder
          await supabase
            .from("reminders")
            .update({ due_date: nextDueDate })
            .eq("record_id", recordId);
          console.log("Reminder updated");
        } else {
          // Create new reminder
          await this.createReminder(recordId, nextDueDate);
        }
      } else if (existingReminder) {
        // Remove reminder if no next due date
        await supabase
          .from("reminders")
          .delete()
          .eq("record_id", recordId);
        console.log("Reminder removed");
      }
    } catch (error) {
      console.error("Error updating reminder:", error);
      // Don't fail the main operation for reminder errors
    }
  }

  // ===========================
  // FORM VALIDATION
  // ===========================
  validateVaccineFormData(formData) {
    // Check required fields
    if (!formData.vaccine_name || !formData.dose_number || !formData.date_given) {
      showToast("Please fill in all required fields", "error");
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
  // ERROR HANDLING
  // ===========================
  handleInitializationError() {
    // Show error state in main containers
    const containers = [
      "records-container",
      "reminders-container"
    ];

    containers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
            <h3>Error Loading Data</h3>
            <p>There was an error loading your vaccination data.</p>
            <button class="btn btn-primary" onclick="window.dashboard.init()">
              <i class="fas fa-refresh"></i> Try Again
            </button>
          </div>
        `;
      }
    });

    // Reset stats to zero
    ["total-vaccines", "up-to-date", "upcoming-reminders", "overdue"].forEach(statId => {
      this.updateStatElement(statId, "—");
    });
  }

  // ===========================
  // UTILITY METHODS
  // ===========================
  async refreshDashboard() {
    try {
      console.log("Refreshing dashboard data...");
      await this.loadVaccinationData();
      this.updateStats();
      this.renderRecords();
      this.renderReminders();
      console.log("Dashboard refreshed successfully");
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
    console.log("Destroying dashboard instance");
    
    // Clean up event listeners
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.removeEventListener("input", this.searchDebounced);
    }

    // Reset state
    this.records = [];
    this.reminders = [];
    this.filteredRecords = [];
    this.currentUser = null;
    this.currentUserRole = "user";
    this.isInitialized = false;
  }
}

export default Dashboard;