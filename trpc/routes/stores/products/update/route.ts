import { z } from 'zod';
import { publicProcedure } from '../../../../../trpc/create-context';
import { db, storeProducts } from '../../../../../db';
import { eq } from 'drizzle-orm';

const updateProductSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'اسم المنتج مطلوب').optional(),
  description: z.string().optional(),
  category: z.enum(['medicine', 'equipment', 'supplements', 'tools']).optional(),
  price: z.number().min(0, 'السعر يجب أن يكون أكبر من صفر').optional(),
  discountPrice: z.number().optional(),
  images: z.array(z.string()).optional(),
  stock: z.number().min(0, 'الكمية يجب أن تكون أكبر من صفر').optional(),
  brand: z.string().optional(),
  expiryDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  batchNumber: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateProductProcedure = publicProcedure
  .input(updateProductSchema)
  .mutation(async ({ input }: { input: z.infer<typeof updateProductSchema> }) => {
    try {
      const { id, ...updateData } = input;
      
      const productData: any = {
        ...updateData,
        images: updateData.images ? JSON.stringify(updateData.images) : undefined,
      };
      
      if (updateData.expiryDate) {
        productData.expiryDate = Math.floor(updateData.expiryDate.getTime() / 1000);
      }
      
      // Remove undefined values
      Object.keys(productData).forEach(key => {
        if (productData[key] === undefined) {
          delete productData[key];
        }
      });
      
      const [updatedProduct] = await db
        .update(storeProducts)
        .set(productData)
        .where(eq(storeProducts.id, id))
        .returning();

      return {
        success: true,
        product: updatedProduct,
        message: 'تم تحديث المنتج بنجاح'
      };
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('حدث خطأ أثناء تحديث المنتج');
    }
  });