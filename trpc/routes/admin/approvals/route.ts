import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import {
  db,
  approvalRequests,
  adminNotifications,
  emailNotifications,
  users,
  veterinarians,
  clinics,
  stores,
} from "../../../../db";
import { eq, and, desc } from "drizzle-orm";

// Get pending approval requests
export const getPendingApprovalsProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      type: z
        .enum(["all", "vet_registration", "clinic_activation", "store_activation", "clinic_renewal", "store_renewal"])
        .optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      // Get regular approval requests
      let approvalQuery = db
        .select({
          id: approvalRequests.id,
          requestType: approvalRequests.requestType,
          requesterId: approvalRequests.requesterId,
          resourceId: approvalRequests.resourceId,
          title: approvalRequests.title,
          description: approvalRequests.description,
          documents: approvalRequests.documents,
          licenseImages: approvalRequests.licenseImages,
          identityImages: approvalRequests.identityImages,
          officialDocuments: approvalRequests.officialDocuments,
          paymentStatus: approvalRequests.paymentStatus,
          paymentAmount: approvalRequests.paymentAmount,
          paymentMethod: approvalRequests.paymentMethod,
          paymentTransactionId: approvalRequests.paymentTransactionId,
          paymentCompletedAt: approvalRequests.paymentCompletedAt,
          paymentReceipt: approvalRequests.paymentReceipt,
          status: approvalRequests.status,
          priority: approvalRequests.priority,
          createdAt: approvalRequests.createdAt,
          requesterName: users.name,
          requesterEmail: users.email,
        })
        .from(approvalRequests)
        .innerJoin(users, eq(approvalRequests.requesterId, users.id))
        .where(eq(approvalRequests.status, "pending"))
        .orderBy(desc(approvalRequests.createdAt));

      if (input.type && input.type !== "all" && !input.type.includes("renewal")) {
        const requests = await db
          .select({
            id: approvalRequests.id,
            requestType: approvalRequests.requestType,
            requesterId: approvalRequests.requesterId,
            resourceId: approvalRequests.resourceId,
            title: approvalRequests.title,
            description: approvalRequests.description,
            documents: approvalRequests.documents,
            licenseImages: approvalRequests.licenseImages,
            identityImages: approvalRequests.identityImages,
            officialDocuments: approvalRequests.officialDocuments,
            paymentStatus: approvalRequests.paymentStatus,
            paymentAmount: approvalRequests.paymentAmount,
            paymentMethod: approvalRequests.paymentMethod,
            paymentTransactionId: approvalRequests.paymentTransactionId,
            paymentCompletedAt: approvalRequests.paymentCompletedAt,
            paymentReceipt: approvalRequests.paymentReceipt,
            status: approvalRequests.status,
            priority: approvalRequests.priority,
            createdAt: approvalRequests.createdAt,
            requesterName: users.name,
            requesterEmail: users.email,
          })
          .from(approvalRequests)
          .innerJoin(users, eq(approvalRequests.requesterId, users.id))
          .where(and(eq(approvalRequests.status, "pending"), eq(approvalRequests.requestType, input.type)))
          .orderBy(desc(approvalRequests.createdAt));

        return { success: true, approvals: requests };
      }

      // Define the type based on the actual query structure
      type ApprovalRequest = {
        id: number;
        requestType: string;
        requesterId: number;
        resourceId: number;
        title: string;
        description: string | null;
        documents: string | null;
        licenseImages: string | null;
        identityImages: string | null;
        officialDocuments: string | null;
        paymentStatus: string;
        paymentAmount: number | null;
        paymentMethod: string | null;
        paymentTransactionId: string | null;
        paymentCompletedAt: Date | null;
        paymentReceipt: string | null;
        status: string;
        priority: string;
        createdAt: Date;
        requesterName: string | null;
        requesterEmail: string | null;
      };

      let allRequests: ApprovalRequest[] = [];

      // Get regular approval requests
      if (!input.type || input.type === "all" || !input.type.includes("renewal")) {
        const regularRequests = await approvalQuery;
        allRequests = [...allRequests, ...regularRequests];
      }

      // Get clinics that need renewal
      if (!input.type || input.type === "all" || input.type === "clinic_renewal") {
        const expiredClinics = await db
          .select({
            id: clinics.id,
            name: clinics.name,
            activationEndDate: clinics.activationEndDate,
            ownerId: users.id,
            ownerName: users.name,
            ownerEmail: users.email,
          })
          .from(clinics)
          .innerJoin(users, eq(clinics.id, users.id)) // Assuming clinic owner relationship
          .where(and(eq(clinics.needsRenewal, true), eq(clinics.isActive, false)));

        const renewalRequests = expiredClinics.map((clinic) => ({
          id: clinic.id + 10000, // Offset to avoid ID conflicts
          requestType: "clinic_renewal" as const,
          requesterId: clinic.ownerId,
          resourceId: clinic.id,
          title: `طلب تجديد اشتراك عيادة ${clinic.name}`,
          description: `انتهت صلاحية تفعيل العيادة في ${
            clinic.activationEndDate ? new Date(clinic.activationEndDate).toLocaleDateString("ar-SA") : "غير محدد"
          }`,
          documents: null,
          licenseImages: null,
          identityImages: null,
          officialDocuments: null,
          paymentStatus: "pending" as const,
          paymentAmount: 1200,
          paymentMethod: null,
          paymentTransactionId: null,
          paymentCompletedAt: null,
          paymentReceipt: null,
          status: "pending",
          priority: "high",
          createdAt: clinic.activationEndDate || new Date(),
          requesterName: clinic.ownerName,
          requesterEmail: clinic.ownerEmail,
        }));

        allRequests = [...allRequests, ...renewalRequests];
      }

      // Get stores that need renewal
      if (!input.type || input.type === "all" || input.type === "store_renewal") {
        const expiredStores = await db
          .select({
            id: stores.id,
            name: stores.name,
            activationEndDate: stores.activationEndDate,
            ownerId: stores.ownerId,
            ownerName: users.name,
            ownerEmail: users.email,
          })
          .from(stores)
          .innerJoin(users, eq(stores.ownerId, users.id))
          .where(and(eq(stores.needsRenewal, true), eq(stores.isActive, false)));

        const renewalRequests = expiredStores.map((store) => ({
          id: store.id + 20000, // Offset to avoid ID conflicts
          requestType: "store_renewal" as const,
          requesterId: store.ownerId,
          resourceId: store.id,
          title: `طلب تجديد اشتراك مخزن ${store.name}`,
          description: `انتهت صلاحية تفعيل المخزن في ${
            store.activationEndDate ? new Date(store.activationEndDate).toLocaleDateString("ar-SA") : "غير محدد"
          }`,
          documents: null,
          licenseImages: null,
          identityImages: null,
          officialDocuments: null,
          paymentStatus: "pending" as const,
          paymentAmount: 800,
          paymentMethod: null,
          paymentTransactionId: null,
          paymentCompletedAt: null,
          paymentReceipt: null,
          status: "pending",
          priority: "normal",
          createdAt: store.activationEndDate || new Date(),
          requesterName: store.ownerName,
          requesterEmail: store.ownerEmail,
        }));

        allRequests = [...allRequests, ...renewalRequests];
      }

      // Sort by creation date (most recent first)
      allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { success: true, approvals: allRequests };
    } catch (error) {
      console.error("Error getting pending approvals:", error);
      throw new Error("Failed to get pending approvals");
    }
  });

