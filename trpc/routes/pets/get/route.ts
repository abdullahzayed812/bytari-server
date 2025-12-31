import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { adoptionPets, breedingPets, db, lostPets, pets, users } from "../../../../db";

export const getAllPetsProcedure = protectedProcedure
  .input(
    z.object({
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    })
  )
  .query(async ({ input }) => {
    const allPets = await db
      .select({
        id: pets.id,
        name: pets.name,
        type: pets.type,
        breed: pets.breed,
        age: pets.age,
        weight: pets.weight,
        color: pets.color,
        gender: pets.gender,
        image: pets.image,
        medicalHistory: pets.medicalHistory,
        vaccinations: pets.vaccinations,
        isLost: pets.isLost,
        createdAt: pets.createdAt,
        updatedAt: pets.updatedAt,
        ownerId: pets.ownerId,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(pets)
      .leftJoin(users, eq(users.id, pets.ownerId))
      .orderBy(desc(pets.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return {
      success: true,
      pets: allPets,
    };
  });

// Get lost pet details by ID
export const getLostPetDetailsProcedure = protectedProcedure
  .input(
    z.object({
      id: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const [pet] = await db
        .select({
          // Pet details
          id: lostPets.id,
          ownerId: lostPets.ownerId,
          name: lostPets.name,
          type: lostPets.type,
          breed: lostPets.breed,
          age: lostPets.age,
          weight: lostPets.weight,
          color: lostPets.color,
          gender: lostPets.gender,
          image: lostPets.image,
          description: lostPets.description,
          images: lostPets.images,
          contactInfo: lostPets.contactInfo,
          location: lostPets.location,

          // Lost pet specific fields
          lastSeenLocation: lostPets.lastSeenLocation,
          lastSeenDate: lostPets.lastSeenDate,
          latitude: lostPets.latitude,
          longitude: lostPets.longitude,
          reward: lostPets.reward,
          specialRequirements: lostPets.specialRequirements,
          status: lostPets.status,

          // Owner details
          ownerName: users.name,
          ownerEmail: users.email,
          ownerPhone: users.phone,

          // Timestamps
          createdAt: lostPets.createdAt,
          updatedAt: lostPets.updatedAt,
        })
        .from(lostPets)
        .leftJoin(users, eq(lostPets.ownerId, users.id))
        .where(
          and(
            eq(lostPets.id, input.id),
            eq(lostPets.status, "lost") // Only return approved lost pets
          )
        );

      if (!pet) {
        throw new Error("الحيوان المفقود غير موجود");
      }

      // Parse contact info if it's stored as JSON string
      let contactInfo = {};
      if (pet.contactInfo) {
        try {
          contactInfo = typeof pet.contactInfo === "string" ? JSON.parse(pet.contactInfo) : pet.contactInfo;
        } catch (error) {
          // If parsing fails, assume it's a plain string
          contactInfo = {
            ownerId: pet.ownerId,
            name: pet.ownerName,
            phone: pet.ownerPhone,
            email: pet.ownerEmail,
            additionalInfo: pet.contactInfo,
          };
        }
      } else {
        // Fallback to owner info if no contact info
        contactInfo = {
          name: pet.ownerName,
          phone: pet.ownerPhone,
          email: pet.ownerEmail,
        };
      }

      // Parse images array
      const images = pet.images ? (typeof pet.images === "string" ? JSON.parse(pet.images) : pet.images) : [];

      return {
        success: true,
        pet: {
          id: pet.id,
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          age: pet.age,
          weight: pet.weight,
          color: pet.color,
          gender: pet.gender,
          image: pet.image,
          description: pet.description,
          images: images,
          contactInfo: contactInfo,
          location: pet.location,
          lastSeen: {
            location: pet.lastSeenLocation,
            date: pet.lastSeenDate,
            latitude: pet.latitude,
            longitude: pet.longitude,
          },
          reward: pet.reward,
          specialRequirements: pet.specialRequirements,
          status: pet.status,
          ownerName: pet.ownerName,
          createdAt: pet.createdAt,
          updatedAt: pet.updatedAt,
        },
      };
    } catch (error) {
      console.error("Error fetching lost pet details:", error);
      throw new Error("فشل في جلب تفاصيل الحيوان المفقود");
    }
  });

// Get adoption or breeding pet details by ID
export const getAdoptionBreedingPetDetailsProcedure = protectedProcedure
  .input(
    z.object({
      id: z.number(),
      type: z.enum(["adoption", "breeding"]),
    })
  )
  .query(async ({ input }) => {
    try {
      let pet;

      if (input.type === "adoption") {
        [pet] = await db
          .select({
            // Pet details
            id: adoptionPets.id,
            name: adoptionPets.name,
            type: adoptionPets.type,
            breed: adoptionPets.breed,
            age: adoptionPets.age,
            weight: adoptionPets.weight,
            color: adoptionPets.color,
            gender: adoptionPets.gender,
            image: adoptionPets.image,
            description: adoptionPets.description,
            images: adoptionPets.images,
            contactInfo: adoptionPets.contactInfo,
            location: adoptionPets.location,
            price: adoptionPets.price,
            specialRequirements: adoptionPets.specialRequirements,

            // Status
            isAvailable: adoptionPets.isAvailable,
            isClosedByOwner: adoptionPets.isClosedByOwner,

            // Owner details
            ownerId: users.id,
            ownerName: users.name,
            ownerEmail: users.email,
            ownerPhone: users.phone,

            // Timestamps
            createdAt: adoptionPets.createdAt,
            updatedAt: adoptionPets.updatedAt,
          })
          .from(adoptionPets)
          .leftJoin(users, eq(adoptionPets.ownerId, users.id))
          .where(
            and(
              eq(adoptionPets.id, input.id),
              eq(adoptionPets.isAvailable, true) // Only return available pets
            )
          );
      } else {
        [pet] = await db
          .select({
            // Pet details
            id: breedingPets.id,
            name: breedingPets.name,
            type: breedingPets.type,
            breed: breedingPets.breed,
            age: breedingPets.age,
            weight: breedingPets.weight,
            color: breedingPets.color,
            gender: breedingPets.gender,
            image: breedingPets.image,
            description: breedingPets.description,
            images: breedingPets.images,
            contactInfo: breedingPets.contactInfo,
            location: breedingPets.location,
            price: breedingPets.price,
            specialRequirements: breedingPets.specialRequirements,

            // Breeding specific fields
            pedigree: breedingPets.pedigree,
            healthCertificates: breedingPets.healthCertificates,
            breedingHistory: breedingPets.breedingHistory,

            // Status
            isAvailable: breedingPets.isAvailable,
            isClosedByOwner: breedingPets.isClosedByOwner,

            // Owner details
            ownerId: users.id,
            ownerName: users.name,
            ownerEmail: users.email,
            ownerPhone: users.phone,

            // Timestamps
            createdAt: breedingPets.createdAt,
            updatedAt: breedingPets.updatedAt,
          })
          .from(breedingPets)
          .leftJoin(users, eq(breedingPets.ownerId, users.id))
          .where(
            and(
              eq(breedingPets.id, input.id),
              eq(breedingPets.isAvailable, true) // Only return available pets
            )
          );
      }

      if (!pet) {
        throw new Error("الحيوان غير موجود");
      }

      // Parse contact info
      let contactInfo = {};
      if (pet.contactInfo) {
        try {
          contactInfo = typeof pet.contactInfo === "string" ? JSON.parse(pet.contactInfo) : pet.contactInfo;
        } catch (error) {
          // If parsing fails, assume it's a plain string or use owner info
          contactInfo = {
            ownerId: pet.ownerId,
            name: pet.ownerName,
            phone: pet.ownerPhone,
            email: pet.ownerEmail,
            additionalInfo: pet.contactInfo,
          };
        }
      } else {
        // Fallback to owner info
        contactInfo = {
          ownerId: pet.ownerId,
          name: pet.ownerName,
          phone: pet.ownerPhone,
          email: pet.ownerEmail,
        };
      }

      // Parse images array
      const images = pet.images ? (typeof pet.images === "string" ? JSON.parse(pet.images) : pet.images) : [];

      // Parse breeding-specific fields if they exist
      const healthCertificates = (pet as any).healthCertificates
        ? typeof (pet as any).healthCertificates === "string"
          ? JSON.parse((pet as any).healthCertificates)
          : (pet as any).healthCertificates
        : [];

      const breedingHistory = (pet as any).breedingHistory
        ? typeof (pet as any).breedingHistory === "string"
          ? JSON.parse((pet as any).breedingHistory)
          : (pet as any).breedingHistory
        : [];

      return {
        success: true,
        pet: {
          id: pet.id,
          name: pet.name,
          type: pet.type,
          breed: pet.breed,
          age: pet.age,
          weight: pet.weight,
          color: pet.color,
          gender: pet.gender,
          image: pet.image,
          description: pet.description,
          images: images,
          contactInfo: contactInfo,
          location: pet.location,
          price: pet.price,
          specialRequirements: pet.specialRequirements,
          isAvailable: pet.isAvailable,
          ownerName: pet.ownerName,
          ownerId: pet.ownerId,
          // Breeding specific fields
          pedigree: (pet as any).pedigree,
          healthCertificates: healthCertificates,
          breedingHistory: breedingHistory,
          createdAt: pet.createdAt,
          updatedAt: pet.updatedAt,
        },
      };
    } catch (error) {
      console.error("Error fetching pet details:", error);
      throw new Error("فشل في جلب تفاصيل الحيوان");
    }
  });
