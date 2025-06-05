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
    (set, get) => ({
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
            },
          });

          if (authError) throw authError;

          // In React Native/Expo, we don't need to check for URL
          // The Supabase SDK will handle the OAuth flow automatically
          
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
          await supabase.auth.signOut();
          set({ user: null });
          // Clear persisted state
          await AsyncStorage.removeItem('auth-storage');
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          set({ error: errorMessage });
        }
      },

      updateUser: (userData: Partial<AuthUser>) => {
        set((state) => {
          if (!state.user) return { user: null };
          return {
            user: { ...state.user, ...userData },
          };
        });
      },

      updateUserProfile: async (profileData) => {
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
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          set({ error: errorMessage });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: AsyncStorageAdapter,
    }
  )
);