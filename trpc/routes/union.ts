import { createTRPCRouter, publicProcedure, protectedProcedure } from "../../trpc/create-context.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import {
  unionMain,
  unionBranches,
  unionAnnouncements,
  unionFollowers,
  unionSettings,
  unionUsers,
  unionRegistrations,
  unionRoleEnum,
  unionAnnouncementTypeEnum,
  unionBranchRegionEnum,
  notifications,
  systemMessages,
  systemMessageRecipients,
  userRoles,
  unionBranchSupervisors,
  adminRoles,
  adminPermissions,
  rolePermissions,
  users,
} from "../../db/schema";
import { eq, and, gte, lte, desc, count, isNull, lt } from "drizzle-orm";

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
            logoUrl: "https://example.com/logos/iraqi-vet-union.png",
            establishedYear: "1958",
            memberCount: "15000",
            phone1: "+964 1 555 1234",
            phone2: "+964 770 123 4567",
            email: "info@iraqivetunion.org",
            website: "https://www.iraqivetunion.org",
            address: "بغداد، العراق – شارع النقابات، قرب ساحة الأندلس",
            services: [
              { title: "تسجيل الأطباء البيطريين", description: "تسجيل ومنح أرقام عضوية رسمية للأطباء البيطريين الجدد." },
              { title: "إصدار وتجديد الهوية النقابية", description: "إصدار وتجديد بطاقات العضوية للنقابة." },
              { title: "الدورات التدريبية", description: "تنظيم ورش عمل ودورات علمية لتطوير المهارات المهنية." },
              { title: "الدعم القانوني", description: "تقديم الاستشارات والدعم القانوني لأعضاء النقابة." },
            ],
          })
          .returning();

        return { success: true, union: { ...newMain[0], isFollowing: false, isRegistered: false, membersCount: 0, followersCount: 0 } };
      }

      const unionId = result[0].id;
      let isFollowing = false;
      let isRegistered = false;
      let membersCount = 0;
      let followersCount = 0;

      if (ctx.user) {
        const [followStatus, regStatus, membersRes, followersRes] = await Promise.all([
          db.select().from(unionFollowers)
            .where(and(eq(unionFollowers.mainUnionId, unionId), eq(unionFollowers.userId, ctx.user.id)))
            .limit(1),
          db.select().from(unionRegistrations)
            .where(and(eq(unionRegistrations.mainUnionId, unionId), eq(unionRegistrations.userId, ctx.user.id), isNull(unionRegistrations.removedAt)))
            .limit(1),
          db.select({ count: count() }).from(unionRegistrations)
            .where(and(eq(unionRegistrations.mainUnionId, unionId), isNull(unionRegistrations.removedAt))),
          db.select({ count: count() }).from(unionFollowers)
            .where(eq(unionFollowers.mainUnionId, unionId)),
        ]);
        isFollowing = followStatus.length > 0;
        isRegistered = regStatus.length > 0;
        membersCount = membersRes[0]?.count ?? 0;
        followersCount = followersRes[0]?.count ?? 0;
      }

      return { success: true, union: { ...result[0], isFollowing, isRegistered, membersCount, followersCount } };
    }),
    update: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string(),
          logoUrl: z.string().optional(),
          establishedYear: z.string().optional(),
          memberCount: z.string().optional(),
          phone1: z.string().optional(),
          phone2: z.string().optional(),
          email: z.string().optional(),
          website: z.string().optional(),
          address: z.string().optional(),
          services: z
            .array(
              z.object({
                id: z.string(),
                title: z.string(),
                description: z.string(),
                color: z.string(),
              })
            )
            .optional(),
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
      if (result.length === 0) return null;
      const branch = result[0];

      let isFollowing = false;
      let isRegistered = false;
      let membersCount = 0;

      if (ctx.user) {
        const [followStatus, regStatus, membersRes] = await Promise.all([
          db.select().from(unionFollowers)
            .where(and(eq(unionFollowers.branchId, branch.id), eq(unionFollowers.userId, ctx.user.id)))
            .limit(1),
          db.select().from(unionRegistrations)
            .where(and(eq(unionRegistrations.branchId, branch.id), eq(unionRegistrations.userId, ctx.user.id), isNull(unionRegistrations.removedAt)))
            .limit(1),
          db.select({ count: count() }).from(unionRegistrations)
            .where(and(eq(unionRegistrations.branchId, branch.id), isNull(unionRegistrations.removedAt))),
        ]);
        isFollowing = followStatus.length > 0;
        isRegistered = regStatus.length > 0;
        membersCount = membersRes[0]?.count ?? 0;
      }

      return { ...branch, isFollowing, isRegistered, membersCount };
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
          services: z
            .array(
              z.object({
                id: z.string(),
                title: z.string(),
                description: z.string(),
                color: z.string(),
              })
            )
            .optional(),
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
          services: z
            .array(
              z.object({
                id: z.string(),
                title: z.string(),
                description: z.string(),
                color: z.string(),
              })
            )
            .optional(),
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
      .input(z.object({ branchId: z.number().optional(), mainUnionId: z.number().optional() }))
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
              branchId ? eq(unionFollowers.branchId, branchId) : eq(unionFollowers.mainUnionId, mainUnionId),
            ),
          );

        if (existingFollow.length > 0) {
          await db.delete(unionFollowers).where(eq(unionFollowers.id, existingFollow[0].id));
          return { success: true, isFollowing: false };
        } else {
          await db.insert(unionFollowers).values({ userId, branchId, mainUnionId });
          return { success: true, isFollowing: true };
        }
      }),

    getFollowers: protectedProcedure
      .input(
        z.object({
          mainUnionId: z.number().optional(),
          branchId: z.number().optional(),
          cursor: z.number().optional(),
          limit: z.number().default(30),
        }),
      )
      .query(async ({ input }) => {
        const { mainUnionId, branchId, cursor, limit } = input;
        const condition = mainUnionId
          ? eq(unionFollowers.mainUnionId, mainUnionId)
          : eq(unionFollowers.branchId, branchId!);

        const rows = await db
          .select({
            followId: unionFollowers.id,
            userId: unionFollowers.userId,
            name: users.name,
            avatar: users.avatar,
            email: users.email,
            followedAt: unionFollowers.createdAt,
          })
          .from(unionFollowers)
          .leftJoin(users, eq(unionFollowers.userId, users.id))
          .where(and(condition, cursor ? lt(unionFollowers.id, cursor) : undefined))
          .orderBy(desc(unionFollowers.id))
          .limit(limit + 1);

        const hasMore = rows.length > limit;
        const followers = hasMore ? rows.slice(0, limit) : rows;
        return { followers, nextCursor: hasMore ? followers[followers.length - 1]?.followId : undefined };
      }),

    removeFollower: protectedProcedure
      .input(z.object({ followId: z.number() }))
      .mutation(async ({ input }) => {
        await db.delete(unionFollowers).where(eq(unionFollowers.id, input.followId));
        return { success: true };
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
        const { title, branchId, mainUnionId, ...restOfInput } = input;

        const newAnnouncement = await db
          .insert(unionAnnouncements)
          .values({
            title,
            branchId,
            mainUnionId,
            ...restOfInput,
          })
          .returning();

        // Get followers
        const followers = await db
          .select({ userId: unionFollowers.userId })
          .from(unionFollowers)
          .where(
            input.branchId
              ? eq(unionFollowers.branchId, input.branchId)
              : eq(unionFollowers.mainUnionId, input.mainUnionId)
          );

        let unionName = "";

        if (branchId) {
          const branch = await db.query.unionBranches.findFirst({
            where: eq(unionBranches.id, branchId),
            columns: { name: true },
          });
          if (branch) {
            unionName = branch.name;
          }
        } else if (mainUnionId) {
          const main = await db.query.unionMain.findFirst({
            columns: { name: true },
          });
          if (main) {
            unionName = main.name;
          }
        }

        const newTitle = `إعلان جديد من ${unionName}: ${title}`;

        if (followers.length > 0) {
          const followerIds = followers.map((f) => f.userId);
          const notificationData = followerIds.map((userId) => ({
            userId,
            title: newTitle,
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

  registration: createTRPCRouter({
    toggle: protectedProcedure
      .input(z.object({ mainUnionId: z.number().optional(), branchId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { mainUnionId, branchId } = input;
        if (!mainUnionId && !branchId) throw new Error("Either mainUnionId or branchId required");

        const userId = ctx.user.id;
        const condition = mainUnionId
          ? eq(unionRegistrations.mainUnionId, mainUnionId)
          : eq(unionRegistrations.branchId, branchId!);

        const [existing] = await db
          .select()
          .from(unionRegistrations)
          .where(and(eq(unionRegistrations.userId, userId), condition))
          .limit(1);

        if (existing) {
          if (existing.removedAt === null) {
            await db
              .update(unionRegistrations)
              .set({ removedAt: new Date(), removedBy: userId })
              .where(eq(unionRegistrations.id, existing.id));
            return { isRegistered: false };
          } else {
            await db
              .update(unionRegistrations)
              .set({ removedAt: null, removedBy: null, registeredAt: new Date() })
              .where(eq(unionRegistrations.id, existing.id));
            return { isRegistered: true };
          }
        }

        await db.insert(unionRegistrations).values({ userId, mainUnionId, branchId });
        return { isRegistered: true };
      }),

    remove: protectedProcedure
      .input(z.object({ registrationId: z.number(), mainUnionId: z.number().optional(), branchId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        await db
          .update(unionRegistrations)
          .set({ removedAt: new Date(), removedBy: ctx.user.id })
          .where(eq(unionRegistrations.id, input.registrationId));
        return { success: true };
      }),

    getMembers: protectedProcedure
      .input(
        z.object({
          mainUnionId: z.number().optional(),
          branchId: z.number().optional(),
          cursor: z.number().optional(),
          limit: z.number().default(30),
        }),
      )
      .query(async ({ input }) => {
        const { mainUnionId, branchId, cursor, limit } = input;
        const condition = mainUnionId
          ? eq(unionRegistrations.mainUnionId, mainUnionId)
          : eq(unionRegistrations.branchId, branchId!);

        const rows = await db
          .select({
            registrationId: unionRegistrations.id,
            userId: unionRegistrations.userId,
            name: users.name,
            avatar: users.avatar,
            email: users.email,
            phone: users.phone,
            registeredAt: unionRegistrations.registeredAt,
          })
          .from(unionRegistrations)
          .leftJoin(users, eq(unionRegistrations.userId, users.id))
          .where(and(condition, isNull(unionRegistrations.removedAt), cursor ? lt(unionRegistrations.id, cursor) : undefined))
          .orderBy(desc(unionRegistrations.id))
          .limit(limit + 1);

        const hasMore = rows.length > limit;
        const members = hasMore ? rows.slice(0, limit) : rows;
        return { members, nextCursor: hasMore ? members[members.length - 1]?.registrationId : undefined };
      }),

    getCounts: protectedProcedure
      .input(z.object({ mainUnionId: z.number().optional(), branchId: z.number().optional() }))
      .query(async ({ input }) => {
        const { mainUnionId, branchId } = input;
        const regCond = mainUnionId
          ? eq(unionRegistrations.mainUnionId, mainUnionId)
          : eq(unionRegistrations.branchId, branchId!);
        const follCond = mainUnionId
          ? eq(unionFollowers.mainUnionId, mainUnionId)
          : eq(unionFollowers.branchId, branchId!);

        const [membersRes, followersRes] = await Promise.all([
          db.select({ count: count() }).from(unionRegistrations).where(and(regCond, isNull(unionRegistrations.removedAt))),
          db.select({ count: count() }).from(unionFollowers).where(follCond),
        ]);

        return { membersCount: membersRes[0]?.count ?? 0, followersCount: followersRes[0]?.count ?? 0 };
      }),
  }),

  messaging: createTRPCRouter({
    sendToMembers: protectedProcedure
      .input(
        z.object({
          mainUnionId: z.number().optional(),
          branchId: z.number().optional(),
          title: z.string().min(1),
          message: z.string().min(1),
          target: z.enum(["members", "followers", "all"]).default("members"),
          linkUrl: z.string().url().optional(),
          imageUrl: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { mainUnionId, branchId, title, message, target, linkUrl, imageUrl } = input;
        if (!mainUnionId && !branchId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Either mainUnionId or branchId required" });
        }

        // Fetch union/branch name for display in messages
        let unionName: string | null = null;
        if (branchId) {
          const [branch] = await db.select({ name: unionBranches.name }).from(unionBranches).where(eq(unionBranches.id, branchId));
          unionName = branch?.name ?? null;
        } else if (mainUnionId) {
          const [main] = await db.select({ name: unionMain.name }).from(unionMain).where(eq(unionMain.id, mainUnionId));
          unionName = main?.name ?? null;
        }

        const userIdSet = new Set<number>();

        if (target === "members" || target === "all") {
          const condition = mainUnionId
            ? eq(unionRegistrations.mainUnionId, mainUnionId)
            : eq(unionRegistrations.branchId, branchId!);
          const rows = await db
            .select({ userId: unionRegistrations.userId })
            .from(unionRegistrations)
            .where(and(condition, isNull(unionRegistrations.removedAt)));
          rows.forEach((r) => userIdSet.add(r.userId));
        }

        if (target === "followers" || target === "all") {
          const condition = mainUnionId
            ? eq(unionFollowers.mainUnionId, mainUnionId)
            : eq(unionFollowers.branchId, branchId!);
          const rows = await db
            .select({ userId: unionFollowers.userId })
            .from(unionFollowers)
            .where(condition);
          rows.forEach((r) => userIdSet.add(r.userId));
        }

        const userIds = [...userIdSet];
        if (userIds.length === 0) return { success: true, sentCount: 0 };

        // Create system message record
        const [systemMessage] = await db
          .insert(systemMessages)
          .values({
            senderId: ctx.user.id,
            title,
            content: message,
            type: "announcement",
            targetAudience: "specific",
            targetUserIds: userIds,
            linkUrl: linkUrl ?? null,
            imageUrl: imageUrl ?? null,
            metadata: { mainUnionId, branchId, target, unionName },
            sentAt: new Date(),
          })
          .returning();

        // Bulk insert message recipients
        await db.insert(systemMessageRecipients).values(
          userIds.map((userId) => ({
            messageId: systemMessage.id,
            userId,
          })),
        );

        // Bulk insert notifications
        await db.insert(notifications).values(
          userIds.map((userId) => ({
            userId,
            title,
            message,
            type: "union_message",
          })),
        );

        return { success: true, sentCount: userIds.length };
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
