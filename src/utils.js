// ==========================
// Toast Notification System
// ==========================
export function showToast(message, type = "info", duration = 5000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    info: "fas fa-info-circle",
    warning: "fas fa-exclamation-triangle",
  };

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
  `;

  // Close button functionality
  toast
    .querySelector(".toast-close")
    .addEventListener("click", () => removeToast(toast));

  container.appendChild(toast);

  // Auto-remove after duration
  setTimeout(() => removeToast(toast), duration);
}

function removeToast(toast) {
  toast.style.animation = "toastSlideOut 0.3s ease forwards";
  setTimeout(() => {
    toast.remove();
  }, 300);
}

// ==========================
// Date Formatting
// ==========================
export function formatDate(dateString) {
  if (!dateString) return "Not set";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ==========================
// Vaccine Status
// ==========================
export function getVaccineStatus(nextDue) {
  if (!nextDue) return { class: "current", text: "Complete" };

  const dueDate = new Date(nextDue);
  const today = new Date();
  const thirtyDaysFromNow = new Date(
    today.getTime() + 30 * 24 * 60 * 60 * 1000
  );

  if (dueDate < today) return { class: "overdue", text: "Overdue" };
  if (dueDate <= thirtyDaysFromNow)
    return { class: "upcoming", text: "Due Soon" };
  return { class: "current", text: "Up to Date" };
}

// ==========================
// Debounce Function
// ==========================
export function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ==========================
// Email Validation
// ==========================
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==========================
// Days Between Two Dates
// ==========================
export function daysBetween(date1, date2) {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs(new Date(date1) - new Date(date2)) / oneDayMs);
}

// ==========================
// Relative Time Formatting
// ==========================
export function formatRelativeTime(dateString) {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((date - now) / (24 * 60 * 60 * 1000));

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "Tomorrow";
  if (diffInDays === -1) return "Yesterday";

  const absDays = Math.abs(diffInDays);
  const future = diffInDays > 0;

  if (absDays < 7) return future ? `In ${absDays} days` : `${absDays} days ago`;
  if (absDays < 30) {
    const weeks = Math.floor(absDays / 7);
    return future
      ? `In ${weeks} week${weeks > 1 ? "s" : ""}`
      : `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }

  const months = Math.floor(absDays / 30);
  return future
    ? `In ${months} month${months > 1 ? "s" : ""}`
    : `${months} month${months > 1 ? "s" : ""} ago`;
}

// ==========================
// Add CSS for Toast Animation
// ==========================
const style = document.createElement("style");
style.textContent = `
  @keyframes toastSlideOut {
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);
