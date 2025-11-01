import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { TRPCError } from "@trpc/server";
// Mock implementation - replace with actual database imports when ready
// import { db } from '../../../db/index';
// import { poultryFarms, vetAssignments, supervisorAssignments, users } from '../../../db/schema';
// import { eq, and } from 'drizzle-orm';

// Mock data for field assignments
let fieldAssignments: {
  id: string;
  farmId: string;
  farmName: string;
  ownerId: string;
  ownerName: string;
  assignedVetId?: string;
  assignedVetName?: string;
  assignedVetPhone?: string;
  assignedSupervisorId?: string;
  assignedSupervisorName?: string;
  assignedSupervisorPhone?: string;
  createdAt: string;
  updatedAt: string;
}[] = [
  {
    id: "assignment1",
    farmId: "farm1",
    farmName: "حقل الدواجن النموذجي",
    ownerId: "owner1",
    ownerName: "أحمد محمد علي",
    assignedVetId: "vet1",
    assignedVetName: "د. أحمد محمد الطبيب",
    assignedVetPhone: "+964 770 123 4567",
    assignedSupervisorId: "supervisor1",
    assignedSupervisorName: "م. سارة علي المشرفة",
    assignedSupervisorPhone: "+964 771 987 6543",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock users data
const mockUsers = [
  {
    id: "vet1",
    name: "د. أحمد محمد الطبيب",
    email: "vet1@example.com",
    phone: "+964 770 123 4567",
    userType: "vet" as const,
    specialization: "طب الدواجن",
  },
  {
    id: "vet2",
    name: "د. فاطمة حسن",
    email: "vet2@example.com",
    phone: "+964 771 234 5678",
    userType: "vet" as const,
    specialization: "طب الحيوان العام",
  },
  {
    id: "supervisor1",
    name: "م. سارة علي المشرفة",
    email: "supervisor1@example.com",
    phone: "+964 771 987 6543",
    userType: "user" as const,
    experience: "5 سنوات",
  },
  {
    id: "supervisor2",
    name: "م. محمد أحمد",
    email: "supervisor2@example.com",
    phone: "+964 772 345 6789",
    userType: "user" as const,
    experience: "3 سنوات",
  },
];

// Mock farms data
const mockFarms = [
  {
    id: "farm1",
    name: "حقل الدواجن النموذجي",
    ownerId: "owner1",
    ownerName: "أحمد محمد علي",
    location: "بغداد - الدورة",
  },
  {
    id: "farm2",
    name: "مزرعة الأمل للدواجن",
    ownerId: "owner2",
    ownerName: "فاطمة حسن",
    location: "البصرة - الزبير",
  },
];

export const getFieldAssignments = publicProcedure.query(async () => {
  return fieldAssignments;
});

export const getAvailableVets = publicProcedure.query(async () => {
  return mockUsers.filter((user) => user.userType === "vet");
});

export const getAvailableSupervisors = publicProcedure.query(async () => {
  return mockUsers.filter(
    (user) => user.userType === "user" && user.experience
  );
});

export const getAvailableFarms = publicProcedure.query(async () => {
  return mockFarms;
});

export const assignVetToField = protectedProcedure
  .input(
    z.object({
      farmId: z.string(),
      vetId: z.string(),
      vetName: z.string(),
      vetPhone: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const existingAssignment = fieldAssignments.find(
      (a) => a.farmId === input.farmId
    );

    if (existingAssignment) {
      // Update existing assignment
      existingAssignment.assignedVetId = input.vetId;
      existingAssignment.assignedVetName = input.vetName;
      existingAssignment.assignedVetPhone = input.vetPhone;
      existingAssignment.updatedAt = new Date().toISOString();
    } else {
      // Create new assignment
      const farm = mockFarms.find((f) => f.id === input.farmId);
      if (!farm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Farm not found",
        });
      }

      fieldAssignments.push({
        id: `assignment_${Date.now()}`,
        farmId: input.farmId,
        farmName: farm.name,
        ownerId: farm.ownerId,
        ownerName: farm.ownerName,
        assignedVetId: input.vetId,
        assignedVetName: input.vetName,
        assignedVetPhone: input.vetPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true, message: "تم تعيين الطبيب البيطري بنجاح" };
  });

export const assignSupervisorToField = protectedProcedure
  .input(
    z.object({
      farmId: z.string(),
      supervisorId: z.string(),
      supervisorName: z.string(),
      supervisorPhone: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const existingAssignment = fieldAssignments.find(
      (a) => a.farmId === input.farmId
    );

    if (existingAssignment) {
      // Update existing assignment
      existingAssignment.assignedSupervisorId = input.supervisorId;
      existingAssignment.assignedSupervisorName = input.supervisorName;
      existingAssignment.assignedSupervisorPhone = input.supervisorPhone;
      existingAssignment.updatedAt = new Date().toISOString();
    } else {
      // Create new assignment
      const farm = mockFarms.find((f) => f.id === input.farmId);
      if (!farm) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Farm not found",
        });
      }

      fieldAssignments.push({
        id: `assignment_${Date.now()}`,
        farmId: input.farmId,
        farmName: farm.name,
        ownerId: farm.ownerId,
        ownerName: farm.ownerName,
        assignedSupervisorId: input.supervisorId,
        assignedSupervisorName: input.supervisorName,
        assignedSupervisorPhone: input.supervisorPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return { success: true, message: "تم تعيين المشرف بنجاح" };
  });

export const removeVetFromField = protectedProcedure
  .input(
    z.object({
      farmId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const assignment = fieldAssignments.find((a) => a.farmId === input.farmId);

    if (assignment) {
      assignment.assignedVetId = undefined;
      assignment.assignedVetName = undefined;
      assignment.assignedVetPhone = undefined;
      assignment.updatedAt = new Date().toISOString();
    }

    return { success: true, message: "تم إلغاء تعيين الطبيب البيطري" };
  });

export const removeSupervisorFromField = protectedProcedure
  .input(
    z.object({
      farmId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const assignment = fieldAssignments.find((a) => a.farmId === input.farmId);

    if (assignment) {
      assignment.assignedSupervisorId = undefined;
      assignment.assignedSupervisorName = undefined;
      assignment.assignedSupervisorPhone = undefined;
      assignment.updatedAt = new Date().toISOString();
    }

    return { success: true, message: "تم إلغاء تعيين المشرف" };
  });

export const getFieldAssignment = publicProcedure
  .input(
    z.object({
      farmId: z.string(),
    })
  )
  .query(async ({ input }) => {
    return fieldAssignments.find((a) => a.farmId === input.farmId) || null;
  });

export const getAssignedFieldsForVet = publicProcedure
  .input(
    z.object({
      vetId: z.string(),
    })
  )
  .query(async ({ input }) => {
    return fieldAssignments.filter((a) => a.assignedVetId === input.vetId);
  });

export const getAssignedFieldsForSupervisor = publicProcedure
  .input(
    z.object({
      supervisorId: z.string(),
    })
  )
  .query(async ({ input }) => {
    return fieldAssignments.filter(
      (a) => a.assignedSupervisorId === input.supervisorId
    );
  });

// New procedures for ownership control
const assignVetSchema = z.object({
  vetId: z.number(),
  farmId: z.number(),
  assignedBy: z.number(),
  isPaid: z.boolean().default(false),
  paymentAmount: z.number().optional(),
  notes: z.string().optional(),
});

const assignSupervisorSchema = z.object({
  supervisorId: z.number(),
  farmId: z.number(),
  assignedBy: z.number(),
  notes: z.string().optional(),
});

const getAssignedFieldsForVetSchema = z.object({
  vetId: z.string(),
});

const getAllFieldsForAdminSchema = z.object({
  adminId: z.number(),
});

// Assign veterinarian to farm
export const assignVetProcedure = protectedProcedure
  .input(assignVetSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      // Only admins can assign vets (simplified check)
      // In real app, check admin permissions here

      // Mock implementation - replace with actual database operations
      console.log("Assigning vet:", input);
      const assignment = {
        id: Date.now(),
        vetId: input.vetId,
        farmId: input.farmId,
        assignedBy: input.assignedBy,
        isPaid: input.isPaid,
        paymentAmount: input.paymentAmount,
        notes: input.notes,
      };

      return {
        success: true,
        assignment,
      };
    } catch (error) {
      console.error("Error assigning vet:", error);
      throw new Error("Failed to assign veterinarian");
    }
  });

// Assign supervisor to farm
export const assignSupervisorProcedure = protectedProcedure
  .input(assignSupervisorSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      // Only admins can assign supervisors (simplified check)
      // In real app, check admin permissions here

      // Mock implementation - replace with actual database operations
      console.log("Assigning supervisor:", input);
      const assignment = {
        id: Date.now(),
        supervisorId: input.supervisorId,
        farmId: input.farmId,
        assignedBy: input.assignedBy,
        notes: input.notes,
      };

      return {
        success: true,
        assignment,
      };
    } catch (error) {
      console.error("Error assigning supervisor:", error);
      throw new Error("Failed to assign supervisor");
    }
  });

// Get assigned fields for a specific vet
export const getAssignedFieldsForVetProcedure = protectedProcedure
  .input(getAssignedFieldsForVetSchema)
  .query(async ({ input, ctx }) => {
    try {
      // Vets can only see their own assignments, admins can see all (simplified check)
      // Mock implementation - replace with actual database query
      const assignments = [
        {
          id: 1,
          farmId: 1,
          farmName: "حقل الدواجن النموذجي",
          farmLocation: "بغداد - الدورة",
          ownerName: "أحمد محمد",
          assignedVetPhone: "+964 770 123 4567",
          isPaid: true,
          paymentAmount: 500,
          assignedAt: new Date(),
        },
      ];

      return assignments;
    } catch (error) {
      console.error("Error fetching assigned fields for vet:", error);
      throw new Error("Failed to fetch assigned fields");
    }
  });

// Get all fields for admin (for assignment purposes)
export const getAllFieldsForAdminProcedure = protectedProcedure
  .input(getAllFieldsForAdminSchema)
  .query(async ({ input, ctx }) => {
    try {
      // Only admins can see all fields (simplified check)
      // In real app, check admin permissions here

      // Mock implementation - replace with actual database query
      const fields = [
        {
          id: 1,
          name: "حقل الدواجن النموذجي",
          location: "بغداد - الدورة",
          ownerName: "أحمد محمد",
          ownerEmail: "owner1@example.com",
          ownerPhone: "+964 770 123 4567",
          assignedVetId: null,
          assignedSupervisorId: null,
          status: "active",
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "مزرعة الأمل للدواجن",
          location: "البصرة - الزبير",
          ownerName: "فاطمة حسن",
          ownerEmail: "owner2@example.com",
          ownerPhone: "+964 771 234 5678",
          assignedVetId: null,
          assignedSupervisorId: null,
          status: "active",
          createdAt: new Date(),
        },
      ];

      return fields;
    } catch (error) {
      console.error("Error fetching all fields for admin:", error);
      throw new Error("Failed to fetch fields");
    }
  });

// Get user's own farms
export const getUserFarmsProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    try {
      // Mock implementation - replace with actual database query
      const userFarms = [
        {
          id: 1,
          name: "حقل الدواجن النموذجي",
          location: "بغداد - الدورة",
          description: "حقل دواجن حديث",
          totalArea: 500,
          capacity: 1000,
          assignedVetId: null,
          assignedSupervisorId: null,
          status: "active",
          createdAt: new Date(),
        },
        {
          id: 2,
          name: "مزرعة الأمل للدواجن",
          location: "البصرة - الزبير",
          description: "مزرعة دواجن متطورة",
          totalArea: 750,
          capacity: 1500,
          assignedVetId: null,
          assignedSupervisorId: null,
          status: "active",
          createdAt: new Date(),
        },
      ];

      return userFarms;
    } catch (error) {
      console.error("Error fetching user farms:", error);
      throw new Error("Failed to fetch farms");
    }
  }
);
