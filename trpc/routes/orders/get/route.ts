import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, orders } from "../../../../db";

export const getOrderStatsProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      console.log("Fetching order statistics for admin:", input.adminId);

      // Get all orders
      const allOrders = await db.select().from(orders);

      // Calculate statistics
      const stats = {
        total: allOrders.length,
        pending: allOrders.filter((o) => o.status === "pending").length,
        confirmed: allOrders.filter((o) => o.status === "confirmed").length,
        preparing: allOrders.filter((o) => o.status === "preparing").length,
        shipped: allOrders.filter((o) => o.status === "shipped").length,
        delivered: allOrders.filter((o) => o.status === "delivered").length,
        cancelled: allOrders.filter((o) => o.status === "cancelled").length,
        totalRevenue: allOrders
          .filter((o) => o.status === "delivered")
          .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      };

      console.log("Order statistics:", stats);

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("Error fetching order statistics:", error);
      throw new Error("حدث خطأ أثناء جلب إحصائيات الطلبات");
    }
  });
