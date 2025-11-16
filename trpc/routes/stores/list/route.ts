import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { approvalRequests, db, products, stores, storeStaff, veterinarians } from "../../../../db";
import { eq, and, desc, inArray } from "drizzle-orm";

export const listStoresProcedure = publicProcedure
  .input(
    z
      .object({
        forVetHome: z.boolean().optional().default(false),
      })
      .optional()
  )
  .query(async ({ input }) => {
    try {
      const rawStores = await db.select().from(stores);

      return {
        success: true,
        stores: rawStores.map((store: any) => ({
          ...store,
          images: store.images ? JSON.parse(store.images) : [],
          workingHours: store.workingHours,
        })),
      };
    } catch (error) {
      console.error("Error fetching stores:", error);
      throw new Error("حدث خطأ أثناء جلب المذاخر");
    }
  });

export const listActiveStoresProcedure = publicProcedure
  .input(
    z
      .object({
        forVetHome: z.boolean().optional().default(false),
      })
      .optional()
  )
  .query(async ({ input }) => {
    try {
      const { forVetHome = false } = input || {};

      // Build where conditions based on the request
      const whereConditions = forVetHome
        ? and(eq(stores.isActive, true), eq(stores.isVerified, true), eq(stores.showOnVetHome, true))
        : eq(stores.isActive, true);

      const rawStores = await db.select().from(stores).where(whereConditions);

      return {
        success: true,
        stores: rawStores.map((store: any) => ({
          ...store,
          images: store.images ? JSON.parse(store.images) : [],
          workingHours: store.workingHours,
        })),
      };
    } catch (error) {
      console.error("Error fetching stores:", error);
      throw new Error("حدث خطأ أثناء جلب المذاخر");
    }
  });

// ============== GET USER APPROVED STORES (UPDATED WITH OWNED/ASSIGNED) ==============
export const getUserApprovedStoresProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const userId = input.userId;
      console.log("Getting user approved stores for user:", userId);

      // Get approved store activation requests for this user (OWNED STORES)
      const approvedRequests = await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.requesterId, userId),
            eq(approvalRequests.requestType, "store_activation"),
            eq(approvalRequests.status, "approved")
          )
        );

      const ownedStoreIds = approvedRequests.map((req) => req.resourceId);

      // Get veterinarian record
      const [vet] = await db.select().from(veterinarians).where(eq(veterinarians.userId, userId)).limit(1);

      // Get assigned stores (stores where user is staff)
      let assignedStoreIds: number[] = [];
      let assignmentDetails: Map<number, any> = new Map();

      if (vet) {
        const assignments = await db
          .select({
            storeId: storeStaff.storeId,
            role: storeStaff.role,
            assignedAt: storeStaff.assignedAt,
            status: storeStaff.status,
            notes: storeStaff.notes,
          })
          .from(storeStaff)
          .where(and(eq(storeStaff.veterinarianId, vet.id), eq(storeStaff.isActive, true)));

        assignedStoreIds = assignments.map((a) => a.storeId);

        // Store assignment details for later use
        assignments.forEach((a) => {
          assignmentDetails.set(a.storeId, {
            role: a.role,
            assignedAt: a.assignedAt,
            status: a.status,
            notes: a.notes,
          });
        });
      }

      // Combine all store IDs
      const allStoreIds = [...new Set([...ownedStoreIds, ...assignedStoreIds])];

      if (allStoreIds.length === 0) {
        return {
          success: true,
          stores: [],
        };
      }

      // Fetch store details
      const userStores = await db
        .select()
        .from(stores)
        .where(and(eq(stores.isActive, true), inArray(stores.id, allStoreIds)));

      return {
        success: true,
        stores: userStores.map((store: any) => {
          const isOwned = ownedStoreIds.includes(store.id);
          const isAssigned = assignedStoreIds.includes(store.id);
          const assignment = assignmentDetails.get(store.id);

          return {
            ...store,
            images: store.images ? (typeof store.images === "string" ? JSON.parse(store.images) : store.images) : [],
            isOwned,
            isAssigned,
            // Include assignment details if it's an assigned store
            ...(isAssigned && assignment
              ? {
                  role: assignment.role,
                  assignedAt: assignment.assignedAt,
                  staffStatus: assignment.status,
                  staffNotes: assignment.notes,
                }
              : {}),
          };
        }),
      };
    } catch (error) {
      console.error("Error getting user approved stores:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب المذاخر الموافق عليها");
    }
  });

