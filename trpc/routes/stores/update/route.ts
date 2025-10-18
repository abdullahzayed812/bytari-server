import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, vetStores } from '../../../../db';
import { eq } from 'drizzle-orm';

const updateStoreSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'اسم المتجر مطلوب').optional(),
  description: z.string().optional(),
  address: z.string().min(1, 'العنوان مطلوب').optional(),
  phone: z.string().optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  workingHours: z.object({
    open: z.string(),
    close: z.string(),
    days: z.string(),
  }).optional(),
  images: z.array(z.string()).optional(),
  licenseImage: z.string().optional(),
  licenseNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateStoreProcedure = publicProcedure
  .input(updateStoreSchema)
  .mutation(async ({ input }: { input: z.infer<typeof updateStoreSchema> }) => {
    try {
      const { id, ...updateData } = input;
      
      const storeData: any = {
        ...updateData,
        workingHours: updateData.workingHours ? JSON.stringify(updateData.workingHours) : undefined,
        images: updateData.images ? JSON.stringify(updateData.images) : undefined,
      };
      
      // Remove undefined values
      Object.keys(storeData).forEach(key => {
        if (storeData[key] === undefined) {
          delete storeData[key];
        }
      });
      
      const [updatedStore] = await db
        .update(vetStores)
        .set(storeData)
        .where(eq(vetStores.id, id))
        .returning();

      return {
        success: true,
        store: updatedStore,
        message: 'تم تحديث المتجر بنجاح'
      };
    } catch (error) {
      console.error('Error updating store:', error);
      throw new Error('حدث خطأ أثناء تحديث المتجر');
    }
  });