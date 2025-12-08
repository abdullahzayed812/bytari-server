import { createTRPCRouter } from "./create-context";
import hiRoute, { testQuery } from "./routes/example/hi/route";
import { createUserProcedure } from "./routes/users/create/route";
import { getUsersProcedure } from "./routes/users/list/route";
import { unionRouter } from "./routes/union";

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
  deleteAccountProcedure,
} from "./routes/auth/route";

// Admin user management
import { getSupervisorsProcedure } from "./routes/admin/users/supervisors";
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
  // getPetProfileProcedure,
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
import {
  getAdoptionBreedingPetDetailsProcedure,
  getAllPetsProcedure,
  getLostPetDetailsProcedure,
} from "./routes/pets/get/route";

import {
  // addMedicalRecordProcedure,
  // addReminderProcedure,
  // addVaccinationProcedure,
  createFollowUpRequestProcedure,
  createTreatmentCardProcedure,
  deleteMedicalRecordProcedure,
  deleteVaccinationProcedure,
  // deleteMedicalRecordProcedure,
  // deleteReminderProcedure,
  // deleteVaccinationProcedure,
  // updatePetProcedure,
  getPetProfileProcedure,
} from "./routes/pets/medical-records/route";

import {
  approveMedicalActionProcedure,
  getMyMedicalRequestsProcedure,
  getPendingMedicalActionsProcedure,
  rejectMedicalActionProcedure,
  requestAddMedicalRecordProcedure,
  requestAddReminderProcedure,
  requestAddVaccinationProcedure,
} from "./routes/pets/pet-notes-permissions/route";

import { createAppointmentProcedure } from "./routes/appointments/create/route";
import { listAppointmentsProcedure } from "./routes/appointments/list/route";
import { createInquiryProcedure } from "./routes/inquiries/create/route";
import { replyInquiryProcedure } from "./routes/inquiries/reply/route";
import { listForUserProcedure } from "./routes/inquiries/list-for-user";
import { userReplyInquiryProcedure } from "./routes/inquiries/user-reply/route";
import { getInquiriesListProcedure, getInquiryDetailsProcedure } from "./routes/inquiries/list/route";

import { createConsultationProcedure } from "./routes/consultations/create/route";
import { replyConsultationProcedure } from "./routes/consultations/reply/route";
import { listForUserProcedure as listConsultationsForUserProcedure } from "./routes/consultations/list-for-user";
import { userReplyConsultationProcedure } from "./routes/consultations/user-reply/route";
import { getConsultationDetailsProcedure, getConsultationsListProcedure } from "./routes/consultations/list/route";

// Store routes
import { createStoreProcedure } from "./routes/stores/create/route";
import {
  getStoreProcedure,
  getUserApprovedStoresProcedure,
  getUserStoresProcedure,
  listActiveStoresProcedure,
  listStoresProcedure,
} from "./routes/stores/list/route";
import { addStoreProductProcedure } from "./routes/stores/products/create/route";
import { listProductsProcedure } from "./routes/stores/products/list/route";
import { updateStoreProductProcedure } from "./routes/stores/products/update/route";
import { deleteStoreProductProcedure } from "./routes/stores/products/delete/route";
import { toggleStoreProductVisibilityProcedure } from "./routes/stores/products/toggle/route";
import { getStoreProductProcedure } from "./routes/stores/products/get/route";
import { getStoreByIdProcedure } from "./routes/stores/getById/route";
import { updateStoreProcedure } from "./routes/stores/update/route";
import { deleteStoreProcedure } from "./routes/stores/delete/route";
import {
  addStoreStaffProcedure,
  getStoreSettingsProcedure,
  getStoreStaffProcedure,
  getStoreSubscriptionProcedure,
  removeStoreStaffProcedure,
  requestStoreRenewalProcedure,
  updateStoreBasicInfoProcedure,
  updateStoreContactInfoProcedure,
  updateStoreImagesProcedure,
  updateStorePermissionsProcedure,
  updateStoreWorkingHoursProcedure,
} from "./routes/stores/settings/route";