// Get user's stores with their products
export const getUserStoresProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const userId = input.userId;
      console.log("Getting user stores for user:", userId);

      // 1️⃣ Get OWNED Stores (approved activation requests)
      const approvedRequests = await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.requesterId, userId),
            eq(approvalRequests.requestType, "store_activation"),
            eq(approvalRequests.status, "approved")
          )
        );

      const ownedStoreIds = approvedRequests.map((req) => req.resourceId);

      // 2️⃣ Get Veterinarian record for assignment lookup
      const [vet] = await db.select().from(veterinarians).where(eq(veterinarians.userId, userId)).limit(1);

      let assignedStoreIds: number[] = [];
      let assignmentDetails: Map<number, any> = new Map();

      // 3️⃣ Get ASSIGNED Stores (store_staff)
      if (vet) {
        const assignments = await db
          .select({
            storeId: storeStaff.storeId,
            role: storeStaff.role,
            assignedAt: storeStaff.assignedAt,
            status: storeStaff.status,
            notes: storeStaff.notes,
          })
          .from(storeStaff)
          .where(and(eq(storeStaff.veterinarianId, vet.id), eq(storeStaff.isActive, true)));

        assignedStoreIds = assignments.map((a) => a.storeId);

        assignments.forEach((a) => {
          assignmentDetails.set(a.storeId, {
            role: a.role,
            assignedAt: a.assignedAt,
            status: a.status,
            notes: a.notes,
          });
        });
      }

      // 4️⃣ Combine all store IDs
      const allStoreIds = [...new Set([...ownedStoreIds, ...assignedStoreIds])];

      if (allStoreIds.length === 0) {
        return {
          success: true,
          stores: [],
        };
      }

      // 5️⃣ Fetch store info
      const userStores = await db
        .select()
        .from(stores)
        .where(and(eq(stores.isActive, true), inArray(stores.id, allStoreIds)));

      // 6️⃣ Fetch each store's products
      const storesWithProducts = await Promise.all(
        userStores.map(async (store: any) => {
          const rawProducts = await db
            .select()
            .from(products)
            .where(eq(products.storeId, store.id))
            .orderBy(desc(products.updatedAt));

          const isOwned = ownedStoreIds.includes(store.id);
          const isAssigned = assignedStoreIds.includes(store.id);
          const assignment = assignmentDetails.get(store.id);

          return {
            ...store,
            images: store.images ? JSON.parse(store.images) : [],
            products: rawProducts,

            // extra flags
            isOwned,
            isAssigned,

            // assignment details (if employee)
            ...(isAssigned && assignment
              ? {
                  role: assignment.role,
                  assignedAt: assignment.assignedAt,
                  staffStatus: assignment.status,
                  staffNotes: assignment.notes,
                }
              : {}),
          };
        })
      );

      return {
        success: true,
        stores: storesWithProducts,
      };
    } catch (error) {
      console.error("Error getting user stores:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب المذاخر");
    }
  });

// Get single store details
export const getStoreProcedure = publicProcedure
  .input(
    z.object({
      storeId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const store = await db.select().from(stores).where(eq(stores.id, input.storeId)).limit(1);

      if (!store || store.length === 0) {
        throw new Error("المتجر غير موجود");
      }

      const rawProducts = await db
        .select()
        .from(products)
        .where(eq(products.storeId, input.storeId))
        .orderBy(desc(products.createdAt));

      return {
        ...store[0],
        images: store[0].images ? JSON.parse(store[0].images) : [],
        // workingHours: store[0].workingHours ? JSON.parse(store[0].workingHours) : null,
        products: rawProducts,
      };
    } catch (error) {
      console.error("Error getting store:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب المتجر");
    }
  });
