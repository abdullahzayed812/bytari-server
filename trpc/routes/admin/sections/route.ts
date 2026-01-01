import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { db, appSections, adminActivityLogs } from "../../../../db";
import { eq, and, asc, or } from "drizzle-orm";

export const listSectionsProcedure = publicProcedure
    .input(z.object({
        adminId: z.number().optional(),
        userType: z.string().optional(), // 'pet_owner', 'veterinarian', 'admin', 'all'
    }))
    .query(async ({ input }) => {
        try {
            let query = db.select().from(appSections);

            if (input.userType && input.userType !== 'all') {
                // @ts-ignore
                query = query.where(or(eq(appSections.userType, input.userType), eq(appSections.userType, 'all')));
            }

            return await query.orderBy(asc(appSections.order));
        } catch (error) {
            console.error("Error listing sections:", error);
            throw new Error("Failed to list sections");
        }
    });

export const createSectionProcedure = publicProcedure
    .input(z.object({
        adminId: z.number(),
        name: z.string(),
        title: z.string(),
        description: z.string().optional(),
        icon: z.string(),
        color: z.string(),
        route: z.string(),
        userType: z.string().default("all"),
        order: z.number().default(0),
        isSystem: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
        try {
            const { adminId, ...sectionData } = input;
            const [section] = await db.insert(appSections).values(sectionData).returning();

            await db.insert(adminActivityLogs).values({
                adminId,
                action: "create",
                resource: "app_section",
                resourceId: section.id,
                details: JSON.stringify(sectionData),
            });

            return section;
        } catch (error) {
            console.error("Error creating section:", error);
            throw new Error("Failed to create section");
        }
    });

export const updateSectionProcedure = publicProcedure
    .input(z.object({
        adminId: z.number(),
        sectionId: z.number(),
        name: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        route: z.string().optional(),
        isActive: z.boolean().optional(),
        order: z.number().optional(),
        userType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
        try {
            const { adminId, sectionId, ...updateData } = input;
            const [updatedSection] = await db
                .update(appSections)
                .set({
                    ...updateData,
                    updatedAt: new Date(),
                })
                .where(eq(appSections.id, sectionId))
                .returning();

            if (!updatedSection) throw new Error("Section not found");

            await db.insert(adminActivityLogs).values({
                adminId,
                action: "update",
                resource: "app_section",
                resourceId: sectionId,
                details: JSON.stringify(updateData),
            });

            return updatedSection;
        } catch (error) {
            console.error("Error updating section:", error);
            throw new Error("Failed to update section");
        }
    });

export const deleteSectionProcedure = publicProcedure
    .input(z.object({
        adminId: z.number(),
        sectionId: z.number(),
    }))
    .mutation(async ({ input }) => {
        try {
            const [section] = await db.select().from(appSections).where(eq(appSections.id, input.sectionId)).limit(1);
            if (!section) throw new Error("Section not found");
            if (section.isSystem) throw new Error("Cannot delete system sections");

            await db.delete(appSections).where(eq(appSections.id, input.sectionId));

            await db.insert(adminActivityLogs).values({
                adminId: input.adminId,
                action: "delete",
                resource: "app_section",
                resourceId: input.sectionId,
                details: JSON.stringify({ name: section.name, title: section.title }),
            });

            return { success: true };
        } catch (error) {
            console.error("Error deleting section:", error);
            throw new Error(error instanceof Error ? error.message : "Failed to delete section");
        }
    });

export const reorderSectionsProcedure = publicProcedure
    .input(z.object({
        adminId: z.number(),
        orders: z.array(z.object({
            id: z.number(),
            order: z.number(),
        })),
    }))
    .mutation(async ({ input }) => {
        try {
            for (const item of input.orders) {
                await db.update(appSections).set({ order: item.order }).where(eq(appSections.id, item.id));
            }

            await db.insert(adminActivityLogs).values({
                adminId: input.adminId,
                action: "reorder",
                resource: "app_section",
                details: JSON.stringify(input.orders),
            });

            return { success: true };
        } catch (error) {
            console.error("Error reordering sections:", error);
            throw new Error("Failed to reorder sections");
        }
    });
