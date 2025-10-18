import { createTRPCRouter } from "./create-context";
import hiRoute, { testQuery } from "./routes/example/hi/route";
import { createUserProcedure } from "./routes/users/create/route";
import { getUsersProcedure } from "./routes/users/list/route";

// Auth routes
import {
  registerProcedure,
  loginProcedure,
  refreshTokenProcedure,
  getProfileProcedure,
  updateProfileProcedure,
  changePasswordProcedure,
  logoutProcedure,
  validateTokenProcedure,
} from "./routes/auth/route";

// Admin user management
import { getSupervisorsProcedure } from './routes/admin/users/supervisors';
import {
  getUserProfileProcedure,
  updateUserProfileProcedure,
  banUserProcedure,
  deleteUserProcedure,
  searchUsersProcedure,
  listAllUsersProcedure,
} from "./routes/admin/users/route";

// Admin pet management
import {
  getPetProfileProcedure,
  updatePetProfileProcedure,
  deletePetProcedure,
  searchPetsProcedure,
} from "./routes/admin/pets/route";
import { createPetProcedure } from "./routes/pets/create/route";
import { getUserPetsProcedure, getAllPetsForAdminProcedure } from "./routes/pets/ownership/route";
import {
  createPetApprovalProcedure,
  getPendingPetApprovalsProcedure,
  reviewPetApprovalProcedure,
  getUserPetApprovalsProcedure,
  getPetApprovalStatsProcedure,
  getApprovedPetsProcedure,
} from "./routes/pets/approval/route";
import { createAppointmentProcedure } from "./routes/appointments/create/route";
import { listAppointmentsProcedure } from "./routes/appointments/list/route";
import { createInquiryProcedure } from "./routes/inquiries/create/route";
import { replyInquiryProcedure } from "./routes/inquiries/reply/route";
import { listForUserProcedure } from "./routes/inquiries/list-for-user";
import { userReplyInquiryProcedure } from "./routes/inquiries/user-reply/route";
import { createConsultationProcedure } from "./routes/consultations/create/route";
import { replyConsultationProcedure } from "./routes/consultations/reply/route";
import { listForUserProcedure as listConsultationsForUserProcedure } from "./routes/consultations/list-for-user";
import { userReplyConsultationProcedure } from "./routes/consultations/user-reply/route";

// Store routes
import { createStoreProcedure } from "./routes/stores/create/route";
import { listStoresProcedure } from "./routes/stores/list/route";
import { createProductProcedure } from "./routes/stores/products/create/route";
import { listProductsProcedure } from "./routes/stores/products/list/route";
import { getStoreByIdProcedure } from "./routes/stores/getById/route";

// Clinic routes
import {
  createClinicProcedure,
  updateClinicActivationProcedure,
  renewClinicActivationProcedure,
} from "./routes/clinics/create/route";
import {
  getUserClinicsProcedure,
  getClinicDetailsProcedure,
  getUserApprovedClinicsProcedure,
} from "./routes/clinics/list/route";
import { getActiveClinicsListProcedure } from "./routes/clinics/public/route";

// Warehouse routes
import {
  createWarehouseProcedure,
  updateWarehouseActivationProcedure,
  renewWarehouseActivationProcedure,
} from "./routes/warehouses/create/route";
import {
  getUserWarehousesProcedure,
  getWarehouseDetailsProcedure,
  getPublicWarehousesProcedure,
  getUserApprovedWarehousesProcedure,
} from "./routes/warehouses/list/route";
import {
  createWarehouseProductProcedure,
  listWarehouseProductsProcedure,
  updateWarehouseProductProcedure,
  deleteWarehouseProductProcedure,
} from "./routes/warehouses/products/route";