// Get approval request details
export const getApprovalDetailsProcedure = publicProcedure
  .input(
    z.object({
      requestId: z.number(),
      adminId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const [request] = await db
        .select({
          id: approvalRequests.id,
          requestType: approvalRequests.requestType,
          requesterId: approvalRequests.requesterId,
          resourceId: approvalRequests.resourceId,
          title: approvalRequests.title,
          description: approvalRequests.description,
          documents: approvalRequests.documents,
          licenseImages: approvalRequests.licenseImages,
          identityImages: approvalRequests.identityImages,
          officialDocuments: approvalRequests.officialDocuments,
          paymentStatus: approvalRequests.paymentStatus,
          paymentAmount: approvalRequests.paymentAmount,
          paymentMethod: approvalRequests.paymentMethod,
          paymentTransactionId: approvalRequests.paymentTransactionId,
          paymentCompletedAt: approvalRequests.paymentCompletedAt,
          paymentReceipt: approvalRequests.paymentReceipt,
          status: approvalRequests.status,
          priority: approvalRequests.priority,
          createdAt: approvalRequests.createdAt,
          requesterName: users.name,
          requesterEmail: users.email,
          requesterPhone: users.phone,
        })
        .from(approvalRequests)
        .innerJoin(users, eq(approvalRequests.requesterId, users.id))
        .where(eq(approvalRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new Error("Approval request not found");
      }

      // Get additional resource details based on type
      let resourceDetails = null;
      if (request.requestType === "vet_registration") {
        const [vet] = await db.select().from(veterinarians).where(eq(veterinarians.id, request.resourceId)).limit(1);
        resourceDetails = vet;
      } else if (request.requestType === "clinic_activation") {
        const [clinic] = await db.select().from(clinics).where(eq(clinics.id, request.resourceId)).limit(1);
        resourceDetails = clinic;
      } else if (request.requestType === "store_activation") {
        const [store] = await db.select().from(stores).where(eq(stores.id, request.resourceId)).limit(1);
        resourceDetails = store;
      }

      return {
        ...request,
        resourceDetails,
      };
    } catch (error) {
      console.error("Error getting approval details:", error);
      throw new Error("Failed to get approval details");
    }
  });

// Approve request
export const approveRequestProcedure = publicProcedure
  .input(
    z.object({
      requestId: z.number(),
      adminId: z.number(),
      adminNotes: z.string().optional(),
      activationStartDate: z.date().optional(),
      activationEndDate: z.date().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const isRenewalRequest = input.requestId > 10000;
      let request: any = null;
      let requestType = "";
      let resourceId = 0;
      let requesterId = 0;
      let title = "";

      // Handle regular approval requests
      const [regularRequest] = await db
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.id, input.requestId))
        .limit(1);

      if (!regularRequest) {
        throw new Error("Approval request not found");
      }

      request = regularRequest;
      requestType = request.requestType;
      resourceId = request.resourceId;
      requesterId = request.requesterId;
      title = request.title;

      // Update the request status
      await db
        .update(approvalRequests)
        .set({
          status: "approved",
          reviewedBy: input.adminId,
          reviewedAt: Math.floor(Date.now() / 1000),
          adminNotes: input.adminNotes,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(approvalRequests.id, input.requestId));
      // }

      // Calculate activation dates

      const startDate = input.activationStartDate || new Date();
      const endDate = input.activationEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

      // Activate the resource based on type
      if (requestType === "vet_registration") {
        await db.update(veterinarians).set({ isVerified: true }).where(eq(veterinarians.id, resourceId));

        await db.update(users).set({ isActive: true }).where(eq(users.id, requesterId));
      } else if (requestType === "clinic_activation" || requestType === "clinic_renewal") {
        await db
          .update(clinics)
          .set({
            isActive: true,
            activationStartDate: startDate,
            activationEndDate: endDate,
            reviewingRenewalRequest: false,
            needsRenewal: false,
          })
          .where(eq(clinics.id, resourceId));
      } else if (requestType === "store_activation" || requestType === "store_renewal") {
        await db
          .update(stores)
          .set({
            isVerified: true,
            isActive: true,
            subscriptionStatus: "active",
            activationStartDate: startDate,
            activationEndDate: endDate,
            reviewingRenewalRequest: false,
            needsRenewal: false,
          })
          .where(eq(stores.id, resourceId));
      }

      // Send notification to the requester
      await db.insert(adminNotifications).values({
        recipientId: requesterId,
        type: "approval_request",
        title: isRenewalRequest ? "تم تجديد اشتراكك" : "تم قبول طلبك",
        content: `تم ${isRenewalRequest ? "تجديد" : "قبول"} ${title} بنجاح. صالح من ${startDate.toLocaleDateString(
          "ar-SA"
        )} إلى ${endDate.toLocaleDateString("ar-SA")}.`,
        relatedResourceType: "approval_request",
        relatedResourceId: isRenewalRequest ? 0 : input.requestId,
        priority: "normal",
      });

      return { success: true, requestType };
    } catch (error) {
      console.error("Error approving request:", error);
      throw new Error("Failed to approve request");
    }
  });

