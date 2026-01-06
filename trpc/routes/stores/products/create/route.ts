import { z } from "zod";
import { publicProcedure } from "../../../../../trpc/create-context";
import { db, products, storeFollowers, notifications, stores } from "../../../../../db";
import { eq } from "drizzle-orm";

export const addStoreProductProcedure = publicProcedure
  .input(
    z.object({
      storeId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.number().positive(),
      quantity: z.number().int().min(0),
      category: z.string(),
      brand: z.string().optional(),
      images: z.array(z.string().url()).optional(),
      inStock: z.boolean().default(true),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [newProduct] = await db
        .insert(products)
        .values({
          storeId: input.storeId,
          name: input.name,
          description: input.description || null,
          price: input.price,
          category: input.category,
          brand: input.brand || null,
          images: input.images || [],
          stockQuantity: input.quantity,
          inStock: input.quantity > 0,
          isActive: input.inStock,
          updatedAt: new Date(),
        })
        .returning();

      // Get store followers
      const followers = await db.select().from(storeFollowers).where(eq(storeFollowers.storeId, input.storeId));
      const store = await db.select().from(stores).where(eq(stores.id, input.storeId)).then(res => res[0]);


      if (followers.length > 0 && store) {
        const notificationData = followers.map(follower => ({
          userId: follower.userId,
          title: "منتج جديد في متجر تتابعه",
          message: `تمت إضافة منتج جديد "${newProduct.name}" إلى متجر "${store.name}".`,
          type: "new_product",
          data: {
            screen: "store-details",
            storeId: input.storeId,
          },
        }));

        await db.insert(notifications).values(notificationData);
      }

      return {
        success: true,
        product: newProduct,
      };
    } catch (error) {
      console.error("Error adding product:", error);
      throw new Error("حدث خطأ أثناء إضافة المنتج");
    }
  });
