import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../../create-context";
import { marketplaceProducts, orderItems, orders } from "../../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../../db";

const StoreTypeEnum = z.enum(["veterinarian", "pet_owner"]);

const VET_CATEGORIES = [
  {
    id: "pharmaceuticals",
    name: "أدوية",
    subcategories: [
      { id: "antibiotics", name: "مضادات حيوية" },
      { id: "anti_inflammatory", name: "مضادات التهاب" },
      { id: "vaccines", name: "لقاحات" },
      { id: "anesthetics", name: "مخدرات" },
      { id: "dermatology", name: "أدوية جلدية" },
      { id: "other", name: "أخرى" },
    ],
  },
  {
    id: "medical_equipment",
    name: "معدات طبية",
    subcategories: [
      { id: "surgical", name: "أدوات جراحية" },
      { id: "diagnostic", name: "أدوات تشخيص" },
      { id: "furniture", name: "أثاث عيادات" },
      { id: "sterilization", name: "تعقيم" },
      { id: "other", name: "أخرى" },
    ],
  },
  {
    id: "lab_supplies",
    name: "مستلزمات مختبر",
    subcategories: [
      { id: "test_kits", name: "أطقم اختبار" },
      { id: "equipment", name: "مجاهر وأجهزة طرد مركزي" },
      { id: "consumables", name: "مستهلكات" },
    ],
  },
  {
    id: "nutrition_supplements",
    name: "تغذية ومكملات",
    subcategories: [
      { id: "therapeutic", name: "حميات علاجية" },
      { id: "growth", name: "محفزات نمو" },
      { id: "vitamins", name: "فيتامينات" },
      { id: "other", name: "أخرى" },
    ],
  },
];

const PET_OWNER_CATEGORIES = [
  {
    id: "cats",
    name: "قطط",
    subcategories: [
      { id: "food", name: "طعام" },
      { id: "litter", name: "رمل ومستلزمات" },
      { id: "toys", name: "ألعاب" },
      { id: "care", name: "صحة وعناية" },
      { id: "beds", name: "أسرة وحقائب" },
    ],
  },
  {
    id: "dogs",
    name: "كلاب",
    subcategories: [
      { id: "food", name: "طعام" },
      { id: "leashes", name: "أطواق ومقاود" },
      { id: "toys", name: "ألعاب" },
      { id: "care", name: "صحة وعناية" },
      { id: "beds", name: "أسرة وتدريب" },
    ],
  },
  {
    id: "birds",
    name: "طيور",
    subcategories: [
      { id: "food", name: "طعام" },
      { id: "cages", name: "أقفاص ومجاثم" },
      { id: "accessories", name: "إكسسوارات" },
    ],
  },
  {
    id: "fish",
    name: "أسماك",
    subcategories: [
      { id: "food", name: "طعام" },
      { id: "tanks", name: "أحواض وديكور" },
      { id: "filters", name: "فلاتر ومضخات" },
    ],
  },
  {
    id: "poultry",
    name: "دواجن",
    subcategories: [
      { id: "food", name: "أعلاف" },
      { id: "equipment", name: "معدات" },
      { id: "health", name: "صحة" },
    ],
  },
  // {
  //   id: "small_animals",
  //   name: "حيوانات صغيرة",
  //   subcategories: [
  //     { id: "food", name: "طعام" },
  //     { id: "cages", name: "أقفاص وفرش" },
  //     { id: "accessories", name: "إكسسوارات" },
  //   ],
  // },
];

