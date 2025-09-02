class ModalManager {
  constructor() {
    this.currentDeleteId = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close buttons & data-modal attribute
    document.querySelectorAll(".modal-close, [data-modal]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const modalId = btn.getAttribute("data-modal");
        if (modalId) this.closeModal(modalId);
      });
    });

    // Click outside to close
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.closeModal(modal.id);
      });
    });

    // Add vaccine form submission
    const addForm = document.getElementById("add-vaccine-form");
    if (addForm)
      addForm.addEventListener("submit", (e) => this.handleAddVaccineSubmit(e));

    // Edit vaccine form submission
    const editForm = document.getElementById("edit-vaccine-form");
    if (editForm)
      editForm.addEventListener("submit", (e) =>
        this.handleEditVaccineSubmit(e)
      );

    // Delete confirmation
    const confirmDeleteBtn = document.getElementById("confirm-delete");
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener("click", async () => {
        if (window.dashboard) await window.dashboard.confirmDelete();
      });
    }

    // Escape key closes all modals
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeAllModals();
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add("show");
    document.body.style.overflow = "hidden";

    // Focus first input after a short delay
    const firstInput = modal.querySelector("input, select, textarea");
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("show");
    document.body.style.overflow = "";

    // Reset forms inside modal
    const form = modal.querySelector("form");
    if (form) {
      form.reset();

      // Hide and reset any custom vaccine input groups
      modal
        .querySelectorAll('[id*="custom-vaccine-group"]')
        .forEach((group) => {
          group.style.display = "none";
          const input = group.querySelector("input");
          if (input) {
            input.value = "";
            input.required = false;
          }
        });
    }
  }

  closeAllModals() {
    document
      .querySelectorAll(".modal.show")
      .forEach((modal) => this.closeModal(modal.id));
  }

  async handleAddVaccineSubmit(e) {
    e.preventDefault();
    const formData = this.getFormData("add-vaccine-form");
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      if (window.dashboard) await window.dashboard.addRecord(formData);
    } catch (error) {
      console.error("Add vaccine error:", error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Record';
    }
  }

  async handleEditVaccineSubmit(e) {
    e.preventDefault();
    const formData = this.getFormData("edit-vaccine-form");
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Updating...';

      if (window.dashboard) await window.dashboard.updateRecord(formData);
    } catch (error) {
      console.error("Edit vaccine error:", error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Record';
    }
  }

  getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const data = {};

    // Handle vaccine name with custom option
    const vaccineSelect = form.querySelector('[id*="vaccine-name"]');
    const customInput = form.querySelector('[id*="custom-vaccine-name"]');
    data.vaccine_name =
      vaccineSelect?.value === "Other" && customInput?.value
        ? customInput.value
        : vaccineSelect?.value || "";

    // Dose, date given, and next due
    data.dose_number = form.querySelector('[id*="dose-number"]')?.value || "";
    data.date_given = form.querySelector('[id*="date-given"]')?.value || "";
    data.next_due = form.querySelector('[id*="next-due"]')?.value || null;

    return data;
  }
}

export default ModalManager;
