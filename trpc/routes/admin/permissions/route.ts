import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, userRoles, adminRoles, rolePermissions, adminPermissions, users } from "../../../../db";
import { eq, and, sql, inArray } from "drizzle-orm";

// ============= GET USER PERMISSIONS =============
export const getUserPermissionsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      // Get user's active roles
      const userActiveRoles = await db
        .select({
          roleId: userRoles.roleId,
          roleName: adminRoles.name,
          roleDisplayName: adminRoles.displayName,
        })
        .from(userRoles)
        .innerJoin(adminRoles, eq(userRoles.roleId, adminRoles.id))
        .where(and(eq(userRoles.userId, input.userId), eq(userRoles.isActive, true), eq(adminRoles.isActive, true)));

      if (userActiveRoles.length === 0) {
        return {
          roles: [],
          permissions: [],
          hasPermission: (permission: string) => false,
        };
      }

      // Get permissions for user's roles
      const roleIds = userActiveRoles.map((role) => role.roleId);

      const userPermissions = await db
        .select({
          permissionName: adminPermissions.name,
          permissionDisplayName: adminPermissions.displayName,
          permissionDescription: adminPermissions.description,
          permissionCategory: adminPermissions.category,
        })
        .from(rolePermissions)
        .innerJoin(adminPermissions, eq(rolePermissions.permissionId, adminPermissions.id))
        .where(
          and(
            inArray(rolePermissions.roleId, roleIds),
            eq(rolePermissions.isActive, true),
            eq(adminPermissions.isActive, true)
          )
        );

      // Remove duplicates
      const uniquePermissions = Array.from(new Map(userPermissions.map((p) => [p.permissionName, p])).values());

      const permissionNames = uniquePermissions.map((p) => p.permissionName);

      return {
        roles: userActiveRoles,
        permissions: uniquePermissions,
        hasPermission: (permission: string) => permissionNames.includes(permission),
      };
    } catch (error) {
      console.error("Error getting user permissions:", error);
      return {
        roles: [],
        permissions: [],
        hasPermission: (permission: string) => false,
        error: "Database connection issue",
      };
    }
  });

// ============= GET ALL SUPERVISORS WITH PERMISSIONS =============
export const getSupervisorsProcedure = publicProcedure
  .input(
    z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    try {
      // Get all users with admin roles
      const supervisorsData = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          userType: users.userType,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          roleId: userRoles.roleId,
          roleName: adminRoles.name,
          roleDisplayName: adminRoles.displayName,
        })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .innerJoin(adminRoles, eq(userRoles.roleId, adminRoles.id))
        .where(and(eq(userRoles.isActive, true), eq(adminRoles.isActive, true)))
        .limit(input.limit)
        .offset(input.offset);

      if (supervisorsData.length === 0) {
        return { supervisors: [], total: 0 };
      }

      // Get unique supervisor IDs
      const supervisorIds = [...new Set(supervisorsData.map((s) => s.id))];

      // Get all permissions for these supervisors
      const permissionsData = await db
        .select({
          userId: userRoles.userId,
          permissionName: adminPermissions.name,
          permissionDisplayName: adminPermissions.displayName,
          permissionCategory: adminPermissions.category,
        })
        .from(userRoles)
        .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
        .innerJoin(adminPermissions, eq(rolePermissions.permissionId, adminPermissions.id))
        .where(
          and(
            inArray(userRoles.userId, supervisorIds),
            eq(userRoles.isActive, true),
            eq(rolePermissions.isActive, true),
            eq(adminPermissions.isActive, true)
          )
        );

      // Group permissions by user
      const permissionsByUser = permissionsData.reduce((acc, perm) => {
        if (!acc[perm.userId]) {
          acc[perm.userId] = [];
        }
        acc[perm.userId].push({
          permissionName: perm.permissionName,
          permissionDisplayName: perm.permissionDisplayName,
          permissionCategory: perm.permissionCategory,
        });
        return acc;
      }, {} as Record<number, any[]>);

      // Combine supervisors with their permissions
      const supervisors = supervisorIds.map((id) => {
        const supervisor = supervisorsData.find((s) => s.id === id)!;
        const userPermissions = permissionsByUser[id] || [];

        // Remove duplicates
        const uniquePermissions = Array.from(new Map(userPermissions.map((p) => [p.permissionName, p])).values());

        return {
          id: supervisor.id,
          name: supervisor.name,
          email: supervisor.email,
          phone: supervisor.phone,
          userType: supervisor.userType,
          isActive: supervisor.isActive,
          createdAt: supervisor.createdAt,
          updatedAt: supervisor.updatedAt,
          permissions: uniquePermissions,
        };
      });

      return {
        supervisors,
        total: supervisors.length,
      };
    } catch (error) {
      console.error("Error getting supervisors:", error);
      return { supervisors: [], total: 0 };
    }
  });

