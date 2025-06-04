// stores/authStore.ts
import { Database, supabase } from "@/lib/supabaseClient";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { create } from "zustand";

type UserData = Database["public"]["Tables"]["users"]["Row"];

interface AuthState {
  user: SupabaseUser | null;
  userData: UserData | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ success: boolean; error?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  initializeAuth: () => Promise<void>;
  fetchUserData: () => Promise<UserData | null>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  userData: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  // Actions
  signUp: async (email: string, password: string, fullName: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: "smartscan://auth/verify", // Add redirect URL for email verification
        },
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Insert user data into our custom users table
        const { error: insertError } = await supabase.from("users").insert({
          id: data.user.id,
          email: data.user.email!,

          full_name: fullName,
        });

        if (insertError) {
          console.warn("Failed to insert user data:", insertError.message);
        }

        set({ user: data.user, isLoading: false });
        await get().fetchUserData();
        return { success: true };
      }

      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      // User is signed in with Supabase, now fetch their data from our table
      const fetchedUserData = await get().fetchUserData();

      if (!fetchedUserData) {
        // This case implies the user exists in Supabase auth but not in our 'users' table,
        // or there was an error fetching. Sign them out to be safe.
        await supabase.auth.signOut();
        set({
          error: "Failed to retrieve user details. Please try again.",
          isLoading: false,
          user: null,
          userData: null,
        });
        return {
          success: false,
          error: "Failed to retrieve user details. Please try again.",
        };
      }

      // Check email verification status from our 'users' table
      if (!fetchedUserData.email_verified) {
        await supabase.auth.signOut(); // Sign out the user
        set({
          error: "Please verify your email before logging in.",
          isLoading: false,
          user: null, // Clear user from auth store
          userData: null, // Clear userData from auth store
        });
        return { success: false, error: "Email not verified" };
      }

      // Email is verified, user data is fetched and set by fetchUserData
      // The user object from signInWithPassword (data.user) is already set by onAuthStateChange or initial call
      set({ user: data.user, userData: fetchedUserData, isLoading: false });
      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  signOut: async () => {
    set({ isLoading: true });

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({
        user: null,
        userData: null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      set({ error: errorMessage, isLoading: false });
    }
  },
  resetPassword: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "smartscan://auth/reset-password",
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  updatePassword: async (newPassword: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }

      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  initializeAuth: async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        set({ user: session.user });
        await get().fetchUserData();
      }

      set({ isInitialized: true });

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          set({ user: session.user });
          await get().fetchUserData();
        } else {
          set({ user: null, userData: null });
        }
      });
    } catch (err) {
      console.error("Failed to initialize auth:", err);
      set({ isInitialized: true });
    }
  },

  fetchUserData: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.warn("Failed to fetch user data:", error.message);
        set({ userData: null }); // Clear userData on error
        return null;
      }

      set({ userData: data });
      return data; // Return the fetched data
    } catch (err) {
      console.warn("Failed to fetch user data:", err);
      set({ userData: null }); // Clear userData on error
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
