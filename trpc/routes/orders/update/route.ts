import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, orders } from "../../../../db";
import { eq, sql } from "drizzle-orm";

export const updateOrderStatusProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      orderId: z.number(),
      status: z.enum(["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"]),
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log("Updating order status:", input);

      // Update the order status
      await db
        .update(orders)
        .set({
          status: input.status,
          updatedAt: sql`(unixepoch())`,
        })
        .where(eq(orders.id, input.orderId));

      console.log(`Order ${input.orderId} status updated to ${input.status}`);

      return {
        success: true,
        message: "تم تحديث حالة الطلب بنجاح",
      };
    } catch (error) {
      console.error("Error updating order status:", error);
      throw new Error("حدث خطأ أثناء تحديث حالة الطلب");
    }
  });