// Admin routes
import { adminAuthProcedure, adminVerifyProcedure, checkAdminPermissionsProcedure } from "./routes/admin/auth/route";
import {
  getUserPermissionsProcedure,
  getAllRolesProcedure,
  getAllPermissionsProcedure,
  assignRoleProcedure,
  removeRoleProcedure,
} from "./routes/admin/permissions/route";
import {
  sendSystemMessageProcedure,
  getUserSystemMessagesProcedure,
  markSystemMessageAsReadProcedure,
  sendNotificationProcedure,
  getAllSystemMessagesProcedure,
  deleteSystemMessageProcedure,
  getUnreadMessagesCountProcedure,
} from "./routes/admin/messages/route";
import {
  createAdvertisementProcedure,
  updateAdvertisementProcedure,
  deleteAdvertisementProcedure,
  getAllAdvertisementsProcedure,
  getActiveProcedure,
  trackClickProcedure,
  trackImpressionProcedure,
  getAdStatisticsProcedure,
  getByIdProcedure,
} from "./routes/admin/ads/route";
import {
  createVetBookProcedure,
  updateVetBookProcedure,
  deleteVetBookProcedure,
  createVetMagazineProcedure,
  updateVetMagazineProcedure,
  createTipProcedure,
  updateTipProcedure,
  updateAppSectionProcedure,
  getContentStatisticsProcedure,
  getVetStoresForHomeProcedure,
  updateStoreHomeVisibilityProcedure,
  bulkUpdateStoreHomeVisibilityProcedure,
  updateContactInfoProcedure,
  getContactInfoProcedure,
} from "./routes/admin/content/route";
import {
  getSystemStatsProcedure,
  getDetailedStatsProcedure,
  getPendingApprovalCountsProcedure,
} from "./routes/admin/stats/route";

// Admin approvals
import {
  getPendingApprovalsProcedure,
  getApprovalDetailsProcedure,
  approveRequestProcedure,
  rejectRequestProcedure,
  createApprovalRequestProcedure,
  checkExpiredSubscriptionsProcedure,
} from "./routes/admin/approvals/route";

// Veterinarian approvals
import { veterinarianApprovalsRouter } from "./routes/admin/veterinarian-approvals/route";

// Jobs management
import { jobsRouter } from "./routes/admin/jobs/route";

// Admin notifications
import {
  getAdminNotificationsProcedure,
  markNotificationAsReadProcedure,
  markAllNotificationsAsReadProcedure,
  deleteNotificationProcedure,
  getUnreadNotificationsCountProcedure,
  createNotificationProcedure,
} from "./routes/admin/notifications/route";

// AI settings
import { updateAiSettingsProcedure, getAiSettingsProcedure, toggleAiProcedure } from "./routes/admin/ai-settings/route";

// AI auto-reply
import {
  autoReplyConsultationProcedure,
  autoReplyInquiryProcedure,
  checkAiStatusProcedure,
  getAiStatsProcedure,
  testAiProcedure,
} from "./routes/ai/auto-reply/route";

// Field assignments
import {
  getFieldAssignments,
  getAvailableVets,
  getAvailableSupervisors,
  getAvailableFarms,
  assignVetToField,
  assignSupervisorToField,
  removeVetFromField,
  removeSupervisorFromField,
  getFieldAssignment,
  getAssignedFieldsForVet,
  getAssignedFieldsForSupervisor,
  assignVetProcedure,
  assignSupervisorProcedure,
  getAssignedFieldsForVetProcedure,
  getAllFieldsForAdminProcedure as getAllFieldsForAdminAssignmentProcedure,
  getUserFarmsProcedure as getUserFarmsAssignmentProcedure,
} from "./routes/admin/field-assignments/route";

// Courses management
import {
  getCoursesListProcedure,
  getCourseProcedure,
  createCourseProcedure,
  updateCourseProcedure,
  deleteCourseProcedure,
  registerForCourseProcedure,
  getCourseRegistrationsProcedure,
  updateRegistrationStatusProcedure,
} from "./routes/courses/route";

// Orders routes
import { getOrderStatsProcedure } from "./routes/orders/get/route";
import { updateOrderStatusProcedure } from "./routes/orders/update/route";
import { listOrdersProcedure } from "./routes/orders/list/route";

// Polls
import {
  getPollByAdIdProcedure,
  voteProcedure,
  getPollResultsProcedure,
  hasUserVotedProcedure,
  getActivePollsProcedure,
} from "./routes/polls/route";

