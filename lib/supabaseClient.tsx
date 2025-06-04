// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Custom storage adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable URL detection for email verification
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;

          full_name: string;
          storage_used_mb: number;
          document_count: number;
          subscription_tier: string;
          timezone: string;
          email_verified: boolean;
          email_verification_token: string | null;
          password_reset_token: string | null;
          password_reset_expires: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;

          full_name: string;
          storage_used_mb?: number;
          document_count?: number;
          subscription_tier?: string;
          timezone?: string;
          email_verified?: boolean;
          email_verification_token?: string | null;
          password_reset_token?: string | null;
          password_reset_expires?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;

          full_name?: string;
          storage_used_mb?: number;
          document_count?: number;
          subscription_tier?: string;
          timezone?: string;
          email_verified?: boolean;
          email_verification_token?: string | null;
          password_reset_token?: string | null;
          password_reset_expires?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
