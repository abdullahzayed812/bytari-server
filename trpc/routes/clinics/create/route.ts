import { z } from 'zod';
import { publicProcedure, protectedProcedure } from '../../../create-context';
import { db, clinics, approvalRequests, users } from '../../../../db';
import { eq } from 'drizzle-orm';

export const createClinicProcedure = publicProcedure
  .input(z.object({
    name: z.string().min(1, 'اسم العيادة مطلوب'),
    address: z.string().min(1, 'عنوان العيادة مطلوب'),
    phone: z.string().min(1, 'رقم الهاتف مطلوب'),
    email: z.string().email('البريد الإلكتروني غير صحيح').optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    workingHours: z.string().optional(),
    services: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    licenseNumber: z.string().min(1, 'رقم الترخيص مطلوب'),
    licenseImages: z.array(z.string()).min(1, 'صور الترخيص مطلوبة'),
    identityImages: z.array(z.string()).min(1, 'صور الهوية مطلوبة'),
    officialDocuments: z.array(z.string()).optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      console.log('Creating clinic registration request:', input.name);
      
      // Mock user ID for development - in production, get from authentication
      const userId = 1;
      
      // Check if user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }
      
      // Create the clinic record first (inactive)
      const [clinic] = await db
        .insert(clinics)
        .values({
          name: input.name,
          address: input.address,
          phone: input.phone,
          email: input.email,
          latitude: input.latitude,
          longitude: input.longitude,
          workingHours: input.workingHours ? JSON.stringify(input.workingHours) : null,
          services: input.services ? JSON.stringify(input.services) : null,
          images: input.images ? JSON.stringify(input.images) : null,
          isActive: false, // Will be activated after approval
        })
        .returning();
      
      // Create approval request
      const [approvalRequest] = await db
        .insert(approvalRequests)
        .values({
          requestType: 'clinic_activation',
          requesterId: userId,
          resourceId: clinic.id,
          title: `طلب تفعيل عيادة: ${input.name}`,
          description: `طلب تفعيل عيادة بيطرية جديدة باسم ${input.name} في ${input.address}`,
          licenseImages: JSON.stringify(input.licenseImages),
          identityImages: JSON.stringify(input.identityImages),
          officialDocuments: input.officialDocuments ? JSON.stringify(input.officialDocuments) : null,
          paymentStatus: 'not_required', // Clinic activation doesn't require payment
          status: 'pending',
        })
        .returning();
      
      console.log('Clinic registration request created successfully:', approvalRequest.id);
      
      return {
        success: true,
        message: 'تم إرسال طلب تسجيل العيادة بنجاح. سيتم مراجعته من قبل الإدارة.',
        clinicId: clinic.id,
        requestId: approvalRequest.id,
      };
      
    } catch (error) {
      console.error('Error creating clinic registration:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'حدث خطأ أثناء تسجيل العيادة'
      );
    }
  });

export const updateClinicActivationProcedure = protectedProcedure
  .input(z.object({
    clinicId: z.number(),
    activationStartDate: z.date(),
    activationEndDate: z.date(),
    isActive: z.boolean().optional(),
  }))
  .mutation(async ({ input }) => {
    const now = new Date();
    const needsRenewal = input.activationEndDate <= now;
    
    const updatedClinic = await db.update(clinics)
      .set({
        activationStartDate: input.activationStartDate,
        activationEndDate: input.activationEndDate,
        isActive: input.isActive ?? (input.activationEndDate > now),
        needsRenewal,
        updatedAt: now,
      })
      .where(eq(clinics.id, input.clinicId))
      .returning();

    return updatedClinic[0];
  });

export const renewClinicActivationProcedure = protectedProcedure
  .input(z.object({
    clinicId: z.number(),
    newEndDate: z.date(),
  }))
  .mutation(async ({ input }) => {
    const now = new Date();
    
    const updatedClinic = await db.update(clinics)
      .set({
        activationEndDate: input.newEndDate,
        isActive: true,
        needsRenewal: false,
        updatedAt: now,
      })
      .where(eq(clinics.id, input.clinicId))
      .returning();

    return updatedClinic[0];
  });