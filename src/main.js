import AuthManager from './auth.js'
import Dashboard from './dashboard.js'
import ModalManager from './modals.js'

// Initialize the application
class App {
  constructor() {
    this.init()
  }

  async init() {
    try {
      // Initialize managers
      window.auth = new AuthManager()
      window.dashboard = new Dashboard()
      window.modals = new ModalManager()
      
      console.log('VaxTracker application initialized successfully')
      
    } catch (error) {
      console.error('Error initializing application:', error)
      
      // Show error message to user
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
      `
    }
  }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new App()
})

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})