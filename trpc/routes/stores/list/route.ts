import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { approvalRequests, db, products, stores } from "../../../../db";
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

      // Get approved store activation requests for this user
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

      const storeIds = approvedRequests.map((req) => req.resourceId);

      if (storeIds.length === 0) {
        return {
          success: true,
          stores: [],
        };
      }

      // Fetch store details
      const userStores = await db
        .select()
        .from(stores)
        .where(and(eq(stores.isActive, true), inArray(stores.id, storeIds)));

      return {
        success: true,
        stores: userStores.map((store: any) => ({
          ...store,
          images: store.images ? JSON.parse(store.images) : [],
          stores: store.workingHours,
        })),
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

      // Get approved store activation requests for this user
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

      const storeIds = approvedRequests.map((req) => req.resourceId);

      if (storeIds.length === 0) {
        return [];
      }

      // Fetch stores details with products
      const userStores = await db
        .select()
        .from(stores)
        .where(and(eq(stores.isActive, true), inArray(stores.id, storeIds)));

      // Get products for each store
      const storesWithProducts = await Promise.all(
        userStores.map(async (store: any) => {
          const rawProducts = await db
            .select()
            .from(products)
            .where(eq(products.storeId, store.id))
            .orderBy(desc(products.updatedAt));

          return {
            ...store,
            images: store.images ? JSON.parse(store.images) : [],
            // workingHours: store.workingHours ? JSON.parse(store.workingHours) : null,
            products: rawProducts,
          };
        })
      );

      return storesWithProducts;
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
