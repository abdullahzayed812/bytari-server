import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  real,
  boolean,
  timestamp,
  serial,
  jsonb,
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Veterinarians table
export const veterinarians = pgTable("veterinarians", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  licenseNumber: text("license_number").notNull().unique(),
  specialization: text("specialization"),
  experience: integer("experience"), // years
  clinicId: integer("clinic_id").references(() => clinics.id),
  isVerified: boolean("is_verified").notNull().default(false),
  rating: real("rating").default(0),
  consultationFee: real("consultation_fee"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Clinics table
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  email: text("email"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  workingHours: jsonb("working_hours"), // JSON data
  services: jsonb("services"), // JSON data
  images: jsonb("images"), // JSON data
  rating: real("rating").default(0),
  isActive: boolean("is_active").notNull().default(true),
  activationStartDate: timestamp("activation_start_date", {
    withTimezone: true,
  }),
  activationEndDate: timestamp("activation_end_date", { withTimezone: true }),
  needsRenewal: boolean("needs_renewal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
    .references(() => pets.id),
  clinicId: integer("clinic_id").references(() => clinics.id),
  appointmentDate: timestamp("appointment_date", {
    withTimezone: true,
  }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'completed', 'cancelled'
  type: text("type").notNull(), // 'consultation', 'vaccination', 'surgery', etc.
  notes: text("notes"),
  fee: real("fee"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Lost pets table
export const lostPets = pgTable("lost_pets", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id),
  reporterId: integer("reporter_id")
    .notNull()
    .references(() => users.id),
  lastSeenLocation: text("last_seen_location").notNull(),
  lastSeenDate: timestamp("last_seen_date", { withTimezone: true }).notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  description: text("description"),
  reward: real("reward"),
  contactInfo: text("contact_info"),
  status: text("status").notNull().default("lost"), // 'lost', 'found', 'closed'
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'
  totalAmount: real("total_amount").notNull(),
  shippingAddress: jsonb("shipping_address"), // JSON data
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Order items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  attachments: jsonb("attachments"), // JSON data
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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

  // Working hours
  workingHours: text("working_hours"),

  // Status flags
  isActive: boolean("is_active").notNull().default(false), // Default false until approved
  isVerified: boolean("is_verified").notNull().default(false),
  showOnVetHome: boolean("show_on_vet_home").notNull().default(false),

  // Rating and sales
  rating: real("rating").default(0),
  totalSales: real("total_sales").default(0),

  // Subscription management
  activationEndDate: timestamp("activation_end_date", { withTimezone: true }),
  needsRenewal: boolean("needs_renewal").notNull().default(false),
  subscriptionStatus: text("subscription_status").default("pending"), // 'active', 'expired', 'pending'

  // Additional images
  images: text("images"), // JSON array of image URLs

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Store products table
export const storeProducts = pgTable("store_products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id")
    .notNull()
    .references(() => stores.id),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  storePrice: real("store_price").notNull(),
  storeStock: integer("store_stock").default(0),
  isAvailable: boolean("is_available").notNull().default(true),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  instructorId: integer("instructor_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content"),
  category: text("category").notNull(),
  level: text("level").notNull(), // 'beginner', 'intermediate', 'advanced'
  duration: integer("duration"), // in hours
  price: real("price").default(0),
  thumbnailImage: text("thumbnail_image"),
  videoUrl: text("video_url"),
  materials: jsonb("materials"), // JSON data
  prerequisites: jsonb("prerequisites"), // JSON data
  isPublished: boolean("is_published").notNull().default(false),
  enrollmentCount: integer("enrollment_count").default(0),
  rating: real("rating").default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Course enrollments table
export const courseEnrollments = pgTable("course_enrollments", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .notNull()
    .references(() => courses.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull().default("enrolled"), // 'enrolled', 'completed', 'cancelled'
  progress: integer("progress").default(0), // percentage
  completedAt: timestamp("completed_at", { withTimezone: true }),
  certificateIssued: boolean("certificate_issued").notNull().default(false),
  enrolledAt: timestamp("enrolled_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// System messages table
export const systemMessages = pgTable("system_messages", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").references(() => users.id), // null for broadcast
  senderId: integer("sender_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull().default("info"), // 'info', 'warning', 'announcement'
  priority: text("priority").notNull().default("normal"), // 'low', 'normal', 'high', 'urgent'
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  deliveredAt: timestamp("delivered_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  isPublished: boolean("is_published").notNull().default(false),
  downloadCount: integer("download_count").default(0),
  rating: real("rating").default(0),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  language: text("language").default("ar"),
  pageCount: integer("page_count"),
  tags: text("tags"), // JSON string
  isPublished: boolean("is_published").notNull().default(false),
  downloadCount: integer("download_count").default(0),
  rating: real("rating").default(0),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  clickCount: integer("click_count").default(0),
  impressionCount: integer("impression_count").default(0),
  budget: real("budget"),
  costPerClick: real("cost_per_click"),
  targetAudience: jsonb("target_audience"), // JSON data
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  paymentCompletedAt: integer("payment_completed_at", { mode: "timestamp" }),
  paymentReceipt: text("payment_receipt"),

  status: text("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  rejectionReason: text("rejection_reason"),
  adminNotes: text("admin_notes"),

  priority: text("priority").notNull().default("normal"),

  // ✅ PostgreSQL-compatible defaults
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`extract(epoch from now())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`extract(epoch from now())`),
});

// Pet approval requests table (for adoption, breeding, missing pets)
export const petApprovalRequests = pgTable("pet_approval_requests", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id")
    .notNull()
    .references(() => pets.id),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// AI settings table
export const aiSettings = pgTable("ai_settings", {
  id: serial("id").primaryKey(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  responseDelay: integer("response_delay").default(10), // seconds
  maxResponseLength: integer("max_response_length").default(1500),
  confidenceThreshold: real("confidence_threshold").default(0.7),
  allowedCategories: jsonb("allowed_categories"), // JSON data
  customPrompts: jsonb("custom_prompts"), // JSON data
  apiKey: text("api_key"),
  model: text("model").default("gpt-3.5-turbo"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Poultry farms table
export const poultryFarms = pgTable("poultry_farms", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  location: text("location").notNull(),
  farmType: text("farm_type").notNull(), // 'broiler', 'layer', 'breeder', 'mixed'
  capacity: integer("capacity"),
  currentPopulation: integer("current_population").default(0),
  establishedDate: timestamp("established_date", { withTimezone: true }),
  licenseNumber: text("license_number"),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  facilities: jsonb("facilities"), // JSON data
  healthStatus: text("health_status").default("healthy"), // 'healthy', 'quarantine', 'sick'
  lastInspection: timestamp("last_inspection", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Field assignments table
export const fieldAssignments = pgTable("field_assignments", {
  id: serial("id").primaryKey(),
  farmId: integer("farm_id")
    .notNull()
    .references(() => poultryFarms.id),
  veterinarianId: integer("veterinarian_id").references(() => veterinarians.id),
  supervisorId: integer("supervisor_id").references(() => users.id),
  assignedDate: timestamp("assigned_date", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'cancelled'
  visitFrequency: text("visit_frequency"), // 'daily', 'weekly', 'monthly'
  lastVisit: timestamp("last_visit", { withTimezone: true }),
  nextVisit: timestamp("next_visit", { withTimezone: true }),
  notes: text("notes"),
  reports: jsonb("reports"), // JSON data
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Export all tables for relationships
// Admin roles table
export const adminRoles = pgTable("admin_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  assignedAt: timestamp("assigned_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Admin permissions table
export const adminPermissions = pgTable("admin_permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'users', 'content', 'system', etc.
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export * from "drizzle-orm";

