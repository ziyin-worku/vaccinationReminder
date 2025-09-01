import { supabase, getCurrentUser } from './supabase-client.js'
import { showToast, formatDate, getVaccineStatus } from './utils.js'

class Dashboard {
  constructor() {
    this.records = []
    this.reminders = []
    this.filteredRecords = []
  }

  async init() {
    this.setupEventListeners()
    await this.loadData()
    this.updateStats()
    this.renderRecords()
    this.renderReminders()
  }

  setupEventListeners() {
    // Search functionality
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.filterRecords(e.target.value)
    })

    // Add vaccine button
    document.getElementById('add-vaccine-btn').addEventListener('click', () => {
      window.modals.openModal('add-vaccine-modal')
    })

    // View reminders button
    document.getElementById('view-reminders-btn').addEventListener('click', () => {
      window.modals.openModal('reminders-modal')
    })

    // Vaccine name change handler
    document.getElementById('vaccine-name').addEventListener('change', (e) => {
      this.toggleCustomVaccineInput(e.target.value, 'custom-vaccine-group', 'custom-vaccine-name')
    })

    document.getElementById('edit-vaccine-name').addEventListener('change', (e) => {
      this.toggleCustomVaccineInput(e.target.value, 'edit-custom-vaccine-group', 'edit-custom-vaccine-name')
    })
  }

  toggleCustomVaccineInput(value, groupId, inputId) {
    const group = document.getElementById(groupId)
    const input = document.getElementById(inputId)
    
    if (value === 'Other') {
      group.style.display = 'block'
      input.required = true
    } else {
      group.style.display = 'none'
      input.required = false
      input.value = ''
    }
  }

  async loadData() {
    try {
      const user = await getCurrentUser()
      if (!user) return

      // Load vaccination records
      const { data: records, error: recordsError } = await supabase
        .from('vaccination_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date_given', { ascending: false })

      if (recordsError) throw recordsError

      this.records = records || []
      this.filteredRecords = [...this.records]

      // Load reminders
      const { data: reminders, error: remindersError } = await supabase
        .from('reminders')
        .select(`
          *,
          vaccination_records (
            vaccine_name,
            dose_number
          )
        `)
        .eq('user_id', user.id)
        .eq('sent', false)
        .order('due_date', { ascending: true })

      if (remindersError) throw remindersError

      this.reminders = reminders || []

    } catch (error) {
      console.error('Error loading data:', error)
      showToast('Error loading data', 'error')
    }
  }

  updateStats() {
    const totalVaccines = this.records.length
    const upToDate = this.records.filter(record => {
      if (!record.next_due) return true
      return new Date(record.next_due) > new Date()
    }).length
    
    const upcomingReminders = this.reminders.filter(reminder => {
      const dueDate = new Date(reminder.due_date)
      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))
      return dueDate >= today && dueDate <= thirtyDaysFromNow
    }).length
    
    const overdue = this.reminders.filter(reminder => {
      return new Date(reminder.due_date) < new Date()
    }).length

    document.getElementById('total-vaccines').textContent = totalVaccines
    document.getElementById('up-to-date').textContent = upToDate
    document.getElementById('upcoming-reminders').textContent = upcomingReminders
    document.getElementById('overdue').textContent = overdue
  }

  filterRecords(searchTerm) {
    const term = searchTerm.toLowerCase().trim()
    
    if (!term) {
      this.filteredRecords = [...this.records]
    } else {
      this.filteredRecords = this.records.filter(record =>
        record.vaccine_name.toLowerCase().includes(term)
      )
    }
    
    this.renderRecords()
  }

  renderRecords() {
    const container = document.getElementById('records-container')
    const loading = document.getElementById('loading')
    
    if (loading) {
      loading.style.display = 'none'
    }

    if (this.filteredRecords.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-syringe"></i>
          <h3>No vaccination records found</h3>
          <p>Start by adding your first vaccination record to keep track of your immunizations.</p>
          <button class="btn btn-primary" onclick="window.modals.openModal('add-vaccine-modal')">
            <i class="fas fa-plus"></i>
            Add First Record
          </button>
        </div>
      `
      return
    }

    const recordsHTML = this.filteredRecords.map(record => {
      const status = getVaccineStatus(record.next_due)
      return `
        <div class="record-card" data-id="${record.id}">
          <div class="record-header">
            <div class="record-title">
              <i class="fas fa-syringe"></i>
              ${record.vaccine_name}
              <span class="dose-badge">Dose ${record.dose_number}</span>
            </div>
            <div class="record-actions">
              <button class="btn-icon" onclick="window.dashboard.editRecord('${record.id}')" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-icon btn-danger" onclick="window.dashboard.deleteRecord('${record.id}')" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="record-details">
            <div class="record-detail">
              <i class="fas fa-calendar"></i>
              <span>Given: ${formatDate(record.date_given)}</span>
            </div>
            ${record.next_due ? `
              <div class="record-detail">
                <i class="fas fa-clock"></i>
                <span>Next Due: ${formatDate(record.next_due)}</span>
              </div>
            ` : ''}
            <div class="record-detail">
              <span class="status-badge status-${status.class}">${status.text}</span>
            </div>
          </div>
        </div>
      `
    }).join('')

    container.innerHTML = recordsHTML
  }

  renderReminders() {
    const container = document.getElementById('reminders-container')
    
    if (this.reminders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-bell"></i>
          <h3>No upcoming reminders</h3>
          <p>You're all caught up! Reminders will appear here when vaccines are due.</p>
        </div>
      `
      return
    }

    const remindersHTML = this.reminders.map(reminder => {
      const isOverdue = new Date(reminder.due_date) < new Date()
      const vaccineName = reminder.vaccination_records?.vaccine_name || 'Unknown Vaccine'
      const doseNumber = reminder.vaccination_records?.dose_number || 1
      
      return `
        <div class="reminder-card ${isOverdue ? 'overdue' : ''}">
          <div class="reminder-info">
            <h4>${vaccineName} - Dose ${doseNumber}</h4>
            <p>${isOverdue ? 'Overdue since' : 'Due on'} ${formatDate(reminder.due_date)}</p>
          </div>
          <div class="reminder-date">
            ${isOverdue ? 'OVERDUE' : 'UPCOMING'}
          </div>
        </div>
      `
    }).join('')

    container.innerHTML = remindersHTML
  }

  async addRecord(formData) {
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('vaccination_records')
        .insert([{
          user_id: user.id,
          vaccine_name: formData.vaccine_name,
          dose_number: parseInt(formData.dose_number),
          date_given: formData.date_given,
          next_due: formData.next_due || null
        }])
        .select()

      if (error) throw error

      // Create reminder if next_due is set
      if (formData.next_due && data[0]) {
        await supabase
          .from('reminders')
          .insert([{
            user_id: user.id,
            record_id: data[0].id,
            due_date: formData.next_due
          }])
      }

      await this.loadData()
      this.updateStats()
      this.renderRecords()
      this.renderReminders()
      
      showToast('Vaccination record added successfully!', 'success')
      window.modals.closeModal('add-vaccine-modal')
      
    } catch (error) {
      console.error('Error adding record:', error)
      showToast('Error adding vaccination record', 'error')
    }
  }

  async editRecord(recordId) {
    const record = this.records.find(r => r.id === recordId)
    if (!record) return

    // Populate edit form
    document.getElementById('edit-record-id').value = record.id
    document.getElementById('edit-vaccine-name').value = record.vaccine_name
    document.getElementById('edit-dose-number').value = record.dose_number
    document.getElementById('edit-date-given').value = record.date_given
    document.getElementById('edit-next-due').value = record.next_due || ''

    // Handle custom vaccine name
    if (!['COVID-19', 'Influenza', 'Hepatitis B', 'MMR', 'Tdap', 'HPV', 'Pneumococcal', 'Meningococcal', 'Varicella', 'Shingles'].includes(record.vaccine_name)) {
      document.getElementById('edit-vaccine-name').value = 'Other'
      document.getElementById('edit-custom-vaccine-group').style.display = 'block'
      document.getElementById('edit-custom-vaccine-name').value = record.vaccine_name
      document.getElementById('edit-custom-vaccine-name').required = true
    }

    window.modals.openModal('edit-vaccine-modal')
  }

  async updateRecord(formData) {
    try {
      const recordId = document.getElementById('edit-record-id').value
      
      const { error } = await supabase
        .from('vaccination_records')
        .update({
          vaccine_name: formData.vaccine_name,
          dose_number: parseInt(formData.dose_number),
          date_given: formData.date_given,
          next_due: formData.next_due || null
        })
        .eq('id', recordId)

      if (error) throw error

      // Update or create reminder
      const { data: existingReminder } = await supabase
        .from('reminders')
        .select('id')
        .eq('record_id', recordId)
        .single()

      if (formData.next_due) {
        if (existingReminder) {
          await supabase
            .from('reminders')
            .update({ due_date: formData.next_due })
            .eq('record_id', recordId)
        } else {
          const user = await getCurrentUser()
          await supabase
            .from('reminders')
            .insert([{
              user_id: user.id,
              record_id: recordId,
              due_date: formData.next_due
            }])
        }
      } else if (existingReminder) {
        await supabase
          .from('reminders')
          .delete()
          .eq('record_id', recordId)
      }

      await this.loadData()
      this.updateStats()
      this.renderRecords()
      this.renderReminders()
      
      showToast('Vaccination record updated successfully!', 'success')
      window.modals.closeModal('edit-vaccine-modal')
      
    } catch (error) {
      console.error('Error updating record:', error)
      showToast('Error updating vaccination record', 'error')
    }
  }

  deleteRecord(recordId) {
    window.modals.currentDeleteId = recordId
    window.modals.openModal('delete-modal')
  }

  async confirmDelete() {
    try {
      const recordId = window.modals.currentDeleteId
      if (!recordId) return

      const { error } = await supabase
        .from('vaccination_records')
        .delete()
        .eq('id', recordId)

      if (error) throw error

      await this.loadData()
      this.updateStats()
      this.renderRecords()
      this.renderReminders()
      
      showToast('Vaccination record deleted successfully!', 'success')
      window.modals.closeModal('delete-modal')
      
    } catch (error) {
      console.error('Error deleting record:', error)
      showToast('Error deleting vaccination record', 'error')
    }
  }
}

export default Dashboard