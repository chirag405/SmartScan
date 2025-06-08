import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearSupabaseSession, supabase } from "../lib/supabaseClient";
import { authQueries, UserProfile } from "../server/auth";

interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface AuthState {
  user: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  isSigningOut: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  forceSignOut: () => Promise<void>;
  validateSession: () => Promise<boolean>;
  clearAllData: () => Promise<void>;
  updateUser: (userData: Partial<AuthUser>) => void;
  updateUserProfile: (profileData: { full_name?: string }) => Promise<void>;
  loadUserProfile: () => Promise<void>;
  forceRefreshAuth: () => Promise<boolean>;
}

// Custom storage adapter for AsyncStorage
const AsyncStorageAdapter = {
  getItem: async (name: string) => {
    try {
      const item = await AsyncStorage.getItem(name);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("AsyncStorage getItem error:", error);
      return null;
    }
  },
  setItem: async (name: string, value: any) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.error("AsyncStorage setItem error:", error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.error("AsyncStorage removeItem error:", error);
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      // Single initialization flag to prevent multiple listeners
      let isInitialized = false;
      let authListener: { data: { subscription: any } } | null = null;

      // Validate session by checking if user exists in database
      const validateSession = async (): Promise<boolean> => {
        try {
          console.log("🔍 Validating session...");

          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error("❌ Session error during validation:", sessionError);
            return false;
          }

          if (!session?.user) {
            console.log("❌ No user in session during validation");
            return false;
          }

          console.log("✅ Session exists for user:", {
            id: session.user.id,
            email: session.user.email,
          });

          // Check if user still exists in database
          console.log(
            "🔍 Checking if user exists in database:",
            session.user.id
          );

          const { data: userRecord, error: userError } = await supabase
            .from("users")
            .select("id, email, full_name")
            .eq("id", session.user.id)
            .maybeSingle();

          if (userError) {
            console.error("❌ Error checking user existence:", userError, {
              code: userError.code,
              details: userError.details,
            });
            return false;
          }

          if (!userRecord) {
            console.log("❌ User not found in database:", session.user.id);

            // Try to create the user profile
            try {
              console.log("🆕 Attempting to create missing user profile");
              const { useDocumentStore } = await import("./documentStore");

              const createdProfile = await authQueries.createUserProfile(
                session.user.id,
                session.user.email || "",
                {
                  full_name: session.user.user_metadata?.full_name || "User",
                }
              );

              if (createdProfile) {
                console.log("✅ User profile created successfully");
                return true;
              } else {
                console.log("❌ Failed to create user profile");
                return false;
              }
            } catch (error) {
              console.error("❌ Error creating user profile:", error);
              return false;
            }
          }

          console.log("✅ User exists in database:", {
            id: userRecord.id,
            email: userRecord.email,
            name: userRecord.full_name,
          });
          return true;
        } catch (error) {
          console.error("❌ Error validating session:", error);
          return false;
        }
      };

      // Clear all cached data
      const clearAllData = async () => {
        try {
          // Clear AsyncStorage
          await AsyncStorage.multiRemove(["auth-storage", "document-storage"]);
          // Clear Supabase session
          await clearSupabaseSession();
          console.log("All cached data cleared");
        } catch (error) {
          console.error("Error clearing cached data:", error);
        }
      };

      // Force sign out with protection against recursive calls
      const forceSignOut = async () => {
        const currentState = get();

        // Prevent recursive calls
        if (currentState.isSigningOut) {
          return;
        }

        // Set signing out flag
        set({ isSigningOut: true, loading: false });

        try {
          // Clear all local data
          await clearAllData();

          // Update state
          set({
            user: null,
            userProfile: null,
            loading: false,
            error: null,
            initialized: true,
            isSigningOut: false,
          });

          // Reset document store
          try {
            const { useDocumentStore } = await import("./documentStore");
            useDocumentStore.getState().resetStore();
          } catch (error) {
            console.error("Error resetting document store:", error);
          }
        } catch (error) {
          console.error("Error during force sign out:", error);
          // Still complete the sign out even if cleanup failed
          set({
            user: null,
            userProfile: null,
            loading: false,
            error: null,
            initialized: true,
            isSigningOut: false,
          });
        }
      };

      // Set up auth state listener - only once
      const initializeAuthListener = async () => {
        if (isInitialized) {
          return;
        }

        isInitialized = true;

        try {
          // First, check if there's an existing session
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.error("Error getting session:", error);
            set({ loading: false, error: error.message, initialized: true });
            return;
          }

          // Set initial state based on session
          if (session?.user) {
            // Validate session before setting user as logged in
            const isValid = await validateSession();

            if (!isValid) {
              await forceSignOut();
              return;
            }

            const userData: AuthUser = {
              id: session.user.id,
              email: session.user.email || "",
              user_metadata: session.user.user_metadata || {},
            };

            // Load user profile
            try {
              const profile = await authQueries.getUserProfile(session.user.id);

              set({
                user: userData,
                userProfile: profile,
                loading: false,
                error: null,
                initialized: true,
                isSigningOut: false,
              });
            } catch (error) {
              console.error("Error loading user profile on init:", error);
              // Set user without profile rather than signing out
              set({
                user: userData,
                userProfile: null,
                loading: false,
                error: null,
                initialized: true,
                isSigningOut: false,
              });
            }
          } else {
            console.log("No existing session found");
            set({
              user: null,
              userProfile: null,
              loading: false,
              error: null,
              initialized: true,
              isSigningOut: false,
            });
          }

          // Set up listener for future auth changes with debouncing
          let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

          authListener = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log("🔥 Auth state change detected:", {
                event,
                hasSession: !!session,
                hasUser: !!session?.user,
                userEmail: session?.user?.email,
                userId: session?.user?.id,
                timestamp: new Date().toISOString(),
              });

              // Clear existing timeout
              if (debounceTimeout) {
                clearTimeout(debounceTimeout);
              }

              // Clear any OAuth timeout that might be active
              const state = get() as any;
              if (state.oauthTimeoutId) {
                console.log("🧹 Clearing OAuth timeout from auth listener");
                clearTimeout(state.oauthTimeoutId);
                state.oauthTimeoutId = null;
              }

              // Debounce auth state changes to prevent rapid updates
              debounceTimeout = setTimeout(async () => {
                console.log(
                  "🔄 Processing auth state change after debounce:",
                  event
                );
                const currentState = get();

                // Prevent processing if already signing out
                if (currentState.isSigningOut) {
                  console.log(
                    "⏭️ Skipping auth state change - currently signing out"
                  );
                  return;
                }

                if (event === "SIGNED_IN" && session?.user) {
                  console.log(
                    "SIGNED_IN event received for user:",
                    session.user.id
                  );

                  // Clear OAuth timeout if it exists
                  const state = get() as any;
                  if (state.oauthTimeoutId) {
                    clearTimeout(state.oauthTimeoutId);
                    console.log(
                      "Cleared OAuth timeout after successful sign in"
                    );
                  }

                  // Only update if user actually changed
                  if (currentState.user?.id !== session.user.id) {
                    const userData: AuthUser = {
                      id: session.user.id,
                      email: session.user.email || "",
                      user_metadata: session.user.user_metadata || {},
                    };

                    console.log(
                      "Setting user data after sign in:",
                      userData.email
                    );

                    // Load user profile with retry logic (profile might be created by trigger)
                    try {
                      // Wait a moment for the database trigger to create the profile
                      await new Promise((resolve) => setTimeout(resolve, 1000));

                      const profile = await authQueries.getUserProfile(
                        session.user.id
                      );

                      console.log("User profile loaded:", profile?.full_name);

                      set({
                        user: userData,
                        userProfile: profile,
                        loading: false,
                        error: null,
                        initialized: true,
                      });

                      console.log("Sign in completed successfully");
                    } catch (error) {
                      console.log(
                        "Could not load profile, setting user without profile"
                      );
                      // Set user without profile - profile creation will be handled by trigger
                      set({
                        user: userData,
                        userProfile: null,
                        loading: false,
                        error: null,
                        initialized: true,
                      });

                      console.log(
                        "Sign in completed successfully (without profile)"
                      );
                    }
                  } else {
                    console.log("Same user, clearing loading state");
                    // Same user, just ensure loading is false
                    set({ loading: false });
                  }
                } else if (event === "SIGNED_OUT") {
                  // Only update if user was actually signed in
                  if (
                    currentState.user !== null &&
                    !currentState.isSigningOut
                  ) {
                    set({
                      user: null,
                      userProfile: null,
                      loading: false,
                      error: null,
                      initialized: true,
                      isSigningOut: false,
                    });

                    // Reset document store
                    try {
                      const { useDocumentStore } = await import(
                        "./documentStore"
                      );
                      useDocumentStore.getState().resetStore();
                    } catch (error) {
                      // Document store reset failed, but continue
                    }
                  }
                } else if (event === "TOKEN_REFRESHED" && session?.user) {
                  // Only update if user changed
                  if (currentState.user?.id !== session.user.id) {
                    const userData: AuthUser = {
                      id: session.user.id,
                      email: session.user.email || "",
                      user_metadata: session.user.user_metadata || {},
                    };
                    set({
                      user: userData,
                      loading: false,
                      error: null,
                      initialized: true,
                    });
                  }
                }
              }, 300); // 300ms debounce
            }
          );
        } catch (error) {
          console.error("Error initializing auth:", error);
          set({
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to initialize authentication",
            initialized: true,
            isSigningOut: false,
          });
        }
      };

      // Initialize the listener
      initializeAuthListener();

      return {
        user: null,
        userProfile: null,
        loading: true,
        error: null,
        initialized: false,
        isSigningOut: false,

        signInWithGoogle: async () => {
          console.log(
            "⚠️ Using legacy OAuth method. Please use GoogleSignInNative component instead."
          );
          console.log(
            "The native Google Sign-In approach is more reliable and faster."
          );

          // For now, just show an error to encourage using the native component
          set({
            loading: false,
            error:
              "Please use the native Google Sign-In button. If you see this message, the app needs to be updated to use the new authentication method.",
          });
        },

        signOut: async () => {
          const currentState = get();

          // Prevent multiple sign out attempts
          if (currentState.isSigningOut || !currentState.user) {
            return;
          }

          set({ loading: true, error: null, isSigningOut: true });

          try {
            const { error } = await supabase.auth.signOut();
            if (error) {
              // Continue with force sign out even if Supabase fails
            }

            // Clear all cached data
            await clearAllData();

            // The auth listener will handle the state update for successful signOut
            // For failed signOut, we handle it here
            if (error) {
              set({
                user: null,
                userProfile: null,
                loading: false,
                error: null,
                initialized: true,
                isSigningOut: false,
              });
            }
          } catch (error: unknown) {
            // Force complete the sign out regardless of errors
            set({
              user: null,
              userProfile: null,
              loading: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Sign out completed with errors",
              initialized: true,
              isSigningOut: false,
            });
          }
        },

        forceSignOut,
        validateSession,
        clearAllData,

        updateUser: (userData: Partial<AuthUser>) => {
          set((state) => {
            if (!state.user || state.isSigningOut) return state;
            return {
              ...state,
              user: { ...state.user, ...userData },
            };
          });
        },

        updateUserProfile: async (profileData) => {
          try {
            const { user, isSigningOut } = get();
            if (!user || isSigningOut) {
              set({ error: "No user logged in" });
              return;
            }

            const updatedProfile = await authQueries.updateUserProfile(
              user.id,
              profileData
            );

            if (updatedProfile) {
              set((state) => ({
                ...state,
                userProfile: updatedProfile,
                user: state.user
                  ? {
                      ...state.user,
                      user_metadata: {
                        ...state.user.user_metadata,
                        ...profileData,
                      },
                    }
                  : null,
                error: null,
              }));
            } else {
              set({ error: "Failed to update profile" });
            }
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : "An unknown error occurred";
            set((state) => ({ ...state, error: errorMessage }));
          }
        },

        loadUserProfile: async () => {
          try {
            const { user, isSigningOut } = get();
            if (!user || isSigningOut) return;

            const profile = await authQueries.getUserProfile(user.id);
            if (profile) {
              set((state) => ({ ...state, userProfile: profile }));
            } else {
              // Don't force sign out here - just continue without profile
            }
          } catch (error) {
            console.error("Error loading user profile:", error);
            // Don't force sign out on profile load errors
          }
        },

        forceRefreshAuth: async () => {
          console.log("🔄 Force refreshing auth state - DIRECT APPROACH");
          try {
            console.log("⏳ Getting session and user data");
            // Get both session and user data for redundancy
            const [sessionResult, userResult] = await Promise.all([
              supabase.auth.getSession(),
              supabase.auth.getUser(),
            ]);

            console.log("📊 Session check result:", {
              hasSession: !!sessionResult?.data?.session,
              sessionError: sessionResult?.error?.message || null,
            });

            console.log("👤 User check result:", {
              hasUser: !!userResult?.data?.user,
              userError: userResult?.error?.message || null,
              email: userResult?.data?.user?.email || null,
            });

            const session = sessionResult.data.session;
            const user = userResult.data.user;

            // Clear any timeouts that might be interfering
            const state = get() as any;
            if (state.oauthTimeoutId) {
              clearTimeout(state.oauthTimeoutId);
              console.log("🧹 Cleared OAuth timeout in force refresh");
              state.oauthTimeoutId = null;
            }

            // Prioritize user data over session data
            const activeUser = user || session?.user;

            if (activeUser) {
              console.log(
                "✅ USER FOUND! Directly updating auth state:",
                activeUser.email
              );

              const userData: AuthUser = {
                id: activeUser.id,
                email: activeUser.email || "",
                user_metadata: activeUser.user_metadata || {},
              };

              console.log("🔐 User data to set:", {
                id: userData.id,
                email: userData.email,
                hasMetadata: !!userData.user_metadata,
              });

              // First update the user data immediately
              set({
                user: userData,
                loading: false,
                error: null,
                initialized: true,
              });

              console.log("✅ Auth store updated with user:", userData.email);

              // Then try to load profile data
              try {
                console.log("🔍 Loading user profile for:", userData.id);
                const profile = await authQueries.getUserProfile(userData.id);

                if (profile) {
                  console.log("✅ Profile found and loaded:", {
                    name: profile.full_name,
                    profileId: profile.id,
                  });
                  set((state) => ({
                    ...state,
                    userProfile: profile,
                  }));
                } else {
                  console.log("⚠️ No profile found, but continuing with auth");
                  // Try to create profile if it doesn't exist
                  try {
                    console.log("🆕 Attempting to create user profile");
                    const createdProfile = await authQueries.createUserProfile(
                      userData.id,
                      userData.email,
                      {
                        full_name: userData.user_metadata?.full_name || "User",
                      }
                    );

                    if (createdProfile) {
                      console.log("✅ Profile created successfully");
                      set((state) => ({
                        ...state,
                        userProfile: createdProfile,
                      }));
                    } else {
                      console.log(
                        "⚠️ Failed to create profile, but continuing"
                      );
                    }
                  } catch (createError) {
                    console.error("❌ Error creating profile:", createError);
                    // Continue without profile
                  }
                }
              } catch (error) {
                console.log(
                  "⚠️ Error loading profile, but auth completed:",
                  error
                );
                // Continue without profile - don't block auth
              }

              return true; // Successfully authenticated
            } else {
              console.log("❌ NO USER FOUND in force refresh");
              set({
                loading: false,
                error: "Could not retrieve user data after OAuth",
                initialized: true,
              });
              return false;
            }
          } catch (error) {
            console.error("❌ Error in forceRefreshAuth:", error);
            set({
              loading: false,
              error:
                "Authentication error: " +
                (error instanceof Error ? error.message : "Unknown error"),
              initialized: true,
            });
            return false;
          }
        },
      };
    },
    {
      name: "auth-storage",
      storage: AsyncStorageAdapter,
      partialize: (state) => ({
        user: state.user,
        // Don't persist userProfile to avoid storage size issues
      }),
    }
  )
);
