import { supabase } from "../lib/supabaseClient";
import { Tables, TablesInsert, TablesUpdate } from "../types";

export type UserProfile = Tables<"users">;
type UserProfileInsert = TablesInsert<"users">;
type UserProfileUpdate = TablesUpdate<"users">;

export const authQueries = {
  // Get user profile data with better error handling
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log("Fetching user profile for:", userId);

      // Ensure we have a valid session before making the query
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error:", sessionError);
        return null;
      }

      if (!session) {
        console.error("No active session found");
        return null;
      }

      if (session.user.id !== userId) {
        console.error("User ID mismatch:", {
          sessionUserId: session.user.id,
          requestedUserId: userId,
        });
        return null;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows

      if (error) {
        console.error("Error fetching user profile:", error, {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        return null;
      }

      console.log("User profile fetch result:", data ? "found" : "not found");
      return data;
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      return null;
    }
  },

  // Create user profile with improved error handling
  createUserProfile: async (
    userId: string,
    email: string,
    userData?: Partial<UserProfile>
  ): Promise<UserProfile | null> => {
    try {
      console.log("Creating user profile for:", userId, email);

      // Ensure we have a valid session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error during profile creation:", sessionError);
        return null;
      }

      if (!session) {
        console.error("No active session found during profile creation");
        return null;
      }

      if (session.user.id !== userId) {
        console.error("User ID mismatch during profile creation:", {
          sessionUserId: session.user.id,
          requestedUserId: userId,
        });
        return null;
      }

      const insertData: UserProfileInsert = {
        id: userId, // Use the authenticated user's ID
        email: email,
        full_name:
          userData?.full_name ||
          session.user.user_metadata?.full_name ||
          "User",
        subscription_tier: "free",
        document_count: 0,
        storage_used_mb: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Attempting to insert user profile:", { userId, email });

      const { data, error } = await supabase
        .from("users")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Error creating user profile:", error, {
          code: error.code,
          message: error.message,
          details: error.details,
        });

        // Handle duplicate key errors
        if (error.code === "23505") {
          if (error.message.includes("users_email_key")) {
            // Email conflict - there's already a user with this email but different ID
            console.error("Email conflict detected:", { email, userId });

            // Try to find the conflicting user record
            const { data: conflictingUser, error: findError } = await supabase
              .from("users")
              .select("*")
              .eq("email", email)
              .maybeSingle();

            if (findError) {
              console.error("Error finding conflicting user:", findError);
              throw new Error(
                `Email ${email} is already registered with a different account. Please contact support or try a different email.`
              );
            }

            if (conflictingUser) {
              console.error("Found conflicting user:", {
                conflictingId: conflictingUser.id,
                currentId: userId,
                email: email,
              });

              // Check if this is the same user (shouldn't happen, but just in case)
              if (conflictingUser.id === userId) {
                console.log("Same user found, returning existing profile");
                return conflictingUser;
              }

              throw new Error(
                `This email (${email}) is already registered with another account. Please use a different email or contact support to merge accounts.`
              );
            }

            throw new Error(
              `Email conflict detected but couldn't find the conflicting record. Please contact support.`
            );
          } else if (
            error.message.includes("users_pkey") ||
            error.message.includes("users_id_key")
          ) {
            // User ID conflict - user already exists with this ID
            console.log("User ID already exists, attempting to fetch:", userId);

            // Wait a bit before retrying to allow for any ongoing transactions
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const existingProfile = await authQueries.getUserProfile(userId);
            if (existingProfile) {
              console.log("Successfully retrieved existing profile:", userId);
              return existingProfile;
            } else {
              console.error(
                "User ID exists but profile still not accessible:",
                userId
              );
              throw new Error(
                "Profile exists but is not accessible - possible RLS policy issue"
              );
            }
          }
        }

        throw new Error(`Failed to create user profile: ${error.message}`);
      }

      console.log("User profile created successfully:", userId);
      return data;
    } catch (error) {
      console.error("Error in createUserProfile:", error);
      return null;
    }
  },

  // Update user profile
  updateUserProfile: async (
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile | null> => {
    try {
      // Ensure we have a valid session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session || session.user.id !== userId) {
        console.error("Invalid session for profile update");
        return null;
      }

      const { data, error } = await supabase
        .from("users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        console.error("Error updating user profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in updateUserProfile:", error);
      return null;
    }
  },

  // Get or create user profile with enhanced error handling
  getOrCreateUserProfile: async (
    userId: string,
    email: string,
    userData?: Partial<UserProfile>
  ): Promise<UserProfile | null> => {
    try {
      console.log("Getting or creating user profile for:", userId, email);

      // Verify session first
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Session error in getOrCreateUserProfile:", sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }

      if (!session) {
        console.error("No active session in getOrCreateUserProfile");
        throw new Error("No active session found");
      }

      if (session.user.id !== userId) {
        console.error("User ID mismatch in getOrCreateUserProfile:", {
          sessionUserId: session.user.id,
          requestedUserId: userId,
        });
        throw new Error("User ID does not match authenticated session");
      }

      // First try to get existing profile
      let profile = await authQueries.getUserProfile(userId);

      // If no profile exists, create one
      if (!profile) {
        console.log(
          "No existing profile found, creating new profile for:",
          userId
        );

        // Try to create profile
        profile = await authQueries.createUserProfile(userId, email, userData);

        // If creation still failed, this is a critical error
        if (!profile) {
          const errorMsg = `Failed to create user profile after multiple attempts for user: ${userId}`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        console.log("Found existing profile for:", userId);
      }

      return profile;
    } catch (error) {
      console.error("Error in getOrCreateUserProfile:", error);
      return null;
    }
  },
};
