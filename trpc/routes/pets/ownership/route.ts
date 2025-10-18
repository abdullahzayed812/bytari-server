import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

// Mock data for user's own pets (simulating database ownership)
const mockUserPets: { [userId: string]: any[] } = {
  '1': [
    {
      id: 1,
      ownerId: 1,
      name: 'فلافي',
      type: 'cat',
      breed: 'شيرازي',
      age: 2,
      weight: 4.5,
      color: 'أبيض',
      gender: 'female',
      image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400',
      medicalHistory: 'تطعيمات كاملة',
      vaccinations: 'تطعيم ثلاثي، تطعيم السعار',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: 2,
      ownerId: 1,
      name: 'ماكس',
      type: 'dog',
      breed: 'جيرمن شيبرد',
      age: 3,
      weight: 25,
      color: 'بني وأسود',
      gender: 'male',
      image: 'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400',
      medicalHistory: 'عملية جراحية في الساق',
      vaccinations: 'تطعيمات كاملة',
      createdAt: new Date('2024-02-01'),
    }
  ],
  '2': [
    {
      id: 3,
      ownerId: 2,
      name: 'لولو',
      type: 'bird',
      breed: 'كناري',
      age: 1,
      weight: 0.02,
      color: 'أصفر',
      gender: 'female',
      image: 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=400',
      medicalHistory: 'صحة جيدة',
      vaccinations: 'لا يوجد',
      createdAt: new Date('2024-01-20'),
    }
  ]
};

// Mock data for user's own farms (simulating database ownership)
const mockUserFarms: { [userId: string]: any[] } = {
  '1': [
    {
      id: 1,
      ownerId: 1,
      name: 'حقل الدواجن النموذجي',
      location: 'بغداد - الدورة',
      description: 'حقل دواجن حديث مجهز بأحدث التقنيات',
      totalArea: 500,
      capacity: 1000,
      assignedVetId: null,
      assignedSupervisorId: null,
      status: 'active',
      createdAt: new Date('2024-01-10'),
    }
  ],
  '2': [
    {
      id: 2,
      ownerId: 2,
      name: 'مزرعة الأمل للدواجن',
      location: 'البصرة - الزبير',
      description: 'مزرعة دواجن عضوية',
      totalArea: 300,
      capacity: 600,
      assignedVetId: null,
      assignedSupervisorId: null,
      status: 'active',
      createdAt: new Date('2024-01-20'),
    }
  ]
};

const getUserPetsSchema = z.object({
  userId: z.number(),
});

const getAllPetsForAdminSchema = z.object({
  adminId: z.number(),
});

// Get pets for specific user (owner only)
export const getUserPetsProcedure = protectedProcedure
  .input(getUserPetsSchema)
  .query(async ({ input, ctx }) => {
    try {
      // Ensure user can only see their own pets
      if (ctx.userId !== input.userId) {
        throw new Error('Unauthorized: You can only view your own pets');
      }

      const userPets = mockUserPets[input.userId.toString()] || [];

      return {
        success: true,
        pets: userPets,
      };
    } catch (error) {
      console.error('Error fetching user pets:', error);
      throw new Error('Failed to fetch pets');
    }
  });

// Get all pets for admin (for assignment purposes)
export const getAllPetsForAdminProcedure = protectedProcedure
  .input(getAllPetsForAdminSchema)
  .query(async ({ input, ctx }) => {
    try {
      // Only admins can see all pets (simplified for demo)
      // In real app, check admin permissions here

      // Combine all pets from all users
      const allPets = Object.entries(mockUserPets).flatMap(([userId, pets]) =>
        pets.map(pet => ({
          ...pet,
          ownerName: `مستخدم ${userId}`,
          ownerEmail: `user${userId}@example.com`,
        }))
      );

      return {
        success: true,
        pets: allPets,
      };
    } catch (error) {
      console.error('Error fetching all pets for admin:', error);
      throw new Error('Failed to fetch pets');
    }
  });

// Get user's own farms
export const getUserFarmsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    try {
      const userFarms = mockUserFarms[ctx.userId.toString()] || [];

      return {
        success: true,
        farms: userFarms,
      };
    } catch (error) {
      console.error('Error fetching user farms:', error);
      throw new Error('Failed to fetch farms');
    }
  });

// Get all fields for admin (for assignment purposes)
export const getAllFieldsForAdminProcedure = protectedProcedure
  .input(z.object({ adminId: z.number() }))
  .query(async ({ input, ctx }) => {
    try {
      // Only admins can see all fields (simplified for demo)
      // In real app, check admin permissions here

      // Combine all farms from all users
      const allFields = Object.entries(mockUserFarms).flatMap(([userId, farms]) =>
        farms.map(farm => ({
          ...farm,
          ownerName: `مستخدم ${userId}`,
          ownerEmail: `user${userId}@example.com`,
          ownerPhone: `+964 770 ${userId}23 4567`,
        }))
      );

      return {
        success: true,
        fields: allFields,
      };
    } catch (error) {
      console.error('Error fetching all fields for admin:', error);
      throw new Error('Failed to fetch fields');
    }
  });