import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// For local development with Expo, use environment variables from .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zbznfomhhnokqnrnfain.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpiem5mb21oaG5va3Fucm5mYWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNTY4NDYsImV4cCI6MjA4NjczMjg0Nn0.xDSKjozjckUfG2KUDYnZMHAReQtZl4YGBuJrg_KmmHs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
