import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, users, userRoles, adminRoles, rolePermissions, adminPermissions } from "../../../../db";
import { eq, and, like, or, inArray } from "drizzle-orm";

export const getSupervisorsProcedure = publicProcedure
  .input(
    z.object({
      limit: z.number().default(20),
      offset: z.number().default(0),
      query: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const supervisorRoles = await db
        .select()
        .from(adminRoles)
        .where(
          or(
            eq(adminRoles.name, "vet_moderator"),
            eq(adminRoles.name, "user_moderator"),
            eq(adminRoles.name, "content_manager"),
            eq(adminRoles.name, "super_admin") // Include super_admin as they also supervise
          )
        );

      if (supervisorRoles.length === 0) {
        return {
          supervisors: [],
          count: 0,
        };
      }

      const supervisorRoleIds = supervisorRoles.map((role) => role.id);

      const supervisorUsers = await db
        .selectDistinct({ user: users })
        .from(users)
        .innerJoin(userRoles, eq(users.id, userRoles.userId))
        .where(
          and(
            inArray(userRoles.roleId, supervisorRoleIds),
            eq(userRoles.isActive, true),
            input.query
              ? or(
                  like(users.name, `%${input.query}%`),
                  like(users.email, `%${input.query}%`),
                  like(users.phone, `%${input.query}%`)
                )
              : undefined
          )
        )
        .limit(input.limit)
        .offset(input.offset);

      const supervisors = await Promise.all(
        supervisorUsers.map(async (supervisor) => {
          const userActiveRoles = await db
            .select({
              roleId: userRoles.roleId,
              roleName: adminRoles.name,
              roleDisplayName: adminRoles.displayName,
            })
            .from(userRoles)
            .innerJoin(adminRoles, eq(userRoles.roleId, adminRoles.id))
            .where(
              and(eq(userRoles.userId, supervisor.user.id), eq(userRoles.isActive, true), eq(adminRoles.isActive, true))
            );

          const roleIds = userActiveRoles.map((role) => role.roleId);

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
            .where(eq(adminPermissions.isActive, true));

          const filteredPermissions = userPermissions.filter((permission) => {
            return roleIds.includes(permission.roleId);
          });

          const uniquePermissions = filteredPermissions.reduce((acc: any[], current: any) => {
            const exists = acc.find((p) => p.permissionName === current.permissionName);
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

          return {
            ...supervisor.user,
            roles: userActiveRoles,
            permissions: uniquePermissions,
          };
        })
      );

      return {
        supervisors,
        count: supervisors.length,
      };
    } catch (error) {
      console.error("Error getting supervisors:", error);
      throw new Error("Failed to get supervisors");
    }
  });
