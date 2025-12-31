import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, breedingPets, adoptionPets, missingPets, approvalRequests, adminNotifications, users } from '../../../../db';
import { eq, and } from 'drizzle-orm';

const contactInfoSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
});

// Create breeding pet
export const createBreedingPetProcedure = publicProcedure
  .input(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    breed: z.string().min(1),
    age: z.number().min(0),
    gender: z.enum(['male', 'female']),
    color: z.string().optional(),
    weight: z.number().optional(),
    images: z.array(z.string()).optional(),
    description: z.string().optional(),
    healthCertificate: z.string().optional(),
    vaccinations: z.array(z.string()).optional(),
    price: z.number().min(0).optional(),
    location: z.string().min(1),
    contactInfo: contactInfoSchema,
    ownerId: z.number()
  }))
  .mutation(async ({ input }) => {
    
    try {
      // Create the breeding pet
      const [breedingPet] = await db.insert(breedingPets).values({
        ownerId: input.ownerId,
        name: input.name,
        type: input.type,
        breed: input.breed,
        age: input.age,
        gender: input.gender,
        color: input.color,
        weight: input.weight,
        images: input.images ? JSON.stringify(input.images) : null,
        description: input.description,
        healthCertificate: input.healthCertificate,
        vaccinations: input.vaccinations ? JSON.stringify(input.vaccinations) : null,
        price: input.price || 0,
        location: input.location,
        contactInfo: input.contactInfo,
        isApproved: false,
        isActive: true
      }).returning();

      // Create approval request
      await db.insert(approvalRequests).values({
        requestType: 'breeding_pet',
        requesterId: input.ownerId,
        resourceId: breedingPet.id,
        title: `طلب موافقة على حيوان للتزاوج: ${input.name}`,
        description: `طلب موافقة على إضافة ${input.type} للتزاوج من النوع ${input.breed}`,
        status: 'pending',
        priority: 'normal'
      });

      // Create admin notification
      const adminUsers = await db.select().from(users).where(eq(users.userType, 'admin'));

      for (const admin of adminUsers) {
        await db.insert(adminNotifications).values({
          recipientId: admin.id,
          type: 'approval_request',
          title: 'طلب موافقة جديد - حيوان للتزاوج',
          content: `تم تقديم طلب موافقة على حيوان للتزاوج: ${input.name} من النوع ${input.type}`,
          relatedResourceType: 'breeding_pet',
          relatedResourceId: breedingPet.id,
          actionUrl: '/admin-approvals',
          priority: 'normal'
        });
      }

      return { success: true, id: breedingPet.id };
    } catch (error) {
      console.error('Error creating breeding pet:', error);
      throw new Error('فشل في إنشاء الحيوان للتزاوج');
    }
  });

// Create adoption pet
export const createAdoptionPetProcedure = publicProcedure
  .input(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    breed: z.string().optional(),
    age: z.number().min(0),
    gender: z.enum(['male', 'female']),
    color: z.string().optional(),
    weight: z.number().optional(),
    images: z.array(z.string()).optional(),
    description: z.string().optional(),
    healthStatus: z.enum(['healthy', 'needs_treatment', 'special_needs']),
    vaccinations: z.array(z.string()).optional(),
    medicalHistory: z.string().optional(),
    temperament: z.string().optional(),
    goodWithKids: z.boolean().optional(),
    goodWithPets: z.boolean().optional(),
    adoptionFee: z.number().min(0).optional(),
    location: z.string().min(1),
    contactInfo: contactInfoSchema,
    specialRequirements: z.string().optional(),
    ownerId: z.number()
  }))
  .mutation(async ({ input }) => {
    
    try {
      // Create the adoption pet
      const [adoptionPet] = await db.insert(adoptionPets).values({
        ownerId: input.ownerId,
        name: input.name,
        type: input.type,
        breed: input.breed,
        age: input.age,
        gender: input.gender,
        color: input.color,
        weight: input.weight,
        images: input.images ? JSON.stringify(input.images) : null,
        description: input.description,
        healthStatus: input.healthStatus,
        vaccinations: input.vaccinations ? JSON.stringify(input.vaccinations) : null,
        medicalHistory: input.medicalHistory,
        temperament: input.temperament,
        goodWithKids: input.goodWithKids ?? true,
        goodWithPets: input.goodWithPets ?? true,
        adoptionFee: input.adoptionFee || 0,
        location: input.location,
        contactInfo: input.contactInfo,
        specialRequirements: input.specialRequirements,
        isApproved: false,
        isActive: true,
        isAdopted: false
      }).returning();

      // Create approval request
      await db.insert(approvalRequests).values({
        requestType: 'adoption_pet',
        requesterId: input.ownerId,
        resourceId: adoptionPet.id,
        title: `طلب موافقة على حيوان للتبني: ${input.name}`,
        description: `طلب موافقة على إضافة ${input.type} للتبني`,
        status: 'pending',
        priority: 'normal'
      });

      // Create admin notification
      const adminUsers = await db.select().from(users).where(eq(users.userType, 'admin'));

      for (const admin of adminUsers) {
        await db.insert(adminNotifications).values({
          recipientId: admin.id,
          type: 'approval_request',
          title: 'طلب موافقة جديد - حيوان للتبني',
          content: `تم تقديم طلب موافقة على حيوان للتبني: ${input.name} من النوع ${input.type}`,
          relatedResourceType: 'adoption_pet',
          relatedResourceId: adoptionPet.id,
          actionUrl: '/admin-approvals',
          priority: 'normal'
        });
      }

      return { success: true, id: adoptionPet.id };
    } catch (error) {
      console.error('Error creating adoption pet:', error);
      throw new Error('فشل في إنشاء الحيوان للتبني');
    }
  });

