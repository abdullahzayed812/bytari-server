import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, pets, users } from "../../../../db";

const createPetSchema = z.object({
  ownerId: z.number(),
  name: z.string().min(1),
  type: z.string().min(1),
  breed: z.string().optional(),
  age: z.number().optional(),
  weight: z.number().optional(),
  color: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
  medicalHistory: z.string().optional(),
  vaccinations: z.string().optional(),
});

export const createPetProcedure = protectedProcedure.input(createPetSchema).mutation(async ({ ctx, input }) => {
  try {
    const [newPet] = await db
      .insert(pets)
      .values({
        ownerId: input.ownerId,
        name: input.name,
        type: input.type,
        breed: input.breed,
        age: input.age,
        weight: input.weight,
        color: input.color,
        gender: input.gender,
        image: input.image,
        images: input.images,
        medicalHistory: input.medicalHistory,
        vaccinations: input.vaccinations
          ? JSON.parse(JSON.stringify(input.vaccinations.split(",").map((v) => v.trim())))
          : [],
      })
      .returning();

    return { success: true, pet: newPet };
  } catch (error) {
    console.error("Error creating pet:", error);
    throw new Error("فشل في إنشاء الحيوان الأليف");
  }
});
