import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);


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
    const item = await AsyncStorage.getItem(name);
    return item ? JSON.parse(item) : null;
  },
  setItem: async (name: string, value: any) => {
    await AsyncStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = {
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
        }
      });

      return {
        user: null,
        loading: false,
        error: null,

        signInWithGoogle: async () => {
          try {
            set({ loading: true });
            
            // Initiate Google OAuth flow
            const { data: { url }, error: authError } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                scopes: 'email profile',
                queryParams: {
                  access_type: 'offline',
                },
                // It's important to specify a redirectTo URL for Supabase to handle the callback correctly in Expo
                redirectTo: process.env.EXPO_PUBLIC_APP_URL || '',
              },
            });

            if (authError) throw authError;

            // Wait for the session to be updated
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;

            if (session?.user) {
              const userData = {
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
              set({
                loading: false,
                error: 'Failed to complete authentication'
              });
            }
          } catch (error) {
            set({
              loading: false,
              error: error instanceof Error ? error.message : 'An error occurred during sign in'
            });
          }
        },
        signOut: async () => {
          try {
            set({ loading: true });
            await supabase.auth.signOut();
            set({ 
              user: null, 
              loading: false, 
              error: null 
            });
            // Clear persisted state
            await AsyncStorage.removeItem('auth-storage');
          } catch (error: unknown) {
            set({ 
              loading: false,
              error: error instanceof Error ? error.message : 'Failed to sign out' 
            });
          }
        },

        updateUser: (userData: Partial<AuthUser>) => {
          set((state) => {
            if (!state.user) return { user: null, loading: false, error: null };
            return {
              user: { ...state.user, ...userData },
              loading: false,
              error: null
            };
          });
        },

        updateUserProfile: async (profileData: { full_name?: string; avatar_url?: string }) => {
          try {
            const { user } = get();
            if (!user) return;

            const { data: userData, error: updateError } = await supabase
              .from('users')
              .update(profileData)
              .eq('id', user.id)
              .select()
              .single();

            if (updateError) throw updateError;

            set({
              user: {
                ...user,
                user_metadata: {
                  ...user.user_metadata,
                  ...profileData,
                },
              },
              loading: false,
              error: null
            });
          } catch (error: unknown) {
            set({ 
              loading: false,
              error: error instanceof Error ? error.message : 'Failed to update profile' 
            });
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