import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';

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
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<AuthUser>) => void;
  updateUserProfile: (profileData: { full_name?: string; avatar_url?: string }) => Promise<void>;
}

// Custom storage adapter for AsyncStorage
const AsyncStorageAdapter = {
  getItem: async (name: string) => {
    try {
      const item = await AsyncStorage.getItem(name);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('AsyncStorage getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: any) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      // Initialize auth listener
      let authListener: { data: { subscription: any } } | null = null;

      // Set up auth state listener
      const initializeAuthListener = () => {
        authListener = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state change:', event, session?.user?.id);
          
          if (event === 'SIGNED_IN' && session?.user) {
            const userData: AuthUser = {
              id: session.user.id,
              email: session.user.email || '',
              user_metadata: session.user.user_metadata || {},
            };
            set({
              user: userData,
              loading: false,
              error: null
            });
          } else if (event === 'SIGNED_OUT') {
            set({
              user: null,
              loading: false,
              error: null
            });
          } else if (event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              const userData: AuthUser = {
                id: session.user.id,
                email: session.user.email || '',
                user_metadata: session.user.user_metadata || {},
              };
              set({
                user: userData,
                loading: false,
                error: null
              });
            } else {
              // Token refresh failed, sign out
              set({
                user: null,
                loading: false,
                error: 'Session expired'
              });
            }
          }
        });
      };

      // Initialize the listener
      initializeAuthListener();

      return {
        user: null,
        loading: false,
        error: null,

        signInWithGoogle: async () => {
          set({ loading: true, error: null });
          try {
            const redirectTo = process.env.EXPO_PUBLIC_APP_URL;
            if (!redirectTo) {
              throw new Error("EXPO_PUBLIC_APP_URL is not set in environment variables.");
            }

            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo,
                scopes: 'email profile',
              },
            });

            if (oauthError) throw oauthError;
            if (!data.url) throw new Error("No URL returned from signInWithOAuth");

            const browserResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

            if (browserResult.type === 'success') {
              const url = new URL(browserResult.url);
              const hash = url.hash.substring(1); // Remove #
              const params = new URLSearchParams(hash);

              const access_token = params.get('access_token');
              const refresh_token = params.get('refresh_token');

              if (access_token && refresh_token) {
                const { error: sessionError } = await supabase.auth.setSession({
                  access_token,
                  refresh_token,
                });

                if (sessionError) {
                  console.error('Error setting session:', sessionError);
                  set({ loading: false, error: `Failed to set session: ${sessionError.message}` });
                } else {
                  // Session set successfully, onAuthStateChange will handle the rest
                  set({ loading: false });
                }
              } else {
                set({ loading: false, error: 'Failed to get tokens from URL' });
              }
            } else if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
              set({ loading: false, error: null }); // Don't treat cancellation as an error
            } else {
              set({ loading: false, error: 'Authentication failed for an unknown reason.' });
            }
          } catch (error) {
            console.error('signInWithGoogle error:', error);
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'An unexpected error occurred during sign in'
            });
          }
        },

        signOut: async () => {
          set({ loading: true, error: null });
          try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // onAuthStateChange will handle setting user to null and loading to false
          } catch (error: unknown) {
            console.error('signOut error:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during sign out';
            set({ user: null, loading: false, error: errorMessage });
          }
        },

        updateUser: (userData: Partial<AuthUser>) => {
          set((state) => {
            if (!state.user) return state; // Return current state instead of { user: null }
            return {
              ...state,
              user: { ...state.user, ...userData },
            };
          });
        },

        updateUserProfile: async (profileData) => {
          try {
            const { user } = get();
            if (!user) {
              set({ error: 'No user logged in' });
              return;
            }

            const { data: userData, error: updateError } = await supabase
              .from('users')
              .update(profileData)
              .eq('id', user.id)
              .select()
              .single();

            if (updateError) throw updateError;

            // Update the user in the store with the new profile data
            set((state) => ({
              ...state,
              user: state.user ? {
                ...state.user,
                user_metadata: {
                  ...state.user.user_metadata,
                  ...profileData,
                },
              } : null,
              error: null,
            }));
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            set((state) => ({ ...state, error: errorMessage }));
          }
        },
      };
    },
    {
      name: 'auth-storage',
      storage: AsyncStorageAdapter,
    }
  )
);