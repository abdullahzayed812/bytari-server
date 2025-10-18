import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, warehouseProducts } from '../../../../db';
import { eq, and, desc } from 'drizzle-orm';

// Create a protected procedure (for now using publicProcedure, should be replaced with proper auth)
const protectedProcedure = publicProcedure;

const createWarehouseProductSchema = z.object({
  warehouseId: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['medicine', 'equipment', 'supplements', 'tools', 'surgical_instruments']),
  price: z.number().positive(),
  discountPrice: z.number().positive().optional(),
  images: z.array(z.string()).optional(),
  stock: z.number().min(0).default(0),
  brand: z.string().optional(),
  expiryDate: z.date().optional(),
  batchNumber: z.string().optional(),
  manufacturerCode: z.string().optional(),
  requiresPrescription: z.boolean().default(false),
});

export const createWarehouseProductProcedure = protectedProcedure
  .input(createWarehouseProductSchema)
  .mutation(async ({ input }) => {
    
    const [newProduct] = await db.insert(warehouseProducts).values({
      warehouseId: input.warehouseId,
      name: input.name,
      description: input.description,
      category: input.category,
      price: input.price,
      discountPrice: input.discountPrice,
      images: input.images ? JSON.stringify(input.images) : null,
      stock: input.stock,
      brand: input.brand,
      expiryDate: input.expiryDate || null,
      batchNumber: input.batchNumber,
      manufacturerCode: input.manufacturerCode,
      requiresPrescription: input.requiresPrescription,
      isActive: true,
      isFeatured: false,
    }).returning();

    return newProduct;
  });

export const listWarehouseProductsProcedure = protectedProcedure
  .input(z.object({
    warehouseId: z.number().optional(),
    category: z.string().optional(),
    isActive: z.boolean().optional(),
  }))
  .query(async ({ input }) => {
    
    let query = db.select().from(warehouseProducts);
    
    const conditions = [];
    
    if (input.warehouseId) {
      conditions.push(eq(warehouseProducts.warehouseId, input.warehouseId));
    }
    
    if (input.category) {
      conditions.push(eq(warehouseProducts.category, input.category));
    }
    
    if (input.isActive !== undefined) {
      conditions.push(eq(warehouseProducts.isActive, input.isActive));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const products = await query.orderBy(desc(warehouseProducts.createdAt));
    
    return products.map((product: any) => ({
      ...product,
      images: product.images ? JSON.parse(product.images) : [],
      expiryDate: product.expiryDate || null,
    }));
  });

export const updateWarehouseProductProcedure = protectedProcedure
  .input(z.object({
    id: z.number(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.enum(['medicine', 'equipment', 'supplements', 'tools', 'surgical_instruments']).optional(),
    price: z.number().positive().optional(),
    discountPrice: z.number().positive().optional(),
    images: z.array(z.string()).optional(),
    stock: z.number().min(0).optional(),
    brand: z.string().optional(),
    expiryDate: z.date().optional(),
    batchNumber: z.string().optional(),
    manufacturerCode: z.string().optional(),
    requiresPrescription: z.boolean().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }))
  .mutation(async ({ input }) => {
    const { id, ...updateData } = input;
    
    const updateValues: any = { ...updateData };
    
    if (updateData.images) {
      updateValues.images = JSON.stringify(updateData.images);
    }
    
    if (updateData.expiryDate) {
      updateValues.expiryDate = updateData.expiryDate;
    }
    
    const [updatedProduct] = await db
      .update(warehouseProducts)
      .set(updateValues)
      .where(eq(warehouseProducts.id, id))
      .returning();

    return updatedProduct;
  });

export const deleteWarehouseProductProcedure = protectedProcedure
  .input(z.object({
    id: z.number(),
  }))
  .mutation(async ({ input }) => {
    
    await db.delete(warehouseProducts).where(eq(warehouseProducts.id, input.id));
    
    return { success: true };
  });