// Clinic routes
import {
  approveClinicAccessProcedure,
  checkClinicAccessProcedure,
  getPendingAccessRequestsProcedure,
  rejectClinicAccessProcedure,
  requestClinicAccessProcedure,
  getMyAccessRequestsProcedure,
  getClinicFollowUpsProcedure,
  cancelClinicFollowUpsProcedure,
} from "./routes/pets/clinic-access/route";
import {
  createClinicProcedure,
  updateClinicActivationProcedure,
  renewClinicActivationProcedure,
} from "./routes/clinics/create/route";
import {
  getUserClinicsProcedure,
  getClinicDetailsProcedure,
  getUserApprovedClinicsProcedure,
  // getVetClinicsProcedure,
  getAllClinicsForAdmin,
  getClinicByIdProcedure,
} from "./routes/clinics/list/route";
import { getActiveClinicsListProcedure } from "./routes/clinics/public/route";
import { getClinicDashboardDataProcedure } from "./routes/clinics/dashboard/route";
import { getTodayCasesProcedure } from "./routes/clinics/cases/route";
import { getClinicAnimalsProcedure } from "./routes/clinics/animals/route";
import { getClinicLatestPetsProcedure } from "./routes/clinics/pets/route";
import {
  deleteClinicProcedure,
  toggleClinicVisibilityProcedure,
  updateClinicProcedure,
} from "./routes/clinics/update-delete-visible/route";

import {
  getClinicRemindersProcedure,
  updateReminderStatusProcedure,
  deleteReminderProcedure,
} from "./routes/clinics/reminders/route";
import {
  getClinicVaccinationsProcedure,
  rescheduleVaccinationProcedure,
  updateVaccinationStatusProcedure,
} from "./routes/clinics/vaccinations/route";

import {
  deleteFollowupProcedure,
  getClinicFollowupsProcedure,
  getFollowupStatsProcedure,
  requestFollowupProcedure,
  rescheduleFollowupProcedure,
  updateFollowupStatusProcedure,
} from "./routes/clinics/followups/route";

import {
  getClinicSettingsProcedure,
  updateClinicBasicInfoProcedure,
  updateClinicContactInfoProcedure,
  updateClinicWorkingHoursProcedure,
  getClinicStaffProcedure,
  addClinicStaffProcedure,
  removeClinicStaffProcedure,
  updateClinicServicesProcedure,
  updateClinicImagesProcedure,
  getClinicSubscriptionProcedure,
  requestClinicRenewalProcedure,
} from "./routes/clinics/settings/route";

import {
  getClinicStaffWithPermissionsProcedure,
  updateStaffPermissionsProcedure,
} from "./routes/clinics/vet-permissions/route";

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
  // getAllRolesProcedure,
  // getAllPermissionsProcedure,
  // assignRoleProcedure,
  // removeRoleProcedure,
  getAllPermissionsGroupedProcedure,
  assignPermissionsProcedure,
  sendMessageToUserProcedure,
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
  deleteVetMagazineProcedure,
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
  getUserFarmsAssignmentProcedure,
  getAllFieldsForAdminAssignmentProcedure,
} from "./routes/poultry-farms/assignments/route";

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
  getAllCoursesRegistrationsProcedure,
} from "./routes/courses/route";

// Orders routes
import { getOrderStatsProcedure } from "./routes/orders/get/route";
import { updateOrderStatusProcedure } from "./routes/orders/update/route";
import { listOrdersProcedure } from "./routes/orders/list/route";

// Polls
import {
  getByAdId,
  vote,
  getResults,
  hasVoted,
  getActive,
  create,
  update,
  deletePoll,
  getAll,
} from "./routes/polls/route";

