import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import {
  db,
  stores,
  veterinarians,
  users,
  storePermissions,
  notifications,
  storeStaff,
  approvalRequests,
  adminNotifications,
} from "../../../../db";

// ============== GET STORE SETTINGS ==============
export const getStoreSettingsProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Get store details
      const [store] = await db.select().from(stores).where(eq(stores.id, input.storeId)).limit(1);

      if (!store) {
        throw new Error("المذخر غير موجود");
      }

      const images = store.images ? (typeof store.images === "string" ? JSON.parse(store.images) : store.images) : [];

      return {
        success: true,
        store: {
          id: store.id,
          name: store.name,
          address: store.address,
          phone: store.phone,
          email: store.email,
          website: store.website,
          latitude: store.latitude,
          longitude: store.longitude,
          workingHours: store.workingHours,
          category: store.category,
          description: store.description,
          logo: store.logo,
          bannerImage: store.bannerImage,
          licenseNumber: store.licenseNumber,
          licenseImage: store.licenseImage,
          images,
          rating: store.rating,
          isActive: store.isActive,
          isVerified: store.isVerified,
          activationEndDate: store.activationEndDate,
          needsRenewal: store.needsRenewal,
          subscriptionStatus: store.subscriptionStatus,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt,
        },
      };
    } catch (error) {
      console.error("❌ Error getting store settings:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب إعدادات المذخر");
    }
  });

// ============== UPDATE BASIC STORE INFO ==============
export const updateStoreBasicInfoProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
      name: z.string().min(1, "اسم المذخر مطلوب"),
      address: z.string().min(1, "العنوان مطلوب"),
      description: z.string().optional(),
      category: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const [updatedStore] = await db
        .update(stores)
        .set({
          name: input.name,
          address: input.address,
          description: input.description,
          category: input.category,
          latitude: input.latitude,
          longitude: input.longitude,
          updatedAt: now,
        })
        .where(eq(stores.id, input.storeId))
        .returning();

      return {
        success: true,
        message: "تم تحديث معلومات المذخر بنجاح",
        store: updatedStore,
      };
    } catch (error) {
      console.error("❌ Error updating store basic info:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث معلومات المذخر");
    }
  });

// ============== UPDATE CONTACT INFO ==============
export const updateStoreContactInfoProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
      phone: z.string().min(1, "رقم الهاتف مطلوب"),
      email: z.string().email("البريد الإلكتروني غير صحيح").optional(),
      website: z.string().url("رابط الموقع غير صحيح").optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const [updatedStore] = await db
        .update(stores)
        .set({
          phone: input.phone,
          email: input.email,
          website: input.website,
          updatedAt: now,
        })
        .where(eq(stores.id, input.storeId))
        .returning();

      return {
        success: true,
        message: "تم تحديث معلومات الاتصال بنجاح",
        store: updatedStore,
      };
    } catch (error) {
      console.error("❌ Error updating contact info:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث معلومات الاتصال");
    }
  });

// ============== UPDATE WORKING HOURS ==============
export const updateStoreWorkingHoursProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
      workingHours: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const [updatedStore] = await db
        .update(stores)
        .set({
          workingHours: input.workingHours,
          updatedAt: now,
        })
        .where(eq(stores.id, input.storeId))
        .returning();

      return {
        success: true,
        message: "تم تحديث ساعات العمل بنجاح",
        store: updatedStore,
      };
    } catch (error) {
      console.error("❌ Error updating working hours:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث ساعات العمل");
    }
  });

