import { publicProcedure, protectedProcedure, createTRPCRouter } from "../../create-context";
import { z } from "zod";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { hospitalAnnouncements, hospitals } from "../../../db/schema";
import { db } from "../../../db";

export const announcementRouter = createTRPCRouter({
  // Get announcements for a specific hospital
  getForHospital: publicProcedure.input(z.object({ hospitalId: z.number() })).query(async ({ input }) => {
    const announcements = await db
      .select()
      .from(hospitalAnnouncements)
      .where(eq(hospitalAnnouncements.hospitalId, input.hospitalId))
      .orderBy(desc(hospitalAnnouncements.createdAt));

    return announcements;
  }),

  // Get latest announcements across all hospitals
  getLatest: publicProcedure
    .input(
      z.object({
        limit: z.number().default(5),
        type: z.enum(["news", "announcement", "event"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const whereConditions = [];
      if (input.type) {
        whereConditions.push(eq(hospitalAnnouncements.type, input.type));
      }

      const announcements = await db
        .select({
          announcement: hospitalAnnouncements,
          hospital: hospitals,
        })
        .from(hospitalAnnouncements)
        .innerJoin(hospitals, eq(hospitalAnnouncements.hospitalId, hospitals.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(hospitalAnnouncements.createdAt))
        .limit(input.limit);

      return announcements;
    }),

  // Get management list with pagination
  getManagementList: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
        hospitalId: z.number().optional(),
        type: z.enum(["news", "announcement", "event"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const whereConditions = [];
      if (input.hospitalId) {
        whereConditions.push(eq(hospitalAnnouncements.hospitalId, input.hospitalId));
      }
      if (input.type) {
        whereConditions.push(eq(hospitalAnnouncements.type, input.type));
      }

      const announcements = await db
        .select({
          announcement: hospitalAnnouncements,
          hospital: hospitals,
        })
        .from(hospitalAnnouncements)
        .innerJoin(hospitals, eq(hospitalAnnouncements.hospitalId, hospitals.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(hospitalAnnouncements.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const totalCount = await db
        .select({ count: count() })
        .from(hospitalAnnouncements)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      return {
        announcements: announcements.map((item) => ({
          ...item.announcement,
          hospital: item.hospital,
        })),
        totalCount: totalCount[0]?.count || 0,
      };
    }),

  // Get announcement by ID
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const [announcement] = await db
      .select({
        announcement: hospitalAnnouncements,
        hospital: hospitals,
      })
      .from(hospitalAnnouncements)
      .innerJoin(hospitals, eq(hospitalAnnouncements.hospitalId, hospitals.id))
      .where(eq(hospitalAnnouncements.id, input.id))
      .limit(1);

    if (!announcement) {
      throw new Error("Announcement not found");
    }

    return {
      ...announcement.announcement,
      hospital: announcement.hospital,
    };
  }),

  // Create announcement
  create: protectedProcedure
    .input(
      z.object({
        hospitalId: z.number(),
        title: z.string().min(1),
        content: z.string().min(1),
        type: z.enum(["news", "announcement", "event"]),
        image: z.string().optional(),
        scheduledDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [newAnnouncement] = await db.insert(hospitalAnnouncements).values(input).returning();

      // Update announcements count for hospital
      await db
        .update(hospitals)
        .set({
          announcementsCount: sql`${hospitals.announcementsCount} + 1`,
        })
        .where(eq(hospitals.id, input.hospitalId));

      return newAnnouncement;
    }),

  // Update announcement
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        content: z.string().min(1).optional(),
        type: z.enum(["news", "announcement", "event"]).optional(),
        image: z.string().optional(),
        scheduledDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const [updatedAnnouncement] = await db
        .update(hospitalAnnouncements)
        .set(updateData)
        .where(eq(hospitalAnnouncements.id, id))
        .returning();

      if (!updatedAnnouncement) {
        throw new Error("Announcement not found");
      }

      return updatedAnnouncement;
    }),

  // Delete announcement
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    // Get announcement first to know which hospital to update
    const [announcement] = await db
      .select()
      .from(hospitalAnnouncements)
      .where(eq(hospitalAnnouncements.id, input.id))
      .limit(1);

    if (!announcement) {
      throw new Error("Announcement not found");
    }

    const [deletedAnnouncement] = await db
      .delete(hospitalAnnouncements)
      .where(eq(hospitalAnnouncements.id, input.id))
      .returning();

    // Update announcements count for hospital
    await db
      .update(hospitals)
      .set({
        announcementsCount: sql`${hospitals.announcementsCount} - 1`,
      })
      .where(eq(hospitals.id, announcement.hospitalId));

    return deletedAnnouncement;
  }),
});
