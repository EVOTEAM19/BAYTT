"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Plan } from "@/types/database";

// ============================================
// Types
// ============================================

export interface ProfileWithPlan extends Profile {
  plans: Plan | null;
}

// ============================================
// Hook
// ============================================

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileWithPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Fetch profile con plan incluido
  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          *,
          plans (*)
        `
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
        return null;
      }

      if (data) {
        const profileWithPlan: ProfileWithPlan = {
          ...data,
          plans: Array.isArray(data.plans) ? data.plans[0] : data.plans || null,
        };
        setProfile(profileWithPlan);
        return profileWithPlan;
      }

      setProfile(null);
      return null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
      return null;
    }
  }

  // Escuchar cambios de auth
  useEffect(() => {
    // Obtener usuario inicial
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id).finally(() => setIsLoading(false));
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Funciones de autenticación

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("Error signing in:", error);
      return { data: null, error };
    }
  }

  async function signUp(email: string, password: string, fullName: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setUser(data.user);
        // El perfil se creará automáticamente con un trigger en Supabase
        // Esperamos un momento antes de intentar obtenerlo
        setTimeout(async () => {
          if (data.user) {
            await fetchProfile(data.user.id);
          }
        }, 1000);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("Error signing up:", error);
      return { data: null, error };
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setUser(null);
      setProfile(null);

      return { error: null };
    } catch (error: any) {
      console.error("Error signing out:", error);
      return { error };
    }
  }

  async function resetPassword(email: string) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("Error resetting password:", error);
      return { data: null, error };
    }
  }

  async function updatePassword(newPassword: string) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error: any) {
      console.error("Error updating password:", error);
      return { data: null, error };
    }
  }

  // Computed values
  const isAuthenticated = !!user;
  const isAdmin =
    profile?.role === "admin" || profile?.role === "superadmin";
  const isSuperAdmin = profile?.role === "superadmin";

  return {
    user,
    profile,
    isLoading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile: () => (user ? fetchProfile(user.id) : Promise.resolve(null)),
  };
}