import { getPoultryFarmDetailsProcedure, listPoultryFarmsProcedure } from "../trpc/routes/poultry-farms/list/route";
import { createPoultryFarmProcedure } from "../trpc/routes/poultry-farms/create/route";
import {
  getAvailableSupervisors,
  getAvailableVets,
  getFieldAssignments,
} from "../trpc/routes/admin/field-assignments/route";

import { hospitalRouter } from "./routes/hospitals/hospital";
import { announcementRouter } from "./routes/hospitals/announcement";

import { contentRouter } from "./routes/content/route";

import {
  getUserNotificationsProcedure,
  markNotificationAsReadProcedure as markUserNotificationAsReadProcedure,
  markAllNotificationsAsReadProcedure as markAllUserNotificationsAsReadProcedure,
  deleteUserNotificationProcedure,
  getUnreadNotificationsCountProcedure as getUnreadUserNotificationsCountProcedure,
  createNotificationProcedure as createUserNotificationProcedure,
} from "./routes/notifications/route";

// Poultry batches and daily data
import { addPoultryBatchProcedure, addDailyDataProcedure, sellBatchProcedure } from "./routes/poultry-batches/route";

// Assignment requests (vet, supervisor, removal)
import {
  requestSupervisorAssignmentProcedure,
  requestVetAssignmentProcedure,
  requestRemovalProcedure,
  getAssignmentRequestsProcedure,
  approveAssignmentRequestProcedure,
  rejectAssignmentRequestProcedure,
} from "./routes/assignment-requests/route";

// Vet Store routes
import { createVetStoreProcedure } from "./routes/vet-stores/create/route";
import { updateVetStoreProcedure } from "./routes/vet-stores/update/route";
import { deleteVetStoreProcedure } from "./routes/vet-stores/delete/route";
import { getUserVetStoresProcedure, listActiveVetStoresProcedure } from "./routes/vet-stores/list/route";
import { getVetStoreByIdProcedure } from "./routes/vet-stores/getById/route";
import { addVetStoreProductProcedure } from "./routes/vet-stores/products/create/route";
import { listVetStoreProductsProcedure } from "./routes/vet-stores/products/list/route";

