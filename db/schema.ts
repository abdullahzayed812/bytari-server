import { sql, relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  real,
  boolean,
  timestamp,
  serial,
  jsonb,
  decimal,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // Hashed password
  name: text("name").notNull(),
  phone: text("phone"),
  userType: text("user_type").notNull().default("pet_owner"), // 'user', 'vet', 'admin'
  avatar: text("avatar"),
  isActive: boolean("is_active").notNull().default(true),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: text("email_verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires", {
    withTimezone: true,
  }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Pets table
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'dog', 'cat', 'bird', etc.
  breed: text("breed"),
  age: integer("age"),
  weight: real("weight"),
  color: text("color"),
  gender: text("gender"), // 'male', 'female'
  image: text("image"),
  medicalHistory: text("medical_history"),
  vaccinations: jsonb("vaccinations"), // JSON data
  isLost: boolean("is_lost").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Medical records table
export const medicalRecords = pgTable("medical_records", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id").references(() => clinics.id),
  veterinarianId: integer("veterinarian_id").references(() => veterinarians.id),
  diagnosis: text("diagnosis").notNull(),
  treatment: text("treatment").notNull(),
  notes: text("notes"),
  prescriptionImage: text("prescription_image"),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Vaccinations table (structured)
export const vaccinations = pgTable("vaccinations", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id").references(() => clinics.id),
  name: text("name").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull().defaultNow(),
  nextDate: timestamp("next_date", { withTimezone: true }),
  status: text("status").notNull().default("scheduled"), // Added status field
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Pet reminders table
export const petReminders = pgTable("pet_reminders", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id").references(() => clinics.id),
  title: text("title").notNull(),
  description: text("description"),
  reminderDate: timestamp("reminder_date", { withTimezone: true }).notNull(),
  reminderType: text("reminder_type").notNull().default("checkup"), // 'vaccination', 'medication', 'checkup', 'other'
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Treatment cards table
export const treatmentCards = pgTable("treatment_cards", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinics.id),
  medications: jsonb("medications").notNull(),
  instructions: text("instructions"),
  followUpDate: timestamp("follow_up_date", { withTimezone: true }),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Follow-up requests table
export const followUpRequests = pgTable("follow_up_requests", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinics.id),
  reason: text("reason").notNull(),
  notes: text("notes"),
  urgency: text("urgency").notNull().default("normal"), // 'low', 'normal', 'high'
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Single access request table - replaces the need for multiple request types
export const clinicAccessRequests = pgTable("clinic_access_requests", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinics.id),
  veterinarianId: integer("veterinarian_id").references(() => veterinarians.id),

  // Simple request
  reason: text("reason").notNull(),

  // Status and tracking
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  expiresAt: timestamp("expires_at", { withTimezone: true }), // When access will expire
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Simple approved access table
export const approvedClinicAccess = pgTable("approved_clinic_access", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinics.id),
  requestId: integer("request_id").references(() => clinicAccessRequests.id),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // Access expiration (e.g., 1 year)
  isActive: boolean("is_active").notNull().default(true),
  grantedBy: integer("granted_by") // pet owner who granted access
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Pending medical actions - awaiting owner approval
export const pendingMedicalActions = pgTable("pending_medical_actions", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinics.id),
  veterinarianId: integer("veterinarian_id").references(() => veterinarians.id),

  // Action type
  actionType: text("action_type").notNull(), // 'medical_record', 'vaccination', 'reminder'

  // Action data stored as JSON
  actionData: jsonb("action_data").notNull(),

  // Request details
  reason: text("reason"), // Why this action is needed
  notes: text("notes"), // Additional notes from vet

  // Status tracking
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Veterinarians table
export const veterinarians = pgTable("veterinarians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  licenseNumber: text("license_number"),
  specialization: text("specialization"),
  experience: integer("experience"), // years
  // clinicId: integer("clinic_id").references(() => clinics.id),
  isVerified: boolean("is_verified").notNull().default(false),
  rating: real("rating").default(0),
  consultationFee: real("consultation_fee"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Clinics table
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  email: text("email"),
  description: text("description"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  workingHours: jsonb("working_hours"), // JSON data
  services: jsonb("services"), // JSON data
  images: jsonb("images"), // JSON data
  doctors: text("doctors"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  whatsapp: text("whatsapp"),
  website: text("website"),
  rating: real("rating").default(0),
  isActive: boolean("is_active").notNull().default(true),
  activationStartDate: timestamp("activation_start_date", {
    withTimezone: true,
  }),
  activationEndDate: timestamp("activation_end_date", { withTimezone: true }),
  reviewingRenewalRequest: boolean("reviewing_renewal_request").notNull().default(false),
  needsRenewal: boolean("needs_renewal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ============== CLINIC STAFF TABLE ==============
// This table tracks all staff assignments to clinics
export const clinicStaff = pgTable("clinic_staff", {
  id: serial("id").primaryKey(),

  // References
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinics.id, { onDelete: "cascade" }),
  veterinarianId: integer("veterinarian_id")
    .notNull()
    .references(() => veterinarians.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Assignment details
  addedBy: integer("added_by")
    .notNull()
    .references(() => users.id), // Clinic owner who added this vet

  // Status
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'removed'
  isActive: boolean("is_active").notNull().default(true),

  // Role and permissions (can reference vetPermissions or store directly)
  role: text("role").default("view_edit_pets"), // 'all', 'view_edit_pets', 'view_only', 'appointments_only'

  // Notes
  notes: text("notes"), // Optional notes about this assignment

  // Timestamps
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vetPermissions = pgTable("vet_permissions", {
  id: serial("id").primaryKey(),
  veterinarianId: integer("veterinarian_id")
    .notNull()
    .references(() => veterinarians.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinics.id, { onDelete: "cascade" }),

  // Permission role
  role: text("role").notNull().default("view_edit_pets"), // 'all', 'view_edit_pets', 'view_only', 'appointments_only'

  // Granular permissions
  canViewPets: boolean("can_view_pets").default(true),
  canEditPets: boolean("can_edit_pets").default(true),
  canAddMedicalRecords: boolean("can_add_medical_records").default(true),
  canAddVaccinations: boolean("can_add_vaccinations").default(true),
  canManageAppointments: boolean("can_manage_appointments").default(true),
  canViewReports: boolean("can_view_reports").default(false),
  canManageStaff: boolean("can_manage_staff").default(false),
  canManageSettings: boolean("can_manage_settings").default(false),

  // Additional settings
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Appointments table
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  vetId: integer("vet_id")
    .notNull()
    .references(() => veterinarians.id),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id, { onDelete: "cascade" }),
  clinicId: integer("clinic_id").references(() => clinics.id),
  appointmentDate: timestamp("appointment_date", {
    withTimezone: true,
  }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'completed', 'cancelled'
  type: text("type").notNull(), // 'consultation', 'vaccination', 'surgery', etc.
  notes: text("notes"),
  fee: real("fee"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Adoption pets table
export const adoptionPets = pgTable("adoption_pets", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),

  // Pet details
  name: text("name").notNull(),
  type: text("type").notNull(),
  breed: text("breed"),
  age: integer("age"),
  weight: real("weight"),
  color: text("color"),
  gender: text("gender"),
  image: text("image"),

  // Documents
  ownershipProof: text("ownership_proof"),
  veterinaryCertificate: text("veterinary_certificate"),

  description: text("description"),
  images: jsonb("images"), // JSON array of image URLs
  contactInfo: jsonb("contact_info"),
  location: text("location"),
  price: real("price"),
  specialRequirements: text("special_requirements"),

  // Status
  isAvailable: boolean("is_available").notNull().default(false), // False until approved
  isClosedByOwner: boolean("is_closed_by_owner").notNull().default(false),
  adoptedBy: integer("adopted_by").references(() => users.id),
  adoptedAt: timestamp("adopted_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Breeding pets table
export const breedingPets = pgTable("breeding_pets", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),

  // Pet details
  name: text("name").notNull(),
  type: text("type").notNull(),
  breed: text("breed"),
  age: integer("age"),
  weight: real("weight"),
  color: text("color"),
  gender: text("gender"),
  image: text("image"),

  // Documents
  ownershipProof: text("ownership_proof"),
  veterinaryCertificate: text("veterinary_certificate"),

  // Breeding specific fields
  description: text("description"),
  images: jsonb("images"), // JSON array of image URLs
  contactInfo: jsonb("contact_info"),
  location: text("location"),
  price: real("price"),
  specialRequirements: text("special_requirements"),

  // Breeding details
  pedigree: text("pedigree"),
  healthCertificates: jsonb("health_certificates"),
  breedingHistory: jsonb("breeding_history"),

  // Status
  isAvailable: boolean("is_available").notNull().default(false), // False until approved
  isClosedByOwner: boolean("is_closed_by_owner").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Lost pets table
export const lostPets = pgTable("lost_pets", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),

  // Pet details
  name: text("name").notNull(),
  type: text("type").notNull(),
  breed: text("breed"),
  age: integer("age"),
  weight: real("weight"),
  color: text("color"),
  gender: text("gender"),
  image: text("image"),

  // Documents
  ownershipProof: text("ownership_proof"),
  veterinaryCertificate: text("veterinary_certificate"),

  // Lost pet specific fields
  description: text("description"),
  images: jsonb("images"), // JSON array of image URLs
  contactInfo: jsonb("contact_info"), // Store owner's contact info here
  location: text("location"),
  lastSeenLocation: text("last_seen_location").notNull(),
  lastSeenDate: timestamp("last_seen_date", { withTimezone: true }).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  reward: real("reward"),
  specialRequirements: text("special_requirements"),

  // Status: 'pending' (waiting approval), 'lost' (approved and still lost), 'found', 'closed'
  status: text("status").notNull().default("pending"),
  foundBy: integer("found_by").references(() => users.id),
  foundAt: timestamp("found_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Pet Sighting Reports table
export const petSightingReports = pgTable("pet_sighting_reports", {
  id: serial("id").primaryKey(),
  lostPetId: integer("lost_pet_id")
    .notNull()
    .references(() => lostPets.id),
  reporterId: integer("reporter_id")
    .notNull()
    .references(() => users.id),
  sightingDate: timestamp("sighting_date", { withTimezone: true }).notNull().defaultNow(),
  sightingLocation: text("sighting_location").notNull(),
  description: text("description"),
  contactInfo: jsonb("contact_info"), // Reporter's contact info
  images: jsonb("images"), // Images from the sighting
  isDismissed: boolean("is_dismissed").notNull().default(false), // By the owner
  dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }),
  vetStoreId: integer("vet_store_id").references(() => vetStores.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  brand: text("brand"),
  images: jsonb("images"), // JSON data
  inStock: boolean("in_stock").notNull().default(true),
  stockQuantity: integer("stock_quantity").default(0),
  sku: text("sku").unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Store Type Enum
export const storeTypeEnum = pgEnum("store_type", ["veterinarian", "pet_owner"]);

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  storeType: storeTypeEnum("store_type").notNull().default("pet_owner"), // 'veterinarian' or 'pet_owner'
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
  totalAmount: real("total_amount").notNull(),
  shippingAddress: jsonb("shipping_address"), // JSON data
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Marketplace Products Table (New)
export const marketplaceProducts = pgTable("marketplace_products", {
  id: serial("id").primaryKey(),
  storeType: storeTypeEnum("store_type").notNull(), // 'veterinarian' or 'pet_owner'
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  image: text("image"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  inStock: boolean("in_stock").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  productId: integer("product_id").references(() => products.id), // Legacy/Existing
  storeProductId: integer("store_product_id").references(() => storeProducts.id), // Legacy/Existing
  marketplaceProductId: integer("marketplace_product_id").references(() => marketplaceProducts.id), // NEW
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
});

// Inquiries table
export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'answered', 'closed'
  priority: text("priority").default("medium"), // 'low', 'medium', 'high'
  attachments: jsonb("attachments"), // JSON data
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Inquiry replies table
export const inquiryReplies = pgTable("inquiry_replies", {
  id: serial("id").primaryKey(),
  inquiryId: integer("inquiry_id")
    .notNull()
    .references(() => inquiries.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  isFromAdmin: boolean("is_from_admin").notNull().default(false),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  attachments: jsonb("attachments"), // JSON data
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Alias for backward compatibility
export const inquiryResponses = inquiryReplies;

// Consultations table
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  petId: integer("pet_id").references(() => pets.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  symptoms: text("symptoms"),
  urgencyLevel: text("urgency_level").notNull().default("medium"), // 'low', 'medium', 'high', 'emergency'
  status: text("status").notNull().default("pending"), // 'pending', 'answered', 'closed'
  category: text("category").notNull(),
  attachments: jsonb("attachments"), // JSON data
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Consultation replies table
export const consultationReplies = pgTable("consultation_replies", {
  id: serial("id").primaryKey(),
  consultationId: integer("consultation_id")
    .notNull()
    .references(() => consultations.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  isFromVet: boolean("is_from_vet").notNull().default(false),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  attachments: jsonb("attachments"), // JSON data
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Alias for backward compatibility
export const consultationResponses = consultationReplies;

// Stores table
// Stores table with additional fields for licensing
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logo: text("logo"),
  bannerImage: text("banner_image"),
  category: text("category").notNull(),

  // Location
  latitude: real("latitude"),
  longitude: real("longitude"),

  // License information
  licenseNumber: text("license_number"),
  licenseImage: text("license_image"),
  identityImage: text("identity_image"),

  // Working hours
  workingHours: text("working_hours"),

  // Social connections
  facebook: text("facebook"),
  instagram: text("instagram"),
  whatsapp: text("whatsapp"),

  // Status flags
  isActive: boolean("is_active").notNull().default(false), // Default false until approved
  isVerified: boolean("is_verified").notNull().default(false),
  showOnVetHome: boolean("show_on_vet_home").notNull().default(false),

  // Rating and sales
  rating: real("rating").default(0),
  totalSales: real("total_sales").default(0),

  // Subscription management
  activationStartDate: timestamp("activation_start_date", { withTimezone: true }),
  activationEndDate: timestamp("activation_end_date", { withTimezone: true }),
  reviewingRenewalRequest: boolean("reviewing_renewal_request").notNull().default(false),
  needsRenewal: boolean("needs_renewal").notNull().default(false),
  subscriptionStatus: text("subscription_status").default("pending"), // 'active', 'expired', 'pending'

  // Additional images
  images: text("images"), // JSON array of image URLs

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Store Staff Table - Similar to clinic_staff
export const storeStaff = pgTable("store_staff", {
  id: serial("id").primaryKey(),

  // References
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  veterinarianId: integer("veterinarian_id")
    .notNull()
    .references(() => veterinarians.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Assignment details
  addedBy: integer("added_by")
    .notNull()
    .references(() => users.id), // Store owner who added this employee

  // Status
  status: text("status").notNull().default("active"), // 'active', 'inactive', 'removed'
  isActive: boolean("is_active").notNull().default(true),

  // Role and permissions
  role: text("role").default("view_only"), // 'all', 'view_edit_inventory', 'view_only', 'orders_only'

  // Notes
  notes: text("notes"),

  // Timestamps
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Store Permissions Table - Similar to vet_permissions
export const storePermissions = pgTable("store_permissions", {
  id: serial("id").primaryKey(),
  veterinarianId: integer("veterinarian_id")
    .notNull()
    .references(() => veterinarians.id, { onDelete: "cascade" }),
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),

  // Permission role
  role: text("role").notNull().default("view_only"), // 'all', 'view_edit_inventory', 'view_only', 'orders_only'

  // Granular permissions
  canViewProducts: boolean("can_view_products").default(true),
  canEditProducts: boolean("can_edit_products").default(true),
  canAddProducts: boolean("can_add_products").default(true),
  canDeleteProducts: boolean("can_delete_products").default(false),
  canManageOrders: boolean("can_manage_orders").default(true),
  canViewReports: boolean("can_view_reports").default(false),
  canManageStaff: boolean("can_manage_staff").default(false),
  canManageSettings: boolean("can_manage_settings").default(false),
  canManageInventory: boolean("can_manage_inventory").default(true),
  canProcessPayments: boolean("can_process_payments").default(false),

  // Additional settings
  isActive: boolean("is_active").default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vetStores = pgTable("vet_stores", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logo: text("logo"),
  bannerImage: text("banner_image"),
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isVerified: boolean("is_verified").notNull().default(false),
  showOnVetHome: boolean("show_on_vet_home").notNull().default(false),
  rating: real("rating").default(0),
  totalSales: real("total_sales").default(0),
  activationEndDate: timestamp("activation_end_date", { withTimezone: true }),
  needsRenewal: boolean("needs_renewal").notNull().default(false),
  subscriptionStatus: text("subscription_status").default("active"), // 'active', 'expired', 'pending'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  workingHours: jsonb("working_hours"),
  images: jsonb("images"),
  services: jsonb("services"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Store products table
export const storeProducts = pgTable("store_products", {
  id: serial("id").primaryKey(),

  storeId: integer("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),

  storePrice: real("store_price").notNull(),
  storeStock: integer("store_stock").default(0),
  inStock: boolean("in_stock"),

  image: text("image"), // رابط الصورة الرئيسية للمنتج

  isAvailable: boolean("is_available").notNull().default(true),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Warehouses table
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  phone: text("phone"),
  email: text("email"),
  licenseNumber: text("license_number"),
  capacity: integer("capacity"),
  currentStock: integer("current_stock").default(0),
  isActive: boolean("is_active").notNull().default(true),
  isVerified: boolean("is_verified").notNull().default(false),
  activationStartDate: timestamp("activation_start_date", {
    withTimezone: true,
  }),
  activationEndDate: timestamp("activation_end_date", { withTimezone: true }),
  needsRenewal: boolean("needs_renewal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Warehouse products table
export const warehouseProducts = pgTable("warehouse_products", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id")
    .notNull()
    .references(() => warehouses.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  brand: text("brand"),
  sku: text("sku"),
  batchNumber: text("batch_number"),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  wholesalePrice: real("wholesale_price"),
  images: jsonb("images"), // JSON data
  specifications: jsonb("specifications"), // JSON data
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Tips table
export const tips = pgTable("tips", {
  id: serial("id").primaryKey(),
  authorId: integer("author_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  summary: text("summary"),
  category: text("category").notNull(),
  tags: jsonb("tags"), // JSON data
  images: jsonb("images"), // JSON data
  isPublished: boolean("is_published").notNull().default(false),
  viewCount: integer("view_count").default(0),
  likeCount: integer("like_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Enhanced Courses table
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  instructorId: integer("instructor_id").references(() => users.id),

  // Basic Information
  title: text("title").notNull(),
  organizer: text("organizer").notNull(),
  description: text("description").notNull(),
  content: text("content"),

  // Type and Category
  type: text("type").notNull(), // 'course' | 'seminar'
  category: text("category").notNull(),

  // Date and Location
  date: text("date").notNull(),
  location: text("location").notNull(),
  duration: text("duration").notNull(),

  // Capacity and Registration
  capacity: integer("capacity").notNull(),
  registered: integer("registered").default(0).notNull(),

  // Pricing
  price: text("price").notNull(),

  // Registration Type
  registrationType: text("registration_type").notNull(), // 'link' | 'internal'
  courseUrl: text("course_url"),

  // Status
  status: text("status").notNull().default("active"), // 'active' | 'inactive' | 'completed'

  // Additional fields (from old schema)
  level: text("level"),
  thumbnailImage: text("thumbnail_image"),
  videoUrl: text("video_url"),
  images: jsonb("images").default(sql`'[]'::jsonb`),
  tags: jsonb("tags").default(sql`'[]'::jsonb`),
  materials: jsonb("materials"),
  prerequisites: jsonb("prerequisites"),

  // Publishing and Statistics
  isPublished: boolean("is_published").notNull().default(true),
  enrollmentCount: integer("enrollment_count").default(0),
  viewCount: integer("view_count").default(0),
  rating: real("rating").default(0),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Course Registrations table
export const courseRegistrations = pgTable("course_registrations", {
  id: serial("id").primaryKey(),

  // Course Reference
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),

  // User Reference (optional for public registrations)
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),

  // Registration Information
  courseName: text("course_name").notNull(),
  participantName: text("participant_name").notNull(),
  participantEmail: text("participant_email").notNull(),
  participantPhone: text("participant_phone").notNull(),

  // Status
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'

  // Review Information
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),

  // Timestamps
  registrationDate: timestamp("registration_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'info', 'warning', 'success', 'error'
  data: jsonb("data"), // JSON data
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Admin notifications table (for admin-specific notifications)
export const adminNotifications = pgTable("admin_notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id")
    .notNull()
    .references(() => users.id), // Admin user who receives notification
  type: text("type").notNull(), // 'approval_request', 'system_alert', 'user_activity', etc.
  title: text("title").notNull(),
  content: text("content").notNull(),
  relatedResourceType: text("related_resource_type"), // 'clinic', 'store', 'user', etc.
  relatedResourceId: integer("related_resource_id"), // ID of the related resource
  actionUrl: text("action_url"), // URL for quick action
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'high', 'urgent'
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  metadata: jsonb("metadata"), // Additional data as JSON
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Email notifications table (for tracking email notifications)
export const emailNotifications = pgTable("email_notifications", {
  id: serial("id").primaryKey(),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'approval_rejection', 'approval_confirmation', 'system_alert', etc.
  relatedResourceType: text("related_resource_type"), // 'approval_request', 'user', etc.
  relatedResourceId: integer("related_resource_id"), // ID of the related resource
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'failed', 'bounced'
  sentAt: timestamp("sent_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0),
  metadata: jsonb("metadata"), // Additional data as JSON
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// System messages table
export const systemMessages = pgTable("system_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("info"), // 'info', 'warning', 'announcement'
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'high', 'urgent'
  status: text("status").notNull().default("sent"), // 'sent', 'replied'
  isActive: boolean("is_active").notNull().default(true),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  targetAudience: text("target_audience").notNull().default("all"),
  targetUserIds: jsonb("target_user_ids"),
  targetCategories: jsonb("target_categories"),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// System message recipients table (junction table for tracking message delivery)
export const systemMessageRecipients = pgTable("system_message_recipients", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id")
    .notNull()
    .references(() => systemMessages.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// System message replies table
export const systemMessageReplies = pgTable("system_message_replies", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id")
    .notNull()
    .references(() => systemMessages.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  isFromAdmin: boolean("is_from_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Admin activity logs table (for tracking admin actions)
export const adminActivityLogs = pgTable("admin_activity_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(), // 'create', 'update', 'delete', etc.
  resource: text("resource").notNull(), // 'vet_book', 'advertisement', etc.
  resourceId: integer("resource_id"), // ID of the resource being acted upon
  details: text("details"), // JSON string with additional details
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// App sections table (for app navigation/UI configuration)
export const appSections = pgTable("app_sections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  route: text("route"),
  isActive: boolean("is_active").notNull().default(true),
  order: integer("order").default(0),
  userType: text("user_type").notNull().default("all"), // 'all', 'user', 'vet', 'admin'
  requiredRole: text("required_role"), // Optional role requirement
  metadata: jsonb("metadata"), // JSON data for additional config
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Veterinary books table (for educational content)
export const vetBooks = pgTable("vet_books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  author: text("author"),
  category: text("category").notNull(), // 'medicine', 'surgery', 'nutrition', etc.
  isbn: text("isbn"),
  filePath: text("file_path"), // Path to PDF file
  coverImage: text("cover_image"),
  language: text("language").default("ar"),
  pageCount: integer("page_count"),
  publishedYear: integer("published_year"),
  tags: text("tags"), // JSON string
  isPublished: boolean("is_published").notNull().default(true),
  downloadCount: integer("download_count").default(0),
  watchCount: integer("watch_count").default(0),
  rating: real("rating").default(0),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Veterinary magazines table (for periodical content)
export const vetMagazines = pgTable("vet_magazines", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  issueNumber: integer("issue_number"),
  volume: integer("volume"),
  publishedDate: timestamp("published_date", { withTimezone: true }),
  category: text("category").notNull(),
  filePath: text("file_path"), // Path to PDF file
  coverImage: text("cover_image"),
  author: text("author"),
  authorTitle: text("author_title"),
  language: text("language").default("ar"),
  pageCount: integer("page_count"),
  tags: text("tags"), // JSON string
  isPublished: boolean("is_published").notNull().default(true),
  downloadCount: integer("download_count").default(0),
  watchCount: integer("watch_count").default(0),
  rating: real("rating").default(0),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  articleId: integer("article_id")
    .references(() => vetMagazines.id)
    .notNull(),
  content: text("content").notNull(),
  parentId: integer("parent_id"), // Self-reference for replies
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Likes table
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  articleId: integer("article_id")
    .references(() => vetMagazines.id)
    .notNull(),
  type: text("type").notNull().default("like"), // 'like', 'dislike'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Relations for comments
export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  article: one(vetMagazines, {
    fields: [comments.articleId],
    references: [vetMagazines.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, {
    relationName: "replies",
  }),
}));

// Relations for likes
export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  article: one(vetMagazines, {
    fields: [likes.articleId],
    references: [vetMagazines.id],
  }),
}));

// Relations for orders
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

// Relations for order items
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  marketplaceProduct: one(marketplaceProducts, {
    fields: [orderItems.marketplaceProductId],
    references: [marketplaceProducts.id],
  }),
}));

// Admin content table (for admin-managed content like contact info, settings, etc.)
export const adminContent = pgTable("admin_content", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(), // 'contact_info', 'terms', 'privacy', etc.
  title: text("title").notNull(),
  content: text("content"), // JSON string or regular text content
  metadata: jsonb("metadata"), // JSON data for additional settings
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").default(1), // For versioning content
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Advertisements table
export const advertisements = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  targetUrl: text("target_url"),
  type: text("type").notNull(), // 'banner', 'popup', 'inline'
  placement: text("placement"), // 'home', 'clinics', 'products', etc.
  interface: text("interface").notNull().default("both"), // "vet", " pet_owner", "both"
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  clickCount: integer("click_count").default(0),
  clickAction: text("click_action").default("none"), // "none" | "open_link" | "open_file";
  impressionCount: integer("impression_count").default(0),
  budget: real("budget"),
  costPerClick: real("cost_per_click"),
  targetAudience: jsonb("target_audience"), // JSON data
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Pet approvals table
export const petApprovals = pgTable("pet_approvals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  petName: text("pet_name").notNull(),
  petType: text("pet_type").notNull(),
  petBreed: text("pet_breed"),
  petAge: integer("pet_age"),
  petWeight: real("pet_weight"),
  petColor: text("pet_color"),
  petGender: text("pet_gender"),
  petImage: text("pet_image"),
  ownershipProof: text("ownership_proof"),
  veterinaryCertificate: text("veterinary_certificate"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Approval requests table (generic)
export const approvalRequests = pgTable("approval_requests", {
  id: serial("id").primaryKey(),

  requestType: text("request_type").notNull(),
  requesterId: integer("requester_id")
    .notNull()
    .references(() => users.id),
  resourceId: integer("resource_id").notNull(),

  title: text("title").notNull(),
  description: text("description"),

  documents: text("documents"),
  licenseImages: text("license_images"),
  identityImages: text("identity_images"),
  officialDocuments: text("official_documents"),

  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentAmount: real("payment_amount"),
  paymentMethod: text("payment_method"),
  paymentTransactionId: text("payment_transaction_id"),
  paymentCompletedAt: integer("payment_completed_at"),
  paymentReceipt: text("payment_receipt"),

  status: text("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: integer("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"),

  priority: text("priority").notNull().default("normal"),

  // ✅ PostgreSQL-compatible defaults
  createdAt: integer("created_at")
    .notNull()
    .default(sql`extract(epoch from now())`),
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`extract(epoch from now())`),
});

// Pet approval requests table (for adoption, breeding, missing pets)
export const petApprovalRequests = pgTable("pet_approval_requests", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  requestType: text("request_type").notNull(), // 'adoption', 'breeding', 'missing'
  title: text("title").notNull(),
  description: text("description"),
  images: text("images"), // JSON string
  contactInfo: text("contact_info"),
  location: text("location"),
  price: real("price"),
  specialRequirements: text("special_requirements"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  priority: text("priority").default("normal"), // 'low', 'normal', 'high'
  reviewedBy: integer("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// AI settings table
export const aiSettingTypeEnum = pgEnum("ai_setting_type", ["consultations", "inquiries"]);

export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  type: aiSettingTypeEnum("type").notNull().unique(), // 'consultations' or 'inquiries'
  isEnabled: boolean("is_enabled").notNull().default(true),
  systemPrompt: text("system_prompt").notNull(),
  responseDelay: integer("response_delay").default(15), // seconds
  maxResponseLength: integer("max_response_length").default(1500),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Poultry farms table
export const poultryFarms = pgTable("poultry_farms", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  location: text("location").notNull(),

  // Existing fields
  farmType: varchar("farm_type", { length: 50 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  contactPerson: text("contact_person"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  facilities: jsonb("facilities"),
  healthStatus: varchar("health_status", { length: 50 }),
  lastInspection: timestamp("last_inspection"),
  establishedDate: timestamp("established_date"),
  images: text("images"),
  isVerified: boolean("is_verified").default(false),

  // New fields for poultry management
  address: text("address"),
  description: text("description"),
  totalArea: decimal("total_area", { precision: 10, scale: 2 }), // متر مربع
  capacity: integer("capacity").notNull(), // السعة القصوى
  currentPopulation: integer("current_population").default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, suspended

  // Assignment tracking
  assignedVetId: integer("assigned_vet_id").references(() => veterinarians.id),
  assignedSupervisorId: integer("assigned_supervisor_id").references(() => users.id),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============== POULTRY BATCHES TABLE ==============
export const poultryBatches = pgTable("poultry_batches", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id")
    .notNull()
    .references(() => poultryFarms.id, { onDelete: "cascade" }),
  batchNumber: integer("batch_number").notNull(), // رقم الدفعة
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"), // تاريخ البيع/الانتهاء

  // Counts
  initialCount: integer("initial_count").notNull(), // العدد الأولي
  currentCount: integer("current_count").notNull(), // العدد الحالي
  finalCount: integer("final_count"), // العدد النهائي عند البيع

  // Age and weight
  chicksAge: integer("chicks_age").notNull().default(0), // العمر بالأيام
  initialWeight: decimal("initial_weight", { precision: 10, scale: 2 }), // وزن الفرد الأولي (جرام)

  // Financial
  pricePerChick: decimal("price_per_chick", { precision: 10, scale: 2 }).notNull(), // سعر الفرد
  totalInvestment: decimal("total_investment", { precision: 12, scale: 2 }).notNull(), // إجمالي الاستثمار
  totalProfit: decimal("total_profit", { precision: 12, scale: 2 }), // الربح الصافي

  status: varchar("status", { length: 20 }).notNull().default("active"), // active, completed, sold

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============== POULTRY DAILY DATA TABLE ==============
export const poultryDailyData = pgTable("poultry_daily_data", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id")
    .notNull()
    .references(() => poultryBatches.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(), // رقم اليوم في الدفعة
  date: timestamp("date").notNull(),

  // Feed consumption
  feedConsumption: decimal("feed_consumption", { precision: 10, scale: 2 }).notNull(), // كيلو
  feedCost: decimal("feed_cost", { precision: 10, scale: 2 }), // تكلفة العلف

  // Weight
  averageWeight: decimal("average_weight", { precision: 10, scale: 2 }).notNull(), // جرام

  // Mortality
  mortality: integer("mortality").notNull().default(0), // عدد النفوق
  mortalityReasons: jsonb("mortality_reasons").$type<string[]>().default([]), // أسباب النفوق

  // Treatments
  treatments: jsonb("treatments")
    .$type<
      {
        id: string;
        name: string;
        dosage: string;
        frequency: string;
        duration: number;
        administeredBy: string;
        cost: number;
        reason: string;
        notes: string;
      }[]
    >()
    .default([]),

  // Vaccinations
  vaccinations: jsonb("vaccinations")
    .$type<
      {
        id: string;
        name: string;
        dosage: string;
        administeredBy: string;
        batchNumber: string;
        cost: number;
        notes: string;
      }[]
    >()
    .default([]),

  // Profit estimation
  estimatedProfit: decimal("estimated_profit", { precision: 10, scale: 2 }).default("0"),

  notes: text("notes"), // ملاحظات اليوم

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============== ASSIGNMENT REQUESTS TABLE ==============
export const assignmentRequests = pgTable("assignment_requests", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id")
    .notNull()
    .references(() => poultryFarms.id, { onDelete: "cascade" }),
  requestType: varchar("request_type", { length: 20 }).notNull(), // vet, supervisor, remove_vet, remove_supervisor
  requestedBy: integer("requested_by")
    .notNull()
    .references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  notes: text("notes"),

  // If it's a removal request
  isRemovalRequest: boolean("is_removal_request").default(false),
  targetUserId: integer("target_user_id").references(() => users.id), // المستخدم المراد إزالته

  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Field assignments table
export const fieldAssignments = pgTable("field_assignments", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id")
    .notNull()
    .references(() => poultryFarms.id),
  veterinarianId: integer("veterinarian_id").references(() => veterinarians.id),
  supervisorId: integer("supervisor_id").references(() => users.id),
  assignedDate: timestamp("assigned_date", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'cancelled'
  visitFrequency: text("visit_frequency"), // 'daily', 'weekly', 'monthly'
  lastVisit: timestamp("last_visit", { withTimezone: true }),
  nextVisit: timestamp("next_visit", { withTimezone: true }),
  notes: text("notes"),
  reports: jsonb("reports"), // JSON data
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Export all tables for relationships
// Admin roles table
export const adminRoles = pgTable("admin_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// User roles table (junction table)
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  roleId: integer("role_id")
    .notNull()
    .references(() => adminRoles.id),
  isActive: boolean("is_active").notNull().default(true),
  assignedBy: integer("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Admin permissions table
export const adminPermissions = pgTable("admin_permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'users', 'content', 'system', etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Role permissions table (junction table)
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id")
    .notNull()
    .references(() => adminRoles.id),
  permissionId: integer("permission_id")
    .notNull()
    .references(() => adminPermissions.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Polls table
export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  advertisementId: integer("advertisement_id").notNull(),
  question: text("question").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isMultipleChoice: boolean("is_multiple_choice").default(false).notNull(),
  showResults: boolean("show_results").default(false).notNull(),
  totalVotes: integer("total_votes").default(0).notNull(),
  endDate: timestamp("end_date", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Poll options table
export const pollOptions = pgTable("poll_options", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id")
    .notNull()
    .references(() => polls.id),
  text: text("text").notNull(),
  order: integer("order").default(0),
  voteCount: integer("vote_count").default(0).notNull(),
});

// Poll votes table
export const pollVotes = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id")
    .notNull()
    .references(() => polls.id),
  optionId: integer("option_id")
    .notNull()
    .references(() => pollOptions.id),
  userId: integer("user_id"),
  deviceId: text("device_id"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Veterinarian approval requests - طلبات موافقة الأطباء البيطريين والطلاب
export const veterinarianApprovals = pgTable("veterinarian_approvals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  gender: text("gender").notNull(),
  veterinarianType: text("veterinarian_type").notNull(),
  idFrontImage: text("id_front_image"),
  idBackImage: text("id_back_image"),
  status: text("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"), // Changed to timestamp
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(), // Changed to timestamp
  createdAt: timestamp("created_at").notNull().defaultNow(), // Changed to timestamp
  updatedAt: timestamp("updated_at").notNull().defaultNow(), // Changed to timestamp
});

// Clinic stats table
export const clinicStats = pgTable("clinic_stats", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinics.id),
  totalAnimals: integer("total_animals").default(0),
  activePatients: integer("active_patients").default(0),
  completedTreatments: integer("completed_treatments").default(0),
  monthlyReport: jsonb("monthly_report"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  clinicId: integer("clinic_id")
    .notNull()
    .references(() => clinics.id),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  reminderType: text("reminder_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("normal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  province: text("province").notNull(),
  phone: text("phone"),
  workingHours: text("working_hours"),
  description: text("description"),
  specialties: jsonb("specialties").$type<string[]>(),
  image: text("image"),
  rating: real("rating").default(0),
  isMain: boolean("is_main").default(false),
  status: text("status").default("active"), // 'active'/'inactive'
  followersCount: integer("followers_count").default(0),
  announcementsCount: integer("announcements_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hospitalAnnouncements = pgTable("hospital_announcements", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id")
    .notNull()
    .references(() => hospitals.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("announcement"), // 'news', 'announcement', 'event'
  image: text("image"),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hospitalFollowers = pgTable("hospital_followers", {
  id: serial("id").primaryKey(),
  hospitalId: integer("hospital_id")
    .notNull()
    .references(() => hospitals.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const unionRoleEnum = pgEnum("union_role", ["admin", "moderator", "member"]);
export const unionAnnouncementTypeEnum = pgEnum("union_announcement_type", ["general", "urgent", "event", "meeting"]);
export const unionBranchRegionEnum = pgEnum("union_branch_region", ["central", "northern", "southern", "kurdistan"]);

export const unionMain = pgTable("union_main", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 1024 }),
  establishedYear: varchar("established_year", { length: 4 }),
  memberCount: varchar("member_count", { length: 256 }),
  phone1: varchar("phone1", { length: 256 }),
  phone2: varchar("phone2", { length: 256 }),
  email: varchar("email", { length: 256 }),
  website: varchar("website", { length: 256 }),
  address: text("address"),
  services: jsonb("services"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const unionBranches = pgTable("union_branches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  governorate: varchar("governorate", { length: 256 }),
  region: unionBranchRegionEnum("region"),
  address: text("address"),
  phone: varchar("phone", { length: 256 }),
  email: varchar("email", { length: 256 }),
  president: varchar("president", { length: 256 }),
  membersCount: integer("members_count"),
  rating: integer("rating"),
  description: text("description"),
  establishedYear: integer("established_year"),
  services: jsonb("services"),
  status: text("status").notNull().default("active"),
  followersCount: integer("followers_count").default(0),
  announcementsCount: integer("announcements_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const unionAnnouncements = pgTable("union_announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  branchId: integer("branch_id").references(() => unionBranches.id),
  mainUnionId: integer("main_union_id").references(() => unionMain.id),
  type: unionAnnouncementTypeEnum("type").default("general"),
  isImportant: boolean("is_important").default(false),
  image: varchar("image", { length: 1024 }),
  link: varchar("link", { length: 1024 }),
  linkText: varchar("link_text", { length: 256 }),
  author: varchar("author", { length: 256 }),
  views: integer("views").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const unionFollowers = pgTable("union_followers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  branchId: integer("branch_id").references(() => unionBranches.id),
  mainUnionId: integer("main_union_id").references(() => unionMain.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const unionSettings = pgTable("union_settings", {
  id: serial("id").primaryKey(),
  unionName: varchar("union_name", { length: 256 }),
  unionDescription: text("union_description"),
  contactEmail: varchar("contact_email", { length: 256 }),
  contactPhone: varchar("contact_phone", { length: 256 }),
  isMaintenanceMode: boolean("is_maintenance_mode").default(false),
  allowRegistration: boolean("allow_registration").default(true),
  requireApproval: boolean("require_approval").default(true),
  // Notification Settings
  emailNotifications: boolean("email_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  newMemberNotifications: boolean("new_member_notifications").default(true),
  eventNotifications: boolean("event_notifications").default(true),
  emergencyNotifications: boolean("emergency_notifications").default(true),
  weeklyReports: boolean("weekly_reports").default(true),
  monthlyReports: boolean("monthly_reports").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const unionUsers = pgTable("union_users", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  role: unionRoleEnum("role").default("member"),
  branchId: integer("branch_id").references(() => unionBranches.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
});

// Job vacancies table
export const jobVacancies = pgTable("job_vacancies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  jobType: text("job_type").notNull(), // 'full-time', 'part-time', 'contract', 'internship'
  salary: text("salary"),
  requirements: text("requirements").notNull(),
  contactInfo: text("contact_info").notNull(),
  postedBy: text("posted_by").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Job applications table
export const jobApplications = pgTable("job_applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id")
    .notNull()
    .references(() => jobVacancies.id, { onDelete: "cascade" }),
  applicantName: text("applicant_name").notNull(),
  applicantEmail: text("applicant_email").notNull(),
  applicantPhone: text("applicant_phone").notNull(),
  coverLetter: text("cover_letter").notNull(),
  experience: text("experience").notNull(),
  education: text("education").notNull(),
  cv: text("cv"), // URL to CV file
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected'
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  notes: text("notes"),
  appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Field supervision requests table
export const fieldSupervisionRequests = pgTable("field_supervision_requests", {
  id: serial("id").primaryKey(),
  farmName: text("farm_name").notNull(),
  farmLocation: text("farm_location").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone").notNull(),
  ownerEmail: text("owner_email").notNull(),
  animalCount: integer("animal_count").notNull().default(0),
  requestType: text("request_type").notNull(), // 'routine_inspection', 'emergency', 'consultation'
  description: text("description").notNull(),
  preferredDate: text("preferred_date").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'completed'
  assignedVet: text("assigned_vet"),
  assignedVetId: integer("assigned_vet_id").references(() => veterinarians.id),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const unionBranchSupervisors = pgTable("union_branch_supervisors", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull(),
  userId: integer("user_id").notNull(),
});

export * from "drizzle-orm";
