import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, vetStores, approvalRequests } from "../../../../db";
import { eq, and, inArray } from "drizzle-orm";

export const getUserWarehousesProcedure = publicProcedure.query(async () => {
  try {
    // Mock user ID for development - in production, get from authentication
    const userId = 1;
    console.log("Getting user warehouses for user:", userId);

    // Get all approval requests for warehouses by this user
    const requests = await db
      .select({
        id: approvalRequests.id,
        requestType: approvalRequests.requestType,
        resourceId: approvalRequests.resourceId,
        title: approvalRequests.title,
        status: approvalRequests.status,
        createdAt: approvalRequests.createdAt,
        reviewedAt: approvalRequests.reviewedAt,
        rejectionReason: approvalRequests.rejectionReason,
      })
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.requesterId, userId),
          eq(approvalRequests.requestType, "store_activation")
        )
      );

    // Get warehouse details for approved requests
    const warehouseIds = requests
      .filter((req) => req.status === "approved")
      .map((req) => req.resourceId);

    let userWarehouses: any[] = [];
    if (warehouseIds.length > 0) {
      userWarehouses = await db
        .select()
        .from(vetStores)
        .where(
          and(eq(vetStores.isActive, true), inArray(vetStores.id, warehouseIds))
        );
    }

    return {
      success: true,
      warehouses: userWarehouses.map((warehouse: any) => ({
        ...warehouse,
        workingHours: warehouse.workingHours
          ? JSON.parse(warehouse.workingHours)
          : null,
        images: warehouse.images ? JSON.parse(warehouse.images) : [],
      })),
      requests: requests.map((req: any) => ({
        ...req,
        createdAt: new Date(Number(req.createdAt) * 1000).toISOString(),
        reviewedAt: req.reviewedAt
          ? new Date(Number(req.reviewedAt) * 1000).toISOString()
          : null,
      })),
    };
  } catch (error) {
    console.error("Error getting user warehouses:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "حدث خطأ أثناء جلب بيانات المذاخر"
    );
  }
});

export const getWarehouseDetailsProcedure = publicProcedure
  .input(
    z.object({
      warehouseId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      // Mock user ID for development - in production, get from authentication
      const userId = 1;
      console.log(
        "Getting warehouse details for warehouse:",
        input.warehouseId
      );

      // Get warehouse details
      const [warehouse] = await db
        .select()
        .from(vetStores)
        .where(eq(vetStores.id, input.warehouseId))
        .limit(1);

      if (!warehouse) {
        throw new Error("المذخر غير موجود");
      }

      // Check if user owns this warehouse
      const [request] = await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.resourceId, input.warehouseId),
            eq(approvalRequests.requesterId, userId),
            eq(approvalRequests.requestType, "store_activation")
          )
        )
        .limit(1);

      const isOwner = !!request;

      return {
        success: true,
        warehouse: {
          ...warehouse,
          workingHours: warehouse.workingHours
            ? JSON.parse(warehouse.workingHours)
            : null,
          images: warehouse.images ? JSON.parse(warehouse.images) : [],
        },
        isOwner,
      };
    } catch (error) {
      console.error("Error getting warehouse details:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء جلب تفاصيل المذخر"
      );
    }
  });

export const getPublicWarehousesProcedure = publicProcedure.query(async () => {
  try {
    console.log("Getting public warehouses list");

    // Get all active and verified warehouses for public display
    const warehouses = await db
      .select()
      .from(vetStores)
      .where(and(eq(vetStores.isActive, true), eq(vetStores.isVerified, true)));

    return {
      success: true,
      warehouses: warehouses.map((warehouse: any) => ({
        ...warehouse,
        workingHours: warehouse.workingHours
          ? JSON.parse(warehouse.workingHours)
          : null,
        images: warehouse.images ? JSON.parse(warehouse.images) : [],
      })),
    };
  } catch (error) {
    console.error("Error getting public warehouses:", error);
    throw new Error(
      error instanceof Error ? error.message : "حدث خطأ أثناء جلب قائمة المذاخر"
    );
  }
});

// Get user's approved warehouses
export const getUserApprovedWarehousesProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const userId = input.userId;
      console.log("Getting user approved warehouses for user:", userId);

      // Get all approved store activation requests for this user
      const approvedRequests = await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.userId, userId),
            eq(approvalRequests.type, "store_activation"),
            eq(approvalRequests.status, "approved")
          )
        );

      const warehouseIds = approvedRequests.map((req) => req.resourceId);

      if (warehouseIds.length === 0) {
        return {
          success: true,
          warehouses: [],
        };
      }

      // Fetch warehouse details from the database
      const userWarehouses = await db
        .select()
        .from(vetStores)
        .where(
          and(eq(vetStores.isActive, true), inArray(vetStores.id, warehouseIds))
        );

      return {
        success: true,
        warehouses: userWarehouses.map((warehouse: any) => ({
          ...warehouse,
          workingHours: warehouse.workingHours
            ? JSON.parse(warehouse.workingHours)
            : null,
          images: warehouse.images ? JSON.parse(warehouse.images) : [],
        })),
      };
    } catch (error) {
      console.error("Error getting user approved warehouses:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء جلب بيانات المذاخر الموافق عليها"
      );
    }
  });