export const appRouter = createTRPCRouter({
  // ... existing routes ...

  // Vet Store routes
  vetStores: createTRPCRouter({
    create: createVetStoreProcedure,
    update: updateVetStoreProcedure,
    delete: deleteVetStoreProcedure,
    getUserStores: getUserVetStoresProcedure,
    listActive: listActiveVetStoresProcedure,
    getById: getVetStoreByIdProcedure,
    products: createTRPCRouter({
      create: addVetStoreProductProcedure,
      list: listVetStoreProductsProcedure,
    }),
  }),

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
    deleteAccount: deleteAccountProcedure,
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
    getProfile: getPetProfileProcedure,
    getUserPets: getUserPetsProcedure,
    getAllForAdmin: getAllPetsForAdminProcedure,
    getLostPetDetails: getLostPetDetailsProcedure,
    getAdoptionBreedingPetDetails: getAdoptionBreedingPetDetailsProcedure,

    // Pet approval system
    createApprovalRequest: createPetApprovalProcedure,
    getUserApprovals: getUserPetApprovalsProcedure,
    getApproved: getApprovedPetsProcedure,
    getAllPets: getAllPetsProcedure,

    // Medical records and vaccinations
    createTreatmentCard: createTreatmentCardProcedure,
    createFollowUpRequest: createFollowUpRequestProcedure,

    deleteMedicalRecord: deleteMedicalRecordProcedure,
    deleteVaccination: deleteVaccinationProcedure,
    deleteReminder: deleteReminderProcedure,

    getMyAccessRequests: getMyAccessRequestsProcedure,

    // Clinic access
    requestClinicAccess: requestClinicAccessProcedure,
    getPendingAccessRequests: getPendingAccessRequestsProcedure,
    approveClinicAccess: approveClinicAccessProcedure,
    rejectClinicAccess: rejectClinicAccessProcedure,
    checkClinicAccess: checkClinicAccessProcedure,

    // NEW: Request-based medical actions (replaces direct add)
    requestAddMedicalRecord: requestAddMedicalRecordProcedure,
    requestAddVaccination: requestAddVaccinationProcedure,
    requestAddReminder: requestAddReminderProcedure,

    // Owner approval system
    getPendingMedicalActions: getPendingMedicalActionsProcedure,
    approveMedicalAction: approveMedicalActionProcedure,
    rejectMedicalAction: rejectMedicalActionProcedure,

    // Vet request tracking
    getMyMedicalRequests: getMyMedicalRequestsProcedure,

    // Follow ups
    getClinicFollowUps: getClinicFollowUpsProcedure,
    cancelFollowUps: cancelClinicFollowUpsProcedure,
  }),

  poultryFarms: createTRPCRouter({
    getUserFarms: getUserFarmsAssignmentProcedure,
    getAllForAdmin: getAllFieldsForAdminAssignmentProcedure,

    list: listPoultryFarmsProcedure,
    create: createPoultryFarmProcedure,
    getDetails: getPoultryFarmDetailsProcedure,
  }),

  poultryBatches: createTRPCRouter({
    add: addPoultryBatchProcedure,
    addDailyData: addDailyDataProcedure,
    sell: sellBatchProcedure,
  }),

  assignmentRequests: createTRPCRouter({
    requestVet: requestVetAssignmentProcedure,
    requestSupervisor: requestSupervisorAssignmentProcedure,
    requestRemoval: requestRemovalProcedure,
    getAll: getAssignmentRequestsProcedure,
    approve: approveAssignmentRequestProcedure,
    reject: rejectAssignmentRequestProcedure,
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
    getList: getInquiriesListProcedure,
    getDetails: getInquiryDetailsProcedure,
  }),

  consultations: createTRPCRouter({
    create: createConsultationProcedure,
    reply: replyConsultationProcedure, // للمشرفين
    userReply: userReplyConsultationProcedure, // للمستخدمين
    listForUser: listConsultationsForUserProcedure,
    getList: getConsultationsListProcedure,
    getDetails: getConsultationDetailsProcedure,
  }),

  // Store routes
  stores: createTRPCRouter({
    create: createStoreProcedure,
    list: listStoresProcedure,
    listActive: listActiveStoresProcedure,
    getById: getStoreByIdProcedure,
    getUserApprovedStores: getUserApprovedStoresProcedure,
    update: updateStoreProcedure,
    delete: deleteStoreProcedure,

    products: createTRPCRouter({
      get: getStoreProductProcedure,
      list: listProductsProcedure,
      create: addStoreProductProcedure,
      update: updateStoreProductProcedure,
      delete: deleteStoreProductProcedure,
      toggle: toggleStoreProductVisibilityProcedure,
    }),

    getUserStores: getUserStoresProcedure,
    getStoreDetails: getStoreProcedure,
    updateWarehouse: updateStoreProcedure,

    settings: {
      updateBasicInfo: updateStoreBasicInfoProcedure,
      updateContactInfo: updateStoreContactInfoProcedure,
      updateWorkingHours: updateStoreWorkingHoursProcedure,
      getSettings: getStoreSettingsProcedure,
      getSubscription: getStoreSubscriptionProcedure,

      requestRenewal: requestStoreRenewalProcedure,

      staff: {
        addStaff: addStoreStaffProcedure,
        removeStaff: removeStoreStaffProcedure,
        updatePermissions: updateStorePermissionsProcedure,
        getStaff: getStoreStaffProcedure,
      },
    },
  }),

  // Clinic routes
  clinics: createTRPCRouter({
    create: createClinicProcedure,
    updateActivation: updateClinicActivationProcedure,
    renewActivation: renewClinicActivationProcedure,
    getUserClinics: getUserClinicsProcedure,
    getUserApprovedClinics: getUserApprovedClinicsProcedure,
    getDetails: getClinicDetailsProcedure,
    getById: getClinicByIdProcedure,
    getActiveList: getActiveClinicsListProcedure,
    getDashboardData: getClinicDashboardDataProcedure,
    getTodayCases: getTodayCasesProcedure,
    getClinicAnimals: getClinicAnimalsProcedure,
    getLatestPets: getClinicLatestPetsProcedure,
    getAllClinics: getAllClinicsForAdmin,

    toggleClinicVisibility: toggleClinicVisibilityProcedure,
    deleteClinic: deleteClinicProcedure,
    updateClinic: updateClinicProcedure,

    // getVetClinics: getVetClinicsProcedure,

    public: createTRPCRouter({
      getPublicClinics: getActiveClinicsListProcedure,
    }),

    reminders: createTRPCRouter({
      getClinicReminders: getClinicRemindersProcedure,
      updateReminderStatus: updateReminderStatusProcedure,
      deleteReminder: deleteReminderProcedure,
    }),
    vaccinations: createTRPCRouter({
      getClinicVaccinations: getClinicVaccinationsProcedure,
      updateVaccinationStatus: updateVaccinationStatusProcedure,
      rescheduleVaccination: rescheduleVaccinationProcedure,
    }),
    followups: createTRPCRouter({
      getClinicFollowups: getClinicFollowupsProcedure,
      updateFollowupStatus: updateFollowupStatusProcedure,
      rescheduleFollowup: rescheduleFollowupProcedure,
      deleteFollowup: deleteFollowupProcedure,
    }),

    settings: createTRPCRouter({
      getSettings: getClinicSettingsProcedure,
      getSubscription: getClinicSubscriptionProcedure,

      updateBasicInfo: updateClinicBasicInfoProcedure,
      updateContactInfo: updateClinicContactInfoProcedure,
      updateWorkingHours: updateClinicWorkingHoursProcedure,
      updateServices: updateClinicServicesProcedure,
      updateImages: updateClinicImagesProcedure,

      requestRenewal: requestClinicRenewalProcedure,

      staff: createTRPCRouter({
        getStaff: getClinicStaffWithPermissionsProcedure,
        addStaff: addClinicStaffProcedure,
        removeStaff: removeClinicStaffProcedure,
        updatePermissions: updateStaffPermissionsProcedure,
      }),
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
      getAllPermissionsGrouped: getAllPermissionsGroupedProcedure,
      getUserPermissions: getUserPermissionsProcedure,
      // getAllRoles: getAllRolesProcedure,
      assignPermissions: assignPermissionsProcedure,
      // getAllPermissions: getAllPermissionsProcedure,
      sendMessageToUser: sendMessageToUserProcedure,
      // assignRole: assignRoleProcedure,
      // removeRole: removeRoleProcedure,
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
      deleteMagazine: deleteVetMagazineProcedure,

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
      submitFieldSupervisionRequest: jobsRouter.submitFieldSupervisionRequest,
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
      getAllCoursesRegistrations: getAllCoursesRegistrationsProcedure,
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
    }),
  }),

  hospitals: hospitalRouter,
  announcements: announcementRouter,

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
    getByAdId: getByAdId,
    vote: vote,
    getResults: getResults,
    hasVoted: hasVoted,
    getActive: getActive,
    create: create,
    update: update,
    delete: deletePoll,
    getAll: getAll,
  }),

  // User notifications
  notifications: createTRPCRouter({
    list: getUserNotificationsProcedure,
    markAsRead: markUserNotificationAsReadProcedure,
    markAllAsRead: markAllUserNotificationsAsReadProcedure,
    delete: deleteUserNotificationProcedure,
    getUnreadCount: getUnreadUserNotificationsCountProcedure,
    create: createUserNotificationProcedure,
  }),

  union: unionRouter,
});

export type AppRouter = typeof appRouter;

// Export admin permission helper for use in other files
export { getUserPermissionsProcedure };
