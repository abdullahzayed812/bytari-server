import { z } from 'zod';
import { publicProcedure } from '../../../../create-context';
import { db, storeProducts } from '../../../../../db';
import { eq } from 'drizzle-orm';

export const listProductsProcedure = publicProcedure
  .input(z.object({
    storeId: z.number()
  }))
  .query(async ({ input }: { input: { storeId: number } }) => {
    try {
      const products = await db
        .select()
        .from(storeProducts)
        .where(eq(storeProducts.storeId, input.storeId));

      return {
        success: true,
        products: products.map((product: any) => ({
          ...product,
          images: product.images ? JSON.parse(product.images) : [],
          expiryDate: product.expiryDate ? new Date(product.expiryDate as number * 1000) : null,
        }))
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new Error('حدث خطأ أثناء جلب المنتجات');
    }
  });