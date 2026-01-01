import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import {
  db,
  vetBooks,
  vetMagazines,
  tips,
  appSections,
  adminActivityLogs,
  vetStores,
  adminContent,
} from "../../../../db";
import { eq, and } from "drizzle-orm";

// Manage Vet Books
export const createVetBookProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      title: z.string().min(1),
      author: z.string().min(1),
      description: z.string().optional(),
      coverImage: z.string().optional(),
      pdfUrl: z.string().optional(),
      isbn: z.string().optional(),
      publisher: z.string().optional(),
      publishYear: z.number().optional(),
      pageCount: z.number().optional(),
      language: z.string().default("ar"),
      category: z.string(),
      tags: z.array(z.string()).optional(),
      isFree: z.boolean().default(true),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const { adminId, tags, ...bookData } = input;

      // Create book
      const [book] = await db
        .insert(vetBooks)
        .values({
          ...bookData,
          tags: tags ? JSON.stringify(tags) : null,
          uploadedBy: adminId,
          isPublished: true,
        })
        .returning();

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId,
        action: "create",
        resource: "vet_book",
        resourceId: book.id,
        details: JSON.stringify({ title: book.title, category: book.category }),
      });

      return book;
    } catch (error) {
      console.error("Error creating vet book:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to create vet book");
    }
  });

export const updateVetBookProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      bookId: z.number(),
      title: z.string().min(1).optional(),
      author: z.string().min(1).optional(),
      description: z.string().optional(),
      coverImage: z.string().optional(),
      pdfUrl: z.string().optional(),
      isbn: z.string().optional().nullable(),
      publisher: z.string().optional().nullable(),
      publishYear: z.number().optional().nullable(),
      pageCount: z.number().optional().nullable(),
      language: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isPublished: z.boolean().optional(),
      isFree: z.boolean().optional(),
      price: z.number().optional(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      const { adminId, bookId, tags, ...updateData } = input;

      // ⭐ Clean up the data before sending to database
      const cleanedData: any = {};

      Object.keys(updateData).forEach((key) => {
        const value = updateData[key];
        // Only include defined values, convert empty strings to null for optional fields
        if (value !== undefined) {
          if (value === "" && ["isbn", "publisher"].includes(key)) {
            cleanedData[key] = null;
          } else {
            cleanedData[key] = value;
          }
        }
      });

      // Update book
      const [updatedBook] = await db
        .update(vetBooks)
        .set({
          ...cleanedData,
          tags: tags ? JSON.stringify(tags) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(vetBooks.id, bookId))
        .returning();

      if (!updatedBook) {
        throw new Error("Book not found");
      }

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId,
        action: "update",
        resource: "vet_book",
        resourceId: bookId,
        details: JSON.stringify(updateData),
      });

      return updatedBook;
    } catch (error) {
      console.error("Error updating vet book:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to update vet book");
    }
  });

export const deleteVetBookProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      bookId: z.number(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      // Soft delete by setting isPublished to false
      const [deletedBook] = await db
        .update(vetBooks)
        .set({
          isPublished: false,
          updatedAt: new Date(),
        })
        .where(eq(vetBooks.id, input.bookId))
        .returning();

      if (!deletedBook) {
        throw new Error("Book not found");
      }

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId: input.adminId,
        action: "delete",
        resource: "vet_book",
        resourceId: input.bookId,
        details: JSON.stringify({ title: deletedBook.title }),
      });

      return { success: true };
    } catch (error) {
      console.error("Error deleting vet book:", error);
      throw new Error("Failed to delete vet book");
    }
  });