// Reject request
export const rejectRequestProcedure = publicProcedure
  .input(
    z.object({
      requestId: z.number(),
      adminId: z.number(),
      rejectionReason: z.string(),
      adminNotes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const isRenewalRequest = input.requestId > 10000;
      let request: any = null;
      let requestType = "";
      let resourceId = 0;
      let requesterId = 0;
      let title = "";

      // Fetch the request (same as approve)
      const [regularRequest] = await db
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.id, input.requestId))
        .limit(1);

      if (!regularRequest) {
        throw new Error("Approval request not found");
      }

      request = regularRequest;
      requestType = request.requestType;
      resourceId = request.resourceId;
      requesterId = request.requesterId;
      title = request.title;

      // Update the request status to rejected
      await db
        .update(approvalRequests)
        .set({
          status: "rejected",
          reviewedBy: input.adminId,
          reviewedAt: Math.floor(Date.now() / 1000),
          rejectionReason: input.rejectionReason,
          adminNotes: input.adminNotes,
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(approvalRequests.id, input.requestId));

      // Handle resource-specific rejection logic
      if (requestType === "vet_registration") {
        // Make sure the vet stays unverified and user inactive
        await db.update(veterinarians).set({ isVerified: false }).where(eq(veterinarians.id, resourceId));
        await db.update(users).set({ isActive: false }).where(eq(users.id, requesterId));
      } else if (requestType === "clinic_activation" || requestType === "clinic_renewal") {
        await db
          .update(clinics)
          .set({
            isActive: false,
            needsRenewal: false,
            reviewingRenewalRequest: true,
            updatedAt: Math.floor(Date.now() / 1000),
          })
          .where(eq(clinics.id, resourceId));
      } else if (requestType === "store_activation" || requestType === "store_renewal") {
        await db
          .update(stores)
          .set({
            isActive: false,
            isVerified: false,
            subscriptionStatus: "rejected",
            needsRenewal: false,
            reviewingRenewalRequest: true,
            updatedAt: Math.floor(Date.now() / 1000),
          })
          .where(eq(stores.id, resourceId));
      }

      // Notify the requester about the rejection
      await db.insert(adminNotifications).values({
        recipientId: requesterId,
        type: "approval_request",
        title: isRenewalRequest ? "تم رفض طلب التجديد" : "تم رفض طلبك",
        content: `تم ${isRenewalRequest ? "رفض طلب تجديد" : "رفض"} ${title}. السبب: ${input.rejectionReason}`,
        relatedResourceType: "approval_request",
        relatedResourceId: input.requestId,
        priority: "high",
      });

      // For vet registration, also send email notification
      if (requestType === "vet_registration") {
        const [user] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, requesterId))
          .limit(1);

        if (user) {
          await db.insert(emailNotifications).values({
            recipientEmail: user.email,
            recipientName: user.name,
            subject: "تم رفض طلب التسجيل كطبيب بيطري",
            content: `عزيزي ${user.name},\n\nنأسف لإبلاغك بأنه تم رفض طلب التسجيل كطبيب بيطري.\n\nسبب الرفض: ${input.rejectionReason}\n\nيمكنك إعادة التقديم بعد تصحيح المشاكل المذكورة.\n\nشكراً لك.`,
            type: "approval_rejection",
            relatedResourceType: "approval_request",
            relatedResourceId: input.requestId,
            status: "pending",
          });
        }
      }

      return { success: true, requestType };
    } catch (error) {
      console.error("Error rejecting request:", error);
      throw new Error("Failed to reject request");
    }
  });

