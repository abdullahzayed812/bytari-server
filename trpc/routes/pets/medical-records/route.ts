import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import {
  db,
  pets,
  users,
  clinics,
  medicalRecords,
  vaccinations,
  petReminders,
  treatmentCards,
  followUpRequests,
  notifications,
} from "../../../../db";

// Get pet profile with all related data
export const getPetProfileProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      // Get basic pet info
      const [pet] = await db
        .select({
          id: pets.id,
          ownerId: pets.ownerId,
          name: pets.name,
          type: pets.type,
          breed: pets.breed,
          age: pets.age,
          weight: pets.weight,
          color: pets.color,
          gender: pets.gender,
          image: pets.image,
          medicalHistory: pets.medicalHistory,
          vaccinations: pets.vaccinations, // Legacy JSON field
          isLost: pets.isLost,
          createdAt: pets.createdAt,
          updatedAt: pets.updatedAt,
          ownerName: users.name,
          ownerEmail: users.email,
        })
        .from(pets)
        .leftJoin(users, eq(users.id, pets.ownerId))
        .where(eq(pets.id, input.petId));

      if (!pet) {
        throw new Error("Pet not found");
      }

      // Get medical records with clinic info
      const medicalRecordsData = await db
        .select({
          id: medicalRecords.id,
          diagnosis: medicalRecords.diagnosis,
          treatment: medicalRecords.treatment,
          notes: medicalRecords.notes,
          prescriptionImage: medicalRecords.prescriptionImage,
          date: medicalRecords.date,
          clinicName: clinics.name,
        })
        .from(medicalRecords)
        .leftJoin(clinics, eq(clinics.id, medicalRecords.clinicId))
        .where(eq(medicalRecords.petId, input.petId))
        .orderBy(desc(medicalRecords.date));

      // Get vaccinations with clinic info
      const vaccinationsData = await db
        .select({
          id: vaccinations.id,
          name: vaccinations.name,
          date: vaccinations.date,
          nextDate: vaccinations.nextDate,
          notes: vaccinations.notes,
          clinicName: clinics.name,
        })
        .from(vaccinations)
        .leftJoin(clinics, eq(clinics.id, vaccinations.clinicId))
        .where(eq(vaccinations.petId, input.petId))
        .orderBy(desc(vaccinations.date));

      // Get reminders with clinic info
      const remindersData = await db
        .select({
          id: petReminders.id,
          title: petReminders.title,
          description: petReminders.description,
          date: petReminders.reminderDate,
          type: petReminders.reminderType,
          isCompleted: petReminders.isCompleted,
          clinicName: clinics.name,
        })
        .from(petReminders)
        .leftJoin(clinics, eq(clinics.id, petReminders.clinicId))
        .where(eq(petReminders.petId, input.petId))
        .orderBy(desc(petReminders.reminderDate));

      return {
        success: true,
        pet: {
          ...pet,
          medicalRecords: medicalRecordsData,
          vaccinations: vaccinationsData,
          reminders: remindersData,
        },
      };
    } catch (error) {
      console.error("Error fetching pet profile:", error);
      throw new Error("Failed to fetch pet profile");
    }
  });

// Create treatment card
export const createTreatmentCardProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
      medications: z.array(
        z.object({
          name: z.string().min(1),
          dosage: z.string(),
          frequency: z.string(),
          duration: z.string(),
        })
      ),
      instructions: z.string().optional(),
      followUpDate: z.string().optional(), // ISO string
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [treatmentCard] = await db
        .insert(treatmentCards)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          medications: input.medications,
          instructions: input.instructions,
          followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
          status: "pending",
        })
        .returning();

      // Send notification to pet owner
      const pet = await db.query.pets.findFirst({
        where: eq(pets.id, input.petId),
      });
      if (pet) {
        await db.insert(notifications).values({
          userId: pet.ownerId,
          title: "تم إضافة بطاقة علاج جديدة",
          message: `تم إضافة بطاقة علاج جديدة لحيوانك ${pet.name}`,
          type: "new_treatment_card",
          data: { treatmentCardId: treatmentCard.id, petId: input.petId },
        });
      }

      return {
        success: true,
        treatmentCard,
        message: "Treatment card created successfully and sent for approval",
      };
    } catch (error) {
      console.error("Error creating treatment card:", error);
      throw new Error("Failed to create treatment card");
    }
  });

// Create follow-up request
export const createFollowUpRequestProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
      reason: z.string().min(1),
      notes: z.string().optional(),
      urgency: z.enum(["low", "normal", "high"]).default("normal"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [followUpRequest] = await db
        .insert(followUpRequests)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          reason: input.reason,
          notes: input.notes,
          urgency: input.urgency,
          status: "pending",
        })
        .returning();

      // Send notification to pet owner
      const pet = await db.query.pets.findFirst({
        where: eq(pets.id, input.petId),
      });
      if (pet) {
        await db.insert(notifications).values({
          userId: pet.ownerId,
          title: "تم إنشاء طلب متابعة جديد",
          message: `تم إنشاء طلب متابعة جديد لحيوانك ${pet.name}`,
          type: "new_follow_up_request",
          data: { followUpRequestId: followUpRequest.id, petId: input.petId },
        });
      }

      return {
        success: true,
        followUpRequest,
        message: "Follow-up request sent successfully",
      };
    } catch (error) {
      console.error("Error creating follow-up request:", error);
      throw new Error("Failed to create follow-up request");
    }
  });

// Delete medical record
export const deleteMedicalRecordProcedure = protectedProcedure
  .input(
    z.object({
      recordId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await db.delete(medicalRecords).where(eq(medicalRecords.id, input.recordId));

      return {
        success: true,
        message: "Medical record deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting medical record:", error);
      throw new Error("Failed to delete medical record");
    }
  });

// Delete vaccination
export const deleteVaccinationProcedure = protectedProcedure
  .input(
    z.object({
      vaccinationId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await db.delete(vaccinations).where(eq(vaccinations.id, input.vaccinationId));

      return {
        success: true,
        message: "Vaccination deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting vaccination:", error);
      throw new Error("Failed to delete vaccination");
    }
  });

// Delete reminder
export const deleteReminderProcedure = protectedProcedure
  .input(
    z.object({
      reminderId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await db.delete(petReminders).where(eq(petReminders.id, input.reminderId));

      return {
        success: true,
        message: "Reminder deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting reminder:", error);
      throw new Error("Failed to delete reminder");
    }
  });

// Update pet information
export const updatePetProcedure = protectedProcedure
  .input(
    z.object({
      id: z.number(),
      name: z.string().min(1),
      type: z.string().min(1),
      breed: z.string().optional(),
      age: z.number().optional(),
      weight: z.number().optional(),
      color: z.string().optional(),
      gender: z.enum(["male", "female"]),
      image: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [updatedPet] = await db
        .update(pets)
        .set({
          name: input.name,
          type: input.type,
          breed: input.breed,
          age: input.age,
          weight: input.weight,
          color: input.color,
          gender: input.gender,
          image: input.image,
          updatedAt: new Date(),
        })
        .where(eq(pets.id, input.id))
        .returning();

      return {
        success: true,
        pet: updatedPet,
        message: "Pet information updated successfully",
      };
    } catch (error) {
      console.error("Error updating pet:", error);
      throw new Error("Failed to update pet information");
    }
  });