// ============== GET STORE STAFF ==============
export const getStoreStaffProcedure = protectedProcedure
  .input(z.object({ storeId: z.number() }))
  .query(async ({ input }) => {
    try {
      const staff = await db
        .select({
          staffId: storeStaff.id,
          id: veterinarians.id,
          userId: veterinarians.userId,
          experience: veterinarians.experience, // READ ONLY
          isVerified: veterinarians.isVerified,
          rating: veterinarians.rating,
          userName: users.name,
          userEmail: users.email,
          userPhone: users.phone,
          userAvatar: users.avatar,
          // Staff assignment info
          assignedAt: storeStaff.assignedAt,
          role: storeStaff.role,
          status: storeStaff.status,
          notes: storeStaff.notes,
        })
        .from(storeStaff)
        .innerJoin(veterinarians, eq(storeStaff.veterinarianId, veterinarians.id))
        .innerJoin(users, eq(veterinarians.userId, users.id))
        .where(and(eq(storeStaff.storeId, input.storeId), eq(storeStaff.isActive, true)));

      return {
        success: true,
        staff: staff.map((s) => ({
          staffId: s.staffId,
          id: s.id,
          userId: s.userId,
          name: s.userName,
          email: s.userEmail,
          phone: s.userPhone,
          avatar: s.userAvatar,
          experience: s.experience, // read only
          isVerified: s.isVerified,
          rating: s.rating,
          assignedAt: s.assignedAt,
          role: s.role,
          status: s.status,
          notes: s.notes,
        })),
      };
    } catch (error) {
      throw new Error("حدث خطأ أثناء جلب موظفي المذخر");
    }
  });

// ============== ADD STAFF MEMBER ==============
export const addStoreStaffProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
      email: z.string().email("البريد الإلكتروني غير صحيح"),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

      if (!user) {
        throw new Error("المستخدم غير موجود");
      }

      // Check if veterinarian exists
      let [vet] = await db.select().from(veterinarians).where(eq(veterinarians.userId, user.id)).limit(1);

      let vetId: number;

      // If not exists → create veterinarian
      if (!vet) {
        const [newVet] = await db
          .insert(veterinarians)
          .values({
            userId: user.id,
            isVerified: false,
          })
          .returning();

        vetId = newVet.id;
      } else {
        vetId = vet.id;
      }

      // Check if already assigned
      const [existing] = await db
        .select()
        .from(storeStaff)
        .where(
          and(
            eq(storeStaff.storeId, input.storeId),
            eq(storeStaff.veterinarianId, vetId),
            eq(storeStaff.isActive, true)
          )
        )
        .limit(1);

      if (existing) {
        throw new Error("هذا الطبيب موجود بالفعل في المذخر");
      }

      const [staffAssignment] = await db
        .insert(storeStaff)
        .values({
          storeId: input.storeId,
          veterinarianId: vetId,
          userId: user.id,
          addedBy: userId,
          role: input.role,
          notes: input.notes,
          status: "active",
          isActive: true,
        })
        .returning();

      // Get store name for notification
      const [store] = await db.select().from(stores).where(eq(stores.id, input.storeId)).limit(1);

      // Send notification
      await db.insert(notifications).values({
        userId: user.id,
        title: "تمت إضافتك كطبيب في عيادة",
        message: `تمت إضافتك إلى عيادة ${store?.name || "عيادة جديدة"} كعضو في الفريق الطبي.`,
        type: "vet_added",
        data: {
          storeId: input.storeId,
          veterinarianId: vetId,
          staffId: staffAssignment.id,
        },
      });

      return {
        success: true,
        message: "تم إضافة الطبيب بنجاح",
        staffAssignment,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "خطأ في إضافة الطبيب");
    }
  });

