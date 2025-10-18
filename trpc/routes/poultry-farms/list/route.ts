import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { poultryFarms, veterinarians, users } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';

export const listPoultryFarmsProcedure = publicProcedure
  .input(z.object({
    ownerId: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  }))
  .query(async ({ input }) => {
    console.log('Listing poultry farms:', input);
    
    try {
      // Build where conditions
      const conditions = [];
      if (input.ownerId) {
        conditions.push(eq(poultryFarms.ownerId, input.ownerId));
      }
      
      if (input.isActive !== undefined) {
        conditions.push(eq(poultryFarms.isActive, input.isActive));
      }

      // Build base query
      const baseQuery = db.select({
        id: poultryFarms.id,
        name: poultryFarms.name,
        description: poultryFarms.description,
        address: poultryFarms.address,
        phone: poultryFarms.phone,
        email: poultryFarms.email,
        farmType: poultryFarms.farmType,
        capacity: poultryFarms.capacity,
        currentStock: poultryFarms.currentStock,
        isActive: poultryFarms.isActive,
        isVerified: poultryFarms.isVerified,
        assignedVetId: poultryFarms.assignedVetId,
        assignedSupervisorId: poultryFarms.assignedSupervisorId,
        images: poultryFarms.images,
        createdAt: poultryFarms.createdAt,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      }).from(poultryFarms)
      .leftJoin(users, eq(poultryFarms.ownerId, users.id));

      // Apply where conditions if any exist
      const farms = conditions.length > 0 
        ? await baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
        : await baseQuery;


      
      console.log('Poultry farms retrieved successfully:', farms.length);
      return {
        success: true,
        farms: farms.map(farm => ({
          ...farm,
          images: farm.images ? JSON.parse(farm.images) : []
        }))
      };
    } catch (error) {
      console.error('Error listing poultry farms:', error);
      throw new Error('فشل في جلب قائمة حقول الدواجن');
    }
  });

export const getPoultryFarmDetailsProcedure = publicProcedure
  .input(z.object({
    farmId: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    console.log('Getting poultry farm details:', input);
    
    try {
      const [farm] = await db.select({
        id: poultryFarms.id,
        name: poultryFarms.name,
        description: poultryFarms.description,
        address: poultryFarms.address,
        phone: poultryFarms.phone,
        email: poultryFarms.email,
        latitude: poultryFarms.latitude,
        longitude: poultryFarms.longitude,
        farmType: poultryFarms.farmType,
        capacity: poultryFarms.capacity,
        currentStock: poultryFarms.currentStock,
        licenseNumber: poultryFarms.licenseNumber,
        licenseImage: poultryFarms.licenseImage,
        images: poultryFarms.images,
        isActive: poultryFarms.isActive,
        isVerified: poultryFarms.isVerified,
        assignedVetId: poultryFarms.assignedVetId,
        assignedSupervisorId: poultryFarms.assignedSupervisorId,
        createdAt: poultryFarms.createdAt,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
        }
      }).from(poultryFarms)
      .leftJoin(users, eq(poultryFarms.ownerId, users.id))
      .where(eq(poultryFarms.id, input.farmId));

      if (!farm) {
        throw new Error('حقل الدواجن غير موجود');
      }

      // Get assigned vet details if exists
      let assignedVet = null;
      if (farm.assignedVetId) {
        const [vet] = await db.select({
          id: veterinarians.id,
          userId: veterinarians.userId,
          licenseNumber: veterinarians.licenseNumber,
          specialization: veterinarians.specialization,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
          }
        }).from(veterinarians)
        .leftJoin(users, eq(veterinarians.userId, users.id))
        .where(eq(veterinarians.id, farm.assignedVetId));
        
        assignedVet = vet;
      }

      // Get assigned supervisor details if exists
      let assignedSupervisor = null;
      if (farm.assignedSupervisorId) {
        const [supervisor] = await db.select()
        .from(users)
        .where(eq(users.id, farm.assignedSupervisorId));
        
        assignedSupervisor = supervisor;
      }
      
      console.log('Poultry farm details retrieved successfully');
      return {
        success: true,
        farm: {
          ...farm,
          images: farm.images ? JSON.parse(farm.images) : [],
          assignedVet,
          assignedSupervisor
        }
      };
    } catch (error) {
      console.error('Error getting poultry farm details:', error);
      throw new Error('فشل في جلب تفاصيل حقل الدواجن');
    }
  });