// Create approval request (for testing)
export const createApprovalRequestProcedure = publicProcedure
  .input(
    z.object({
      requestType: z.enum(["vet_registration", "clinic_activation", "store_activation"]),
      requesterId: z.number(),
      resourceId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      documents: z.array(z.string()).optional(),
      licenseImages: z.array(z.string()).optional(),
      identityImages: z.array(z.string()).optional(),
      officialDocuments: z.array(z.string()).optional(),
      paymentAmount: z.number().optional(),
      paymentMethod: z.string().optional(),
      paymentTransactionId: z.string().optional(),
      paymentReceipt: z.string().optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [newRequest] = await db
        .insert(approvalRequests)
        .values({
          requestType: input.requestType,
          requesterId: input.requesterId,
          resourceId: input.resourceId,
          title: input.title,
          description: input.description,
          documents: input.documents ? JSON.stringify(input.documents) : null,
          licenseImages: input.licenseImages ? JSON.stringify(input.licenseImages) : null,
          identityImages: input.identityImages ? JSON.stringify(input.identityImages) : null,
          officialDocuments: input.officialDocuments ? JSON.stringify(input.officialDocuments) : null,
          paymentAmount: input.paymentAmount,
          paymentMethod: input.paymentMethod,
          paymentTransactionId: input.paymentTransactionId,
          paymentReceipt: input.paymentReceipt,
          paymentStatus: input.paymentAmount ? "completed" : "not_required",
          paymentCompletedAt: input.paymentAmount ? new Date() : null,
          priority: input.priority,
        })
        .returning();

      // Notify admins with appropriate permissions
      const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.userType, "admin"));

      for (const admin of adminUsers) {
        await db.insert(adminNotifications).values({
          recipientId: admin.id,
          type: "approval_request",
          title: "طلب موافقة جديد",
          content: `طلب موافقة جديد: ${input.title}`,
          relatedResourceType: "approval_request",
          relatedResourceId: newRequest.id,
          actionUrl: `/admin/approvals/${newRequest.id}`,
          priority: input.priority,
        });
      }

      return newRequest;
    } catch (error) {
      console.error("Error creating approval request:", error);
      throw new Error("Failed to create approval request");
    }
  });

