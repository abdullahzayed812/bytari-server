import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import {
  db,
  users,
  pets,
  userRoles,
  clinicStaff,
  storeStaff,
  unionUsers,
  hospitalFollowers,
  unionFollowers,
  medicalRecords,
  petReminders,
  treatmentCards,
  followUpRequests,
  clinicAccessRequests,
  approvedClinicAccess,
  pendingMedicalActions,
  appointments,
  inquiries,
  consultations,
  orders,
  notifications,
  vaccinations,
} from "../../../../db";
import { eq, like, or, inArray } from "drizzle-orm";

// Get user profile for admin editing
export const getUserProfileProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      adminId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      // TODO: Check admin permissions here

      const user = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

      if (user.length === 0) {
        throw new Error("المستخدم غير موجود");
      }

      return user[0];
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw new Error("فشل في جلب بيانات المستخدم");
    }
  });

// Update user profile by admin
export const updateUserProfileProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      adminId: z.number(),
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      userType: z.enum(["user", "vet", "admin"]),
      avatar: z.string().optional(),
      isActive: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here

      const updatedUser = await db
        .update(users)
        .set({
          name: input.name,
          email: input.email,
          phone: input.phone,
          userType: input.userType,
          avatar: input.avatar,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId))
        .returning();

      if (updatedUser.length === 0) {
        throw new Error("فشل في تحديث بيانات المستخدم");
      }

      return updatedUser[0];
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw new Error("فشل في تحديث بيانات المستخدم");
    }
  });

// Ban/Unban user
export const banUserProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      adminId: z.number(),
      ban: z.boolean(), // true to ban, false to unban
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here

      const updatedUser = await db
        .update(users)
        .set({
          isActive: !input.ban,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId))
        .returning();

      if (updatedUser.length === 0) {
        throw new Error("فشل في تحديث حالة المستخدم");
      }

      // TODO: Log admin activity

      return {
        success: true,
        message: input.ban ? "تم حظر المستخدم بنجاح" : "تم إلغاء حظر المستخدم بنجاح",
        user: updatedUser[0],
      };
    } catch (error) {
      console.error("Error banning/unbanning user:", error);
      throw new Error("فشل في تحديث حالة المستخدم");
    }
  });

// Delete user procedure (updated)
export const deleteUserProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      adminId: z.number(),
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here

      // First, delete all related records in the correct order
      await db.transaction(async (tx) => {
        // 1. Delete user roles
        await tx.delete(userRoles).where(eq(userRoles.userId, input.userId));

        // 2. Delete other user-related records (add more as needed)
        await tx.delete(clinicStaff).where(eq(clinicStaff.userId, input.userId));

        await tx.delete(storeStaff).where(eq(storeStaff.userId, input.userId));

        await tx.delete(unionUsers).where(eq(unionUsers.userId, input.userId));

        await tx.delete(hospitalFollowers).where(eq(hospitalFollowers.userId, input.userId));

        await tx.delete(unionFollowers).where(eq(unionFollowers.userId, input.userId));

        // 3. Delete user's pets and related records
        const userPets = await tx.select({ id: pets.id }).from(pets).where(eq(pets.ownerId, input.userId));

        const petIds = userPets.map((pet) => pet.id);

        if (petIds.length > 0) {
          // Delete records that reference pets
          await tx.delete(medicalRecords).where(inArray(medicalRecords.petId, petIds));

          await tx.delete(vaccinations).where(inArray(vaccinations.petId, petIds));

          await tx.delete(petReminders).where(inArray(petReminders.petId, petIds));

          await tx.delete(treatmentCards).where(inArray(treatmentCards.petId, petIds));

          await tx.delete(followUpRequests).where(inArray(followUpRequests.petId, petIds));

          await tx.delete(clinicAccessRequests).where(inArray(clinicAccessRequests.petId, petIds));

          await tx.delete(approvedClinicAccess).where(inArray(approvedClinicAccess.petId, petIds));

          await tx.delete(pendingMedicalActions).where(inArray(pendingMedicalActions.petId, petIds));

          // Delete the pets
          await tx.delete(pets).where(eq(pets.ownerId, input.userId));
        }

        // 4. Delete other user-related records
        await tx.delete(appointments).where(eq(appointments.userId, input.userId));

        await tx.delete(inquiries).where(eq(inquiries.userId, input.userId));

        await tx.delete(consultations).where(eq(consultations.userId, input.userId));

        await tx.delete(orders).where(eq(orders.userId, input.userId));

        await tx.delete(notifications).where(eq(notifications.userId, input.userId));

        // 5. Finally delete the user
        const deletedUser = await tx.delete(users).where(eq(users.id, input.userId)).returning();

        if (deletedUser.length === 0) {
          throw new Error("فشل في حذف المستخدم");
        }
      });

      // TODO: Log admin activity

      return {
        success: true,
        message: "تم حذف المستخدم بنجاح",
      };
    } catch (error) {
      console.error("Error deleting user:", error);
      throw new Error("فشل في حذف المستخدم: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  });

// List all users for admin
export const listAllUsersProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      userType: z.enum(["user", "vet", "admin"]).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    try {
      // TODO: Check admin permissions here

      let allUsers;

      if (input.userType) {
        allUsers = await db
          .select()
          .from(users)
          .where(eq(users.userType, input.userType))
          .limit(input.limit)
          .offset(input.offset);
      } else {
        allUsers = await db.select().from(users).limit(input.limit).offset(input.offset);
      }

      return {
        success: true,
        users: allUsers,
        count: allUsers.length,
      };
    } catch (error) {
      console.error("Error listing users:", error);
      throw new Error("فشل في جلب قائمة المستخدمين");
    }
  });

// Search users for admin
export const searchUsersProcedure = publicProcedure
  .input(
    z.object({
      query: z.string(),
      adminId: z.number(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    try {
      // TODO: Check admin permissions here

      const searchResults = await db
        .select()
        .from(users)
        .where(
          or(
            like(users.name, `%${input.query}%`),
            like(users.email, `%${input.query}%`),
            like(users.phone, `%${input.query}%`)
          )
        )
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(users.createdAt);

      return searchResults;
    } catch (error) {
      console.error("Error searching users:", error);
      throw new Error("فشل في البحث عن المستخدمين");
    }
  });
