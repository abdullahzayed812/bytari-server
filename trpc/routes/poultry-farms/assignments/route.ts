import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { vetFarmAssignments, poultryFarms, veterinarians, users } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

const assignVetToFarmSchema = z.object({
  vetId: z.number().int().positive(),
  farmId: z.number().int().positive(),
  assignmentType: z.enum(['doctor', 'supervisor']),
  assignedBy: z.number().int().positive(),
  notes: z.string().optional(),
});

export const assignVetToFarmProcedure = publicProcedure
  .input(assignVetToFarmSchema)
  .mutation(async ({ input }) => {
    console.log('Assigning vet to farm:', input);
    
    try {
      // Check if farm exists
      const [farm] = await db.select()
        .from(poultryFarms)
        .where(eq(poultryFarms.id, input.farmId));
      
      if (!farm) {
        throw new Error('حقل الدواجن غير موجود');
      }

      // Check if vet exists
      const [vet] = await db.select()
        .from(veterinarians)
        .where(eq(veterinarians.id, input.vetId));
      
      if (!vet) {
        throw new Error('الطبيب البيطري غير موجود');
      }

      // Create assignment record
      const [assignment] = await db.insert(vetFarmAssignments).values({
        vetId: input.vetId,
        farmId: input.farmId,
        assignmentType: input.assignmentType,
        assignedBy: input.assignedBy,
        notes: input.notes,
        isActive: true,
      }).returning();

      // Update farm with assigned vet/supervisor
      if (input.assignmentType === 'doctor') {
        await db.update(poultryFarms)
          .set({ assignedVetId: input.vetId })
          .where(eq(poultryFarms.id, input.farmId));
      } else if (input.assignmentType === 'supervisor') {
        await db.update(poultryFarms)
          .set({ assignedSupervisorId: vet.userId })
          .where(eq(poultryFarms.id, input.farmId));
      }
      
      console.log('Vet assigned to farm successfully:', assignment);
      return {
        success: true,
        assignment,
        message: input.assignmentType === 'doctor' 
          ? 'تم تعيين الطبيب للحقل بنجاح'
          : 'تم تعيين المشرف للحقل بنجاح'
      };
    } catch (error) {
      console.error('Error assigning vet to farm:', error);
      throw new Error('فشل في تعيين الطبيب للحقل');
    }
  });

export const unassignVetFromFarmProcedure = publicProcedure
  .input(z.object({
    assignmentId: z.number().int().positive(),
    unassignedBy: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    console.log('Unassigning vet from farm:', input);
    
    try {
      // Get assignment details
      const [assignment] = await db.select()
        .from(vetFarmAssignments)
        .where(eq(vetFarmAssignments.id, input.assignmentId));
      
      if (!assignment) {
        throw new Error('التعيين غير موجود');
      }

      // Update assignment as inactive
      await db.update(vetFarmAssignments)
        .set({ 
          isActive: false,
          unassignedAt: new Date(),
          unassignedBy: input.unassignedBy
        })
        .where(eq(vetFarmAssignments.id, input.assignmentId));

      // Update farm to remove assigned vet/supervisor
      if (assignment.assignmentType === 'doctor') {
        await db.update(poultryFarms)
          .set({ assignedVetId: null })
          .where(eq(poultryFarms.id, assignment.farmId));
      } else if (assignment.assignmentType === 'supervisor') {
        await db.update(poultryFarms)
          .set({ assignedSupervisorId: null })
          .where(eq(poultryFarms.id, assignment.farmId));
      }
      
      console.log('Vet unassigned from farm successfully');
      return {
        success: true,
        message: assignment.assignmentType === 'doctor' 
          ? 'تم إلغاء تعيين الطبيب من الحقل بنجاح'
          : 'تم إلغاء تعيين المشرف من الحقل بنجاح'
      };
    } catch (error) {
      console.error('Error unassigning vet from farm:', error);
      throw new Error('فشل في إلغاء تعيين الطبيب من الحقل');
    }
  });

export const getVetAssignmentsProcedure = publicProcedure
  .input(z.object({
    vetId: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    console.log('Getting vet assignments:', input);
    
    try {
      const assignments = await db.select({
        id: vetFarmAssignments.id,
        assignmentType: vetFarmAssignments.assignmentType,
        isActive: vetFarmAssignments.isActive,
        assignedAt: vetFarmAssignments.assignedAt,
        notes: vetFarmAssignments.notes,
        farmId: poultryFarms.id,
        farmName: poultryFarms.name,
        farmAddress: poultryFarms.address,
        farmType: poultryFarms.farmType,
        ownerId: users.id,
        ownerName: users.name,
        ownerPhone: users.phone
      }).from(vetFarmAssignments)
      .leftJoin(poultryFarms, eq(vetFarmAssignments.farmId, poultryFarms.id))
      .leftJoin(users, eq(poultryFarms.ownerId, users.id))
      .where(eq(vetFarmAssignments.vetId, input.vetId));
      
      console.log('Vet assignments retrieved successfully:', assignments.length);
      return {
        success: true,
        assignments
      };
    } catch (error) {
      console.error('Error getting vet assignments:', error);
      throw new Error('فشل في جلب تعيينات الطبيب');
    }
  });