// ============= ASSIGN PERMISSIONS TO USER =============
export const assignPermissionsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      permissionIds: z.array(z.number()),
      assignedBy: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // First, check if user already has roles - if not, create a default "Moderator" role
      const existingRoles = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, input.userId), eq(userRoles.isActive, true)));

      let userRoleId: number;

      if (existingRoles.length === 0) {
        // Create or get "Moderator" role
        let moderatorRole = await db.select().from(adminRoles).where(eq(adminRoles.name, "moderator")).limit(1);

        if (moderatorRole.length === 0) {
          // Create moderator role if it doesn't exist
          const [newRole] = await db
            .insert(adminRoles)
            .values({
              name: "moderator",
              displayName: "مشرف",
              description: "مشرف بصلاحيات مخصصة",
              isActive: true,
            })
            .returning();

          userRoleId = newRole.id;
        } else {
          userRoleId = moderatorRole[0].id;
        }

        // Assign the role to the user
        await db.insert(userRoles).values({
          userId: input.userId,
          roleId: userRoleId,
          assignedBy: input.assignedBy,
          isActive: true,
        });
      } else {
        userRoleId = existingRoles[0].roleId;
      }

      // Remove existing permissions for this role
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, userRoleId));

      // Add new permissions
      if (input.permissionIds.length > 0) {
        await db.insert(rolePermissions).values(
          input.permissionIds.map((permissionId) => ({
            roleId: userRoleId,
            permissionId,
            isActive: true,
          }))
        );
      }

      // Update user type to admin if not already
      await db.update(users).set({ userType: "admin" }).where(eq(users.id, input.userId));

      return { success: true, roleId: userRoleId };
    } catch (error) {
      console.error("Error assigning permissions:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to assign permissions");
    }
  });

// ============= UPDATE USER PERMISSIONS =============
export const updatePermissionsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      permissionIds: z.array(z.number()),
      updatedBy: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Get user's role
      const userRole = await db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, input.userId), eq(userRoles.isActive, true)))
        .limit(1);

      if (userRole.length === 0) {
        throw new Error("User has no assigned role");
      }

      const roleId = userRole[0].roleId;

      // Remove existing permissions
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

      // Add new permissions
      if (input.permissionIds.length > 0) {
        await db.insert(rolePermissions).values(
          input.permissionIds.map((permissionId) => ({
            roleId,
            permissionId,
            isActive: true,
          }))
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error updating permissions:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to update permissions");
    }
  });

// ============= REMOVE ALL PERMISSIONS FROM USER =============
export const removePermissionsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      removedBy: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Deactivate user's roles
      await db.update(userRoles).set({ isActive: false }).where(eq(userRoles.userId, input.userId));

      // Change user type back to user
      await db.update(users).set({ userType: "user" }).where(eq(users.id, input.userId));

      return { success: true };
    } catch (error) {
      console.error("Error removing permissions:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to remove permissions");
    }
  });

// ============= GET ALL PERMISSIONS GROUPED =============
export const getAllPermissionsGroupedProcedure = publicProcedure.query(async () => {
  try {
    const permissions = await db
      .select()
      .from(adminPermissions)
      .where(eq(adminPermissions.isActive, true))
      .orderBy(adminPermissions.category, adminPermissions.displayName);

    // Group by category
    const grouped = permissions.reduce((acc, permission) => {
      const category = permission.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {} as Record<string, typeof permissions>);

    return {
      permissions,
      grouped,
    };
  } catch (error) {
    console.error("Error getting permissions:", error);
    return { permissions: [], grouped: {} };
  }
});

// ============= SEND MESSAGE TO USER =============
export const sendMessageToUserProcedure = publicProcedure
  .input(
    z.object({
      recipientId: z.number(),
      senderId: z.number(),
      title: z.string(),
      content: z.string(),
      type: z.enum(["info", "warning", "announcement"]).default("info"),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const { systemMessages } = await import("../../../../db");

      const [message] = await db
        .insert(systemMessages)
        .values({
          recipientId: input.recipientId,
          senderId: input.senderId,
          title: input.title,
          content: input.content,
          type: input.type,
          priority: input.priority,
          isRead: false,
        })
        .returning();

      return { success: true, message };
    } catch (error) {
      console.error("Error sending message:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to send message");
    }
  });
