import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { jobVacancies, jobApplications, fieldSupervisionRequests, courseRegistrations } from "../../../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const jobsRouter = {
  // Get all jobs
  getAllJobs: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        status: z.enum(["active", "inactive", "all"]).optional().default("all"),
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

  // Create new job
  createJob: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        title: z.string(),
        description: z.string(),
        location: z.string(),
        jobType: z.enum(["full-time", "part-time", "contract", "internship"]),
        salary: z.string().optional(),
        requirements: z.string(),
        contactInfo: z.string(),
        postedBy: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("Creating new job:", input.title, "by admin:", input.adminId);

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
            postedBy: input.postedBy,
            status: "active",
          })
          .returning();

        return {
          success: true,
          jobId: newJob.id.toString(),
          message: "تم إنشاء الوظيفة بنجاح",
        };
      } catch (error) {
        console.error("Error creating job:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء إنشاء الوظيفة",
        };
      }
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
        status: z.enum(["active", "inactive"]).optional(),
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

        await db
          .update(jobApplications)
          .set({
            status,
            reviewedBy: input.adminId,
            reviewedAt: new Date(),
            notes: input.notes,
            updatedAt: new Date(),
          })
          .where(eq(jobApplications.id, parseInt(input.applicationId)));

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
        requestType: z.enum(["routine_inspection", "emergency", "consultation"]),
        description: z.string(),
        preferredDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        console.log("Submitting field supervision request for farm:", input.farmName);

        const [request] = await db
          .insert(fieldSupervisionRequests)
          .values({
            farmName: input.farmName,
            farmLocation: input.farmLocation,
            ownerName: input.ownerName,
            ownerPhone: input.ownerPhone,
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
          .orderBy(desc(jobVacancies.createdAt))
          .limit(input.limit);

        // Fetch Job Applications
        const applications = await db
          .select()
          .from(jobApplications)
          .orderBy(desc(jobApplications.appliedAt))
          .limit(input.limit);

        // Fetch Field Supervision Requests
        const supervisionRequests = await db
          .select()
          .from(fieldSupervisionRequests)
          .orderBy(desc(fieldSupervisionRequests.createdAt))
          .limit(input.limit);

        // Map to common structure
        const mappedJobs = jobs.map((job) => ({
          id: job.id.toString(),
          type: "job_posting" as const,
          title: job.title,
          applicantName: job.postedBy, // Using postedBy as applicantName for consistency
          submittedDate: job.createdAt.toISOString(),
          status: job.status === "active" ? "approved" : "pending", // Map active to approved for UI consistency
          location: job.location,
          details: {
            company: job.postedBy,
            salary: job.salary,
            description: job.description,
          },
        }));

        const mappedApplications = applications.map((app) => ({
          id: app.id.toString(),
          type: "job_application" as const,
          title: "طلب توظيف", // Generic title, ideally should fetch job title
          applicantName: app.applicantName,
          submittedDate: app.appliedAt.toISOString(),
          status: app.status as "pending" | "approved" | "rejected",
          location: "N/A",
          details: {
            position: "Job ID: " + app.jobId, // Should ideally fetch job title
            experience: app.experience,
            education: app.education,
            employmentStatus: app.status,
          },
        }));

        const mappedSupervision = supervisionRequests.map((req) => ({
          id: req.id.toString(),
          type: "field_supervision" as const,
          title: "طلب إشراف ميداني",
          applicantName: req.ownerName,
          submittedDate: req.createdAt.toISOString(),
          status: req.status as "pending" | "approved" | "rejected",
          location: req.farmLocation,
          details: {
            farmType: req.requestType,
            animalCount: "N/A", // Not in schema currently
            employmentStatus: req.status,
          },
        }));

        // Combine and sort
        const allRequests = [...mappedJobs, ...mappedApplications, ...mappedSupervision].sort(
          (a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()
        );

        // Apply status filter if needed
        const filteredRequests =
          input.status === "all"
            ? allRequests
            : allRequests.filter((req) => req.status === input.status);

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
        await db
          .update(fieldSupervisionRequests)
          .set({ status })
          .where(eq(fieldSupervisionRequests.id, parseInt(input.requestId)));

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
          db.select({ totalJobs: sql<number>`count(*)` }).from(jobVacancies).then(res => res[0]),
          db.select({ activeJobs: sql<number>`count(*)` }).from(jobVacancies).where(eq(jobVacancies.status, "active")).then(res => res[0]),
          db.select({ totalApplications: sql<number>`count(*)` }).from(jobApplications).then(res => res[0]),
          db.select({ pendingApplications: sql<number>`count(*)` }).from(jobApplications).where(eq(jobApplications.status, "pending")).then(res => res[0]),
          db.select({ approvedApplications: sql<number>`count(*)` }).from(jobApplications).where(eq(jobApplications.status, "approved")).then(res => res[0]),
          db.select({ rejectedApplications: sql<number>`count(*)` }).from(jobApplications).where(eq(jobApplications.status, "rejected")).then(res => res[0]),
          db.select({ fieldRequests: sql<number>`count(*)` }).from(fieldSupervisionRequests).then(res => res[0]),
          db.select({ completedSupervisions: sql<number>`count(*)` }).from(fieldSupervisionRequests).where(eq(fieldSupervisionRequests.status, "completed")).then(res => res[0]),
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
};
