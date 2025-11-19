import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, consultations, consultationResponses, users } from "../../../../db";
import { eq, desc, and } from "drizzle-orm";

const getConsultationsListSchema = z.object({
  status: z.enum(["all", "pending", "assigned", "answered", "closed"]).optional(),
  petType: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
});

export const getConsultationsListProcedure = publicProcedure
  .input(getConsultationsListSchema)
  .query(async ({ input }) => {
    try {
      const { status, petType, priority, limit, offset } = input;

      // Build where conditions
      const conditions: any[] = [];

      if (status && status !== "all") {
        conditions.push(eq(consultations.status, status));
      }

      if (petType) {
        conditions.push(eq(consultations.petType, petType));
      }

      if (priority) {
        conditions.push(eq(consultations.priority, priority));
      }

      // Fetch consultations with user info
      const consultationsList = await db
        .select({
          consultation: consultations,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          },
        })
        .from(consultations)
        .leftJoin(users, eq(consultations.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(consultations.createdAt))
        .limit(limit)
        .offset(offset);

      // Get responses count for each consultation
      const consultationsWithDetails = await Promise.all(
        consultationsList.map(async (item) => {
          const responses = await db
            .select()
            .from(consultationResponses)
            .where(eq(consultationResponses.consultationId, item.consultation.id));

          return {
            ...item.consultation,
            user: item.user,
            responsesCount: responses.length,
          };
        })
      );

      // Get counts by status
      const allConsultations = await db.select().from(consultations);
      const counts = {
        all: allConsultations.length,
        pending: allConsultations.filter((c) => c.status === "pending").length,
        assigned: allConsultations.filter((c) => c.status === "assigned").length,
        answered: allConsultations.filter((c) => c.status === "answered").length,
        closed: allConsultations.filter((c) => c.status === "closed").length,
      };

      return {
        success: true,
        consultations: consultationsWithDetails,
        counts,
        total: consultationsWithDetails.length,
      };
    } catch (error) {
      console.error("Error fetching consultations list:", error);
      throw new Error("Failed to fetch consultations list");
    }
  });

const getConsultationDetailsSchema = z.object({
  consultationId: z.number(),
});

export const getConsultationDetailsProcedure = publicProcedure
  .input(getConsultationDetailsSchema)
  .query(async ({ input }) => {
    try {
      // Fetch consultation with user info
      const consultationData = await db
        .select({
          consultation: consultations,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
            userType: users.userType,
          },
        })
        .from(consultations)
        .leftJoin(users, eq(consultations.userId, users.id))
        .where(eq(consultations.id, input.consultationId))
        .limit(1);

      if (consultationData.length === 0) {
        throw new Error("Consultation not found");
      }

      // Fetch all responses with responder info
      const responses = await db
        .select({
          response: consultationResponses,
          responder: {
            id: users.id,
            name: users.name,
            email: users.email,
            avatar: users.avatar,
            userType: users.userType,
          },
        })
        .from(consultationResponses)
        .leftJoin(users, eq(consultationResponses.userId, users.id))
        .where(eq(consultationResponses.consultationId, input.consultationId))
        .orderBy(consultationResponses.createdAt);

      return {
        success: true,
        consultation: {
          ...consultationData[0].consultation,
          user: consultationData[0].user,
        },
        responses: responses.map((r) => ({
          ...r.response,
          responder: r.responder,
        })),
      };
    } catch (error) {
      console.error("Error fetching consultation details:", error);
      throw new Error("Failed to fetch consultation details");
    }
  });