export const unifiedStoreRouter = {
  // Get Categories
  getCategories: publicProcedure
    .input(
      z.object({
        storeType: StoreTypeEnum,
      })
    )
    .query(({ input }) => {
      const { storeType } = input;
      if (storeType === "veterinarian") {
        return VET_CATEGORIES;
      }
      return PET_OWNER_CATEGORIES;
    }),

  // List Products based on store type
  listProducts: publicProcedure
    .input(
      z.object({
        storeType: StoreTypeEnum,
        category: z.string().optional(),
        subcategory: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().optional().default(20),
        cursor: z.number().optional().default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const { storeType, category, subcategory, search, limit, cursor } = input;

        const conditions = [eq(marketplaceProducts.storeType, storeType), eq(marketplaceProducts.inStock, true)];

        if (category && category !== "all") {
          conditions.push(eq(marketplaceProducts.category, category));
        }

        if (subcategory && subcategory !== "all") {
          conditions.push(eq(marketplaceProducts.subcategory, subcategory));
        }

        // Simple search implementation
        // if (search) {
        //   conditions.push(ilike(marketplaceProducts.name, `% ${ search }% `));
        // }

        const items = await db
          .select()
          .from(marketplaceProducts)
          .where(and(...conditions))
          .limit(limit)
          .offset(cursor)
          .orderBy(desc(marketplaceProducts.createdAt));

        return {
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            category: item.category,
            subcategory: item.subcategory,
            storeType: item.storeType,
            inStock: item.inStock,
          })),
          nextCursor: items.length === limit ? cursor + limit : undefined,
        };
      } catch (error) {
        console.error("Error listing products:", error);
        throw new Error("Failed to list products");
      }
    }),

  // Get Product Details
  getProduct: publicProcedure
    .input(
      z.object({
        id: z.number(),
        storeType: StoreTypeEnum,
      })
    )
    .query(async ({ input }) => {
      const { id, storeType } = input;

      const [product] = await db
        .select()
        .from(marketplaceProducts)
        .where(and(eq(marketplaceProducts.id, id), eq(marketplaceProducts.storeType, storeType)))
        .limit(1);

      if (!product) throw new Error("Product not found");

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        image: product.image,
        category: product.category,
        subcategory: product.subcategory,
        storeType: product.storeType,
        inStock: product.inStock,
      };
    }),

  // Create Product
  createProduct: protectedProcedure
    .input(
      z.object({
        storeType: StoreTypeEnum,
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.number().positive(),
        category: z.string(),
        subcategory: z.string().optional(),
        images: z.array(z.string()).optional(),
        stock: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [newProduct] = await db
        .insert(marketplaceProducts)
        .values({
          storeType: input.storeType,
          name: input.name,
          description: input.description,
          price: input.price,
          category: input.category,
          subcategory: input.subcategory,
          image: input.images?.[0] || null,
          inStock: (input.stock || 0) > 0,
        })
        .returning();

      return { success: true, product: newProduct };
    }),

  // Update Product
  updateProduct: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        storeType: StoreTypeEnum,
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.number().positive().optional(),
        category: z.string().optional(),
        subcategory: z.string().optional(),
        images: z.array(z.string()).optional(),
        stock: z.number().int().optional(),
        inStock: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, storeType, ...updateData } = input;

      const [updatedProduct] = await db
        .update(marketplaceProducts)
        .set({
          ...updateData,
          image: updateData.images?.[0], // Update primary image if images array is provided
          updatedAt: new Date(),
        })
        .where(and(eq(marketplaceProducts.id, id), eq(marketplaceProducts.storeType, storeType)))
        .returning();

      if (!updatedProduct) throw new Error("Product not found or access denied");

      return { success: true, product: updatedProduct };
    }),

  // Delete Product
  deleteProduct: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        storeType: StoreTypeEnum,
      })
    )
    .mutation(async ({ input }) => {
      const { id, storeType } = input;

      const [deletedProduct] = await db
        .delete(marketplaceProducts)
        .where(and(eq(marketplaceProducts.id, id), eq(marketplaceProducts.storeType, storeType)))
        .returning();

      if (!deletedProduct) throw new Error("Product not found or access denied");

      return { success: true };
    }),

  // Create Order
  createOrder: protectedProcedure
    .input(
      z.object({
        storeType: StoreTypeEnum,
        items: z.array(
          z.object({
            productId: z.number(), // This is marketplace_product_id
            quantity: z.number(),
            unitPrice: z.number(),
          })
        ),
        totalAmount: z.number(),
        shippingAddress: z.any(),
        paymentMethod: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { storeType, items, totalAmount, shippingAddress, paymentMethod } = input;
      const userId = ctx.user.id;

      try {
        // Create Order
        const [newOrder] = await db
          .insert(orders)
          .values({
            userId,
            storeType,
            totalAmount,
            shippingAddress,
            paymentMethod,
            status: "pending",
            paymentStatus: "pending",
          })
          .returning();

        // Create Order Items
        if (items.length > 0) {
          await db.insert(orderItems).values(
            items.map((item) => ({
              orderId: newOrder.id,
              marketplaceProductId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            }))
          );
        }

        return newOrder;
      } catch (error) {
        console.error("Error creating order:", error);
        throw error;
      }
    }),

  // List My Orders
  listMyOrders: protectedProcedure
    .input(
      z.object({
        storeType: StoreTypeEnum,
      })
    )
    .query(async ({ ctx, input }) => {
      const { storeType } = input;
      const userId = ctx.user.id;

      const userOrders = await db.query.orders.findMany({
        where: and(eq(orders.userId, userId), eq(orders.storeType, storeType)),
        orderBy: desc(orders.createdAt),
        with: {
          items: {
            with: {
              marketplaceProduct: true,
            },
          },
        },
      });

      // Transform to match frontend expected structure if needed
      // Frontend expects: items: { product: { ... }, quantity: ... }
      return userOrders.map((order) => ({
        ...order,
        items: order.items.map((item) => ({
          ...item,
          product: item.marketplaceProduct,
        })),
      }));
    }),

  // List Store Orders (For Supervisors)
  listStoreOrders: protectedProcedure
    .input(
      z.object({
        storeType: StoreTypeEnum,
        status: z.enum(["pending", "confirmed", "preparing", "shipped", "delivered", "cancelled"]).optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { storeType, status, search, limit, offset } = input;

      const conditions = [eq(orders.storeType, storeType)];

      if (status) {
        conditions.push(eq(orders.status, status));
      }

      const storeOrders = await db.query.orders.findMany({
        where: and(...conditions),
        orderBy: desc(orders.createdAt),
        limit,
        offset,
        with: {
          user: true,
          items: {
            with: {
              marketplaceProduct: true,
            },
          },
        },
      });

      return {
        orders: storeOrders.map((order) => ({
          ...order,
          userName: order.user.name,
          userEmail: order.user.email,
          userPhone: order.user.phone,
          items: order.items.map((item) => ({
            ...item,
            productName: item.marketplaceProduct.name,
            productImage: item.marketplaceProduct.image,
            price: item.unitPrice,
            quantity: item.quantity,
          })),
        })),
      };
    }),

  getPendingOrdersCount: protectedProcedure
    .input(
      z.object({
        storeType: StoreTypeEnum,
      })
    )
    .query(async ({ ctx, input }) => {
      const { storeType } = input;
      const userId = ctx.user.id;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(and(eq(orders.userId, userId), eq(orders.storeType, storeType), eq(orders.status, "pending")));

      return countResult.count;
    }),
};