// Manage Vet Magazines
export const createVetMagazineProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      coverImage: z.string().optional(),
      author: z.string().optional(),
      authorTitle: z.string().optional(),
      pdfUrl: z.string().optional(),
      issueNumber: z.string().optional(),
      publishDate: z.date().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      isFeatured: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const { adminId, tags, ...magazineData } = input;

      // Create magazine
      const [magazine] = await db
        .insert(vetMagazines)
        .values({
          ...magazineData,
          tags: tags ? JSON.stringify(tags) : null,
          authorId: adminId,
          isPublished: true,
        })
        .returning();

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId,
        action: "create",
        resource: "vet_magazine",
        resourceId: magazine.id,
        details: JSON.stringify({
          title: magazine.title,
          issueNumber: magazine.issueNumber,
        }),
      });

      return magazine;
    } catch (error) {
      console.error("Error creating vet magazine:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to create vet magazine");
    }
  });

export const updateVetMagazineProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      magazineId: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      coverImage: z.string().optional().nullable(),
      pdfUrl: z.string().optional().nullable(),
      issueNumber: z.string().optional().nullable(),
      // ⭐ FIX: Accept both string and date, with coercion
      publishDate: z
        .union([z.string().transform((str) => new Date(str)), z.date()])
        .optional()
        .nullable(),
      category: z.string().optional().nullable(),
      tags: z.array(z.string()).optional().nullable(),
      isPublished: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      const { adminId, magazineId, tags, issueNumber, ...updateData } = input;

      // Prepare update data with proper type handling
      const updatePayload: any = {
        ...updateData,
        updatedAt: new Date(),
      };

      // Handle tags conversion (array to JSON string)
      if (tags !== undefined) {
        updatePayload.tags = tags ? JSON.stringify(tags) : null;
      }

      // Handle issueNumber conversion (string to integer for database)
      if (issueNumber !== undefined) {
        updatePayload.issueNumber = issueNumber ? parseInt(issueNumber) : null;
      }

      // Handle null values properly
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === null) {
          updatePayload[key] = null; // Explicitly set null for database
        }
      });

      // Update magazine
      const [updatedMagazine] = await db
        .update(vetMagazines)
        .set(updatePayload)
        .where(eq(vetMagazines.id, magazineId))
        .returning();

      if (!updatedMagazine) {
        throw new Error("المجلة غير موجودة");
      }

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId,
        action: "update",
        resource: "vet_magazine",
        resourceId: magazineId,
        details: JSON.stringify(updateData),
      });

      return updatedMagazine;
    } catch (error) {
      console.error("Error updating vet magazine:", error);
      throw new Error(error instanceof Error ? error.message : "فشل في تحديث المجلة");
    }
  });
// Delete Vet Magazine
export const deleteVetMagazineProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      magazineId: z.number(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const { adminId, magazineId } = input;

      // First, get the magazine details for logging
      const [magazine] = await db.select().from(vetMagazines).where(eq(vetMagazines.id, magazineId)).limit(1);

      if (!magazine) {
        throw new Error("المجلة غير موجودة");
      }

      // Delete the magazine
      const [deletedMagazine] = await db.delete(vetMagazines).where(eq(vetMagazines.id, magazineId)).returning();

      if (!deletedMagazine) {
        throw new Error("فشل في حذف المجلة");
      }

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId,
        action: "delete",
        resource: "vet_magazine",
        resourceId: magazineId,
        details: JSON.stringify({
          title: magazine.title,
          issueNumber: magazine.issueNumber,
          category: magazine.category,
        }),
      });

      return {
        success: true,
        message: "تم حذف المجلة بنجاح",
        deletedMagazine: deletedMagazine,
      };
    } catch (error) {
      console.error("Error deleting vet magazine:", error);
      throw new Error(error instanceof Error ? error.message : "فشل في حذف المجلة");
    }
  });

// Manage Tips/Articles
export const createTipProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      title: z.string().min(1),
      content: z.string().min(1),
      category: z.string(),
      tags: z.array(z.string()).optional(),
      images: z.array(z.string()).optional(),
      isPublished: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const { adminId, tags, images, ...tipData } = input;

      // Create tip
      const [tip] = await db
        .insert(tips)
        .values({
          title: tipData.title,
          content: tipData.content,
          category: tipData.category,
          images: images ? JSON.stringify(images) : null,
          tags: tags ? JSON.stringify(tags) : null,
          authorId: adminId,
          isPublished: true,
        })
        .returning();

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId,
        action: "create",
        resource: "tip",
        resourceId: tip.id,
        details: JSON.stringify({ title: tip.title, category: tip.category }),
      });

      return tip;
    } catch (error) {
      console.error("Error creating tip:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to create tip");
    }
  });

