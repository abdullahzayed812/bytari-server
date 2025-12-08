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
} from "../../db/schema";
import { eq, and } from "drizzle-orm";

export const unionRouter = createTRPCRouter({
  main: createTRPCRouter({
    get: publicProcedure.query(async ({ ctx }) => {
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
        return { success: true, union: newMain[0] };
      }
      return { success: true, union: result[0] };
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
    list: publicProcedure.query(async ({ ctx }) => {
      return await db.select().from(unionBranches);
    }),
    get: publicProcedure.input(z.number()).query(async ({ ctx, input }) => {
      const result = await db.select().from(unionBranches).where(eq(unionBranches.id, input));
      return result[0];
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
    follow: protectedProcedure.input(z.number()).mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const existingFollow = await db
        .select()
        .from(unionFollowers)
        .where(and(eq(unionFollowers.branchId, input), eq(unionFollowers.userId, userId)));

      if (existingFollow.length > 0) {
        await db.delete(unionFollowers).where(eq(unionFollowers.id, existingFollow[0].id));
        return { success: true, isFollowing: false };
      } else {
        await db.insert(unionFollowers).values({ userId, branchId: input });
        return { success: true, isFollowing: true };
      }
    }),
  }),

  announcement: createTRPCRouter({
    list: publicProcedure.input(z.number()).query(async ({ ctx, input }) => {
      return await db.select().from(unionAnnouncements).where(eq(unionAnnouncements.branchId, input));
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
      // Real counts from DB
      const [membersCount, branchesCount, announcementsCount] = await Promise.all([
        db.select({ count: count() }).from(unionUsers),
        db.select({ count: count() }).from(unionBranches),
        db.select({ count: count() }).from(unionAnnouncements),
      ]);

      return {
        totalMembers: {
          value: membersCount[0]?.count.toString() || "0",
          change: "+0",
          changeType: "neutral"
        },
        newMembers: {
          value: "0", // Needs 'createdAt' filtering for accurate 'new' count
          change: "0",
          changeType: "neutral"
        },
        events: {
          value: announcementsCount[0]?.count.toString() || "0",
          change: "+0",
          changeType: "neutral"
        },
        activityRate: { value: "100%", change: "0%", changeType: "neutral" },
        chartData: [
          { month: "Jan", members: 0, events: 0 },
          { month: "Feb", members: 0, events: 0 },
          { month: "Mar", members: 0, events: 0 },
          { month: "Apr", members: 0, events: 0 },
          { month: "May", members: 0, events: 0 },
          { month: "Jun", members: 0, events: 0 },
        ],
        topEvents: [],
        regionDistribution: [],
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
  }),
});
