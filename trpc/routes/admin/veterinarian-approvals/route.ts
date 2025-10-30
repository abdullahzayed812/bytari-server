import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { db } from "../../../../db/index";
import {
  veterinarianApprovals,
  users,
  notifications,
} from "../../../../db/schema";

export const veterinarianApprovalsRouter = {
  // Get all pending veterinarian applications
  getPendingApplications: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(
      async ({
        input,
        ctx,
      }: {
        input: { adminId: number; limit?: number; offset?: number };
        ctx: any;
      }) => {
        try {
          console.log(
            "Getting pending veterinarian applications for admin:",
            input.adminId
          );

          const pendingApplications = await db
            .select()
            .from(veterinarianApprovals)
            .where(eq(veterinarianApprovals.status, "pending"))
            .orderBy(desc(veterinarianApprovals.submittedAt))
            .limit(input.limit || 50)
            .offset(input.offset || 0);

          const formattedApplications = pendingApplications.map((app) => ({
            id: app.id.toString(),
            name: app.name,
            email: app.email,
            phone: app.phone,
            city: app.city,
            province: app.province,
            gender: app.gender,
            veterinarianType: app.veterinarianType,
            status: app.status,
            submittedAt: new Date(app.submittedAt).toISOString(),
            idFrontImage: app.idFrontImage || "",
            idBackImage: app.idBackImage || "",
          }));

          return {
            success: true,
            applications: formattedApplications,
            total: formattedApplications.length,
            message: "تم جلب طلبات الموافقة بنجاح",
          };
        } catch (error) {
          console.error("Error getting pending applications:", error);
          return {
            success: false,
            applications: [],
            total: 0,
            message: "حدث خطأ في جلب طلبات الموافقة",
          };
        }
      }
    ),

  // Approve a veterinarian application
  approveApplication: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        applicationId: z.string(),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(
      async ({
        input,
        ctx,
      }: {
        input: { adminId: number; applicationId: string; adminNotes?: string };
        ctx: any;
      }) => {
        try {
          console.log(
            "Approving veterinarian application:",
            input.applicationId,
            "by admin:",
            input.adminId
          );

          const applicationId = parseInt(input.applicationId);

          // Get the application details
          const application = await db
            .select()
            .from(veterinarianApprovals)
            .where(eq(veterinarianApprovals.id, applicationId))
            .limit(1);

          if (!application || application.length === 0) {
            return {
              success: false,
              message: "الطلب غير موجود",
            };
          }

          const app = application[0];

          // Update the application status to 'approved'
          await db
            .update(veterinarianApprovals)
            .set({
              status: "approved",
              reviewedBy: input.adminId,
              reviewedAt: new Date(),
              adminNotes: input.adminNotes || "",
              updatedAt: new Date(),
            })
            .where(eq(veterinarianApprovals.id, applicationId));

          // Update the user's account type to 'vet'
          await db
            .update(users)
            .set({
              userType: "vet",
              updatedAt: new Date(),
            })
            .where(eq(users.id, app.userId));

          // Create in-app notification for the user
          await db.insert(notifications).values({
            userId: app.userId,
            title: "تم الموافقة على حسابك كطبيب بيطري",
            content:
              "مبروك! تم الموافقة على طلب تسجيلك كطبيب بيطري. يمكنك الآن الوصول إلى جميع ميزات الأطباء البيطريين.",
            type: "veterinarian_approval",
            isRead: false,
            data: JSON.stringify({
              applicationId: applicationId,
              adminNotes: input.adminNotes,
            }),
            createdAt: new Date(),
          });

          return {
            success: true,
            message: "تم الموافقة على الطلب وإرسال إشعار للمستخدم",
          };
        } catch (error) {
          console.error("Error approving application:", error);
          return {
            success: false,
            message: "حدث خطأ أثناء الموافقة على الطلب",
          };
        }
      }
    ),

  // Reject a veterinarian application
  rejectApplication: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        applicationId: z.string(),
        rejectionReason: z.string().optional(),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(
      async ({
        input,
        ctx,
      }: {
        input: {
          adminId: number;
          applicationId: string;
          rejectionReason?: string;
          adminNotes?: string;
        };
        ctx: any;
      }) => {
        try {
          console.log(
            "Rejecting veterinarian application:",
            input.applicationId,
            "by admin:",
            input.adminId
          );

          const applicationId = parseInt(input.applicationId);

          // Get the application details
          const application = await db
            .select()
            .from(veterinarianApprovals)
            .where(eq(veterinarianApprovals.id, applicationId))
            .limit(1);

          if (!application || application.length === 0) {
            return {
              success: false,
              message: "الطلب غير موجود",
            };
          }

          const app = application[0];

          // Update the application status to 'rejected'
          await db
            .update(veterinarianApprovals)
            .set({
              status: "rejected",
              reviewedBy: input.adminId,
              reviewedAt: new Date(),
              rejectionReason: input.rejectionReason || "",
              adminNotes: input.adminNotes || "",
              updatedAt: new Date(),
            })
            .where(eq(veterinarianApprovals.id, applicationId));

          // Create in-app notification for the user
          await db.insert(notifications).values({
            userId: app.userId,
            title: "تم رفض طلب التسجيل كطبيب بيطري",
            content: `نأسف لإعلامك بأنه تم رفض طلب تسجيلك كطبيب بيطري${
              input.rejectionReason ? `: ${input.rejectionReason}` : "."
            }`,
            type: "veterinarian_rejection",
            isRead: false,
            data: JSON.stringify({
              applicationId: applicationId,
              rejectionReason: input.rejectionReason,
              adminNotes: input.adminNotes,
            }),
            createdAt: new Date(),
          });

          return {
            success: true,
            message: "تم رفض الطلب وإرسال إشعار للمستخدم",
          };
        } catch (error) {
          console.error("Error rejecting application:", error);
          return {
            success: false,
            message: "حدث خطأ أثناء رفض الطلب",
          };
        }
      }
    ),

  // Get application details
  getApplicationDetails: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        applicationId: z.string(),
      })
    )
    .query(
      async ({
        input,
        ctx,
      }: {
        input: { adminId: number; applicationId: string };
        ctx: any;
      }) => {
        try {
          console.log("Getting application details:", input.applicationId);

          const applicationId = parseInt(input.applicationId);

          const application = await db
            .select()
            .from(veterinarianApprovals)
            .where(eq(veterinarianApprovals.id, applicationId))
            .limit(1);

          if (!application || application.length === 0) {
            return {
              success: false,
              application: null,
              message: "الطلب غير موجود",
            };
          }

          const app = application[0];

          return {
            success: true,
            application: {
              id: app.id.toString(),
              name: app.name,
              email: app.email,
              phone: app.phone,
              city: app.city,
              province: app.province,
              gender: app.gender,
              veterinarianType: app.veterinarianType,
              status: app.status,
              submittedAt: new Date(app.submittedAt).toISOString(),
              idFrontImage: app.idFrontImage || "",
              idBackImage: app.idBackImage || "",
              adminNotes: app.adminNotes || "",
              rejectionReason: app.rejectionReason || null,
            },
            message: "تم جلب تفاصيل الطلب بنجاح",
          };
        } catch (error) {
          console.error("Error getting application details:", error);
          return {
            success: false,
            application: null,
            message: "حدث خطأ في جلب تفاصيل الطلب",
          };
        }
      }
    ),

  // Submit veterinarian registration application
  submitApplication: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string(),
        city: z.string(),
        province: z.string(),
        gender: z.enum(["male", "female"]),
        veterinarianType: z.enum(["student", "veterinarian"]),
        password: z.string().min(6),
        idFrontImage: z.string().optional(),
        idBackImage: z.string().optional(),
      })
    )
    .mutation(
      async ({
        input,
        ctx,
      }: {
        input: {
          name: string;
          email: string;
          phone: string;
          city: string;
          province: string;
          gender: "male" | "female";
          veterinarianType: "student" | "veterinarian";
          password: string;
          idFrontImage?: string;
          idBackImage?: string;
        };
        ctx: any;
      }) => {
        try {
          console.log("Submitting veterinarian application for:", input.email);

          // Check if user already exists
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, input.email))
            .limit(1);

          if (existingUser && existingUser.length > 0) {
            return {
              success: false,
              message: "البريد الإلكتروني مستخدم بالفعل",
            };
          }

          // Create a new user with user_type = 'user' (not 'vet' until approved)
          const newUser = await db
            .insert(users)
            .values({
              email: input.email,
              name: input.name,
              phone: input.phone,
              userType: "user",
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          if (!newUser || newUser.length === 0) {
            return {
              success: false,
              message: "حدث خطأ أثناء إنشاء الحساب",
            };
          }

          const userId = newUser[0].id;

          // Create a VeterinarianApproval record with status = 'pending'
          const newApplication = await db
            .insert(veterinarianApprovals)
            .values({
              userId: userId,
              name: input.name,
              email: input.email,
              phone: input.phone,
              city: input.city,
              province: input.province,
              gender: input.gender,
              veterinarianType: input.veterinarianType,
              idFrontImage: input.idFrontImage || "",
              idBackImage: input.idBackImage || "",
              status: "pending",
              submittedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          if (!newApplication || newApplication.length === 0) {
            return {
              success: false,
              message: "حدث خطأ أثناء إرسال الطلب",
            };
          }

          return {
            success: true,
            message: "تم إرسال طلب التسجيل بنجاح. سيتم إشعارك عند المراجعة.",
            applicationId: newApplication[0].id.toString(),
          };
        } catch (error) {
          console.error("Error submitting application:", error);
          return {
            success: false,
            message: "حدث خطأ أثناء إرسال طلب التسجيل",
          };
        }
      }
    ),

  // Check application status
  checkApplicationStatus: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .query(async ({ input, ctx }: { input: { email: string }; ctx: any }) => {
      try {
        console.log("Checking application status for:", input.email);

        const application = await db
          .select()
          .from(veterinarianApprovals)
          .where(eq(veterinarianApprovals.email, input.email))
          .orderBy(desc(veterinarianApprovals.submittedAt))
          .limit(1);

        if (!application || application.length === 0) {
          return {
            success: false,
            status: "not_found",
            message: "لا يوجد طلب تسجيل بهذا البريد الإلكتروني",
          };
        }

        const app = application[0];

        let message = "";
        if (app.status === "approved") {
          message = "تم الموافقة على طلبك. يمكنك تسجيل الدخول الآن.";
        } else if (app.status === "rejected") {
          message = "تم رفض طلبك. يمكنك إعادة التقديم.";
        } else {
          message = "طلبك قيد المراجعة. سيتم إشعارك عند الانتهاء.";
        }

        return {
          success: true,
          status: app.status,
          message: message,
          rejectionReason: app.rejectionReason || undefined,
        };
      } catch (error) {
        console.error("Error checking application status:", error);
        return {
          success: false,
          status: "unknown",
          message: "حدث خطأ في التحقق من حالة الطلب",
        };
      }
    }),

  // Get user's approval notifications
  getApprovalNotifications: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().optional().default(20),
      })
    )
    .query(
      async ({
        input,
        ctx,
      }: {
        input: { userId: string; limit?: number };
        ctx: any;
      }) => {
        try {
          console.log("Getting approval notifications for user:", input.userId);

          const userId = parseInt(input.userId);

          const userNotifications = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, userId),
                eq(notifications.type, "veterinarian_approval")
              )
            )
            .orderBy(desc(notifications.createdAt))
            .limit(input.limit || 20);

          const formattedNotifications = userNotifications.map((notif) => ({
            id: notif.id.toString(),
            type: notif.type,
            title: notif.title,
            message: notif.content,
            status:
              notif.type === "veterinarian_approval" ? "approved" : "rejected",
            createdAt: new Date(notif.createdAt).toISOString(),
            read: notif.isRead,
            data: notif.data ? JSON.parse(notif.data) : {},
          }));

          return {
            success: true,
            notifications: formattedNotifications,
            message: "تم جلب الإشعارات بنجاح",
          };
        } catch (error) {
          console.error("Error getting approval notifications:", error);
          return {
            success: false,
            notifications: [],
            message: "حدث خطأ في جلب الإشعارات",
          };
        }
      }
    ),
};
