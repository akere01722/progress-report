import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a mock supabase client if env vars are missing
let supabase;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase env vars. Using mock client. Create .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  
  // Create a minimal mock client that won't crash
  supabase = {
    functions: {
      invoke: async () => {
        throw new Error("Supabase not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file.");
      }
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