import { contentRouter } from "./routes/content/route";

export const appRouter = createTRPCRouter({
  // Authentication routes
  auth: createTRPCRouter({
    register: registerProcedure,
    login: loginProcedure,
    refreshToken: refreshTokenProcedure,
    logout: logoutProcedure,
    getProfile: getProfileProcedure,
    updateProfile: updateProfileProcedure,
    changePassword: changePasswordProcedure,
    validateToken: validateTokenProcedure,
  }),

  example: createTRPCRouter({
    hi: hiRoute,
    test: testQuery,
  }),
  users: createTRPCRouter({
    create: createUserProcedure,
    list: getUsersProcedure,
  }),
  pets: createTRPCRouter({
    create: createPetProcedure,
    getUserPets: getUserPetsProcedure,
    getAllForAdmin: getAllPetsForAdminProcedure,
    // Pet approval system
    createApprovalRequest: createPetApprovalProcedure,
    getUserApprovals: getUserPetApprovalsProcedure,
    getApproved: getApprovedPetsProcedure,
  }),
  poultryFarms: createTRPCRouter({
    getUserFarms: getUserFarmsAssignmentProcedure,
    getAllForAdmin: getAllFieldsForAdminAssignmentProcedure,
  }),

  appointments: createTRPCRouter({
    create: createAppointmentProcedure,
    list: listAppointmentsProcedure,
  }),
  inquiries: createTRPCRouter({
    create: createInquiryProcedure,
    reply: replyInquiryProcedure, // للمشرفين
    userReply: userReplyInquiryProcedure, // للمستخدمين
    listForUser: listForUserProcedure,
  }),
  consultations: createTRPCRouter({
    create: createConsultationProcedure,
    reply: replyConsultationProcedure, // للمشرفين
    userReply: userReplyConsultationProcedure, // للمستخدمين
    listForUser: listConsultationsForUserProcedure,
  }),

  // Store routes
  stores: createTRPCRouter({
    create: createStoreProcedure,
    list: listStoresProcedure,
    getById: getStoreByIdProcedure,
    products: createTRPCRouter({
      create: createProductProcedure,
      list: listProductsProcedure,
    }),
  }),

  // Clinic routes
  clinics: createTRPCRouter({
    create: createClinicProcedure,
    updateActivation: updateClinicActivationProcedure,
    renewActivation: renewClinicActivationProcedure,
    getUserClinics: getUserClinicsProcedure,
    getUserApprovedClinics: getUserApprovedClinicsProcedure,
    getDetails: getClinicDetailsProcedure,
    getActiveList: getActiveClinicsListProcedure,
    public: createTRPCRouter({
      getPublicClinics: getActiveClinicsListProcedure,
    }),
  }),

  // Warehouse routes
  warehouses: createTRPCRouter({
    create: createWarehouseProcedure,
    updateActivation: updateWarehouseActivationProcedure,
    renewActivation: renewWarehouseActivationProcedure,
    getUserWarehouses: getUserWarehousesProcedure,
    getUserApprovedWarehouses: getUserApprovedWarehousesProcedure,
    getDetails: getWarehouseDetailsProcedure,
    getPublicList: getPublicWarehousesProcedure,
    products: createTRPCRouter({
      create: createWarehouseProductProcedure,
      list: listWarehouseProductsProcedure,
      update: updateWarehouseProductProcedure,
      delete: deleteWarehouseProductProcedure,
    }),
  }),

  // Public Content
  content: contentRouter,

  // Admin routes
  admin: createTRPCRouter({
    // Authentication
    auth: createTRPCRouter({
      login: adminAuthProcedure,
      verify: adminVerifyProcedure,
      checkPermissions: checkAdminPermissionsProcedure,
    }),

    // Permissions management
    permissions: createTRPCRouter({
      getUserPermissions: getUserPermissionsProcedure,
      getAllRoles: getAllRolesProcedure,
      getAllPermissions: getAllPermissionsProcedure,
      assignRole: assignRoleProcedure,
      removeRole: removeRoleProcedure,
    }),

    // Messages and notifications
    messages: createTRPCRouter({
      sendSystemMessage: sendSystemMessageProcedure,
      getUserSystemMessages: getUserSystemMessagesProcedure,
      markAsRead: markSystemMessageAsReadProcedure,
      sendNotification: sendNotificationProcedure,
      getAllSystemMessages: getAllSystemMessagesProcedure,
      deleteSystemMessage: deleteSystemMessageProcedure,
      getUnreadCount: getUnreadMessagesCountProcedure,
    }),

    // Advertisements management
    ads: createTRPCRouter({
      create: createAdvertisementProcedure,
      update: updateAdvertisementProcedure,
      delete: deleteAdvertisementProcedure,
      getAll: getAllAdvertisementsProcedure,
      getActive: getActiveProcedure,
      getById: getByIdProcedure,
      trackClick: trackClickProcedure,
      trackImpression: trackImpressionProcedure,
      getStatistics: getAdStatisticsProcedure,
    }),

    // Content management
    content: createTRPCRouter({
      // Books
      createBook: createVetBookProcedure,
      updateBook: updateVetBookProcedure,
      deleteBook: deleteVetBookProcedure,

      // Magazines
      createMagazine: createVetMagazineProcedure,
      updateMagazine: updateVetMagazineProcedure,

      // Tips
      createTip: createTipProcedure,
      updateTip: updateTipProcedure,

      // Sections
      updateSection: updateAppSectionProcedure,

      // Statistics
      getStatistics: getContentStatisticsProcedure,

      // Vet Stores Home Visibility
      getVetStoresForHome: getVetStoresForHomeProcedure,
      updateStoreHomeVisibility: updateStoreHomeVisibilityProcedure,
      bulkUpdateStoreHomeVisibility: bulkUpdateStoreHomeVisibilityProcedure,

      // Contact Info Management
      updateContactInfo: updateContactInfoProcedure,
      getContactInfo: getContactInfoProcedure,
    }),

    // System statistics
    stats: createTRPCRouter({
      getSystemStats: getSystemStatsProcedure,
      getDetailedStats: getDetailedStatsProcedure,
      getPendingApprovalCounts: getPendingApprovalCountsProcedure,
    }),

    // User management
    users: createTRPCRouter({
      getProfile: getUserProfileProcedure,
      updateProfile: updateUserProfileProcedure,
      ban: banUserProcedure,
      delete: deleteUserProcedure,
      search: searchUsersProcedure,
      listAll: listAllUsersProcedure,
      getSupervisors: getSupervisorsProcedure,
    }),

    // Pet management
    pets: createTRPCRouter({
      getProfile: getPetProfileProcedure,
      updateProfile: updatePetProfileProcedure,
      delete: deletePetProcedure,
      search: searchPetsProcedure,
      // Pet approval management
      getPendingApprovals: getPendingPetApprovalsProcedure,
      reviewApproval: reviewPetApprovalProcedure,
      getApprovalStats: getPetApprovalStatsProcedure,
    }),

    // Approvals management
    approvals: createTRPCRouter({
      getPending: getPendingApprovalsProcedure,
      getDetails: getApprovalDetailsProcedure,
      approve: approveRequestProcedure,
      reject: rejectRequestProcedure,
      create: createApprovalRequestProcedure,
      checkExpired: checkExpiredSubscriptionsProcedure,
    }),

    // Veterinarian approvals management
    veterinarianApprovals: createTRPCRouter({
      getPendingApplications: veterinarianApprovalsRouter.getPendingApplications,
      approveApplication: veterinarianApprovalsRouter.approveApplication,
      rejectApplication: veterinarianApprovalsRouter.rejectApplication,
      getApplicationDetails: veterinarianApprovalsRouter.getApplicationDetails,
      submitApplication: veterinarianApprovalsRouter.submitApplication,
      checkApplicationStatus: veterinarianApprovalsRouter.checkApplicationStatus,
      getApprovalNotifications: veterinarianApprovalsRouter.getApprovalNotifications,
    }),

    // Jobs management
    jobs: createTRPCRouter({
      getAllJobs: jobsRouter.getAllJobs,
      createJob: jobsRouter.createJob,
      updateJob: jobsRouter.updateJob,
      deleteJob: jobsRouter.deleteJob,
      getJobApplications: jobsRouter.getJobApplications,
      manageJobApplication: jobsRouter.manageJobApplication,
      getFieldSupervisionRequests: jobsRouter.getFieldSupervisionRequests,
      getJobsAnalytics: jobsRouter.getJobsAnalytics,
      submitJobApplication: jobsRouter.submitJobApplication,
      submitCourseRegistration: jobsRouter.submitCourseRegistration,
      getCourseRegistrations: jobsRouter.getCourseRegistrations,
    }),

    // Courses management
    courses: createTRPCRouter({
      getList: getCoursesListProcedure,
      getById: getCourseProcedure,
      create: createCourseProcedure,
      update: updateCourseProcedure,
      delete: deleteCourseProcedure,
      register: registerForCourseProcedure,
      getRegistrations: getCourseRegistrationsProcedure,
      updateRegistrationStatus: updateRegistrationStatusProcedure,
    }),

    // Notifications management
    notifications: createTRPCRouter({
      getNotifications: getAdminNotificationsProcedure,
      markAsRead: markNotificationAsReadProcedure,
      markAllAsRead: markAllNotificationsAsReadProcedure,
      delete: deleteNotificationProcedure,
      getUnreadCount: getUnreadNotificationsCountProcedure,
      create: createNotificationProcedure,
    }),

    // AI settings management
    aiSettings: createTRPCRouter({
      update: updateAiSettingsProcedure,
      get: getAiSettingsProcedure,
      toggle: toggleAiProcedure,
    }),

    // Field assignments management
    fieldAssignments: createTRPCRouter({
      getFieldAssignments: getFieldAssignments,
      getAvailableVets: getAvailableVets,
      getAvailableSupervisors: getAvailableSupervisors,
      getAvailableFarms: getAvailableFarms,
      assignVetToField: assignVetToField,
      assignSupervisorToField: assignSupervisorToField,
      removeVetFromField: removeVetFromField,
      removeSupervisorFromField: removeSupervisorFromField,
      getFieldAssignment: getFieldAssignment,
      getAssignedFieldsForVet: getAssignedFieldsForVet,
      getAssignedFieldsForSupervisor: getAssignedFieldsForSupervisor,
      // New procedures for ownership control
      assignVetProcedure: assignVetProcedure,
      assignSupervisorProcedure: assignSupervisorProcedure,
      getAssignedFieldsForVetProcedure: getAssignedFieldsForVetProcedure,
      getAllFieldsForAdmin: getAllFieldsForAdminAssignmentProcedure,
      getUserFarms: getUserFarmsAssignmentProcedure,
    }),
  }),

  // AI auto-reply system
  ai: createTRPCRouter({
    autoReplyConsultation: autoReplyConsultationProcedure,
    autoReplyInquiry: autoReplyInquiryProcedure,
    checkStatus: checkAiStatusProcedure,
    getStats: getAiStatsProcedure,
    test: testAiProcedure,
  }),

  // Courses management (public access)
  courses: createTRPCRouter({
    getList: getCoursesListProcedure,
    getById: getCourseProcedure,
    register: registerForCourseProcedure,
  }),

  // Orders managment (public access)
  orders: createTRPCRouter({
    list: listOrdersProcedure,
    update: updateOrderStatusProcedure,
    get: getOrderStatsProcedure,
  }),

  polls: createTRPCRouter({
    getByAdId: getPollByAdIdProcedure,
    vote: voteProcedure,
    getResults: getPollResultsProcedure,
    hasVoted: hasUserVotedProcedure,
    getActive: getActivePollsProcedure,
  }),
});

export type AppRouter = typeof appRouter;

// Export admin permission helper for use in other files
export { getUserPermissionsProcedure };
