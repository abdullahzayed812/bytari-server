import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, userRoles, adminRoles, rolePermissions, adminPermissions } from '../../../../db';
import { eq, and } from 'drizzle-orm';

// Get user permissions
export const getUserPermissionsProcedure = publicProcedure
  .input(z.object({
    userId: z.number(),
  }))
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
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.isActive, true),
            eq(adminRoles.isActive, true)
          )
        );

      if (userActiveRoles.length === 0) {
        console.log(`No active roles found for user ${input.userId}`);
        const noPermissionCheck = (permission: string): boolean => false;
        return {
          roles: [],
          permissions: [],
          hasPermission: noPermissionCheck,
          debug: {
            roleIds: [],
            totalPermissions: 0,
            filteredPermissions: 0,
            permissionNames: []
          }
        };
      }

      // Get permissions for user's roles
      const roleIds: number[] = userActiveRoles.map((role: any) => role.roleId);
      
      // Get permissions for user's roles with proper filtering
      const userPermissions = await db
        .select({
          permissionName: adminPermissions.name,
          permissionDisplayName: adminPermissions.displayName,
          permissionDescription: adminPermissions.description,
          permissionCategory: adminPermissions.category,
          roleId: rolePermissions.roleId,
        })
        .from(rolePermissions)
        .innerJoin(adminPermissions, eq(rolePermissions.permissionId, adminPermissions.id))
        .where(
          and(
            eq(adminPermissions.isActive, true)
          )
        );
      
      // Filter permissions based on user's actual roles
      const filteredPermissions = userPermissions.filter((permission: any) => {
        return roleIds.includes(permission.roleId);
      });
      
      // Remove duplicates (same permission from multiple roles)
      const uniquePermissions = filteredPermissions.reduce((acc: any[], current: any) => {
        const exists = acc.find(p => p.permissionName === current.permissionName);
        if (!exists) {
          acc.push({
            permissionName: current.permissionName,
            permissionDisplayName: current.permissionDisplayName,
            permissionDescription: current.permissionDescription,
            permissionCategory: current.permissionCategory,
          });
        }
        return acc;
      }, []);

      // Create a helper function to check permissions
      const permissionNames = uniquePermissions.map((p: any) => p.permissionName);
      const hasPermission = (permission: string): boolean => {
        console.log(`Checking permission: ${permission}, Available: ${permissionNames.join(', ')}`);
        return permissionNames.includes(permission);
      };

      return {
        roles: userActiveRoles,
        permissions: uniquePermissions,
        hasPermission,
        debug: {
          roleIds,
          totalPermissions: userPermissions.length,
          filteredPermissions: uniquePermissions.length,
          permissionNames
        }
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      // Return empty permissions instead of throwing
      const noPermissionCheck = (permission: string): boolean => false;
      return {
        roles: [],
        permissions: [],
        hasPermission: noPermissionCheck,
        debug: {
          roleIds: [],
          totalPermissions: 0,
          filteredPermissions: 0,
          permissionNames: []
        },
        error: 'Database connection issue'
      };
    }
  });

// Get all available roles
export const getAllRolesProcedure = publicProcedure
  .query(async () => {
    try {
      const roles = await db
        .select()
        .from(adminRoles)
        .where(eq(adminRoles.isActive, true));

      console.log('Found roles:', roles.length);
      return roles;
    } catch (error) {
      console.error('Error getting roles:', error);
      // Return empty array instead of throwing error
      return [];
    }
  });

// Get all available permissions
export const getAllPermissionsProcedure = publicProcedure
  .query(async () => {
    try {
      const permissions = await db
        .select()
        .from(adminPermissions)
        .where(eq(adminPermissions.isActive, true))
        .orderBy(adminPermissions.category, adminPermissions.displayName);

      // Group permissions by category
      const groupedPermissions = permissions.reduce((acc: any, permission: any) => {
        const category = permission.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(permission);
        return acc;
      }, {} as Record<string, any[]>);

      return {
        permissions,
        groupedPermissions,
      };
    } catch (error) {
      console.error('Error getting permissions:', error);
      throw new Error('Failed to get permissions');
    }
  });

// Assign role to user (Super Admin only)
export const assignRoleProcedure = publicProcedure
  .input(z.object({
    userId: z.number(),
    roleId: z.number(),
    assignedBy: z.number(),
    expiresAt: z.date().optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      // For now, skip permission check - in production, implement proper permission checking
      // TODO: Implement proper permission checking

      // Check if user already has this role
      const existingRole = await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId),
            eq(userRoles.isActive, true)
          )
        )
        .limit(1);

      if (existingRole.length > 0) {
        throw new Error('User already has this role');
      }

      // Assign the role
      const [newUserRole] = await db
        .insert(userRoles)
        .values({
          userId: input.userId,
          roleId: input.roleId,
          assignedBy: input.assignedBy,
          expiresAt: input.expiresAt,
        })
        .returning();

      return newUserRole;
    } catch (error) {
      console.error('Error assigning role:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to assign role');
    }
  });

// Remove role from user (Super Admin only)
export const removeRoleProcedure = publicProcedure
  .input(z.object({
    userId: z.number(),
    roleId: z.number(),
    removedBy: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      // For now, skip permission check - in production, implement proper permission checking
      // TODO: Implement proper permission checking

      // Deactivate the role assignment
      await db
        .update(userRoles)
        .set({ isActive: false })
        .where(
          and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId),
            eq(userRoles.isActive, true)
          )
        );

      return { success: true };
    } catch (error) {
      console.error('Error removing role:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to remove role');
    }
  });