import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, inquiries, inquiryResponses, users } from "../../../../db";
import { eq, desc, and } from "drizzle-orm";

const getInquiriesListSchema = z.object({
  status: z.enum(["all", "pending", "assigned", "answered", "closed"]).optional(),
  category: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
});

export const getInquiriesListProcedure = publicProcedure.input(getInquiriesListSchema).query(async ({ input }) => {
  try {
    const { status, category, priority, limit, offset } = input;

    // Build where conditions
    const conditions: any[] = [];

    if (status && status !== "all") {
      conditions.push(eq(inquiries.status, status));
    }

    if (category) {
      conditions.push(eq(inquiries.category, category));
    }

    if (priority) {
      conditions.push(eq(inquiries.priority, priority));
    }

    // Fetch inquiries with user info
    const inquiriesList = await db
      .select({
        inquiry: inquiries,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        },
      })
      .from(inquiries)
      .leftJoin(users, eq(inquiries.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(inquiries.createdAt))
      .limit(limit)
      .offset(offset);

    // Get responses count for each inquiry
    const inquiriesWithDetails = await Promise.all(
      inquiriesList.map(async (item) => {
        const responses = await db
          .select()
          .from(inquiryResponses)
          .where(eq(inquiryResponses.inquiryId, item.inquiry.id));

        return {
          ...item.inquiry,
          user: item.user,
          responsesCount: responses.length,
        };
      })
    );

    // Get counts by status
    const allInquiries = await db.select().from(inquiries);
    const counts = {
      all: allInquiries.length,
      pending: allInquiries.filter((i) => i.status === "pending").length,
      assigned: allInquiries.filter((i) => i.status === "assigned").length,
      answered: allInquiries.filter((i) => i.status === "answered").length,
      closed: allInquiries.filter((i) => i.status === "closed").length,
    };

    return {
      success: true,
      inquiries: inquiriesWithDetails,
      counts,
      total: inquiriesWithDetails.length,
    };
  } catch (error) {
    console.error("Error fetching inquiries list:", error);
    throw new Error("Failed to fetch inquiries list");
  }
});

const getInquiryDetailsSchema = z.object({
  inquiryId: z.number(),
});

export const getInquiryDetailsProcedure = publicProcedure.input(getInquiryDetailsSchema).query(async ({ input }) => {
  try {
    // Fetch inquiry with user info
    const inquiryData = await db
      .select({
        inquiry: inquiries,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          userType: users.userType,
        },
      })
      .from(inquiries)
      .leftJoin(users, eq(inquiries.userId, users.id))
      .where(eq(inquiries.id, input.inquiryId))
      .limit(1);

    if (inquiryData.length === 0) {
      throw new Error("Inquiry not found");
    }

    // Fetch all responses with responder info
    const responses = await db
      .select({
        response: inquiryResponses,
        responder: {
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          userType: users.userType,
        },
      })
      .from(inquiryResponses)
      .leftJoin(users, eq(inquiryResponses.userId, users.id))
      .where(eq(inquiryResponses.inquiryId, input.inquiryId))
      .orderBy(inquiryResponses.createdAt);

    return {
      success: true,
      inquiry: {
        ...inquiryData[0].inquiry,
        user: inquiryData[0].user,
      },
      responses: responses.map((r) => ({
        ...r.response,
        responder: r.responder,
      })),
    };
  } catch (error) {
    console.error("Error fetching inquiry details:", error);
    throw new Error("Failed to fetch inquiry details");
  }
});
