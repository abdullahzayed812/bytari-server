import { createTRPCRouter, publicProcedure, protectedProcedure } from "../../trpc/create-context.js";
import { z } from "zod";
import { db } from "../../db";
import {
  unionMain,
  unionBranches,
  unionAnnouncements,
  unionFollowers,
  unionSettings,
  unionUsers,
  unionRoleEnum,
  unionAnnouncementTypeEnum,
  unionBranchRegionEnum,
  notifications,
  userRoles,
  unionBranchSupervisors,
  adminRoles,
  adminPermissions,
  rolePermissions,
  users,
} from "../../db/schema";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";

const assignSupervisorSchema = z.object({
  branchId: z.number(),
  email: z.string().email(),
});

export const unionRouter = createTRPCRouter({
  main: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
      const result = await db.select().from(unionMain).limit(1);
      if (result.length === 0) {
        // Create default main union if not exists
        const newMain = await db
          .insert(unionMain)
          .values({
            name: "نقابة الأطباء البيطريين العراقية",
            description: "النقابة الرسمية للأطباء البيطريين في العراق",
            establishedYear: "1958",
            memberCount: "0",
          })
          .returning();
        return { success: true, union: { ...newMain[0], isFollowing: false } };
      }

      let isFollowing = false;
      if (ctx.user) {
        const followStatus = await db
          .select()
          .from(unionFollowers)
          .where(and(eq(unionFollowers.mainUnionId, result[0].id), eq(unionFollowers.userId, ctx.user.id)));
        isFollowing = followStatus.length > 0;
      }

      return { success: true, union: { ...result[0], isFollowing } };
    }),
    update: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string(),
          logoUrl: z.string(),
          establishedYear: z.string(),
          memberCount: z.string(),
          phone1: z.string(),
          phone2: z.string(),
          email: z.string(),
          website: z.string(),
          address: z.string(),
          services: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              description: z.string(),
              color: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.select().from(unionMain).limit(1);
        if (result.length === 0) {
          await db.insert(unionMain).values(input);
        } else {
          await db.update(unionMain).set(input).where(eq(unionMain.id, result[0].id));
        }
        return { success: true };
      }),
  }),

  branch: createTRPCRouter({
    list: protectedProcedure.query(async ({ ctx }) => {
      const branches = await db.select().from(unionBranches);
      if (!ctx?.user?.id) {
        return branches.map((branch) => ({ ...branch, isFollowing: false }));
      }

      const followedBranches = await db
        .select({ branchId: unionFollowers.branchId })
        .from(unionFollowers)
        .where(eq(unionFollowers.userId, ctx.user.id));
      const followedBranchIds = new Set(followedBranches.map((f) => f.branchId));

      return branches.map((branch) => ({
        ...branch,
        isFollowing: followedBranchIds.has(branch.id),
      }));
    }),
    get: protectedProcedure.input(z.number()).query(async ({ ctx, input }) => {
      const result = await db.select().from(unionBranches).where(eq(unionBranches.id, input));
      if (result.length === 0) {
        return null;
      }
      const branch = result[0];

      let isFollowing = false;
      if (ctx.user) {
        const followStatus = await db
          .select()
          .from(unionFollowers)
          .where(and(eq(unionFollowers.branchId, branch.id), eq(unionFollowers.userId, ctx.user.id)));
        isFollowing = followStatus.length > 0;
      }

      return { ...branch, isFollowing };
    }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          governorate: z.string(),
          region: z.enum(unionBranchRegionEnum.enumValues),
          address: z.string(),
          phone: z.string(),
          email: z.string(),
          president: z.string(),
          membersCount: z.number(),
          rating: z.number(),
          description: z.string().optional(),
          establishedYear: z.number().optional(),
          services: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const newBranch = await db.insert(unionBranches).values(input).returning();
        return { success: true, branch: newBranch[0] };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string(),
          governorate: z.string(),
          region: z.enum(unionBranchRegionEnum.enumValues),
          address: z.string(),
          phone: z.string(),
          email: z.string(),
          president: z.string(),
          membersCount: z.number(),
          rating: z.number(),
          description: z.string().optional(),
          establishedYear: z.number().optional(),
          services: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.update(unionBranches).set(input).where(eq(unionBranches.id, input.id));
        return { success: true };
      }),
    delete: protectedProcedure.input(z.number()).mutation(async ({ ctx, input }) => {
      await db.delete(unionBranches).where(eq(unionBranches.id, input));
      return { success: true };
    }),
    assignSupervisor: protectedProcedure.input(assignSupervisorSchema).mutation(async ({ input, ctx }) => {
      try {
        const permissionsData = await db
          .select({
            permissionName: adminPermissions.name,
          })
          .from(rolePermissions)
          .innerJoin(adminPermissions, eq(rolePermissions.permissionId, adminPermissions.id))
          .innerJoin(userRoles, eq(rolePermissions.roleId, userRoles.roleId))
          .where(and(eq(userRoles.userId, ctx.user.id), eq(adminPermissions.isActive, true)));

        const hasManageUnions = permissionsData.some((p) => p.permissionName === "manage_unions");

        const currentUserRoles = await db.select().from(userRoles).where(eq(userRoles.userId, ctx.user.id));
        const superAdminRole = await db.query.adminRoles.findFirst({
          where: eq(adminRoles.name, "super_admin"),
        });
        const isSuperAdmin = superAdminRole && currentUserRoles.some((role) => role.roleId === superAdminRole.id);

        if (!isSuperAdmin && !hasManageUnions) {
          throw new Error("Unauthorized: You don't have permission to manage unions.");
        }

        const userToAssign = await db.select().from(users).where(eq(users.email, input.email));

        if (userToAssign.length === 0) {
          throw new Error("User not found");
        }
        const userId = userToAssign[0].id;

        await db.insert(unionBranchSupervisors).values({
          branchId: input.branchId,
          userId: userId,
        });

        const unionBranchSupervisorRole = await db.query.adminRoles.findFirst({
          where: eq(adminRoles.name, "union_branch_supervisor"),
        });

        if (unionBranchSupervisorRole) {
          await db.insert(userRoles).values({
            userId: userId,
            roleId: unionBranchSupervisorRole.id,
            assignedBy: ctx.user.id,
          });
        }

        // Send notification to the new supervisor
        const [branch] = await db
          .select({ name: unionBranches.name })
          .from(unionBranches)
          .where(eq(unionBranches.id, input.branchId));

        if (branch) {
          await db.insert(notifications).values({
            userId: userId,
            title: "تم تعيينك كمشرف",
            message: `لقد تم تعيينك كمشرف على فرع نقابة ${branch.name}.`,
            type: "union_supervisor_assignment",
            data: JSON.stringify({
              branchId: input.branchId,
            }),
          });
        }

        return {
          success: true,
        };
      } catch (error) {
        console.error("Error assigning supervisor:", error);
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error("Failed to assign supervisor");
      }
    }),
  }),

  follow: createTRPCRouter({
    toggle: protectedProcedure
      .input(
        z.object({
          branchId: z.number().optional(),
          mainUnionId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user.id;
        const { branchId, mainUnionId } = input;

        if (!branchId && !mainUnionId) {
          throw new Error("Either branchId or mainUnionId must be provided");
        }

        const existingFollow = await db
          .select()
          .from(unionFollowers)
          .where(
            and(
              eq(unionFollowers.userId, userId),
              branchId ? eq(unionFollowers.branchId, branchId) : eq(unionFollowers.mainUnionId, mainUnionId)
            )
          );

        if (existingFollow.length > 0) {
          await db.delete(unionFollowers).where(eq(unionFollowers.id, existingFollow[0].id));
          return { success: true, isFollowing: false };
        } else {
          await db.insert(unionFollowers).values({ userId, branchId, mainUnionId });
          return { success: true, isFollowing: true };
        }
      }),
  }),

  announcement: createTRPCRouter({
    list: publicProcedure
      .input(z.object({ branchId: z.number().optional(), mainUnionId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (input.branchId) {
          return await db.select().from(unionAnnouncements).where(eq(unionAnnouncements.branchId, input.branchId));
        }
        if (input.mainUnionId) {
          return await db
            .select()
            .from(unionAnnouncements)
            .where(eq(unionAnnouncements.mainUnionId, input.mainUnionId));
        }
        return await db.select().from(unionAnnouncements);
      }),
    get: publicProcedure.input(z.number()).query(async ({ ctx, input }) => {
      const result = await db.select().from(unionAnnouncements).where(eq(unionAnnouncements.id, input));
      return result[0];
    }),
    create: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          content: z.string(),
          branchId: z.number().optional(),
          mainUnionId: z.number().optional(),
          type: z.enum(unionAnnouncementTypeEnum.enumValues),
          isImportant: z.boolean(),
          image: z.string().optional(),
          link: z.string().optional(),
          linkText: z.string().optional(),
          author: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const newAnnouncement = await db.insert(unionAnnouncements).values(input).returning();

        // Get followers
        const followers = await db
          .select({ userId: unionFollowers.userId })
          .from(unionFollowers)
          .where(
            input.branchId
              ? eq(unionFollowers.branchId, input.branchId)
              : eq(unionFollowers.mainUnionId, input.mainUnionId)
          );

        if (followers.length > 0) {
          const followerIds = followers.map((f) => f.userId);
          const notificationData = followerIds.map((userId) => ({
            userId,
            title: `إعلان جديد: ${input.title}`,
            message: input.content.substring(0, 100),
            type: "announcement" as const,
            data: JSON.stringify({
              announcementId: newAnnouncement[0].id,
              branchId: input.branchId,
              mainUnionId: input.mainUnionId,
            }),
          }));

          await db.insert(notifications).values(notificationData);
        }

        return { success: true, announcement: newAnnouncement[0] };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string(),
          content: z.string(),
          type: z.enum(unionAnnouncementTypeEnum.enumValues),
          isImportant: z.boolean(),
          image: z.string().optional(),
          link: z.string().optional(),
          linkText: z.string().optional(),
          author: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.update(unionAnnouncements).set(input).where(eq(unionAnnouncements.id, input.id));
        return { success: true };
      }),
    delete: protectedProcedure.input(z.number()).mutation(async ({ ctx, input }) => {
      await db.delete(unionAnnouncements).where(eq(unionAnnouncements.id, input));
      return { success: true };
    }),
  }),

  settings: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
      const result = await db.select().from(unionSettings).limit(1);
      if (result.length === 0) {
        const newSettings = await db.insert(unionSettings).values({}).returning();
        return newSettings[0];
      }
      return result[0];
    }),
    update: protectedProcedure
      .input(
        z.object({
          unionName: z.string().optional(),
          unionDescription: z.string().optional(),
          contactEmail: z.string().optional(),
          contactPhone: z.string().optional(),
          isMaintenanceMode: z.boolean().optional(),
          allowRegistration: z.boolean().optional(),
          requireApproval: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.select().from(unionSettings).limit(1);
        if (result.length === 0) {
          await db.insert(unionSettings).values(input);
        } else {
          await db.update(unionSettings).set(input).where(eq(unionSettings.id, result[0].id));
        }
        return { success: true };
      }),
  }),

  notificationSettings: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
      const result = await db.select().from(unionSettings).limit(1);
      if (result.length === 0) {
        const newSettings = await db.insert(unionSettings).values({}).returning();
        return {
          emailNotifications: newSettings[0].emailNotifications ?? true,
          pushNotifications: newSettings[0].pushNotifications ?? true,
          smsNotifications: newSettings[0].smsNotifications ?? false,
          newMemberNotifications: newSettings[0].newMemberNotifications ?? true,
          eventNotifications: newSettings[0].eventNotifications ?? true,
          emergencyNotifications: newSettings[0].emergencyNotifications ?? true,
          weeklyReports: newSettings[0].weeklyReports ?? true,
          monthlyReports: newSettings[0].monthlyReports ?? true,
        };
      }
      return {
        emailNotifications: result[0].emailNotifications ?? true,
        pushNotifications: result[0].pushNotifications ?? true,
        smsNotifications: result[0].smsNotifications ?? false,
        newMemberNotifications: result[0].newMemberNotifications ?? true,
        eventNotifications: result[0].eventNotifications ?? true,
        emergencyNotifications: result[0].emergencyNotifications ?? true,
        weeklyReports: result[0].weeklyReports ?? true,
        monthlyReports: result[0].monthlyReports ?? true,
      };
    }),
    update: protectedProcedure
      .input(
        z.object({
          emailNotifications: z.boolean(),
          pushNotifications: z.boolean(),
          smsNotifications: z.boolean(),
          newMemberNotifications: z.boolean(),
          eventNotifications: z.boolean(),
          emergencyNotifications: z.boolean(),
          weeklyReports: z.boolean(),
          monthlyReports: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.select().from(unionSettings).limit(1);
        if (result.length === 0) {
          await db.insert(unionSettings).values(input);
        } else {
          await db.update(unionSettings).set(input).where(eq(unionSettings.id, result[0].id));
        }
        return { success: true };
      }),
  }),

  analytics: createTRPCRouter({
    getStats: protectedProcedure.query(async ({ ctx }) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        membersCount,
        newMembersCount,
        branchesCount,
        announcementsCount,
        activeMembersCount,
        topAnnouncements,
        regionDistribution,
      ] = await Promise.all([
        db.select({ count: count() }).from(unionUsers),
        db.select({ count: count() }).from(unionUsers).where(gte(unionUsers.createdAt, thirtyDaysAgo)),
        db.select({ count: count() }).from(unionBranches),
        db.select({ count: count() }).from(unionAnnouncements),
        db.select({ count: count() }).from(unionUsers).where(gte(unionUsers.lastSeen, thirtyDaysAgo)),
        db
          .select()
          .from(unionAnnouncements)
          .orderBy(desc(unionAnnouncements.isImportant), desc(unionAnnouncements.createdAt))
          .limit(5),
        db.select({ region: unionBranches.region, count: count() }).from(unionBranches).groupBy(unionBranches.region),
      ]);

      const totalMembers = membersCount[0]?.count || 0;
      const activityRate = totalMembers > 0 ? ((activeMembersCount[0]?.count || 0) / totalMembers) * 100 : 0;

      const monthlyData = await Promise.all(
        Array.from({ length: 6 }).map(async (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const month = d.toLocaleString("default", { month: "short" });
          const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
          const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);

          const [monthlyMembers, monthlyEvents] = await Promise.all([
            db
              .select({ count: count() })
              .from(unionUsers)
              .where(and(gte(unionUsers.createdAt, firstDay), lte(unionUsers.createdAt, lastDay))),
            db
              .select({ count: count() })
              .from(unionAnnouncements)
              .where(and(gte(unionAnnouncements.createdAt, firstDay), lte(unionAnnouncements.createdAt, lastDay))),
          ]);

          return {
            month,
            members: monthlyMembers[0]?.count || 0,
            events: monthlyEvents[0]?.count || 0,
          };
        })
      );

      return {
        totalMembers: {
          value: totalMembers.toString(),
          change: `+${newMembersCount[0]?.count || 0}`,
          changeType: "positive",
        },
        newMembers: {
          value: (newMembersCount[0]?.count || 0).toString(),
          change: "30d",
          changeType: "neutral",
        },
        events: {
          value: (announcementsCount[0]?.count || 0).toString(),
          change: "+0",
          changeType: "neutral",
        },
        activityRate: { value: `${activityRate.toFixed(1)}%`, change: "30d", changeType: "neutral" },
        chartData: monthlyData.reverse(),
        topEvents: topAnnouncements,
        regionDistribution: regionDistribution.map((item) => ({ ...item, label: item.region })),
      };
    }),
  }),

  users: createTRPCRouter({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.select().from(unionUsers);
    }),
    create: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          role: z.enum(unionRoleEnum.enumValues),
          branchId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const newUser = await db.insert(unionUsers).values(input).returning();
        return { success: true, user: newUser[0] };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          role: z.enum(unionRoleEnum.enumValues),
          branchId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.update(unionUsers).set(input).where(eq(unionUsers.id, input.id));
        return { success: true };
      }),
    delete: protectedProcedure.input(z.number()).mutation(async ({ ctx, input }) => {
      await db.delete(unionUsers).where(eq(unionUsers.id, input));
      return { success: true };
    }),
    getUserByEmail: protectedProcedure.input(z.string().email()).query(async ({ ctx, input }) => {
      const user = await db.select().from(users).where(eq(users.email, input));
      if (user.length === 0) {
        throw new Error("User not found");
      }
      return user[0];
    }),
  }),
});
