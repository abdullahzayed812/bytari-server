import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryFarms } from "../../../../db/schema";

const createPoultryFarmSchema = z.object({
  // Required fields
  name: z.string().min(1, "اسم الحقل مطلوب"),
  location: z.string().min(1, "الموقع مطلوب"),
  farmType: z.enum(["broiler", "layer", "breeder", "mixed"], {
    errorMap: () => ({ message: "نوع المزرعة مطلوب" }),
  }),
  ownerId: z.number().int().positive(),

  // Optional fields
  capacity: z.number().int().positive().optional(),
  currentPopulation: z.number().int().min(0).optional(),
  establishedDate: z.string().trim().min(1).optional().or(z.literal("")),
  licenseNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  facilities: z.array(z.string()).optional(),
  healthStatus: z.enum(["healthy", "quarantine", "sick"]).optional(),
  lastInspection: z.string().trim().min(1).optional().or(z.literal("")),
  description: z.string().optional(),
  address: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const createPoultryFarmProcedure = publicProcedure.input(createPoultryFarmSchema).mutation(async ({ input }) => {
  console.log("Creating poultry farm:", input);

  try {
    // Prepare facilities as JSONB
    const facilitiesJson = input.facilities && input.facilities.length > 0 ? input.facilities : null;

    // Prepare images - store as JSON string in text field
    const imagesString = input.images && input.images.length > 0 ? JSON.stringify(input.images) : null;

    // Parse dates if provided and valid
    let establishedDate: Date | null = null;
    if (input.establishedDate && input.establishedDate.trim()) {
      const parsed = new Date(input.establishedDate);
      establishedDate = !isNaN(parsed.getTime()) ? parsed : null;
    }

    let lastInspection: Date | null = null;
    if (input.lastInspection && input.lastInspection.trim()) {
      const parsed = new Date(input.lastInspection);
      lastInspection = !isNaN(parsed.getTime()) ? parsed : null;
    }

    // Insert into database
    const [farm] = await db
      .insert(poultryFarms)
      .values({
        // Required fields
        ownerId: input.ownerId,
        name: input.name,
        location: input.location,
        farmType: input.farmType,

        // Optional fields
        capacity: input.capacity ?? null,
        currentPopulation: input.currentPopulation ?? 0,
        establishedDate: establishedDate,
        licenseNumber: input.licenseNumber ?? null,
        contactPerson: input.contactPerson ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        facilities: facilitiesJson,
        healthStatus: input.healthStatus ?? "healthy",
        lastInspection: lastInspection,
        address: input.address ?? null,
        description: input.description ?? null,
        images: imagesString,

        // Default values
        isActive: true,
        isVerified: false,
      })
      .returning();

    console.log("Poultry farm created successfully:", farm);

    return {
      success: true,
      farm: {
        ...farm,
        facilities: farm.facilities || [],
        images: farm.images ? JSON.parse(farm.images) : [],
      },
      message: "تم إنشاء حقل الدواجن بنجاح",
    };
  } catch (error) {
    console.error("Error creating poultry farm:", error);

    if (error instanceof Error) {
      if (error.message.includes("duplicate key")) {
        throw new Error("يوجد حقل بنفس الاسم مسبقاً");
      }
      if (error.message.includes("foreign key")) {
        throw new Error("المستخدم غير موجود");
      }
    }

    throw new Error("فشل في إنشاء حقل الدواجن");
  }
});

export type CreatePoultryFarmInput = z.infer<typeof createPoultryFarmSchema>;
