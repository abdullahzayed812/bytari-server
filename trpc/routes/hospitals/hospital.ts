import { publicProcedure, protectedProcedure, createTRPCRouter } from "../../create-context";
import { hospitals, hospitalFollowers } from "../../../db/schema";
import { eq, desc, sql, count, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db";

export const hospitalRouter = createTRPCRouter({
  // Get all hospitals with filtering and pagination
  getAll: publicProcedure
    .input(
      z.object({
        province: z.string().optional(),
        isMain: z.boolean().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const whereConditions = [];
      if (input.province) {
        whereConditions.push(eq(hospitals.province, input.province));
      }
      if (input.isMain !== undefined) {
        whereConditions.push(eq(hospitals.isMain, input.isMain));
      }
      if (input.status) {
        whereConditions.push(eq(hospitals.status, input.status));
      }

      const hospitalsData = await db
        .select()
        .from(hospitals)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(hospitals.isMain), desc(hospitals.rating))
        .limit(input.limit)
        .offset(input.offset);

      const totalCount = await db
        .select({ count: count() })
        .from(hospitals)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      return {
        hospitals: hospitalsData,
        totalCount: totalCount[0]?.count || 0,
      };
    }),

  // Get hospital by ID
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const hospital = await db.select().from(hospitals).where(eq(hospitals.id, input.id)).limit(1);

    if (!hospital[0]) {
      throw new Error("Hospital not found");
    }

    return hospital[0];
  }),

  // Get main hospital
  getMainHospital: publicProcedure.query(async () => {
    const mainHospital = await db.select().from(hospitals).where(eq(hospitals.isMain, true)).limit(1);

    return mainHospital[0] || null;
  }),

  // Get hospitals by province
  getByProvince: publicProcedure.input(z.object({ province: z.string() })).query(async ({ input }) => {
    const provinceHospitals = await db
      .select()
      .from(hospitals)
      .where(and(eq(hospitals.province, input.province), eq(hospitals.isMain, false), eq(hospitals.status, "active")))
      .orderBy(desc(hospitals.rating));

    return provinceHospitals;
  }),

  // Get management dashboard stats
  getManagementDashboard: protectedProcedure.query(async () => {
    const [totalHospitals, activeHospitals, inactiveHospitals] = await Promise.all([
      db.select({ count: count() }).from(hospitals),
      db.select({ count: count() }).from(hospitals).where(eq(hospitals.status, "active")),
      db.select({ count: count() }).from(hospitals).where(eq(hospitals.status, "inactive")),
    ]);

    return {
      total: totalHospitals[0]?.count || 0,
      active: activeHospitals[0]?.count || 0,
      inactive: inactiveHospitals[0]?.count || 0,
    };
  }),

  // Create hospital (admin only)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        location: z.string().min(1),
        province: z.string().min(1),
        phone: z.string().min(1),
        workingHours: z.string().min(1),
        description: z.string().min(1),
        specialties: z.array(z.string()),
        image: z.string().optional(),
        isMain: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      // If setting as main hospital, unset any existing main hospital
      if (input.isMain) {
        await db.update(hospitals).set({ isMain: false }).where(eq(hospitals.isMain, true));
      }

      const [newHospital] = await db
        .insert(hospitals)
        .values({
          ...input,
          status: "active",
        })
        .returning();

      return newHospital;
    }),

  // Update hospital
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        location: z.string().min(1).optional(),
        province: z.string().min(1).optional(),
        phone: z.string().min(1).optional(),
        workingHours: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        specialties: z.array(z.string()).optional(),
        image: z.string().optional(),
        isMain: z.boolean().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      // If setting as main hospital, unset any existing main hospital
      if (updateData.isMain) {
        await db.update(hospitals).set({ isMain: false }).where(eq(hospitals.isMain, true));
      }

      const [updatedHospital] = await db.update(hospitals).set(updateData).where(eq(hospitals.id, id)).returning();

      if (!updatedHospital) {
        throw new Error("Hospital not found");
      }

      return updatedHospital;
    }),

  // Delete hospital
  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const [deletedHospital] = await db.delete(hospitals).where(eq(hospitals.id, input.id)).returning();

    if (!deletedHospital) {
      throw new Error("Hospital not found");
    }

    return deletedHospital;
  }),

  // Follow hospital
  follow: protectedProcedure.input(z.object({ hospitalId: z.number() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.user.id;

    // Check if already following
    const existingFollow = await db
      .select()
      .from(hospitalFollowers)
      .where(and(eq(hospitalFollowers.hospitalId, input.hospitalId), eq(hospitalFollowers.userId, userId)))
      .limit(1);

    if (existingFollow.length > 0) {
      throw new Error("Already following this hospital");
    }

    // Add follow
    await db.insert(hospitalFollowers).values({
      hospitalId: input.hospitalId,
      userId: userId,
    });

    // Update followers count
    await db
      .update(hospitals)
      .set({
        followersCount: sql`${hospitals.followersCount} + 1`,
      })
      .where(eq(hospitals.id, input.hospitalId));

    return { status: "followed" };
  }),

  // Unfollow hospital
  unfollow: protectedProcedure.input(z.object({ hospitalId: z.number() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.user.id;

    const [deletedFollow] = await db
      .delete(hospitalFollowers)
      .where(and(eq(hospitalFollowers.hospitalId, input.hospitalId), eq(hospitalFollowers.userId, userId)))
      .returning();

    if (!deletedFollow) {
      throw new Error("Not following this hospital");
    }

    // Update followers count
    await db
      .update(hospitals)
      .set({
        followersCount: sql`${hospitals.followersCount} - 1`,
      })
      .where(eq(hospitals.id, input.hospitalId));

    return { status: "unfollowed" };
  }),

  // Check if user is following hospital
  isFollowing: protectedProcedure.input(z.object({ hospitalId: z.number() })).query(async ({ input, ctx }) => {
    const userId = ctx.user.id;

    const [follow] = await db
      .select()
      .from(hospitalFollowers)
      .where(and(eq(hospitalFollowers.hospitalId, input.hospitalId), eq(hospitalFollowers.userId, userId)))
      .limit(1);

    return !!follow;
  }),

  // Get user's followed hospitals
  getFollowedHospitals: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const followedHospitals = await db
      .select({
        hospital: hospitals,
      })
      .from(hospitalFollowers)
      .innerJoin(hospitals, eq(hospitalFollowers.hospitalId, hospitals.id))
      .where(eq(hospitalFollowers.userId, userId))
      .orderBy(desc(hospitalFollowers.createdAt));

    return followedHospitals.map((item) => item.hospital);
  }),
});
