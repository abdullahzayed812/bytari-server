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
        await db.update(unionMain).set(input).where(eq(unionMain.id, 1));
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
      return result[0];
    }),
    update: protectedProcedure
      .input(
        z.object({
          unionName: z.string(),
          unionDescription: z.string(),
          contactEmail: z.string(),
          contactPhone: z.string(),
          isMaintenanceMode: z.boolean(),
          allowRegistration: z.boolean(),
          requireApproval: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.update(unionSettings).set(input).where(eq(unionSettings.id, 1));
        return { success: true };
      }),
  }),

  notificationSettings: createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
      return {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        newMemberNotifications: true,
        eventNotifications: true,
        emergencyNotifications: true,
        weeklyReports: true,
        monthlyReports: true,
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
        console.log("Updating notification settings:", input);
        return { success: true };
      }),
  }),

  analytics: createTRPCRouter({
    getStats: protectedProcedure.query(async ({ ctx }) => {
      return {
        totalMembers: { value: "8,520", change: "+120", changeType: "positive" },
        newMembers: { value: "350", change: "+30", changeType: "positive" },
        events: { value: "42", change: "+5", changeType: "positive" },
        activityRate: { value: "92%", change: "-1%", changeType: "negative" },
        chartData: [
          { month: "Jan", members: 100, events: 5 },
          { month: "Feb", members: 120, events: 8 },
          { month: "Mar", members: 150, events: 7 },
          { month: "Apr", members: 180, events: 10 },
          { month: "May", members: 220, events: 12 },
          { month: "Jun", members: 250, events: 15 },
        ],
        topEvents: [
          { name: "ورشة الطب البيطري الحديث", participants: 145 },
          { name: "مؤتمر الصحة الحيوانية", participants: 120 },
          { name: "دورة الجراحة المتقدمة", participants: 98 },
        ],
        regionDistribution: [
          { region: "بغداد", count: 3250, percentage: 28 },
          { region: "البصرة", count: 1890, percentage: 16 },
          { region: "أربيل", count: 1560, percentage: 14 },
        ],
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
          branchId: z.number(),
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
          branchId: z.number(),
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
