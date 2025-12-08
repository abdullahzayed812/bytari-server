import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, vetStores, users } from "../../../../db";
import { eq } from "drizzle-orm";

export const getVetStoreByIdProcedure = publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
        try {
            const [store] = await db
                .select({
                    id: vetStores.id,
                    ownerId: vetStores.ownerId,
                    name: vetStores.name,
                    description: vetStores.description,
                    address: vetStores.address,
                    phone: vetStores.phone,
                    email: vetStores.email,
                    website: vetStores.website,
                    logo: vetStores.logo,
                    bannerImage: vetStores.bannerImage,
                    category: vetStores.category,
                    isActive: vetStores.isActive,
                    isVerified: vetStores.isVerified,
                    rating: vetStores.rating,
                    workingHours: vetStores.workingHours,
                    images: vetStores.images,
                    services: vetStores.services,
                    createdAt: vetStores.createdAt,
                    ownerName: users.name,
                })
                .from(vetStores)
                .innerJoin(users, eq(vetStores.ownerId, users.id))
                .where(eq(vetStores.id, input.id))
                .limit(1);

            if (!store) {
                throw new Error("المذخر غير موجود");
            }

            return {
                success: true,
                store,
            };
        } catch (error) {
            console.error("Error fetching vet store details:", error);
            throw new Error("فشل في جلب تفاصيل المذخر");
        }
    });