// Create missing pet
export const createMissingPetProcedure = publicProcedure
  .input(z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    breed: z.string().optional(),
    age: z.number().optional(),
    gender: z.enum(['male', 'female']).optional(),
    color: z.string().min(1),
    weight: z.number().optional(),
    images: z.array(z.string()).optional(),
    description: z.string().min(1),
    lastSeenLocation: z.string().min(1),
    lastSeenDate: z.string(), // ISO date string
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    contactInfo: z.string().min(1),
    reward: z.number().min(0).optional(),
    specialMarks: z.string().optional(),
    microchipId: z.string().optional(),
    ownerId: z.number()
  }))
  .mutation(async ({ input }) => {
    
    try {
      // Create the missing pet
      const [missingPet] = await db.insert(missingPets).values({
        ownerId: input.ownerId,
        name: input.name,
        type: input.type,
        breed: input.breed,
        age: input.age,
        gender: input.gender,
        color: input.color,
        weight: input.weight,
        images: input.images ? JSON.stringify(input.images) : null,
        description: input.description,
        lastSeenLocation: input.lastSeenLocation,
        lastSeenDate: new Date(input.lastSeenDate),
        latitude: input.latitude,
        longitude: input.longitude,
        contactInfo: input.contactInfo,
        reward: input.reward || 0,
        specialMarks: input.specialMarks,
        microchipId: input.microchipId,
        isApproved: false,
        status: 'missing',
        isActive: true
      }).returning();

      // Create approval request
      await db.insert(approvalRequests).values({
        requestType: 'missing_pet',
        requesterId: input.ownerId,
        resourceId: missingPet.id,
        title: `طلب موافقة على حيوان مفقود: ${input.name}`,
        description: `طلب موافقة على إضافة ${input.type} مفقود`,
        status: 'pending',
        priority: 'high' // Missing pets have higher priority
      });

      // Create admin notification
      const adminUsers = await db.select().from(users).where(eq(users.userType, 'admin'));

      for (const admin of adminUsers) {
        await db.insert(adminNotifications).values({
          recipientId: admin.id,
          type: 'approval_request',
          title: 'طلب موافقة جديد - حيوان مفقود',
          content: `تم تقديم طلب موافقة على حيوان مفقود: ${input.name} من النوع ${input.type}`,
          relatedResourceType: 'missing_pet',
          relatedResourceId: missingPet.id,
          actionUrl: '/admin-approvals',
          priority: 'high'
        });
      }

      return { success: true, id: missingPet.id };
    } catch (error) {
      console.error('Error creating missing pet:', error);
      throw new Error('فشل في إنشاء الحيوان المفقود');
    }
  });