// ============== REMOVE STAFF MEMBER ==============
export const removeStoreStaffProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
      veterinarianId: z.number(), // veterinarianId
    })
  )
  .mutation(async ({ input }) => {
    try {
      const now = new Date();

      const [staffAssignment] = await db
        .select()
        .from(storeStaff)
        .where(
          and(
            eq(storeStaff.storeId, input.storeId),
            eq(storeStaff.veterinarianId, input.veterinarianId),
            eq(storeStaff.isActive, true)
          )
        )
        .limit(1);

      if (!staffAssignment) {
        throw new Error("الطبيب غير موجود في هذا المذخر");
      }

      await db
        .update(storeStaff)
        .set({
          isActive: false,
          status: "removed",
          removedAt: now,
        })
        .where(eq(storeStaff.id, staffAssignment.id));

      await db
        .update(storePermissions)
        .set({
          isActive: false,
          updatedAt: now,
        })
        .where(
          and(eq(storePermissions.storeId, input.storeId), eq(storePermissions.veterinarianId, input.veterinarianId))
        );

      return {
        success: true,
        message: "تم إزالة الطبيب من المذخر بنجاح",
      };
    } catch (error) {
      throw new Error("حدث خطأ أثناء إزالة الطبيب");
    }
  });

// ============== UPDATE STORE IMAGES ==============
export const updateStoreImagesProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
      images: z.array(z.string()),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const [updatedStore] = await db
        .update(stores)
        .set({
          images: JSON.stringify(input.images),
          updatedAt: now,
        })
        .where(eq(stores.id, input.storeId))
        .returning();

      return {
        success: true,
        message: "تم تحديث الصور بنجاح",
        store: updatedStore,
      };
    } catch (error) {
      console.error("❌ Error updating images:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الصور");
    }
  });

// ============== GET SUBSCRIPTION STATUS ==============
export const getStoreSubscriptionProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const [store] = await db
        .select({
          id: stores.id,
          name: stores.name,
          isActive: stores.isActive,
          activationStartDate: stores.activationStartDate,
          activationEndDate: stores.activationEndDate,
          needsRenewal: stores.needsRenewal,
          subscriptionStatus: stores.subscriptionStatus,
        })
        .from(stores)
        .where(eq(stores.id, input.storeId))
        .limit(1);

      if (!store) {
        throw new Error("المذخر غير موجود");
      }

      // Calculate subscription status
      const now = new Date();
      const endDate = store.activationEndDate ? new Date(store.activationEndDate) : null;
      const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      return {
        success: true,
        subscription: {
          isActive: store.isActive,
          startDate: store.activationStartDate,
          endDate: store.activationEndDate,
          needsRenewal: daysRemaining && daysRemaining < 1,
          daysRemaining,
          status: store.isActive ? (daysRemaining && daysRemaining < 30 ? "expiring_soon" : "active") : "inactive",
        },
      };
    } catch (error) {
      console.error("❌ Error getting subscription:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب حالة الاشتراك");
    }
  });

