import "react-native-url-polyfill/auto"; // Added
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Database } from "../types";

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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// Utility function to clear all Supabase session data
export const clearSupabaseSession = async () => {
  try {
    // Clear from Supabase auth storage
    const storageKeys = [
      `sb-${supabaseUrl.split("//")[1].split(".")[0]}-auth-token`,
      "supabase.auth.token",
      `supabase-auth-${supabaseUrl}`,
    ];

    for (const key of storageKeys) {
      try {
        await SecureStore.deleteItemAsync(key);
        console.log(`Cleared SecureStore key: ${key}`);
      } catch (error) {
        console.log(`Key not found in SecureStore: ${key}`);
      }
    }

    // Also try to sign out from Supabase
    try {
      await supabase.auth.signOut();
      console.log("Supabase sign out completed");
    } catch (error) {
      console.log("Supabase sign out failed:", error);
    }

    console.log("All Supabase session data cleared");
  } catch (error) {
    console.error("Error clearing Supabase session:", error);
  }
};
