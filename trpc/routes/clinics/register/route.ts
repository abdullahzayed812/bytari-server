import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { clinics, approvalRequests } from '../../../../db/schema';

const registerClinicSchema = z.object({
  name: z.string().min(1, 'اسم العيادة مطلوب'),
  address: z.string().min(1, 'عنوان العيادة مطلوب'),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  email: z.string().email().optional(),
  workingHours: z.string().optional(),
  services: z.array(z.string()).optional(),
  description: z.string().optional(),
  licenseNumber: z.string().min(1, 'رقم الترخيص مطلوب'),
  licenseImage: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const registerClinicProcedure = publicProcedure
  .input(registerClinicSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('Registering clinic:', input);
      
      // Create the clinic in the database (inactive by default)
      const newClinic = await db.insert(clinics).values({
        name: input.name,
        address: input.address,
        phone: input.phone,
        email: input.email || null,
        workingHours: input.workingHours ? JSON.stringify({ hours: input.workingHours }) : null,
        services: input.services ? JSON.stringify(input.services) : null,
        images: input.images ? JSON.stringify(input.images) : null,
        rating: 0,
        isActive: false // Clinic starts as inactive until approved
      }).returning();

      const clinicId = newClinic[0]?.id;
      if (!clinicId) {
        throw new Error('فشل في إنشاء العيادة');
      }

      // Create an approval request
      const approvalRequest = await db.insert(approvalRequests).values({
        requestType: 'clinic_activation',
        requesterId: 1, // Mock user ID - in real app, get from context
        resourceId: clinicId,
        title: `طلب تفعيل ${input.name}`,
        description: `طلب تفعيل عيادة ${input.name} في ${input.address}. ${input.description || ''}`,
        documents: JSON.stringify([]),
        licenseImages: input.licenseImage ? JSON.stringify([input.licenseImage]) : JSON.stringify([]),
        identityImages: JSON.stringify([]),
        officialDocuments: JSON.stringify([]),
        status: 'pending',
        priority: 'normal'
      }).returning();
      
      return {
        success: true,
        message: 'تم إرسال طلب تسجيل العيادة بنجاح',
        clinicId: clinicId,
        approvalRequestId: approvalRequest[0]?.id,
      };
    } catch (error) {
      console.error('Error registering clinic:', error);
      throw new Error('حدث خطأ أثناء تسجيل العيادة');
    }
  });

export const getClinicsByOwnerProcedure = publicProcedure
  .query(async () => {
    try {
      // Fetch clinics from database
      const userClinics = await db.select().from(clinics).where(eq(clinics.isActive, true));
      
      return userClinics.map(clinic => ({
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone || '',
        email: clinic.email || '',
        workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null,
        services: clinic.services ? JSON.parse(clinic.services) : [],
        images: clinic.images ? JSON.parse(clinic.images) : [],
        rating: clinic.rating || 0,
        isActive: clinic.isActive,
        isPremium: true, // Mock premium status
        isOpen: true, // Mock open status
        reviewsCount: Math.floor(Math.random() * 200) + 50, // Mock review count
        createdAt: clinic.createdAt,
      }));
    } catch (error) {
      console.error('Error fetching user clinics:', error);
      throw new Error('حدث خطأ أثناء جلب العيادات');
    }
  });