import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";
import type { Tables } from "../types/supabase";

interface AdminState {
  isAdmin: boolean;
  isDataAnalyst: boolean;
  loading: boolean;
  userProfile: Tables<"users"> | null;
}

export const useAdmin = () => {
  const { user } = useAuth();
  const [adminState, setAdminState] = useState<AdminState>({
    isAdmin: false,
    isDataAnalyst: false,
    loading: true,
    userProfile: null,
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setAdminState({
          isAdmin: false,
          isDataAnalyst: false,
          loading: false,
          userProfile: null,
        });
        return;
      }

      try {
        // Get user profile
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single();

        if (!profile) {
          setAdminState({
            isAdmin: false,
            isDataAnalyst: false,
            loading: false,
            userProfile: null,
          });
          return;
        }

        // Check if user has admin role
        const { data: roleAssignments } = await supabase
          .from("user_role_assignments")
          .select("role_id")
          .eq("user_id", profile.id);

        if (!roleAssignments) {
          setAdminState({
            isAdmin: false,
            isDataAnalyst: false,
            loading: false,
            userProfile: profile,
          });
          return;
        }

        // Get role details
        const roleIds = roleAssignments.map((assignment) => assignment.role_id);
        const { data: roles } = await supabase
          .from("user_roles")
          .select("*")
          .in("role_id", roleIds);

        const isAdmin =
          roles?.some(
            (role) =>
              role.role_name.toLowerCase() === "admin" ||
              role.role_name.toLowerCase() === "administrator"
          ) || false;

        const isDataAnalyst =
          roles?.some(
            (role) =>
              role.role_name.toLowerCase() === "data analyst" ||
              role.role_name.toLowerCase() === "data_analyst" ||
              role.role_name.toLowerCase() === "dataanalyst"
          ) || false;

        setAdminState({
          isAdmin,
          isDataAnalyst,
          loading: false,
          userProfile: profile,
        });
      } catch (error) {
        console.error("Error checking admin status:", error);
        setAdminState({
          isAdmin: false,
          isDataAnalyst: false,
          loading: false,
          userProfile: null,
        });
      }
    };

    checkAdminStatus();
  }, [user]);

  // Get all users
  const getAllUsers = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    return { data, error };
  };

  // Get all roles
  const getAllRoles = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .order("role_name", { ascending: true });

    return { data, error };
  };

  // Get user role assignments
  const getUserRoleAssignments = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_role_assignments")
      .select("role_id")
      .eq("user_id", userId);

    return { data, error };
  };

  // Assign role to user
  const assignRole = async (userId: string, roleId: string) => {
    const { data, error } = await supabase
      .from("user_role_assignments")
      .insert({ user_id: userId, role_id: roleId });

    return { data, error };
  };

  // Remove role from user
  const removeRole = async (userId: string, roleId: string) => {
    const { error } = await supabase
      .from("user_role_assignments")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", roleId);

    return { error };
  };

  // Create new role
  const createRole = async (roleName: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .insert({ role_name: roleName })
      .select()
      .single();

    return { data, error };
  };

  // Delete role
  const deleteRole = async (roleId: string) => {
    // First remove all assignments for this role
    await supabase.from("user_role_assignments").delete().eq("role_id", roleId);

    // Then delete the role
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("role_id", roleId);

    return { error };
  };

  // Delete user and all related data
  const deleteUser = async (userId: string) => {
    try {
      // Delete user's health metrics
      await supabase.from("health_metrics").delete().eq("user_id", userId);

      // Delete user's notifications
      await supabase.from("notifications").delete().eq("user_id", userId);

      // Delete user's reports
      await supabase.from("reports").delete().eq("user_id", userId);

      // Delete user's subscriptions
      await supabase.from("subscriptions").delete().eq("user_id", userId);

      // Delete user's role assignments
      await supabase
        .from("user_role_assignments")
        .delete()
        .eq("user_id", userId);

      // Finally delete the user
      const { error } = await supabase.from("users").delete().eq("id", userId);

      return { error };
    } catch (error) {
      return { error };
    }
  };

  // Delete user's health metrics
  const deleteUserHealthMetrics = async (userId: string) => {
    const { error } = await supabase
      .from("health_metrics")
      .delete()
      .eq("user_id", userId);

    return { error };
  };

  return {
    isAdmin: adminState.isAdmin,
    isDataAnalyst: adminState.isDataAnalyst,
    loading: adminState.loading,
    userProfile: adminState.userProfile,
    getAllUsers,
    getAllRoles,
    getUserRoleAssignments,
    assignRole,
    removeRole,
    createRole,
    deleteRole,
    deleteUser,
    deleteUserHealthMetrics,
  };
};