// Check and create renewal requests for expired clinics and stores
export const checkExpiredSubscriptionsProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const now = new Date();

      // Check expired clinics
      const expiredClinics = await db
        .select({
          id: clinics.id,
          name: clinics.name,
          activationEndDate: clinics.activationEndDate,
        })
        .from(clinics)
        .where(and(eq(clinics.isActive, true), eq(clinics.needsRenewal, false)));

      // Mark clinics as needing renewal if expired
      for (const clinic of expiredClinics) {
        if (clinic.activationEndDate && new Date(clinic.activationEndDate) <= now) {
          await db
            .update(clinics)
            .set({
              isActive: false,
              needsRenewal: true,
              updatedAt: now,
            })
            .where(eq(clinics.id, clinic.id));
        }
      }

      // Check expired stores
      const expiredStores = await db
        .select({
          id: stores.id,
          name: stores.name,
          activationEndDate: stores.activationEndDate,
          ownerId: stores.ownerId,
        })
        .from(stores)
        .where(and(eq(stores.isActive, true), eq(stores.needsRenewal, false)));

      // Mark stores as needing renewal if expired
      for (const store of expiredStores) {
        if (store.activationEndDate && new Date(store.activationEndDate) <= now) {
          await db
            .update(stores)
            .set({
              isActive: false,
              needsRenewal: true,
              subscriptionStatus: "expired",
              updatedAt: now,
            })
            .where(eq(stores.id, store.id));

          // Send notification to store owner
          await db.insert(adminNotifications).values({
            recipientId: store.ownerId,
            type: "system_alert",
            title: "انتهت صلاحية المتجر",
            content: `انتهت صلاحية تفعيل متجر ${store.name}. يرجى تجديد الاشتراك لاستمرار الخدمة.`,
            relatedResourceType: "store",
            relatedResourceId: store.id,
            priority: "high",
          });
        }
      }

      return {
        success: true,
        expiredClinics: expiredClinics.filter((c) => c.activationEndDate && new Date(c.activationEndDate) <= now)
          .length,
        expiredStores: expiredStores.filter((s) => s.activationEndDate && new Date(s.activationEndDate) <= now).length,
      };
    } catch (error) {
      console.error("Error checking expired subscriptions:", error);
      throw new Error("Failed to check expired subscriptions");
    }
  });
