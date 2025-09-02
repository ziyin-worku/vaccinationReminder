// If using Vite or a bundler, ensure @supabase/supabase-js is installed via npm:
// npm install @supabase/supabase-js
// Or use the CDN import as below (ESM):
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase project credentials
const supabaseUrl = "https://fonjibcafpndaawwrypc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvbmppYmNhZnBuZGFhd3dyeXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDE2MjgsImV4cCI6MjA3MjIxNzYyOH0.20nWSr5ij5Zs9jXguivRPyNhdPF-aN6io7sBaoKC2_4";

// Basic validation
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Please provide URL and anon key."
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the currently authenticated user
 * @returns {Promise<User|null>}
 */
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user || null;
  } catch (err) {
    console.error("Error getting current user:", err);
    return null;
  }
};

/**
 * Check if a user is authenticated (has an active session)
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return !!session;
  } catch (err) {
    console.error("Error checking authentication:", err);
    return false;
  }
};
