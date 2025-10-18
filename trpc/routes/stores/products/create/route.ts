import { z } from 'zod';
import { publicProcedure } from '../../../../../trpc/create-context';
import { db, storeProducts } from '../../../../../db';

const createProductSchema = z.object({
  storeId: z.number(),
  name: z.string().min(1, 'اسم المنتج مطلوب'),
  description: z.string().optional(),
  category: z.enum(['medicine', 'equipment', 'supplements', 'tools']),
  price: z.number().min(0, 'السعر يجب أن يكون أكبر من صفر'),
  discountPrice: z.number().optional(),
  images: z.array(z.string()).optional(),
  stock: z.number().min(0, 'الكمية يجب أن تكون أكبر من صفر'),
  brand: z.string().optional(),
  expiryDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  batchNumber: z.string().optional(),
  isFeatured: z.boolean().optional(),
});

export const createProductProcedure = publicProcedure
  .input(createProductSchema)
  .mutation(async ({ input }: { input: z.infer<typeof createProductSchema> }) => {
    try {
      const productData: any = {
        storeId: input.storeId,
        name: input.name,
        description: input.description,
        category: input.category,
        price: input.price,
        discountPrice: input.discountPrice,
        images: input.images ? JSON.stringify(input.images) : null,
        stock: input.stock,
        brand: input.brand,
        batchNumber: input.batchNumber,
        isFeatured: input.isFeatured || false,
        isActive: true,
      };
      
      if (input.expiryDate) {
        productData.expiryDate = Math.floor(input.expiryDate.getTime() / 1000);
      }
      
      const [product] = await db.insert(storeProducts).values(productData).returning();

      return {
        success: true,
        product,
        message: 'تم إضافة المنتج بنجاح'
      };
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('حدث خطأ أثناء إضافة المنتج');
    }
  });