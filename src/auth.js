import { supabase } from "./supabase-client.js";
import { showToast } from "./utils.js";

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  // Initialize auth
  async init() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) console.error("Error getting session:", error);

      if (session?.user) await this.handleAuthSuccess(session.user);

      // Listen to auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          await this.handleAuthSuccess(session.user);
        } else if (event === "SIGNED_OUT") {
          this.handleSignOut();
        }
      });

      this.setupEventListeners();
    } catch (err) {
      console.error("Auth initialization error:", err);
    }
  }

  // Event listeners for forms and buttons
  setupEventListeners() {
    const loginForm = document.getElementById("login");
    const signupForm = document.getElementById("signup");

    loginForm?.addEventListener("submit", (e) => this.handleLogin(e));
    signupForm?.addEventListener("submit", (e) => this.handleSignup(e));

    document
      .getElementById("show-signup")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.showSignupForm();
      });

    document
      .getElementById("show-login")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.showLoginForm();
      });

    document
      .getElementById("logout-btn")
      ?.addEventListener("click", () => this.logout());
  }

  // Handle login
  async handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!email || !password) {
      showToast("Please enter email and password", "error");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Signing in...';

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) {
        if (error.status === 400)
          showToast("Bad request. Check email/password.", "error");
        else if (error.status === 401)
          showToast("Incorrect credentials or email not confirmed.", "error");
        else showToast(error.message, "error");
        return;
      }

      if (!data.user) {
        showToast("User not found. Please signup first.", "error");
        return;
      }

      showToast("✅ Logged in successfully!", "success");
      await this.handleAuthSuccess(data.user);
    } catch (err) {
      console.error("Login error:", err);
      showToast("Unexpected error during login", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
  }

  // Handle signup
  async handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById("signup-name")?.value.trim();
    const email = document.getElementById("signup-email")?.value.trim();
    const password = document.getElementById("signup-password")?.value.trim();
    const submitBtn = e.target.querySelector('button[type="submit"]');

    if (!name || !email || !password) {
      showToast("Please fill in all fields", "error");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Creating account...';

      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
      });

      if (error) {
        if (error.status === 400) showToast("Invalid signup request", "error");
        else if (error.status === 422) showToast("User already registered", "error");
        else showToast(error.message, "error");
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: data.user.id,
            email: data.user.email,
            full_name: name,
            role: "user", // default role
          },
        ]);

        if (profileError) console.error("Profile creation error:", profileError);
      }

      showToast(
        "✅ Account created! Check your email to confirm before logging in.",
        "success"
      );
      this.showLoginForm();
    } catch (err) {
      console.error("Signup error:", err);
      showToast("Unexpected error during signup", "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
    }
  }

  // Handle successful auth
  async handleAuthSuccess(user) {
    this.currentUser = user;

    // Fetch profile
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (error) console.error("Error fetching profile:", error);

    // Update UI
    const userNameElem = document.getElementById("user-name");
    if (userNameElem) userNameElem.textContent = profile?.full_name || user.email;

    const authContainer = document.getElementById("auth-container");
    const appContainer = document.getElementById("app-container");
    if (authContainer) authContainer.style.display = "none";
    if (appContainer) appContainer.style.display = "block";

    // Store role globally
    window.currentUserRole = profile?.role || "user";

    // Initialize dashboard
    if (window.dashboard) window.dashboard.init();

    // Make UI read-only for non-admins
    if (window.currentUserRole !== "admin") {
      document.querySelectorAll(".action-buttons, .btn-icon").forEach((el) => {
        el.style.display = "none";
      });
    }
  }

  handleSignOut() {
    this.currentUser = null;

    const authContainer = document.getElementById("auth-container");
    const appContainer = document.getElementById("app-container");
    if (authContainer) authContainer.style.display = "flex";
    if (appContainer) appContainer.style.display = "none";

    document.getElementById("login")?.reset();
    document.getElementById("signup")?.reset();
  }

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showToast("Logged out successfully", "info");
    } catch (err) {
      console.error("Logout error:", err);
      showToast("Error logging out", "error");
    }
  }

  showSignupForm() {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    if (loginForm) loginForm.style.display = "none";
    if (signupForm) signupForm.style.display = "block";
  }

  showLoginForm() {
    const signupForm = document.getElementById("signup-form");
    const loginForm = document.getElementById("login-form");
    if (signupForm) signupForm.style.display = "none";
    if (loginForm) loginForm.style.display = "block";
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

export default AuthManager;
