import { z } from 'zod';
import { publicProcedure } from '../../../../../trpc/create-context';
import { db, storeProducts } from '../../../../../db';
import { eq } from 'drizzle-orm';

export const deleteProductProcedure = publicProcedure
  .input(z.object({
    id: z.number()
  }))
  .mutation(async ({ input }: { input: { id: number } }) => {
    try {
      await db
        .delete(storeProducts)
        .where(eq(storeProducts.id, input.id));

      return {
        success: true,
        message: 'تم حذف المنتج بنجاح'
      };
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('حدث خطأ أثناء حذف المنتج');
    }
  });