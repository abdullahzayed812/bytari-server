import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, orders, orderItems, users, storeProducts } from "../../../../db";
import { eq, desc, and, like, or, sql } from "drizzle-orm";

export const listOrdersProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number().optional(),
      status: z.enum(["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"]).optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    try {
      console.log("Fetching orders with input:", input);

      // Build the query conditions
      const conditions = [];

      if (input.status) {
        conditions.push(eq(orders.status, input.status));
      }

      if (input.search) {
        // Search in user names, emails, or order IDs
        conditions.push(
          or(
            like(users.name, `%${input.search}%`),
            like(users.email, `%${input.search}%`),
            like(orders.id, `%${input.search}%`)
          )
        );
      }

      // Fetch orders with user information
      const ordersQuery = db
        .select({
          id: orders.id,
          userId: orders.userId,
          userName: users.name,
          userEmail: users.email,
          userPhone: users.phone,
          totalAmount: orders.totalAmount,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          paymentStatus: orders.paymentStatus,
          shippingAddress: orders.shippingAddress,
          notes: orders.notes,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(orders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const ordersList = await ordersQuery;

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        ordersList.map(async (order) => {
          const items = await db
            .select({
              id: orderItems.id,
              productId: orderItems.productId,
              productName: storeProducts.name,
              productImage: storeProducts.images,
              quantity: orderItems.quantity,
              price: orderItems.price,
              storeId: storeProducts.id,
              storeName: sql`'متجر عام'`,
            })
            .from(orderItems)
            .leftJoin(storeProducts, eq(orderItems.productId, storeProducts.id))
            // Note: storeProducts doesn't have storeId field, it's a general products table
            .where(eq(orderItems.orderId, order.id));

          return {
            ...order,
            items: items.map((item) => ({
              ...item,
              productImage: item.productImage
                ? typeof item.productImage === "string"
                  ? JSON.parse(item.productImage)[0]
                  : null
                : null,
            })),
          };
        })
      );

      console.log(`Found ${ordersWithItems.length} orders`);

      return {
        success: true,
        orders: ordersWithItems,
        total: ordersWithItems.length,
      };
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new Error("حدث خطأ أثناء جلب الطلبات");
    }
  });