export const updateTipProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      tipId: z.number(),
      title: z.string().min(1).optional(),
      content: z.string().min(1).optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      images: z.array(z.string()).optional(),
      isPublished: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const { adminId, tipId, tags, images, ...updateData } = input;

      // Prepare update payload
      const updatePayload: any = {
        ...updateData,
        tags: tags ? JSON.stringify(tags) : undefined,
        images: images ? JSON.stringify(images) : undefined,
        updatedAt: new Date(),
      };

      // Update tip
      const [updatedTip] = await db
        .update(tips)
        .set(updatePayload)
        .where(eq(tips.id, tipId))
        .returning();

      if (!updatedTip) {
        throw new Error("Tip not found");
      }

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId,
        action: "update",
        resource: "tip",
        resourceId: tipId,
        details: JSON.stringify(updateData),
      });

      return updatedTip;
    } catch (error) {
      console.error("Error updating tip:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to update tip");
    }
  });

// Get content statistics
export const getContentStatisticsProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      // Get statistics - simplified approach
      const booksResult = await db.select().from(vetBooks).where(eq(vetBooks.isPublished, true));

      const magazinesResult = await db.select().from(vetMagazines).where(eq(vetMagazines.isPublished, true));

      const tipsResult = await db.select().from(tips).where(eq(tips.isPublished, true));

      const sectionsResult = await db.select().from(appSections).where(eq(appSections.isActive, true));

      return {
        books: booksResult.length,
        magazines: magazinesResult.length,
        tips: tipsResult.length,
        sections: sectionsResult.length,
      };
    } catch (error) {
      console.error("Error getting content statistics:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to get content statistics");
    }
  });

// Manage Vet Stores Visibility on Home Page
export const getVetStoresForHomeProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      // Get all active stores with their home visibility status
      const stores = await db
        .select()
        .from(vetStores)
        .where(and(eq(vetStores.isActive, true), eq(vetStores.isVerified, true)));

      return {
        success: true,
        stores: stores.map((store: any) => ({
          ...store,
          images: store.images ? JSON.parse(store.images) : [],
          workingHours: store.workingHours ? JSON.parse(store.workingHours) : null,
        })),
      };
    } catch (error) {
      console.error("Error fetching vet stores for home:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to fetch vet stores");
    }
  });

export const updateStoreHomeVisibilityProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      storeId: z.number(),
      showOnVetHome: z.boolean(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const { adminId, storeId, showOnVetHome } = input;

      // Update store visibility
      const [updatedStore] = await db
        .update(vetStores)
        .set({
          showOnVetHome,
          updatedAt: new Date(),
        })
        .where(eq(vetStores.id, storeId))
        .returning();

      if (!updatedStore) {
        throw new Error("Store not found");
      }

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId,
        action: "update",
        resource: "vet_store_visibility",
        resourceId: storeId,
        details: JSON.stringify({
          storeName: updatedStore.name,
          showOnVetHome,
          action: showOnVetHome ? "show_on_home" : "hide_from_home",
        }),
      });

      return {
        success: true,
        store: {
          ...updatedStore,
          images: updatedStore.images ? JSON.parse(updatedStore.images) : [],
          workingHours: updatedStore.workingHours ? JSON.parse(updatedStore.workingHours) : null,
        },
      };
    } catch (error) {
      console.error("Error updating store home visibility:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to update store visibility");
    }
  });

export const bulkUpdateStoreHomeVisibilityProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      storeIds: z.array(z.number()),
      showOnVetHome: z.boolean(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const { adminId, storeIds, showOnVetHome } = input;

      // Update multiple stores visibility
      const updatedStores = [];
      for (const storeId of storeIds) {
        const [updatedStore] = await db
          .update(vetStores)
          .set({
            showOnVetHome,
            updatedAt: new Date(),
          })
          .where(eq(vetStores.id, storeId))
          .returning();

        if (updatedStore) {
          updatedStores.push(updatedStore);

          // Log activity for each store
          await db.insert(adminActivityLogs).values({
            adminId,
            action: "bulk_update",
            resource: "vet_store_visibility",
            resourceId: storeId,
            details: JSON.stringify({
              storeName: updatedStore.name,
              showOnVetHome,
              action: showOnVetHome ? "show_on_home" : "hide_from_home",
              bulkOperation: true,
            }),
          });
        }
      }

      return {
        success: true,
        updatedCount: updatedStores.length,
        stores: updatedStores.map((store: any) => ({
          ...store,
          images: store.images ? JSON.parse(store.images) : [],
          workingHours: store.workingHours ? JSON.parse(store.workingHours) : null,
        })),
      };
    } catch (error) {
      console.error("Error bulk updating store home visibility:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to bulk update store visibility");
    }
  });

// إجراء خاص لتحديث معلومات التواصل (للأدمن الأساسي فقط)
export const updateContactInfoProcedure = protectedProcedure
  .input(
    z.object({
      email: z.string().email(),
      phone: z.string().min(1),
      whatsapp: z.string().min(1),
      address: z.string().min(1),
      workingHours: z.object({
        sunday_thursday: z.string(),
        friday: z.string(),
        saturday: z.string(),
      }),
    })
  )
  .mutation(async ({ input, ctx }) => {
    // التحقق من أن المستخدم هو الأدمن الأساسي
    const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "zuhairalrawi0@gmail.com";

    // في التطبيق الحقيقي، يجب التحقق من الـ token والصلاحيات
    // هنا سنفترض أن المستخدم مصادق عليه بالفعل

    try {
      const contactData = {
        email: input.email,
        phone: input.phone,
        whatsapp: input.whatsapp,
        address: input.address,
        workingHours: input.workingHours,
      };

      // حفظ معلومات التواصل في قاعدة البيانات
      await db
        .insert(adminContent)
        .values({
          type: "contact_info",
          title: "معلومات التواصل",
          content: JSON.stringify(contactData),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: adminContent.type,
          set: {
            content: JSON.stringify(contactData),
            updatedAt: new Date(),
          },
        });

      return {
        success: true,
        message: "تم تحديث معلومات التواصل بنجاح",
      };
    } catch (error) {
      console.error("خطأ في تحديث معلومات التواصل:", error);
      throw new Error("فشل في تحديث معلومات التواصل");
    }
  });

// إجراء لجلب معلومات التواصل
export const getContactInfoProcedure = publicProcedure.query(async () => {
  try {
    const result = await db.select().from(adminContent).where(eq(adminContent.type, "contact_info")).limit(1);

    if (result.length === 0) {
      // إرجاع البيانات الافتراضية إذا لم توجد بيانات محفوظة
      return {
        success: true,
        contactInfo: {
          email: "support@petcare.com",
          phone: "+964 750 123 4567",
          whatsapp: "+964 750 123 4567",
          address: "بغداد، العراق",
          workingHours: {
            sunday_thursday: "9:00 ص - 6:00 م",
            friday: "10:00 ص - 4:00 م",
            saturday: "مغلق",
          },
        },
      };
    }

    const contactInfo = JSON.parse(result[0].content);

    return {
      success: true,
      contactInfo,
    };
  } catch (error) {
    console.error("خطأ في جلب معلومات التواصل:", error);
    // إرجاع البيانات الافتراضية في حالة الخطأ
    return {
      success: true,
      contactInfo: {
        email: "support@petcare.com",
        phone: "+964 750 123 4567",
        whatsapp: "+964 750 123 4567",
        address: "بغداد، العراق",
        workingHours: {
          sunday_thursday: "9:00 ص - 6:00 م",
          friday: "10:00 ص - 4:00 م",
          saturday: "مغلق",
        },
      },
    };
  }
});
