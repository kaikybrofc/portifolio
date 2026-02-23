import {
  hasSupabaseSecretInBrowser,
  isSupabaseConfigured,
  supabase,
} from './customSupabaseClient';

// Export the existing configured client to be used throughout the app
export { hasSupabaseSecretInBrowser, isSupabaseConfigured, supabase };
