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
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>; // Added this line
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
        console.log("[AuthStore] onAuthStateChange: Event received:", event);
        console.log("[AuthStore] onAuthStateChange: Session object:", JSON.stringify(session, null, 2));
        set({ isLoading: true });

        if (session?.user) {
          const supabaseUser = session.user;
          console.log("[AuthStore] onAuthStateChange: supabaseUser object:", JSON.stringify(supabaseUser, null, 2));
          set({ user: supabaseUser });

          // Attempt to fetch existing user data from our 'users' table
          console.log("[AuthStore] onAuthStateChange: Attempting initial fetchUserData.");
          let fetchedUserData = await get().fetchUserData(); // fetchUserData also logs
          console.log("[AuthStore] onAuthStateChange: UserData after initial fetch:", JSON.stringify(get().userData, null, 2));

          // If user data is not found in our DB (e.g., first Google Sign-In)
          // and it's a sign-in event, try to create it.
          if (!fetchedUserData && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
            if (supabaseUser.email && supabaseUser.user_metadata?.full_name) {
              const userProfileToUpsert = {
                id: supabaseUser.id,
                email: supabaseUser.email,
                full_name: supabaseUser.user_metadata.full_name,
                email_verified:
                  supabaseUser.app_metadata.provider === "google" ||
                  !!supabaseUser.email_confirmed_at,
              };
              console.log(
                "[AuthStore] onAuthStateChange: User profile not in DB or needs update. Attempting to upsert with data:",
                JSON.stringify(userProfileToUpsert, null, 2)
              );

              const { error: upsertError } = await supabase
                .from("users")
                .upsert(userProfileToUpsert);

              if (upsertError) {
                console.error(
                  "[AuthStore] onAuthStateChange: Error upserting user data:",
                  upsertError
                );
                set({
                  error: "Failed to save user profile. " + upsertError.message,
                  isLoading: false, // Ensure isLoading is false on error
                });
              } else {
                console.log(
                  "[AuthStore] onAuthStateChange: User data upserted successfully for:",
                  supabaseUser.email
                );
                // Re-fetch user data after successful upsert
                console.log("[AuthStore] onAuthStateChange: Attempting fetchUserData after upsert.");
                fetchedUserData = await get().fetchUserData();
                console.log("[AuthStore] onAuthStateChange: UserData after upsert and re-fetch:", JSON.stringify(get().userData, null, 2));
              }
            } else {
              console.warn(
                "[AuthStore] onAuthStateChange: User signed in, but missing email or full_name for profile creation. Supabase User:",
                JSON.stringify(supabaseUser, null, 2)
              );
               set({ isLoading: false }); // Ensure isLoading is false if we can't proceed
            }
          }

          // Final state logging
          console.log("[AuthStore] onAuthStateChange: Final user state from store:", JSON.stringify(get().user, null, 2));
          console.log("[AuthStore] onAuthStateChange: Final userData state from store:", JSON.stringify(get().userData, null, 2));

          // If fetchUserData was called, it handles its own isLoading.
          // If it wasn't called (e.g. not SIGNED_IN event, or missing metadata for upsert),
          // or if it was called but didn't find/create data, ensure isLoading is false.
          if (!get().userData && event !== "SIGNED_OUT") { // Avoid double set if fetchUserData already did it
             set({ isLoading: false });
             console.log("[AuthStore] onAuthStateChange: Setting isLoading to false as userData is still null (and not a SIGNED_OUT event).");
          }

        } else { // No session or user (e.g., sign out)
          console.log("[AuthStore] onAuthStateChange: No user session (event: " + event + "). Clearing user and userData.");
          set({ user: null, userData: null, isLoading: false, error: null });
        }
      });
    } catch (err) {
      console.error("[AuthStore] initializeAuth: Failed to initialize auth or onAuthStateChange listener error:", err);
      set({ isInitialized: true, isLoading: false }); // Ensure loading is false on error too
    }
  },

  // Google Sign-In
  signInWithGoogle: async () => {
    console.log("[AuthStore] signInWithGoogle: Called");
    set({ isLoading: true, error: null });
    try {
      const oauthOptions = {
        provider: "google" as const,
        options: {
          redirectTo: "smartscan://auth/callback",
        },
      };
      console.log("[AuthStore] signInWithGoogle: Attempting signInWithOAuth with options:", JSON.stringify(oauthOptions, null, 2));
      const { data, error } = await supabase.auth.signInWithOAuth(oauthOptions);

      if (error) {
        console.error("[AuthStore] signInWithGoogle: Error from signInWithOAuth:", error);
        set({ error: error.message, isLoading: false });
        return { success: false, error: error.message };
      }
      console.log("[AuthStore] signInWithGoogle: signInWithOAuth successful (data might be null due to redirect):", JSON.stringify(data, null, 2));
      // Supabase handles the redirect.
      return { success: true };
    } catch (err) {
      console.error("[AuthStore] signInWithGoogle: Catch block error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  fetchUserData: async () => {
    const { user, isLoading: currentIsLoading } = get(); // Get current loading state
    if (!user) {
      // console.log("[AuthStore] fetchUserData: No user in state, cannot fetch.");
      // If there's no user, we shouldn't be in a loading state from this function.
      if (currentIsLoading) set({ isLoading: false });
      return null;
    }
    console.log("[AuthStore] fetchUserData: Called for user ID:", user.id);
    // set({ isLoading: true }); // Caller (onAuthStateChange) usually sets isLoading

    try {
      const { data, error: fetchError, status } = await supabase // Renamed 'error' to 'fetchError'
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError) {
        console.warn(`[AuthStore] fetchUserData: Error fetching user data for ID ${user.id}. Status: ${status}. Error:`, fetchError.message);
        set({ userData: null, isLoading: false });
        return null;
      }

      console.log(`[AuthStore] fetchUserData: Successfully fetched user data for ID ${user.id}:`, JSON.stringify(data, null, 2));
      set({ userData: data, isLoading: false });
      return data;
    } catch (err) {
      console.error("[AuthStore] fetchUserData: Catch block error:", err);
      set({ userData: null, isLoading: false });
      return null;
    }
  },

  clearError: () => {
    console.log("[AuthStore] clearError: Called");
    set({ error: null });
  },
}));
