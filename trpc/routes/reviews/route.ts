import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../create-context";
import { db, reviews, users } from "../../../db";
import { eq, desc, and } from "drizzle-orm";

export const reviewsRouter = createTRPCRouter({
  // Add a review for a clinic
  addClinicReview: protectedProcedure
    .input(
      z.object({
        clinicId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [newReview] = await db
        .insert(reviews)
        .values({
          userId: ctx.user.id,
          clinicId: input.clinicId,
          rating: input.rating,
          comment: input.comment,
        })
        .returning();

      return {
        success: true,
        review: newReview,
      };
    }),

  // Get reviews for a clinic
  getClinicReviews: protectedProcedure
    .input(
      z.object({
        clinicId: z.number(),
        limit: z.number().optional().default(10),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const clinicReviews = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.clinicId, input.clinicId))
        .orderBy(desc(reviews.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        success: true,
        reviews: clinicReviews,
      };
    }),

  // Add a review for a store
  addStoreReview: protectedProcedure
    .input(
      z.object({
        storeId: z.number(),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [newReview] = await db
        .insert(reviews)
        .values({
          userId: ctx.user.id,
          storeId: input.storeId,
          rating: input.rating,
          comment: input.comment,
        })
        .returning();

      return {
        success: true,
        review: newReview,
      };
    }),

  // Get reviews for a store
  getStoreReviews: protectedProcedure
    .input(
      z.object({
        storeId: z.number(),
        limit: z.number().optional().default(10),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const storeReviews = await db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          comment: reviews.comment,
          createdAt: reviews.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.storeId, input.storeId))
        .orderBy(desc(reviews.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        success: true,
        reviews: storeReviews,
      };
    }),
});
