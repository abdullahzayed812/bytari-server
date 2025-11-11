import { z } from "zod";
import { publicProcedure } from "../../../../../trpc/create-context";
import { db, products } from "../../../../../db";

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

      return {
        success: true,
        product: newProduct,
      };
    } catch (error) {
      console.error("Error adding product:", error);
      throw new Error("حدث خطأ أثناء إضافة المنتج");
    }
  });
