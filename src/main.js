import AuthManager from "./auth.js";
import Dashboard from "./dashboard.js";
import ModalManager from "./modals.js";

class App {
  constructor() {
    this.init();
  }

  async init() {
    try {
      // Initialize managers
      window.auth = new AuthManager();
      window.dashboard = new Dashboard();
      window.modals = new ModalManager();

      console.log("VaxTracker application initialized successfully");

      // Setup UI helpers
      this.setupFormSwitching();
      this.setupModalHandlers();
      this.setupDarkMode();

      // Wait until user logs in
      this.waitForAuth();
    } catch (error) {
      this.showErrorScreen(error);
    }
  }

  waitForAuth() {
    const interval = setInterval(async () => {
      const user = window.auth.getCurrentUser();
      if (user) {
        clearInterval(interval);
        document.getElementById("auth-container").style.display = "none";
        document.getElementById("app-container").style.display = "block";
        document.getElementById("user-name").textContent =
          user.email.split("@")[0];
        await window.dashboard.init();
      }
    }, 500);
  }

  setupFormSwitching() {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    document.getElementById("show-signup").addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.style.display = "none";
      signupForm.style.display = "block";
    });

    document.getElementById("show-login").addEventListener("click", (e) => {
      e.preventDefault();
      signupForm.style.display = "none";
      loginForm.style.display = "block";
    });
  }

  setupModalHandlers() {
    document.querySelectorAll(".modal-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modalId = btn.dataset.modal;
        document.getElementById(modalId).classList.remove("show");
      });
    });

    document.querySelectorAll("[data-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modalId = btn.dataset.modal;
        document.getElementById(modalId).classList.add("show");
      });
    });
  }

  setupDarkMode() {
    const toggle = document.getElementById("dark-mode-toggle");
    const icon = toggle.querySelector("i");

    // Load preference
    if (localStorage.getItem("dark-mode") === "enabled") {
      document.body.classList.add("dark-mode");
      icon.classList.replace("fa-moon", "fa-sun");
    }

    toggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");

      if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("dark-mode", "enabled");
        icon.classList.replace("fa-moon", "fa-sun");
      } else {
        localStorage.setItem("dark-mode", "disabled");
        icon.classList.replace("fa-sun", "fa-moon");
      }
    });
  }

  showErrorScreen(error) {
    console.error("Error initializing application:", error);
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #f9fafb;
        font-family: Inter, sans-serif;
        text-align: center;
        padding: 24px;
      ">
        <div style="
          background: white;
          padding: 48px;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          max-width: 400px;
        ">
          <div style="color: #ef4444; font-size: 48px; margin-bottom: 16px;">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <h2 style="color: #1f2937; margin-bottom: 8px;">Application Error</h2>
          <p style="color: #6b7280; margin-bottom: 24px;">
            There was an error initializing the application. Please check your configuration and try again.
          </p>
          <button onclick="window.location.reload()" style="
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
          ">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }

  static showToast({ message, type = "info", title = "" }) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    toast.innerHTML = `
      <div class="toast-icon"><i class="${
        type === "success"
          ? "fas fa-check-circle"
          : type === "error"
          ? "fas fa-exclamation-circle"
          : "fas fa-info-circle"
      }"></i></div>
      <div class="toast-content">
        ${title ? `<div class="toast-title">${title}</div>` : ""}
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);

    toast.querySelector(".toast-close").addEventListener("click", () => {
      toast.remove();
    });

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
}

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new App();
});

// Global error handlers
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});
