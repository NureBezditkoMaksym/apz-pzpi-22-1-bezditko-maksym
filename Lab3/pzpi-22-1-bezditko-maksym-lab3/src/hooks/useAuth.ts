import { useState, useEffect } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

interface SignUpData {
  email: string;
  password: string;
  username: string;
}

interface SignInData {
  email: string;
  password: string;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    data: SignUpData
  ): Promise<{ user: User | null; error: AuthError | null }> => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            username: data.username,
          },
        },
      });

      if (error) {
        return { user: null, error };
      }

      // Create user profile in our users table
      if (authData.user) {
        const { error: profileError } = await supabase.from("users").insert({
          auth_id: authData.user.id,
          email: data.email,
          username: data.username,
          is_premium: false,
        });

        if (profileError) {
          console.error("Error creating user profile:", profileError);
        }
      }

      return { user: authData.user, error: null };
    } catch (err) {
      return {
        user: null,
        error: { message: "An unexpected error occurred" } as AuthError,
      };
    }
  };

  const signIn = async (
    data: SignInData
  ): Promise<{ user: User | null; error: AuthError | null }> => {
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      return { user: authData.user, error };
    } catch (err) {
      return {
        user: null,
        error: { message: "An unexpected error occurred" } as AuthError,
      };
    }
  };

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (err) {
      return {
        error: { message: "An unexpected error occurred" } as AuthError,
      };
    }
  };

  const resetPassword = async (
    email: string
  ): Promise<{ error: AuthError | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (err) {
      return {
        error: { message: "An unexpected error occurred" } as AuthError,
      };
    }
  };

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
};