// List approved breeding pets
export const listBreedingPetsProcedure = publicProcedure
  .query(async () => {
    
    try {
      const pets = await db.select({
        id: breedingPets.id,
        ownerId: breedingPets.ownerId,
        name: breedingPets.name,
        type: breedingPets.type,
        breed: breedingPets.breed,
        age: breedingPets.age,
        gender: breedingPets.gender,
        color: breedingPets.color,
        weight: breedingPets.weight,
        images: breedingPets.images,
        description: breedingPets.description,
        healthCertificate: breedingPets.healthCertificate,
        vaccinations: breedingPets.vaccinations,
        price: breedingPets.price,
        location: breedingPets.location,
        contactInfo: breedingPets.contactInfo,
        createdAt: breedingPets.createdAt,
      })
      .from(breedingPets)
      .leftJoin(users, eq(breedingPets.ownerId, users.id))
      .where(and(
        eq(breedingPets.isApproved, true),
        eq(breedingPets.isActive, true)
      ))
      .orderBy(breedingPets.createdAt);

      const formattedPets = pets.map((pet: any) => ({
        ...pet,
        images: pet.images ? JSON.parse(pet.images) : [],
        vaccinations: pet.vaccinations ? JSON.parse(pet.vaccinations) : []
      }));

      return formattedPets;
    } catch (error) {
      console.error('Error fetching breeding pets:', error);
      throw new Error('فشل في جلب حيوانات التزاوج');
    }
  });

// List approved adoption pets
export const listAdoptionPetsProcedure = publicProcedure
  .query(async () => {
    
    try {
      const pets = await db.select({
        id: adoptionPets.id,
        ownerId: adoptionPets.ownerId,
        name: adoptionPets.name,
        type: adoptionPets.type,
        breed: adoptionPets.breed,
        age: adoptionPets.age,
        gender: adoptionPets.gender,
        color: adoptionPets.color,
        weight: adoptionPets.weight,
        images: adoptionPets.images,
        description: adoptionPets.description,
        healthStatus: adoptionPets.healthStatus,
        vaccinations: adoptionPets.vaccinations,
        medicalHistory: adoptionPets.medicalHistory,
        temperament: adoptionPets.temperament,
        goodWithKids: adoptionPets.goodWithKids,
        goodWithPets: adoptionPets.goodWithPets,
        adoptionFee: adoptionPets.adoptionFee,
        location: adoptionPets.location,
        contactInfo: adoptionPets.contactInfo,
        specialRequirements: adoptionPets.specialRequirements,
        createdAt: adoptionPets.createdAt,
      })
      .from(adoptionPets)
      .leftJoin(users, eq(adoptionPets.ownerId, users.id))
      .where(and(
        eq(adoptionPets.isApproved, true),
        eq(adoptionPets.isActive, true),
        eq(adoptionPets.isAdopted, false)
      ))
      .orderBy(adoptionPets.createdAt);

      const formattedPets = pets.map((pet: any) => ({
        ...pet,
        images: pet.images ? JSON.parse(pet.images) : [],
        vaccinations: pet.vaccinations ? JSON.parse(pet.vaccinations) : []
      }));

      return formattedPets;
    } catch (error) {
      console.error('Error fetching adoption pets:', error);
      throw new Error('فشل في جلب حيوانات التبني');
    }
  });

// List approved missing pets
export const listMissingPetsProcedure = publicProcedure
  .query(async () => {
    
    try {
      const pets = await db.select({
        id: missingPets.id,
        ownerId: missingPets.ownerId,
        name: missingPets.name,
        type: missingPets.type,
        breed: missingPets.breed,
        age: missingPets.age,
        gender: missingPets.gender,
        color: missingPets.color,
        weight: missingPets.weight,
        images: missingPets.images,
        description: missingPets.description,
        lastSeenLocation: missingPets.lastSeenLocation,
        lastSeenDate: missingPets.lastSeenDate,
        latitude: missingPets.latitude,
        longitude: missingPets.longitude,
        contactInfo: missingPets.contactInfo,
        reward: missingPets.reward,
        specialMarks: missingPets.specialMarks,
        microchipId: missingPets.microchipId,
        status: missingPets.status,
        createdAt: missingPets.createdAt,
        ownerName: users.name,
        ownerEmail: users.email,
        ownerPhone: users.phone
      })
      .from(missingPets)
      .leftJoin(users, eq(missingPets.ownerId, users.id))
      .where(and(
        eq(missingPets.isApproved, true),
        eq(missingPets.isActive, true),
        eq(missingPets.status, 'missing')
      ))
      .orderBy(missingPets.createdAt);

      const formattedPets = pets.map((pet: any) => ({
        ...pet,
        images: pet.images ? JSON.parse(pet.images) : [],
        lastSeenDate: pet.lastSeenDate instanceof Date ? pet.lastSeenDate.toISOString() : new Date(pet.lastSeenDate).toISOString()
      }));

      return formattedPets;
    } catch (error) {
      console.error('Error fetching missing pets:', error);
      throw new Error('فشل في جلب الحيوانات المفقودة');
    }
  });