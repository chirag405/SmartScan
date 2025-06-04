import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session, User } from "@supabase/supabase-js";
import * as AuthSession from "expo-auth-session";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { supabase } from "@/lib/supabaseClient";

const redirectTo = AuthSession.makeRedirectUri({
  scheme: "smartscan",
});

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: false,
      initialized: false,
      initialize: async () => {
        try {
          set({ loading: true, initialized: false });

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("Error getting session:", sessionError.message);
          }

          console.log(
            "Initializing auth. Current session:",
            session?.user?.email || "No session"
          );

          if (session?.user) {
            // Placeholder for upserting user profile data
            // await upsertUserProfile(session.user);
            console.log(
              "User session active, potentially upsert profile here."
            );
          }

          set({
            user: session?.user || null,
            session,
            initialized: true,
            loading: false,
          });

          // Listen for auth changes
          const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
              console.log(
                "Auth state change:",
                event,
                newSession?.user?.email || "No user"
              );

              if (event === "TOKEN_REFRESHED") {
                set({ session: newSession, loading: false });
                return;
              }

              if (event === "SIGNED_IN" && newSession?.user) {
                // Placeholder for upserting user profile data
                // await upsertUserProfile(newSession.user);
                console.log("User signed in, potentially upsert profile here.");
              }

              if (event === "SIGNED_OUT") {
                set({ user: null, session: null, loading: false });
                return;
              }

              set({
                user: newSession?.user || null,
                session: newSession,
                loading: false,
              });
            }
          );
        } catch (error) {
          console.error("Auth initialization error:", error);
          set({ initialized: true, loading: false, user: null, session: null });
        }
      },
      signInWithGoogle: async () => {
        try {
          set({ loading: true });
          console.log("Attempting Google Sign-In with redirect:", redirectTo);

          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo,
              queryParams: {
                access_type: "offline",
                prompt: "consent",
              },
            },
          });

          if (error) {
            console.error("Supabase signInWithOAuth error:", error.message);
            throw error;
          }
        } catch (error: any) {
          console.error(
            "Google sign-in process error:",
            error.message || error
          );
          set({ loading: false });
          throw error;
        }
      },

      signOut: async () => {
        try {
          set({ loading: true });
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error("Supabase signOut error:", error.message);
            throw error;
          }
          set({ user: null, session: null, loading: false });
        } catch (error: any) {
          console.error("Sign out error:", error.message || error);
          set({ loading: false });
          throw error;
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
      onRehydrateStorage: (state) => {
        console.log("Rehydrating auth store");
        return (state, error) => {
          if (error) {
            console.error("Error rehydrating auth store:", error);
          }
          if (state) {
            console.log("Auth store rehydrated. User:", state.user?.email);
          }
        };
      },
    }
  )
);
