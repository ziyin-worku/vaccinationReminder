import { supabase } from './supabase-client.js'
import { showToast } from './utils.js'

class AuthManager {
  constructor() {
    this.currentUser = null
    this.init()
  }

  async init() {
    // Check for existing session
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await this.handleAuthSuccess(session.user)
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.handleAuthSuccess(session.user)
      } else if (event === 'SIGNED_OUT') {
        this.handleSignOut()
      }
    })

    this.setupEventListeners()
  }

  setupEventListeners() {
    // Form submissions
    document.getElementById('login').addEventListener('submit', (e) => this.handleLogin(e))
    document.getElementById('signup').addEventListener('submit', (e) => this.handleSignup(e))
    
    // Form switching
    document.getElementById('show-signup').addEventListener('click', (e) => {
      e.preventDefault()
      this.showSignupForm()
    })
    
    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault()
      this.showLoginForm()
    })

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => this.logout())
  }

  async handleLogin(e) {
    e.preventDefault()
    
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value
    const submitBtn = e.target.querySelector('button[type="submit"]')
    
    try {
      submitBtn.disabled = true
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...'
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      showToast('Welcome back!', 'success')
      
    } catch (error) {
      console.error('Login error:', error)
      showToast(error.message, 'error')
    } finally {
      submitBtn.disabled = false
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In'
    }
  }

  async handleSignup(e) {
    e.preventDefault()
    
    const name = document.getElementById('signup-name').value
    const email = document.getElementById('signup-email').value
    const password = document.getElementById('signup-password').value
    const submitBtn = e.target.querySelector('button[type="submit"]')
    
    try {
      submitBtn.disabled = true
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...'
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })
      
      if (error) throw error
      
      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              name: name
            }
          ])
        
        if (profileError) {
          console.error('Profile creation error:', profileError)
        }
      }
      
      showToast('Account created successfully!', 'success')
      
    } catch (error) {
      console.error('Signup error:', error)
      showToast(error.message, 'error')
    } finally {
      submitBtn.disabled = false
      submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account'
    }
  }

  async handleAuthSuccess(user) {
    this.currentUser = user
    
    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single()
    
    // Update UI
    document.getElementById('user-name').textContent = profile?.name || user.email
    document.getElementById('auth-container').style.display = 'none'
    document.getElementById('app-container').style.display = 'block'
    
    // Initialize dashboard
    if (window.dashboard) {
      window.dashboard.init()
    }
  }

  handleSignOut() {
    this.currentUser = null
    document.getElementById('auth-container').style.display = 'flex'
    document.getElementById('app-container').style.display = 'none'
    
    // Clear forms
    document.getElementById('login').reset()
    document.getElementById('signup').reset()
  }

  async logout() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      showToast('Logged out successfully', 'info')
    } catch (error) {
      console.error('Logout error:', error)
      showToast('Error logging out', 'error')
    }
  }

  showSignupForm() {
    document.getElementById('login-form').style.display = 'none'
    document.getElementById('signup-form').style.display = 'block'
  }

  showLoginForm() {
    document.getElementById('signup-form').style.display = 'none'
    document.getElementById('login-form').style.display = 'block'
  }

  getCurrentUser() {
    return this.currentUser
  }
}

export default AuthManager