// ============== UPDATE PERMISSIONS ==============
export const updateStorePermissionsProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
      permissions: z.array(
        z.object({
          veterinarianId: z.number(),
          permission: z.enum(["all", "view_edit_inventory", "view_only", "orders_only"]),
        })
      ),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const permissionMap = {
        all: {
          canViewProducts: true,
          canEditProducts: true,
          canAddProducts: true,
          canDeleteProducts: true,
          canManageOrders: true,
          canViewReports: true,
          canManageStaff: true,
          canManageSettings: true,
        },
        view_edit_inventory: {
          canViewProducts: true,
          canEditProducts: true,
          canAddProducts: true,
          canDeleteProducts: false, // optional
          canManageOrders: false,
          canViewReports: false,
          canManageStaff: false,
          canManageSettings: false,
        },
        view_only: {
          canViewProducts: true,
          canEditProducts: false,
          canAddProducts: false,
          canDeleteProducts: false,
          canManageOrders: false,
          canViewReports: false,
          canManageStaff: false,
          canManageSettings: false,
        },
        orders_only: {
          canViewProducts: false,
          canEditProducts: false,
          canAddProducts: false,
          canDeleteProducts: false,
          canManageOrders: true,
          canViewReports: false,
          canManageStaff: false,
          canManageSettings: false,
        },
      };

      const updatePromises = input.permissions.map(async ({ veterinarianId, permission }) => {
        // 1️⃣ Validate user belongs to this store
        const [staffRecord] = await db
          .select()
          .from(storeStaff)
          .where(
            and(
              eq(storeStaff.veterinarianId, veterinarianId),
              eq(storeStaff.storeId, input.storeId),
              eq(storeStaff.isActive, true)
            )
          )
          .limit(1);

        if (!staffRecord) {
          throw new Error(`الموظف ذو المعرف ${veterinarianId} غير موجود في هذا المتجر`);
        }

        // 2️⃣ Update role in store_staff
        await db
          .update(storeStaff)
          .set({
            role: permission,
            updatedAt: now,
          })
          .where(eq(storeStaff.id, staffRecord.id));

        // 3️⃣ Check if store_permissions row exists
        const [existingPermission] = await db
          .select()
          .from(storePermissions)
          .where(and(eq(storePermissions.veterinarianId, veterinarianId), eq(storePermissions.storeId, input.storeId)))
          .limit(1);

        if (existingPermission) {
          // 4️⃣ Update existing permissions
          await db
            .update(storePermissions)
            .set({
              role: permission,
              ...permissionMap[permission],
              updatedAt: now,
            })
            .where(eq(storePermissions.id, existingPermission.id));
        } else {
          // 5️⃣ Insert new permission row
          await db.insert(storePermissions).values({
            storeId: input.storeId,
            veterinarianId,
            role: permission,
            ...permissionMap[permission],
            createdAt: now,
          });
        }

        return { veterinarianId, permission, updated: true };
      });

      const results = await Promise.all(updatePromises);

      return {
        success: true,
        message: "تم تحديث صلاحيات المتجر بنجاح",
        results,
      };
    } catch (error) {
      console.error("❌ Error updating store permissions:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الصلاحيات");
    }
  });

// ============== REQUEST STORE RENEWAL ==============
export const requestStoreRenewalProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Get store details
      const [store] = await db.select().from(stores).where(eq(stores.id, input.storeId)).limit(1);

      if (!store) {
        throw new Error("المذخر غير موجود");
      }

      // Check if user owns this store
      if (store.ownerId !== userId) {
        throw new Error("ليس لديك صلاحية لتجديد هذا المذخر");
      }

      // Check if there's already a pending renewal request
      const [existingRequest] = await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.requesterId, userId),
            eq(approvalRequests.resourceId, input.storeId),
            eq(approvalRequests.requestType, "store_renewal"),
            eq(approvalRequests.status, "pending")
          )
        )
        .limit(1);

      if (existingRequest) {
        throw new Error("يوجد طلب تجديد قيد المراجعة بالفعل");
      }

      const renewalAmount = 800; // Renewal fee for store

      // Create renewal approval request
      const [renewalRequest] = await db
        .insert(approvalRequests)
        .values({
          requestType: "store_renewal",
          requesterId: userId,
          resourceId: input.storeId,
          title: `طلب تجديد اشتراك مذخر ${store.name}`,
          description: `طلب تجديد اشتراك المذخر لمدة سنة إضافية`,
          paymentAmount: renewalAmount,
          paymentStatus: "not_required",
          priority: "normal",
          status: "pending",
        })
        .returning();

      // Update store review renewal
      await db
        .update(stores)
        .set({
          reviewingRenewalRequest: true,
        })
        .where(eq(stores.id, input.storeId));

      // Notify all admins
      const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.userType, "admin"));

      for (const admin of adminUsers) {
        await db.insert(adminNotifications).values({
          recipientId: admin.id,
          type: "approval_request",
          title: "طلب تجديد اشتراك مذخر جديد",
          content: `طلب تجديد اشتراك من ${store.name}`,
          relatedResourceType: "approval_request",
          relatedResourceId: renewalRequest.id,
          priority: "normal",
        });
      }

      return {
        success: true,
        message: "تم إرسال طلب التجديد بنجاح",
        requestId: renewalRequest.id,
      };
    } catch (error) {
      console.error("❌ Error requesting store renewal:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء طلب تجديد الاشتراك");
    }
  });
