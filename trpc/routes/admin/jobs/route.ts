import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { db } from "../../../../db";
import {
  jobVacancies,
  jobApplications,
  fieldSupervisionRequests,
  courseRegistrations,
  users,
  poultryFarms,
  notifications,
} from "../../../../db/schema";
import { eq, and, desc, sql, getTableColumns } from "drizzle-orm";

export const jobsRouter = {
  // Get all jobs
  getAllJobs: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        status: z.enum(["pending", "approved", "rejected", "all"]).optional().default("all"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log("Getting all jobs for admin:", input.adminId);

        const conditions = [];
        if (input.status !== "all") {
          conditions.push(eq(jobVacancies.status, input.status));
        }

        const jobs = await db
          .select({
            id: jobVacancies.id,
            title: jobVacancies.title,
            description: jobVacancies.description,
            location: jobVacancies.location,
            jobType: jobVacancies.jobType,
            salary: jobVacancies.salary,
            requirements: jobVacancies.requirements,
            contactInfo: jobVacancies.contactInfo,
            status: jobVacancies.status,
            postedBy: jobVacancies.postedBy,
            createdAt: jobVacancies.createdAt,
          })
          .from(jobVacancies)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(jobVacancies.createdAt));

        // Get applications count for each job
        const jobsWithCounts = await Promise.all(
          jobs.map(async (job) => {
            const [{ count }] = await db
              .select({ count: sql<number>`count(*)` })
              .from(jobApplications)
              .where(eq(jobApplications.jobId, job.id));

            return {
              ...job,
              applicationsCount: Number(count) || 0,
            };
          })
        );

        return {
          success: true,
          jobs: jobsWithCounts,
          total: jobsWithCounts.length,
          message: "تم جلب الوظائف بنجاح",
        };
      } catch (error) {
        console.error("Error getting jobs:", error);
        return {
          success: false,
          jobs: [],
          total: 0,
          message: "حدث خطأ في جلب الوظائف",
        };
      }
    }),

  requestJobCreation: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        companyName: z.string(), // New field for company name
        location: z.string(),
        jobType: z.enum(["full-time", "part-time", "contract", "internship"]),
        salary: z.string().optional(),
        description: z.string(),
        requirements: z.string(),
        contactInfo: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("Creating new job request:", input.title, "by admin:", ctx.user.id);

        const [newJob] = await db
          .insert(jobVacancies)
          .values({
            title: input.title,
            description: input.description,
            location: input.location,
            jobType: input.jobType,
            salary: input.salary,
            requirements: input.requirements,
            contactInfo: input.contactInfo,
            postedBy: input.companyName, // Use companyName for postedBy
            status: "pending",
          })
          .returning();

        return {
          success: true,
          jobId: newJob.id.toString(),
          message: "تم إرسال طلب إنشاء الوظيفة بنجاح",
        };
      } catch (error) {
        console.error("Error creating job request:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء إرسال طلب إنشاء الوظيفة",
        };
      }
    }),

  approveJob: protectedProcedure.input(z.object({ jobId: z.number() })).mutation(async ({ input }) => {
    await db.update(jobVacancies).set({ status: "active" }).where(eq(jobVacancies.id, input.jobId));
    return { success: true };
  }),

  rejectJob: protectedProcedure.input(z.object({ jobId: z.number() })).mutation(async ({ input }) => {
    await db.update(jobVacancies).set({ status: "rejected" }).where(eq(jobVacancies.id, input.jobId));
    return { success: true };
  }),

  getPendingJobs: protectedProcedure.query(async () => {
    const jobs = await db.select().from(jobVacancies).where(eq(jobVacancies.status, "pending"));
    return jobs;
  }),

  // Update job
  updateJob: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        jobId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        jobType: z.enum(["full-time", "part-time", "contract", "internship"]).optional(),
        salary: z.string().optional(),
        requirements: z.string().optional(),
        contactInfo: z.string().optional(),
        status: z.enum(["approved", "rejected"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("Updating job:", input.jobId, "by admin:", input.adminId);

        const updateData: any = {};
        if (input.title) updateData.title = input.title;
        if (input.description) updateData.description = input.description;
        if (input.location) updateData.location = input.location;
        if (input.jobType) updateData.jobType = input.jobType;
        if (input.salary) updateData.salary = input.salary;
        if (input.requirements) updateData.requirements = input.requirements;
        if (input.contactInfo) updateData.contactInfo = input.contactInfo;
        if (input.status) updateData.status = input.status;

        updateData.updatedAt = new Date();

        await db
          .update(jobVacancies)
          .set(updateData)
          .where(eq(jobVacancies.id, parseInt(input.jobId)));

        return {
          success: true,
          message: "تم تحديث الوظيفة بنجاح",
        };
      } catch (error) {
        console.error("Error updating job:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء تحديث الوظيفة",
        };
      }
    }),

  // Delete job
  deleteJob: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        jobId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("Deleting job:", input.jobId, "by admin:", input.adminId);

        await db.delete(jobVacancies).where(eq(jobVacancies.id, parseInt(input.jobId)));

        return {
          success: true,
          message: "تم حذف الوظيفة بنجاح",
        };
      } catch (error) {
        console.error("Error deleting job:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء حذف الوظيفة",
        };
      }
    }),

  // Get job applications
  getJobApplications: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        jobId: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log("Getting job applications for admin:", input.adminId);

        const conditions = [];
        if (input.jobId) {
          conditions.push(eq(jobApplications.jobId, parseInt(input.jobId)));
        }

        const applications = await db
          .select()
          .from(jobApplications)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(jobApplications.appliedAt));

        return {
          success: true,
          applications,
          total: applications.length,
          message: "تم جلب طلبات التوظيف بنجاح",
        };
      } catch (error) {
        console.error("Error getting job applications:", error);
        return {
          success: false,
          applications: [],
          total: 0,
          message: "حدث خطأ في جلب طلبات التوظيف",
        };
      }
    }),

  // Manage job application (approve/reject)
  manageJobApplication: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        applicationId: z.string(),
        action: z.enum(["approve", "reject"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(
          "Managing job application:",
          input.applicationId,
          "action:",
          input.action,
          "by admin:",
          input.adminId
        );

        const status = input.action === "approve" ? "approved" : "rejected";

        const [application] = await db
          .update(jobApplications)
          .set({
            status,
            reviewedBy: input.adminId,
            reviewedAt: new Date(),
            notes: input.notes,
            updatedAt: new Date(),
          })
          .where(eq(jobApplications.id, parseInt(input.applicationId)))
          .returning();

        if (application) {
          const [user] = await db.select().from(users).where(eq(users.email, application.applicantEmail));
          if (user) {
            const [job] = await db.select().from(jobVacancies).where(eq(jobVacancies.id, application.jobId));
            const notificationTitle = input.action === "approve" ? "تم قبول طلب التوظيف" : "تم رفض طلب التوظيف";
            const notificationMessage = `تم ${input.action === "approve" ? "قبول" : "رفض"} طلبك لوظيفة "${
              job?.title
            }".`;

            await db.insert(notifications).values({
              userId: user.id,
              title: notificationTitle,
              message: notificationMessage,
              type: input.action === "approve" ? "success" : "error",
              data: {
                applicationId: application.id,
                jobId: application.jobId,
              },
            });
          }
        }

        const actionText = input.action === "approve" ? "الموافقة على" : "رفض";

        return {
          success: true,
          message: `تم ${actionText} طلب التوظيف بنجاح`,
        };
      } catch (error) {
        console.error("Error managing job application:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء معالجة طلب التوظيف",
        };
      }
    }),

  // Get field supervision requests
  getFieldSupervisionRequests: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        status: z.enum(["pending", "approved", "rejected", "all"]).optional().default("all"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log("Getting field supervision requests for admin:", input.adminId);

        const conditions = [];
        if (input.status !== "all") {
          conditions.push(eq(fieldSupervisionRequests.status, input.status));
        }

        const requests = await db
          .select()
          .from(fieldSupervisionRequests)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(fieldSupervisionRequests.createdAt));

        return {
          success: true,
          requests,
          total: requests.length,
          message: "تم جلب طلبات الإشراف الميداني بنجاح",
        };
      } catch (error) {
        console.error("Error getting field supervision requests:", error);
        return {
          success: false,
          requests: [],
          total: 0,
          message: "حدث خطأ في جلب طلبات الإشراف الميداني",
        };
      }
    }),

  // Submit field supervision request
  submitFieldSupervisionRequest: publicProcedure
    .input(
      z.object({
        farmName: z.string(),
        farmLocation: z.string(),
        ownerName: z.string(),
        ownerPhone: z.string(),
        ownerEmail: z.string().email(),
        requestType: z.enum(["routine_inspection", "emergency", "consultation"]),
        description: z.string(),
        preferredDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("Submitting field supervision request for farm:", input.farmName);

        const user = await db.select().from(users).where(eq(users.email, input.ownerEmail));
        if (user.length === 0) {
          return {
            success: false,
            message: "المستخدم غير موجود",
          };
        }

        const [request] = await db
          .insert(fieldSupervisionRequests)
          .values({
            farmName: input.farmName,
            farmLocation: input.farmLocation,
            ownerName: input.ownerName,
            ownerPhone: input.ownerPhone,
            ownerEmail: input.ownerEmail,
            requestType: input.requestType,
            description: input.description,
            preferredDate: input.preferredDate,
            status: "pending",
          })
          .returning();

        return {
          success: true,
          requestId: request.id.toString(),
          message: "تم إرسال طلب الإشراف الميداني بنجاح. سيتم مراجعته والتواصل معك قريباً.",
        };
      } catch (error) {
        console.error("Error submitting field supervision request:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء إرسال طلب الإشراف الميداني. يرجى المحاولة مرة أخرى.",
        };
      }
    }),

  // Get all requests (aggregated)
  getAllRequests: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        status: z.enum(["pending", "approved", "rejected", "all"]).optional().default("all"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log("Getting all requests for admin:", input.adminId);

        // Fetch Job Vacancies
        const jobs = await db
          .select()
          .from(jobVacancies)
          .leftJoin(users, eq(jobVacancies.postedBy, users.id.toString()))
          .orderBy(desc(jobVacancies.createdAt))
          .limit(input.limit);

        // Fetch Job Applications
        const applications = await db
          .select({
            ...getTableColumns(jobApplications),
            applicantId: users.id,
            jobTitle: jobVacancies.title,
          })
          .from(jobApplications)
          .leftJoin(users, eq(jobApplications.applicantEmail, users.email))
          .leftJoin(jobVacancies, eq(jobApplications.jobId, jobVacancies.id))
          .orderBy(desc(jobApplications.appliedAt))
          .limit(input.limit);

        // Fetch Field Supervision Requests
        const supervisionRequests = await db
          .select({
            ...getTableColumns(fieldSupervisionRequests),
            applicantId: poultryFarms.ownerId,
            farmId: poultryFarms.id,
          })
          .from(fieldSupervisionRequests)
          .leftJoin(poultryFarms, eq(fieldSupervisionRequests.farmName, poultryFarms.name))
          .orderBy(desc(fieldSupervisionRequests.createdAt))
          .limit(input.limit);

        // Map to common structure
        const mappedJobs = jobs.map((job) => ({
          id: job.job_vacancies.id.toString(),
          applicantId: job.users?.id,
          type: "job_posting" as const,
          title: job.job_vacancies.title,
          applicantName: job.job_vacancies.postedBy, // Using postedBy as applicantName for consistency
          submittedDate: job.job_vacancies.createdAt.toISOString(),
          status: job.job_vacancies.status as "pending" | "approved" | "rejected", // Map active to approved for UI consistency
          location: job.job_vacancies.location,
          details: {
            company: job.job_vacancies.postedBy,
            salary: job.job_vacancies.salary,
            description: job.job_vacancies.description,
            employmentStatus: job.job_vacancies.status,
          },
        }));

        const mappedApplications = applications.map((app) => ({
          id: app.id.toString(),
          applicantId: app.applicantId,
          type: "job_application" as const,
          title: app.jobTitle || "طلب توظيف", // Generic title, ideally should fetch job title
          applicantName: app.applicantName,
          applicantEmail: app.applicantEmail,
          submittedDate: app.appliedAt.toISOString(),
          status: app.status as "pending" | "approved" | "rejected",
          location: "N/A",
          details: {
            position: app.jobTitle || "Job ID: " + app.jobId, // Should ideally fetch job title
            experience: app.experience,
            education: app.education,
            employmentStatus: app.status,
          },
        }));

        const mappedSupervision = supervisionRequests.map((req) => ({
          id: req.id.toString(),
          applicantId: req.applicantId,
          type: "field_supervision" as const,
          title: "طلب إشراف ميداني",
          applicantName: req.ownerName,
          applicantEmail: req.ownerEmail,
          farmName: req.farmName,
          farmId: req.farmId,
          submittedDate: req.createdAt.toISOString(),
          status: req.status as "pending" | "approved" | "rejected",
          location: req.farmLocation,
          details: {
            farmType: req.requestType,
            animalCount: req.animalCount || "N/A", // Not in schema currently
            employmentStatus: req.status,
          },
        }));

        // Combine and sort
        const allRequests = [...mappedJobs, ...mappedApplications, ...mappedSupervision].sort(
          (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
        );

        // Apply status filter if needed
        const filteredRequests =
          input.status === "all" ? allRequests : allRequests.filter((req) => req.status === input.status);

        return {
          success: true,
          requests: filteredRequests.slice(input.offset, input.offset + input.limit),
          total: filteredRequests.length,
          message: "تم جلب جميع الطلبات بنجاح",
        };
      } catch (error) {
        console.error("Error getting all requests:", error);
        return {
          success: false,
          requests: [],
          total: 0,
          message: "حدث خطأ في جلب الطلبات",
        };
      }
    }),

  // Manage field supervision request
  manageFieldSupervisionRequest: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        requestId: z.string(),
        action: z.enum(["approve", "reject"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const status = input.action === "approve" ? "approved" : "rejected";
        const [request] = await db
          .update(fieldSupervisionRequests)
          .set({ status })
          .where(eq(fieldSupervisionRequests.id, parseInt(input.requestId)))
          .returning();

        if (request) {
          const [user] = await db.select().from(users).where(eq(users.email, request.ownerEmail));
          if (user) {
            const notificationTitle = input.action === "approve" ? "تم قبول طلب الإشراف" : "تم رفض طلب الإشراف";
            const notificationMessage = `تم ${
              input.action === "approve" ? "قبول" : "رفض"
            } طلب الإشراف الخاص بك لمزرعة "${request.farmName}".`;

            await db.insert(notifications).values({
              userId: user.id,
              title: notificationTitle,
              message: notificationMessage,
              type: input.action === "approve" ? "success" : "error",
              data: {
                requestId: request.id,
              },
            });
          }
        }

        return {
          success: true,
          message: `تم ${input.action === "approve" ? "الموافقة على" : "رفض"} الطلب بنجاح`,
        };
      } catch (error) {
        console.error("Error managing field supervision request:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء معالجة الطلب",
        };
      }
    }),

  // Get jobs analytics (Updated with real data aggregation)
  getJobsAnalytics: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        period: z.enum(["week", "month", "quarter", "year"]).optional().default("month"),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Basic counts
        const [
          { totalJobs },
          { activeJobs },
          { totalApplications },
          { pendingApplications },
          { approvedApplications },
          { rejectedApplications },
          { fieldRequests },
          { completedSupervisions },
        ] = await Promise.all([
          db
            .select({ totalJobs: sql<number>`count(*)` })
            .from(jobVacancies)
            .then((res) => res[0]),
          db
            .select({ activeJobs: sql<number>`count(*)` })
            .from(jobVacancies)
            .where(eq(jobVacancies.status, "active"))
            .then((res) => res[0]),
          db
            .select({ totalApplications: sql<number>`count(*)` })
            .from(jobApplications)
            .then((res) => res[0]),
          db
            .select({ pendingApplications: sql<number>`count(*)` })
            .from(jobApplications)
            .where(eq(jobApplications.status, "pending"))
            .then((res) => res[0]),
          db
            .select({ approvedApplications: sql<number>`count(*)` })
            .from(jobApplications)
            .where(eq(jobApplications.status, "approved"))
            .then((res) => res[0]),
          db
            .select({ rejectedApplications: sql<number>`count(*)` })
            .from(jobApplications)
            .where(eq(jobApplications.status, "rejected"))
            .then((res) => res[0]),
          db
            .select({ fieldRequests: sql<number>`count(*)` })
            .from(fieldSupervisionRequests)
            .then((res) => res[0]),
          db
            .select({ completedSupervisions: sql<number>`count(*)` })
            .from(fieldSupervisionRequests)
            .where(eq(fieldSupervisionRequests.status, "completed"))
            .then((res) => res[0]),
        ]);

        return {
          success: true,
          analytics: {
            totalJobs: Number(totalJobs) || 0,
            activeJobs: Number(activeJobs) || 0,
            totalApplications: Number(totalApplications) || 0,
            pendingApplications: Number(pendingApplications) || 0,
            approvedApplications: Number(approvedApplications) || 0,
            rejectedApplications: Number(rejectedApplications) || 0,
            fieldSupervisionRequests: Number(fieldRequests) || 0,
            completedSupervisions: Number(completedSupervisions) || 0,
            jobsByCategory: {
              veterinarian: 0, // Placeholder as category isn't in schema yet
              fieldSupervisor: 0,
              technician: 0,
            },
            applicationsByMonth: [], // Placeholder
          },
          message: "تم جلب إحصائيات الوظائف بنجاح",
        };
      } catch (error) {
        console.error("Error getting jobs analytics:", error);
        return {
          success: false,
          analytics: null,
          message: "حدث خطأ في جلب إحصائيات الوظائف",
        };
      }
    }),

  // Submit job application
  submitJobApplication: publicProcedure
    .input(
      z.object({
        jobId: z.string(),
        applicantName: z.string(),
        applicantEmail: z.string(),
        applicantPhone: z.string(),
        coverLetter: z.string(),
        experience: z.string(),
        education: z.string(),
        cv: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("Submitting job application for job:", input.jobId, "by:", input.applicantName);

        const user = await db.select().from(users).where(eq(users.email, input.applicantEmail));
        if (user.length === 0) {
          return {
            success: false,
            message: "المستخدم غير موجود",
          };
        }

        const [application] = await db
          .insert(jobApplications)
          .values({
            jobId: parseInt(input.jobId),
            applicantName: input.applicantName,
            applicantEmail: input.applicantEmail,
            applicantPhone: input.applicantPhone,
            coverLetter: input.coverLetter,
            experience: input.experience,
            education: input.education,
            cv: input.cv,
            status: "pending",
          })
          .returning();

        return {
          success: true,
          applicationId: application.id.toString(),
          message: "تم تقديم طلب التوظيف بنجاح. سيتم مراجعة طلبك والتواصل معك قريباً.",
        };
      } catch (error) {
        console.error("Error submitting job application:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء تقديم طلب التوظيف. يرجى المحاولة مرة أخرى.",
        };
      }
    }),

  // Submit course registration
  submitCourseRegistration: publicProcedure
    .input(
      z.object({
        courseId: z.string(),
        courseName: z.string(),
        participantName: z.string(),
        participantEmail: z.string().email(),
        participantPhone: z.string(),
        specialRequests: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("Submitting course registration for course:", input.courseId, "by:", input.participantName);

        const [registration] = await db
          .insert(courseRegistrations)
          .values({
            courseId: parseInt(input.courseId),
            courseName: input.courseName,
            participantName: input.participantName,
            participantEmail: input.participantEmail,
            participantPhone: input.participantPhone,
            notes: input.specialRequests,
            status: "pending",
          })
          .returning();

        return {
          success: true,
          registrationId: registration.id.toString(),
          message: "تم إرسال طلب التسجيل بنجاح. سيتم التواصل معك قريباً.",
        };
      } catch (error) {
        console.error("Error submitting course registration:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء إرسال طلب التسجيل. يرجى المحاولة مرة أخرى.",
        };
      }
    }),

  // Get course registrations
  getCourseRegistrations: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        courseId: z.string().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        console.log("Getting course registrations for admin:", input.adminId);

        const conditions = [];
        if (input.courseId) {
          conditions.push(eq(courseRegistrations.courseId, parseInt(input.courseId)));
        }

        const registrations = await db
          .select()
          .from(courseRegistrations)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(courseRegistrations.registrationDate));

        return {
          success: true,
          registrations,
          total: registrations.length,
          message: "تم جلب تسجيلات الدورات بنجاح",
        };
      } catch (error) {
        console.error("Error getting course registrations:", error);
        return {
          success: false,
          registrations: [],
          total: 0,
          message: "حدث خطأ في جلب تسجيلات الدورات",
        };
      }
    }),

  // Get request details
  getRequestDetails: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        requestId: z.string(),
        requestType: z.enum(["job_posting", "job_application", "field_supervision"]),
      })
    )
    .query(async ({ input }) => {
      const { requestId, requestType } = input;
      let requestDetails: any = null;

      try {
        if (requestType === "job_posting") {
          const job = await db
            .select()
            .from(jobVacancies)
            .where(eq(jobVacancies.id, parseInt(requestId)))
            .leftJoin(users, eq(jobVacancies.postedBy, users.id.toString()))
            .limit(1);

          if (job.length > 0) {
            const j = job[0];
            requestDetails = {
              id: j.job_vacancies.id.toString(),
              type: "job_posting",
              title: j.job_vacancies.title,
              applicantName: j.job_vacancies.postedBy,
              submittedDate: j.job_vacancies.createdAt.toISOString(),
              status: j.job_vacancies.status,
              location: j.job_vacancies.location,
              details: {
                company: j.job_vacancies.postedBy,
                salary: j.job_vacancies.salary,
                description: j.job_vacancies.description,
              },
              applicantInfo: {
                name: j.users?.name,
                avatar: j.users?.avatar,
                email: j.users?.email,
                phone: j.users?.phone,
              },
            };
          }
        } else if (requestType === "job_application") {
          const application = await db
            .select()
            .from(jobApplications)
            .where(eq(jobApplications.id, parseInt(requestId)))
            .leftJoin(users, eq(jobApplications.applicantEmail, users.email))
            .leftJoin(jobVacancies, eq(jobApplications.jobId, jobVacancies.id))
            .limit(1);

          if (application.length > 0) {
            const app = application[0];
            requestDetails = {
              id: app.job_applications.id.toString(),
              type: "job_application",
              title: app.job_vacancies?.title || "طلب توظيف",
              applicantName: app.job_applications.applicantName,
              submittedDate: app.job_applications.appliedAt.toISOString(),
              status: app.job_applications.status,
              location: app.job_vacancies?.location || "N/A",
              details: {
                position: app.job_vacancies?.title || "Job ID: " + app.job_applications.jobId,
                experience: app.job_applications.experience,
                education: app.job_applications.education,
              },
              applicantInfo: {
                name: app.users?.name,
                avatar: app.users?.avatar,
                email: app.users?.email,
                phone: app.users?.phone,
                cv: app.job_applications.cv,
              },
            };
          }
        } else if (requestType === "field_supervision") {
          const supervision = await db
            .select()
            .from(fieldSupervisionRequests)
            .where(eq(fieldSupervisionRequests.id, parseInt(requestId)))
            .leftJoin(poultryFarms, eq(fieldSupervisionRequests.farmName, poultryFarms.name))
            .leftJoin(users, eq(poultryFarms.ownerId, users.id))
            .limit(1);

          if (supervision.length > 0) {
            const sup = supervision[0];
            requestDetails = {
              id: sup.field_supervision_requests.id.toString(),
              type: "field_supervision",
              title: "طلب إشراف ميداني",
              applicantName: sup.field_supervision_requests.ownerName,
              submittedDate: sup.field_supervision_requests.createdAt.toISOString(),
              status: sup.field_supervision_requests.status,
              location: sup.field_supervision_requests.farmLocation,
              details: {
                farmType: sup.field_supervision_requests.requestType,
                animalCount: sup.field_supervision_requests.animalCount,
              },
              applicantInfo: {
                name: sup.users?.name,
                avatar: sup.users?.avatar,
                email: sup.users?.email,
                phone: sup.users?.phone,
              },
            };
          }
        }

        if (requestDetails) {
          return {
            success: true,
            ...requestDetails,
          };
        } else {
          return {
            success: false,
            message: "لم يتم العثور على الطلب",
          };
        }
      } catch (error) {
        console.error("Error getting request details:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء جلب تفاصيل الطلب",
        };
      }
    }),
};
