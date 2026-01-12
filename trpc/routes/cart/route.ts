import { z } from "zod";
import { protectedProcedure } from "../../create-context";
import { db } from "../../../db";
import { userCartItems, marketplaceProducts } from "../../../db/schema";
import { eq, and } from "drizzle-orm";

export const cartRouter = {
  getCart: protectedProcedure.query(async ({ ctx }) => {
    const cartItems = await db.query.userCartItems.findMany({
      where: eq(userCartItems.userId, ctx.user.id),
      with: {
        marketplaceProduct: true,
      },
    });

    return cartItems.map((item) => ({
      productId: item.marketplaceProduct.id,
      product: {
        id: item.marketplaceProduct.id,
        name: item.marketplaceProduct.name,
        description: item.marketplaceProduct.description,
        price: item.marketplaceProduct.price,
        image: item.marketplaceProduct.image,
      },
      quantity: item.quantity,
    }));
  }),

  addToCart: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        quantity: z.number().min(1).default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { productId, quantity } = input;
      const userId = ctx.user.id;

      const existingCartItem = await db.query.userCartItems.findFirst({
        where: and(
          eq(userCartItems.userId, userId),
          eq(userCartItems.marketplaceProductId, productId)
        ),
      });

      if (existingCartItem) {
        const [updatedItem] = await db
          .update(userCartItems)
          .set({ quantity: existingCartItem.quantity + quantity })
          .where(eq(userCartItems.id, existingCartItem.id))
          .returning();
        return updatedItem;
      } else {
        const [newItem] = await db
          .insert(userCartItems)
          .values({
            userId,
            marketplaceProductId: productId,
            quantity,
          })
          .returning();
        return newItem;
      }
    }),

  removeFromCart: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(userCartItems)
        .where(
          and(
            eq(userCartItems.userId, ctx.user.id),
            eq(userCartItems.marketplaceProductId, input.productId)
          )
        );
      return { success: true };
    }),

  updateQuantity: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        quantity: z.number().min(0), // Allow 0 to effectively remove item
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { productId, quantity } = input;
      const userId = ctx.user.id;

      if (quantity === 0) {
        await db
          .delete(userCartItems)
          .where(
            and(
              eq(userCartItems.userId, userId),
              eq(userCartItems.marketplaceProductId, productId)
            )
          );
        return { success: true };
      } else {
        const [updatedItem] = await db
          .update(userCartItems)
          .set({ quantity })
          .where(
            and(
              eq(userCartItems.userId, userId),
              eq(userCartItems.marketplaceProductId, productId)
            )
          )
          .returning();
        return updatedItem;
      }
    }),

  clearCart: protectedProcedure.mutation(async ({ ctx }) => {
    await db.delete(userCartItems).where(eq(userCartItems.userId, ctx.user.id));
    return { success: true };
  }),
};
