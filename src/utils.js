// Toast notification system
export function showToast(message, type = 'info', duration = 5000) {
  const container = document.getElementById('toast-container')
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    info: 'fas fa-info-circle',
    warning: 'fas fa-exclamation-triangle'
  }
  
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="${icons[type] || icons.info}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">
      <i class="fas fa-times"></i>
    </button>
  `
  
  // Add close functionality
  toast.querySelector('.toast-close').addEventListener('click', () => {
    removeToast(toast)
  })
  
  container.appendChild(toast)
  
  // Auto remove after duration
  setTimeout(() => {
    removeToast(toast)
  }, duration)
}

function removeToast(toast) {
  toast.style.animation = 'toastSlideOut 0.3s ease forwards'
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast)
    }
  }, 300)
}

// Date formatting
export function formatDate(dateString) {
  if (!dateString) return 'Not set'
  
  const date = new Date(dateString)
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }
  
  return date.toLocaleDateString('en-US', options)
}

// Get vaccine status based on next due date
export function getVaccineStatus(nextDue) {
  if (!nextDue) {
    return { class: 'current', text: 'Complete' }
  }
  
  const dueDate = new Date(nextDue)
  const today = new Date()
  const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000))
  
  if (dueDate < today) {
    return { class: 'overdue', text: 'Overdue' }
  } else if (dueDate <= thirtyDaysFromNow) {
    return { class: 'upcoming', text: 'Due Soon' }
  } else {
    return { class: 'current', text: 'Up to Date' }
  }
}

// Debounce function for search
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Validate email format
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Calculate days between dates
export function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000
  const firstDate = new Date(date1)
  const secondDate = new Date(date2)
  
  return Math.round(Math.abs((firstDate - secondDate) / oneDay))
}

// Format relative time (e.g., "3 days ago", "in 2 weeks")
export function formatRelativeTime(dateString) {
  if (!dateString) return 'Unknown'
  
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((date - now) / 1000)
  const diffInDays = Math.floor(diffInSeconds / (24 * 60 * 60))
  
  if (diffInDays === 0) {
    return 'Today'
  } else if (diffInDays === 1) {
    return 'Tomorrow'
  } else if (diffInDays === -1) {
    return 'Yesterday'
  } else if (diffInDays > 0) {
    if (diffInDays < 7) {
      return `In ${diffInDays} days`
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return `In ${weeks} week${weeks > 1 ? 's' : ''}`
    } else {
      const months = Math.floor(diffInDays / 30)
      return `In ${months} month${months > 1 ? 's' : ''}`
    }
  } else {
    const absDays = Math.abs(diffInDays)
    if (absDays < 7) {
      return `${absDays} days ago`
    } else if (absDays < 30) {
      const weeks = Math.floor(absDays / 7)
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else {
      const months = Math.floor(absDays / 30)
      return `${months} month${months > 1 ? 's' : ''} ago`
    }
  }
}

// Add CSS animation for toast slide out
const style = document.createElement('style')
style.textContent = `
  @keyframes toastSlideOut {
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`
document.head.appendChild(style)