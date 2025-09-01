class ModalManager {
  constructor() {
    this.currentDeleteId = null
    this.init()
  }

  init() {
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Modal close buttons
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = btn.getAttribute('data-modal')
        if (modalId) {
          this.closeModal(modalId)
        }
      })
    })

    // Click outside to close
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id)
        }
      })
    })

    // Form submissions
    document.getElementById('add-vaccine-form').addEventListener('submit', (e) => {
      this.handleAddVaccineSubmit(e)
    })

    document.getElementById('edit-vaccine-form').addEventListener('submit', (e) => {
      this.handleEditVaccineSubmit(e)
    })

    // Delete confirmation
    document.getElementById('confirm-delete').addEventListener('click', () => {
      if (window.dashboard) {
        window.dashboard.confirmDelete()
      }
    })

    // Escape key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllModals()
      }
    })
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.classList.add('show')
      document.body.style.overflow = 'hidden'
      
      // Focus first input
      const firstInput = modal.querySelector('input, select, textarea')
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 100)
      }
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId)
    if (modal) {
      modal.classList.remove('show')
      document.body.style.overflow = ''
      
      // Reset forms
      const form = modal.querySelector('form')
      if (form) {
        form.reset()
        
        // Hide custom vaccine inputs
        const customGroups = modal.querySelectorAll('[id*="custom-vaccine-group"]')
        customGroups.forEach(group => {
          group.style.display = 'none'
          const input = group.querySelector('input')
          if (input) {
            input.required = false
          }
        })
      }
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal.show').forEach(modal => {
      this.closeModal(modal.id)
    })
  }

  async handleAddVaccineSubmit(e) {
    e.preventDefault()
    
    const formData = this.getFormData('add-vaccine-form')
    const submitBtn = e.target.querySelector('button[type="submit"]')
    
    try {
      submitBtn.disabled = true
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'
      
      if (window.dashboard) {
        await window.dashboard.addRecord(formData)
      }
      
    } catch (error) {
      console.error('Error in form submission:', error)
    } finally {
      submitBtn.disabled = false
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Record'
    }
  }

  async handleEditVaccineSubmit(e) {
    e.preventDefault()
    
    const formData = this.getFormData('edit-vaccine-form')
    const submitBtn = e.target.querySelector('button[type="submit"]')
    
    try {
      submitBtn.disabled = true
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...'
      
      if (window.dashboard) {
        await window.dashboard.updateRecord(formData)
      }
      
    } catch (error) {
      console.error('Error in form submission:', error)
    } finally {
      submitBtn.disabled = false
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Record'
    }
  }

  getFormData(formId) {
    const form = document.getElementById(formId)
    const formData = new FormData(form)
    const data = {}
    
    // Get vaccine name (handle custom vaccine)
    const vaccineSelect = form.querySelector('[id*="vaccine-name"]')
    const customVaccineInput = form.querySelector('[id*="custom-vaccine-name"]')
    
    if (vaccineSelect.value === 'Other' && customVaccineInput.value) {
      data.vaccine_name = customVaccineInput.value
    } else {
      data.vaccine_name = vaccineSelect.value
    }
    
    // Get other form fields
    const doseInput = form.querySelector('[id*="dose-number"]')
    const dateGivenInput = form.querySelector('[id*="date-given"]')
    const nextDueInput = form.querySelector('[id*="next-due"]')
    
    data.dose_number = doseInput.value
    data.date_given = dateGivenInput.value
    data.next_due = nextDueInput.value || null
    
    return data
  }
}

export default ModalManager