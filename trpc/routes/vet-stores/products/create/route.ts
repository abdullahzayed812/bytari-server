import { z } from "zod";
import { protectedProcedure } from "../../../../create-context";
import { db, products, vetStores } from "../../../../../db";
import { eq, and } from "drizzle-orm";

export const addVetStoreProductProcedure = protectedProcedure
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
    .mutation(async ({ input, ctx }) => {
        try {
            const userId = ctx.user.id;

            // Check if store exists and belongs to user
            const [store] = await db
                .select()
                .from(vetStores)
                .where(and(eq(vetStores.id, input.storeId), eq(vetStores.ownerId, userId)))
                .limit(1);

            if (!store) {
                throw new Error("المذخر غير موجود أو ليس لديك صلاحية الإضافة عليه");
            }

            const [newProduct] = await db
                .insert(products)
                .values({
                    vetStoreId: input.storeId, // Link to vet store
                    storeId: null, // Explicitly null for vet store products
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
            console.error("Error adding vet store product:", error);
            throw new Error("حدث خطأ أثناء إضافة المنتج");
        }
    });
