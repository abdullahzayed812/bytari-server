CREATE TABLE "admin_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" integer,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1,
	"published_at" timestamp with time zone,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_content_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"related_resource_type" text,
	"related_resource_id" integer,
	"action_url" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "advertisements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"target_url" text,
	"type" text NOT NULL,
	"placement" text,
	"interface" text,
	"start_date" timestamp with time zone NOT NULL DEFAULT NOW(),
	"end_date" timestamp with time zone NOT NULL DEFAULT NOW(),
	"is_active" boolean DEFAULT true NOT NULL,
	"click_count" integer DEFAULT 0,
	"impression_count" integer DEFAULT 0,
	"budget" real,
	"cost_per_click" real,
	"target_audience" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"response_delay" integer DEFAULT 10,
	"max_response_length" integer DEFAULT 1500,
	"confidence_threshold" real DEFAULT 0.7,
	"allowed_categories" jsonb,
	"custom_prompts" jsonb,
	"api_key" text,
	"model" text DEFAULT 'gpt-3.5-turbo',
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"route" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0,
	"user_type" text DEFAULT 'all' NOT NULL,
	"required_role" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_sections_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"vet_id" integer NOT NULL,
	"pet_id" integer NOT NULL,
	"clinic_id" integer,
	"appointment_date" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"type" text NOT NULL,
	"notes" text,
	"fee" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "request_type" text NOT NULL,
  "requester_id" integer NOT NULL,
  "resource_id" integer NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "documents" text,
  "license_images" text,
  "identity_images" text,
  "official_documents" text,
  "payment_status" text DEFAULT 'pending' NOT NULL,
  "payment_amount" real,
  "payment_method" text,
  "payment_transaction_id" text,
  "payment_completed_at" integer,
  "payment_receipt" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "reviewed_by" integer,
  "reviewed_at" integer,
  "rejection_reason" text,
  "admin_notes" text,
  "priority" text DEFAULT 'normal' NOT NULL,
  "created_at" integer DEFAULT (extract(epoch from now())) NOT NULL,
  "updated_at" integer DEFAULT (extract(epoch from now())) NOT NULL
);


--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"phone" text,
	"email" text,
	"description" text,
	"latitude" real,
	"longitude" real,
	"working_hours" jsonb,
	"services" jsonb,
	"images" jsonb,
	"doctors" text,
	"facebook" text,
	"instagram" text,
	"whatsapp" text,
	"website" text,
	"rating" real DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"activation_start_date" timestamp with time zone,
	"activation_end_date" timestamp with time zone,
	"reviewing_renewal_request" boolean DEFAULT false NOT NULL,
	"needs_renewal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultation_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"consultation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_from_vet" boolean DEFAULT false NOT NULL,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"pet_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"symptoms" text,
	"urgency_level" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"category" text NOT NULL,
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE  "course_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"course_id" integer NOT NULL,
	"user_id" integer,
	"course_name" text NOT NULL,
	"participant_name" text NOT NULL,
	"participant_email" text NOT NULL,
	"participant_phone" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL, -- 'pending' | 'approved' | 'rejected'
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"notes" text,
	"registration_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"instructor_id" integer,
	"title" text NOT NULL,
	"organizer" text NOT NULL,
	"description" text NOT NULL,
	"content" text,
	"category" text NOT NULL,
	"type" text NOT NULL, -- 'course' | 'seminar'
	"date" text NOT NULL,
	"location" text NOT NULL,
	"duration" text NOT NULL,
	"capacity" integer NOT NULL,
	"registered" integer DEFAULT 0 NOT NULL,
	"price" text NOT NULL,
	"registration_type" text NOT NULL, -- 'link' | 'internal'
	"course_url" text,
	"status" text DEFAULT 'active' NOT NULL, -- 'active' | 'inactive' | 'completed'
	"level" text,
	"thumbnail_image" text,
	"video_url" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"materials" jsonb,
	"prerequisites" jsonb,
	"is_published" boolean DEFAULT true NOT NULL,
	"enrollment_count" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"rating" real DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_email" text NOT NULL,
	"recipient_name" text,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"type" text NOT NULL,
	"related_resource_type" text,
	"related_resource_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"farm_id" integer NOT NULL,
	"veterinarian_id" integer,
	"supervisor_id" integer,
	"assigned_date" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"visit_frequency" text,
	"last_visit" timestamp with time zone,
	"next_visit" timestamp with time zone,
	"notes" text,
	"reports" jsonb,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium',
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_from_admin" boolean DEFAULT false NOT NULL,
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- Adoption Pets Table
CREATE TABLE "adoption_pets" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_id" integer NOT NULL,
  
  -- Pet details
  "name" text NOT NULL,
  "type" text NOT NULL,
  "breed" text,
  "age" integer,
  "weight" real,
  "color" text,
  "gender" text,
  "image" text,
  
  -- Documents
  "ownership_proof" text,
  "veterinary_certificate" text,
  
  -- Adoption specific fields
  "description" text,
  "images" jsonb,
  "contact_info" text,
  "location" text,
  "price" real,
  "special_requirements" text,
  
  -- Status
  "is_available" boolean DEFAULT false NOT NULL,
  "adopted_by" integer,
  "adopted_at" timestamp with time zone,
  
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Breeding Pets Table
CREATE TABLE "breeding_pets" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_id" integer NOT NULL,
  
  -- Pet details
  "name" text NOT NULL,
  "type" text NOT NULL,
  "breed" text,
  "age" integer,
  "weight" real,
  "color" text,
  "gender" text,
  "image" text,
  
  -- Documents
  "ownership_proof" text,
  "veterinary_certificate" text,
  
  -- Breeding specific fields
  "description" text,
  "images" jsonb,
  "contact_info" text,
  "location" text,
  "price" real,
  "special_requirements" text,
  
  -- Breeding details
  "pedigree" text,
  "health_certificates" jsonb,
  "breeding_history" jsonb,
  
  -- Status
  "is_available" boolean DEFAULT false NOT NULL,
  
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Lost Pets Enhanced Table
CREATE TABLE "lost_pets" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_id" integer NOT NULL,
  
  -- Pet details
  "name" text NOT NULL,
  "type" text NOT NULL,
  "breed" text,
  "age" integer,
  "weight" real,
  "color" text,
  "gender" text,
  "image" text,
  
  -- Documents
  "ownership_proof" text,
  "veterinary_certificate" text,
  
  -- Lost pet specific fields
  "description" text,
  "images" jsonb,
  "contact_info" text,
  "location" text,
  "last_seen_location" text NOT NULL,
  "last_seen_date" timestamp with time zone NOT NULL,
  "latitude" real,
  "longitude" real,
  "reward" real,
  "special_requirements" text,
  
  -- Status: 'pending' (waiting approval), 'lost' (approved and still lost), 'found', 'closed'
  "status" text DEFAULT 'pending' NOT NULL,
  "found_by" integer,
  "found_at" timestamp with time zone,
  
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" real NOT NULL,
	"total_price" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_amount" real NOT NULL,
	"shipping_address" jsonb,
	"payment_method" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_approval_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"owner_id" integer NOT NULL,
	"request_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"images" text,
	"contact_info" text,
	"location" text,
	"price" real,
	"special_requirements" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal',
	"reviewed_by" integer,
	"rejection_reason" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"pet_name" text NOT NULL,
	"pet_type" text NOT NULL,
	"pet_breed" text,
	"pet_age" integer,
	"pet_weight" real,
	"pet_color" text,
	"pet_gender" text,
	"pet_image" text,
	"ownership_proof" text,
	"veterinary_certificate" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" integer,
	"review_notes" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"breed" text,
	"age" integer,
	"weight" real,
	"color" text,
	"gender" text,
	"image" text,
	"medical_history" text,
	"vaccinations" jsonb,
	"is_lost" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poultry_farms" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"address" text,
	"description" text,
	"farm_type" text NOT NULL,
	"capacity" integer NOT NULL,
	"current_population" integer DEFAULT 0,
	"total_area" numeric(10, 2),
	"established_date" timestamp with time zone,
	"license_number" text,
	"contact_person" text,
	"phone" text,
	"email" text,
	"facilities" jsonb,
	"health_status" text DEFAULT 'healthy',
	"last_inspection" timestamp with time zone,
	"images" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"assigned_vet_id" integer,
	"assigned_supervisor_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- ============== CREATE ASSIGNMENT REQUESTS TABLE ==============
CREATE TABLE  "assignment_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"farm_id" integer NOT NULL,
	"request_type" varchar(20) NOT NULL,
	"requested_by" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"is_removal_request" boolean DEFAULT false,
	"target_user_id" integer,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- ============== CREATE POULTRY DAILY DATA TABLE ==============
CREATE TABLE "poultry_daily_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"day_number" integer NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"feed_consumption" numeric(10, 2) NOT NULL,
	"feed_cost" numeric(10, 2),
	"average_weight" numeric(10, 2) NOT NULL,
	"mortality" integer DEFAULT 0 NOT NULL,
	"mortality_reasons" jsonb DEFAULT '[]'::jsonb,
	"treatments" jsonb DEFAULT '[]'::jsonb,
	"vaccinations" jsonb DEFAULT '[]'::jsonb,
	"estimated_profit" numeric(10, 2) DEFAULT 0,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- ============== CREATE POULTRY BATCHES TABLE ==============
CREATE TABLE "poultry_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"farm_id" integer NOT NULL,
	"batch_number" integer NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"initial_count" integer NOT NULL,
	"current_count" integer NOT NULL,
	"final_count" integer,
	"chicks_age" integer DEFAULT 0 NOT NULL,
	"initial_weight" numeric(10, 2),
	"price_per_chick" numeric(10, 2) NOT NULL,
	"total_investment" numeric(12, 2) NOT NULL,
	"total_profit" numeric(12, 2),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" real NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"brand" text,
	"images" jsonb,
	"in_stock" boolean DEFAULT true NOT NULL,
	"stock_quantity" integer DEFAULT 0,
	"sku" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_products" (
    "id" serial PRIMARY KEY NOT NULL,
    "store_id" integer NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "category" text NOT NULL,
    "store_price" real NOT NULL,
    "store_stock" integer DEFAULT 0,
		"in_stock" boolean,
    "image" text,
    "is_available" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" text,
	"phone" text,
	"email" text,
	"website" text,
	"logo" text,
	"banner_image" text,
	"category" text NOT NULL,
	"latitude" real,
	"longitude" real,
	"license_number" text,
	"license_image" text,
	"identity_image" text,
	"working_hours" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"show_on_vet_home" boolean DEFAULT false NOT NULL,
	"rating" real DEFAULT 0,
	"total_sales" real DEFAULT 0,
	"activation_start_date" timestamp with time zone,
	"activation_end_date" timestamp with time zone,
	"reviewing_renewal_request" boolean DEFAULT false NOT NULL,
	"needs_renewal" boolean DEFAULT false NOT NULL,
	"subscription_status" text DEFAULT 'pending',
	"images" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vet_stores" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_id" integer NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "address" text,
  "phone" text,
  "email" text,
  "website" text,
  "logo" text,
  "banner_image" text,
  "category" text NOT NULL,
  "working_hours" jsonb,
  "images" jsonb DEFAULT '[]'::jsonb,
  "services" jsonb DEFAULT '[]'::jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_verified" boolean DEFAULT false NOT NULL,
  "show_on_vet_home" boolean DEFAULT false NOT NULL,
  "rating" real DEFAULT 0,
  "total_sales" real DEFAULT 0,
  "activation_end_date" timestamp with time zone,
  "needs_renewal" boolean DEFAULT false NOT NULL,
  "subscription_status" text DEFAULT 'active', -- 'active', 'expired', 'pending'
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "vet_stores_subscription_status_check" CHECK (
    subscription_status IN ('active', 'expired', 'pending')
  )
);
--> statement-breakpoint
CREATE TABLE "system_message_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient_id" integer,
	"sender_id" integer,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text,
	"category" text NOT NULL,
	"tags" jsonb,
	"images" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0,
	"like_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"assigned_by" integer,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"user_type" text DEFAULT 'pet_owner' NOT NULL,
	"avatar" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vet_books" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"author" text,
	"category" text NOT NULL,
	"isbn" text,
	"file_path" text,
	"cover_image" text,
	"language" text DEFAULT 'ar',
	"page_count" integer,
	"published_year" integer,
	"tags" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"download_count" integer DEFAULT 0,
	"rating" real DEFAULT 0,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vet_magazines" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"issue_number" integer,
	"volume" integer,
	"published_date" timestamp with time zone,
	"category" text NOT NULL,
	"file_path" text,
	"cover_image" text,
	"language" text DEFAULT 'ar',
	"page_count" integer,
	"tags" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"download_count" integer DEFAULT 0,
	"rating" real DEFAULT 0,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "veterinarians" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"license_number" text,
	"specialization" text,
	"experience" integer,
	-- "clinic_id" integer,
	"is_verified" boolean DEFAULT false NOT NULL,
	"rating" real DEFAULT 0,
	"consultation_fee" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "veterinarians_license_number_unique" UNIQUE("license_number")
);
--> statement-breakpoint
CREATE TABLE "warehouse_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"warehouse_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"brand" text,
	"sku" text,
	"batch_number" text,
	"expiry_date" timestamp with time zone,
	"quantity" integer NOT NULL,
	"unit_price" real NOT NULL,
	"wholesale_price" real,
	"images" jsonb,
	"specifications" jsonb,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" text NOT NULL,
	"phone" text,
	"email" text,
	"license_number" text,
	"capacity" integer,
	"current_stock" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"activation_start_date" timestamp with time zone,
	"activation_end_date" timestamp with time zone,
	"needs_renewal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "polls" (
  "id" serial PRIMARY KEY NOT NULL,
  "advertisement_id" integer NOT NULL,
  "question" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_multiple_choice" boolean DEFAULT false NOT NULL,
  "show_results" boolean DEFAULT false NOT NULL,
  "total_votes" integer DEFAULT 0 NOT NULL,
  "end_date" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
  "id" serial PRIMARY KEY NOT NULL,
  "poll_id" integer NOT NULL,
  "text" text NOT NULL,
  "order" integer DEFAULT 0,
  "vote_count" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
  "id" serial PRIMARY KEY NOT NULL,
  "poll_id" integer NOT NULL,
  "option_id" integer NOT NULL,
  "user_id" integer,
  "device_id" text,
  "ip_address" text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE,
  CONSTRAINT "poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE "veterinarian_approvals" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text NOT NULL,
  "city" text NOT NULL,
  "province" text NOT NULL,
  "gender" text NOT NULL, -- 'male', 'female'
  "veterinarian_type" text NOT NULL, -- 'student', 'veterinarian'
  "id_front_image" text,
  "id_back_image" text,
  "status" text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  "reviewed_by" integer,
  "reviewed_at" timestamp,
  "rejection_reason" text,
  "admin_notes" text,
  "submitted_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "veterinarian_approvals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "veterinarian_approvals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id")
);

-- Hospitals table
CREATE TABLE "hospitals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"province" text NOT NULL,
	"phone" text,
	"working_hours" text,
	"description" text,
	"specialties" jsonb,
	"image" text,
	"rating" real DEFAULT 0,
	"is_main" boolean DEFAULT false,
	"status" text DEFAULT 'active',
	"followers_count" integer DEFAULT 0,
	"announcements_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Hospital Announcements table
CREATE TABLE "hospital_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" text NOT NULL DEFAULT 'announcement',
	"image" text,
	"scheduled_date" timestamp NOT NULL DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Hospital Followers table
CREATE TABLE "hospital_followers" (
	"id" serial PRIMARY KEY NOT NULL,
	"hospital_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);


-- Union Main table
CREATE TABLE "union_main" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"logo_url" varchar(1024),
	"established_year" varchar(4),
	"member_count" varchar(256),
	"phone1" varchar(256),
	"phone2" varchar(256),
	"email" varchar(256),
	"website" varchar(256),
	"address" text,
	"services" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Union Branches table
CREATE TABLE "union_branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"governorate" varchar(256),
	"region" text DEFAULT 'central',
	"address" text,
	"phone" varchar(256),
	"email" varchar(256),
	"president" varchar(256),
	"members_count" integer DEFAULT 0,
	"rating" integer DEFAULT 0,
	"description" text,
	"established_year" integer,
	"services" jsonb,
	"status" text DEFAULT 'active',
	"followers_count" integer DEFAULT 0,
	"announcements_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Union Announcements table
CREATE TABLE "union_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"branch_id" integer,
	"main_union_id" integer,
	"type" text DEFAULT 'general',
	"is_important" boolean DEFAULT false,
	"image" varchar(1024),
	"link" varchar(1024),
	"link_text" varchar(256),
	"author" varchar(256),
	"views" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Union Followers table
CREATE TABLE "union_followers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"branch_id" integer,
	"main_union_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Union Settings table
CREATE TABLE "union_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"union_name" varchar(256),
	"union_description" text,
	"contact_email" varchar(256),
	"contact_phone" varchar(256),
	"is_maintenance_mode" boolean DEFAULT false,
	"allow_registration" boolean DEFAULT true,
	"require_approval" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Union Users table
CREATE TABLE "union_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role" text DEFAULT 'member',
	"branch_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);



--> statement-breakpoint
CREATE TABLE clinic_stats (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL,
  total_animals INTEGER DEFAULT 0,
  active_patients INTEGER DEFAULT 0,
  completed_treatments INTEGER DEFAULT 0,
  monthly_report JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clinic_stats_clinic_id_fkey
    FOREIGN KEY (clinic_id)
    REFERENCES clinics(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

--> statement-breakpoint
CREATE TABLE reminders (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER NOT NULL,
  pet_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reminder_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reminders_clinic_id_fkey
    FOREIGN KEY (clinic_id)
    REFERENCES clinics(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT reminders_pet_id_fkey
    FOREIGN KEY (pet_id)
    REFERENCES pets(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT reminders_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);



	-- Medical records table
CREATE TABLE "medical_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"clinic_id" integer,
	"veterinarian_id" integer,
	"diagnosis" text NOT NULL,
	"treatment" text NOT NULL,
	"notes" text,
	"prescription_image" text,
	"date" timestamp with time zone DEFAULT now() NOT NULL,			
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- Vaccinations table
CREATE TABLE "vaccinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"clinic_id" integer,
	"name" text NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"next_date" timestamp with time zone,
	"notes" text,
	"status" text NOT NULL DEFAULT 'scheduled',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- Pet reminders table
CREATE TABLE "pet_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"clinic_id" integer,
	"title" text NOT NULL,
	"description" text,
	"reminder_date" timestamp with time zone NOT NULL,
	"reminder_type" text DEFAULT 'checkup' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- Treatment cards table
CREATE TABLE "treatment_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"clinic_id" integer NOT NULL,
	"medications" jsonb NOT NULL,
	"instructions" text,
	"follow_up_date" timestamp with time zone,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
-- Follow-up requests table
CREATE TABLE "follow_up_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"clinic_id" integer NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"urgency" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Clinic access requests table
CREATE TABLE "clinic_access_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"clinic_id" integer NOT NULL,
	"veterinarian_id" integer,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Approved clinic access table
CREATE TABLE "approved_clinic_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"clinic_id" integer NOT NULL,
	"request_id" integer,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"granted_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Pending medical actions - awaiting owner approval
CREATE TABLE "pending_medical_actions" (
  "id" serial PRIMARY KEY NOT NULL,
  "pet_id" integer NOT NULL,
  "clinic_id" integer NOT NULL,
  "veterinarian_id" integer,
  
  -- Action type
  "action_type" text NOT NULL, -- 'medical_record', 'vaccination', 'reminder'
  
  -- Action data stored as JSON
  "action_data" jsonb NOT NULL,
  
  -- Request details
  "reason" text,               -- Why this action is needed
  "notes" text,                -- Additional notes from vet
  
  -- Status tracking
  "status" text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  "approved_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "rejection_reason" text,
  
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);



CREATE TABLE "vet_permissions" (
    "id" SERIAL PRIMARY KEY,

    "veterinarian_id" INTEGER NOT NULL,
    "clinic_id"       INTEGER NOT NULL,

    "role" TEXT NOT NULL DEFAULT 'view_edit_pets',

    "can_view_pets"              BOOLEAN DEFAULT TRUE,
    "can_edit_pets"             BOOLEAN DEFAULT TRUE,
    "can_add_medical_records"    BOOLEAN DEFAULT TRUE,
    "can_add_vaccinations"       BOOLEAN DEFAULT TRUE,
    "can_manage_appointments"    BOOLEAN DEFAULT TRUE,
    "can_view_reports"           BOOLEAN DEFAULT FALSE,
    "can_manage_staff"           BOOLEAN DEFAULT FALSE,
    "can_manage_settings"        BOOLEAN DEFAULT FALSE,

    "is_active" BOOLEAN DEFAULT TRUE,

    "created_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    UNIQUE (veterinarian_id, clinic_id)
);



CREATE TABLE IF NOT EXISTS clinic_staff (
  id SERIAL PRIMARY KEY,

  clinic_id INTEGER NOT NULL,
  veterinarian_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  added_by INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Role
  role TEXT DEFAULT 'view_edit_pets',

  -- Notes
  notes TEXT,

  -- Timestamps
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  removed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);




CREATE TABLE "store_staff" (
    "id" serial PRIMARY KEY NOT NULL,
    
    -- References
    "store_id" integer NOT NULL,
    "veterinarian_id" integer NOT NULL,
    "user_id" integer NOT NULL,
    "added_by" integer NOT NULL,

    -- Status
    "status" text DEFAULT 'active' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,

    -- Role & permissions
    "role" text DEFAULT 'view_only',

    -- Notes
    "notes" text,

    -- Timestamps
    "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
    "removed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);





CREATE TABLE "store_permissions" (
    "id" serial PRIMARY KEY NOT NULL,
    "veterinarian_id" integer NOT NULL,
    "store_id" integer NOT NULL,

    -- Permission role
    "role" text DEFAULT 'view_only' NOT NULL,

    -- Granular permissions
    "can_view_products" boolean DEFAULT true,
    "can_edit_products" boolean DEFAULT true,
    "can_add_products" boolean DEFAULT true,
    "can_delete_products" boolean DEFAULT false,
    "can_manage_orders" boolean DEFAULT true,
    "can_view_reports" boolean DEFAULT false,
    "can_manage_staff" boolean DEFAULT false,
    "can_manage_settings" boolean DEFAULT false,
    "can_manage_inventory" boolean DEFAULT true,
    "can_process_payments" boolean DEFAULT false,

    -- Additional
    "is_active" boolean DEFAULT true,

    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);







--> statement-breakpoint
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_content" ADD CONSTRAINT "admin_content_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_content" ADD CONSTRAINT "admin_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_vet_id_veterinarians_id_fk" FOREIGN KEY ("vet_id") REFERENCES "public"."veterinarians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_requests"
ADD CONSTRAINT "approval_requests_requester_id_users_id_fk"
FOREIGN KEY ("requester_id")
REFERENCES "public"."users"("id")
ON DELETE NO ACTION
ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "approval_requests"
ADD CONSTRAINT "approval_requests_reviewed_by_users_id_fk"
FOREIGN KEY ("reviewed_by")
REFERENCES "public"."users"("id")
ON DELETE NO ACTION
ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "consultation_replies" ADD CONSTRAINT "consultation_replies_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_replies" ADD CONSTRAINT "consultation_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_course_id_courses_id_fk" 
	FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_user_id_users_id_fk" 
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_reviewed_by_users_id_fk" 
	FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "hospital_announcements" ADD CONSTRAINT "hospital_announcements_hospital_id_fkey" 
	FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE;

ALTER TABLE "hospital_followers" ADD CONSTRAINT "hospital_followers_hospital_id_fkey" 
	FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE;

ALTER TABLE "hospital_followers" ADD CONSTRAINT "hospital_followers_user_id_fkey" 
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" 
	FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "field_assignments" ADD CONSTRAINT "field_assignments_farm_id_poultry_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."poultry_farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_assignments" ADD CONSTRAINT "field_assignments_veterinarian_id_veterinarians_id_fk" FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_assignments" ADD CONSTRAINT "field_assignments_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_replies" ADD CONSTRAINT "inquiry_replies_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_replies" ADD CONSTRAINT "inquiry_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Add Foreign Key Constraints
ALTER TABLE "adoption_pets" 
  ADD CONSTRAINT "adoption_pets_owner_id_fkey" 
  FOREIGN KEY ("owner_id") 
  REFERENCES "users"("id") 
  ON DELETE CASCADE;

ALTER TABLE "adoption_pets" 
  ADD CONSTRAINT "adoption_pets_adopted_by_fkey" 
  FOREIGN KEY ("adopted_by") 
  REFERENCES "users"("id") 
  ON DELETE SET NULL;

ALTER TABLE "breeding_pets" 
  ADD CONSTRAINT "breeding_pets_owner_id_fkey" 
  FOREIGN KEY ("owner_id") 
  REFERENCES "users"("id") 
  ON DELETE CASCADE;

ALTER TABLE "lost_pets" 
  ADD CONSTRAINT "lost_pets_owner_id_fkey" 
  FOREIGN KEY ("owner_id") 
  REFERENCES "users"("id") 
  ON DELETE CASCADE;

ALTER TABLE "lost_pets" 
  ADD CONSTRAINT "lost_pets_found_by_fkey" 
  FOREIGN KEY ("found_by") 
  REFERENCES "users"("id") 
  ON DELETE SET NULL;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "pet_approval_requests" ADD CONSTRAINT "pet_approval_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_approval_requests" ADD CONSTRAINT "pet_approval_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_approvals" ADD CONSTRAINT "pet_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_approvals" ADD CONSTRAINT "pet_approvals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "poultry_farms"
	ADD CONSTRAINT "poultry_farms_assigned_vet_id_fkey"
		FOREIGN KEY ("assigned_vet_id") REFERENCES "veterinarians"("id");

--> statement-breakpoint
ALTER TABLE "poultry_farms"
	ADD CONSTRAINT "poultry_farms_assigned_supervisor_id_fkey"
		FOREIGN KEY ("assigned_supervisor_id") REFERENCES "users"("id");

--> statement-breakpoint
ALTER TABLE "poultry_farms"
	ADD CONSTRAINT "poultry_farms_owner_id_users_id_fk"
		FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
		ON DELETE NO ACTION ON UPDATE NO ACTION;

--> statement-breakpoint
ALTER TABLE "assignment_requests"
	ADD CONSTRAINT "assignment_requests_farm_id_fkey"
		FOREIGN KEY ("farm_id") REFERENCES "poultry_farms"("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "assignment_requests"
	ADD CONSTRAINT "assignment_requests_requested_by_fkey"
		FOREIGN KEY ("requested_by") REFERENCES "users"("id");

--> statement-breakpoint
ALTER TABLE "assignment_requests"
	ADD CONSTRAINT "assignment_requests_target_user_id_fkey"
		FOREIGN KEY ("target_user_id") REFERENCES "users"("id");

--> statement-breakpoint
ALTER TABLE "assignment_requests"
	ADD CONSTRAINT "assignment_requests_reviewed_by_fkey"
		FOREIGN KEY ("reviewed_by") REFERENCES "users"("id");

--> statement-breakpoint
ALTER TABLE "poultry_daily_data"
	ADD CONSTRAINT "poultry_daily_data_batch_id_fkey"
		FOREIGN KEY ("batch_id") REFERENCES "poultry_batches"("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "poultry_daily_data"
	ADD CONSTRAINT "unique_batch_day_number"
		UNIQUE ("batch_id", "day_number");

--> statement-breakpoint
ALTER TABLE "poultry_batches"
	ADD CONSTRAINT "poultry_batches_farm_id_fkey"
		FOREIGN KEY ("farm_id") REFERENCES "poultry_farms"("id") ON DELETE CASCADE;

--> statement-breakpoint
ALTER TABLE "poultry_batches"
	ADD CONSTRAINT "unique_farm_batch_number"
		UNIQUE ("farm_id", "batch_number");

--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_admin_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."admin_permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_products" ADD CONSTRAINT "store_products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint


ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_stores"
  ADD CONSTRAINT "vet_stores_owner_id_users_id_fk"
  FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
  ON DELETE NO ACTION
  ON UPDATE NO ACTION;--> statement-breakpoint
ALTER TABLE "system_message_recipients" ADD CONSTRAINT "system_message_recipients_message_id_system_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."system_messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_message_recipients" ADD CONSTRAINT "system_message_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_admin_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."admin_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_books" ADD CONSTRAINT "vet_books_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_magazines" ADD CONSTRAINT "vet_magazines_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "veterinarians" ADD CONSTRAINT "veterinarians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- ALTER TABLE "veterinarians" ADD CONSTRAINT "veterinarians_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_products" ADD CONSTRAINT "warehouse_products_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;



 ALTER TABLE "union_announcements" ADD CONSTRAINT "union_announcements_branch_id_fkey" 
	FOREIGN KEY ("branch_id") REFERENCES "union_branches"("id") ON DELETE CASCADE;

ALTER TABLE "union_announcements" ADD CONSTRAINT "union_announcements_main_union_id_fkey" 
	FOREIGN KEY ("main_union_id") REFERENCES "union_main"("id") ON DELETE CASCADE;

ALTER TABLE "union_followers" ADD CONSTRAINT "union_followers_user_id_fkey" 
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "union_followers" ADD CONSTRAINT "union_followers_branch_id_fkey" 
	FOREIGN KEY ("branch_id") REFERENCES "union_branches"("id") ON DELETE CASCADE;

ALTER TABLE "union_followers" ADD CONSTRAINT "union_followers_main_union_id_fkey" 
	FOREIGN KEY ("main_union_id") REFERENCES "union_main"("id") ON DELETE CASCADE;

ALTER TABLE "union_users" ADD CONSTRAINT "union_users_user_id_fkey" 
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "union_users" ADD CONSTRAINT "union_users_branch_id_fkey" 
	FOREIGN KEY ("branch_id") REFERENCES "union_branches"("id") ON DELETE CASCADE;













ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_veterinarian_id_veterinarians_id_fk" FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id") ON DELETE no action ON UPDATE no action;



ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;



ALTER TABLE "pet_reminders" ADD CONSTRAINT "pet_reminders_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "pet_reminders" ADD CONSTRAINT "pet_reminders_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;



ALTER TABLE "treatment_cards" ADD CONSTRAINT "treatment_cards_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "treatment_cards" ADD CONSTRAINT "treatment_cards_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;



ALTER TABLE "follow_up_requests" ADD CONSTRAINT "follow_up_requests_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "follow_up_requests" ADD CONSTRAINT "follow_up_requests_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;


-- Clinic access requests table foreign keys
ALTER TABLE "clinic_access_requests" ADD CONSTRAINT "clinic_access_requests_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;
ALTER TABLE "clinic_access_requests" ADD CONSTRAINT "clinic_access_requests_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE "clinic_access_requests" ADD CONSTRAINT "clinic_access_requests_veterinarian_id_veterinarians_id_fk" FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id") ON DELETE SET NULL;

-- Approved clinic access table foreign keys
ALTER TABLE "approved_clinic_access" ADD CONSTRAINT "approved_clinic_access_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE;
ALTER TABLE "approved_clinic_access" ADD CONSTRAINT "approved_clinic_access_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE;
ALTER TABLE "approved_clinic_access" ADD CONSTRAINT "approved_clinic_access_request_id_clinic_access_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."clinic_access_requests"("id") ON DELETE SET NULL;
ALTER TABLE "approved_clinic_access" ADD CONSTRAINT "approved_clinic_access_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE CASCADE;



-- Foreign key constraints
ALTER TABLE "pending_medical_actions"
  ADD CONSTRAINT "pending_medical_actions_pet_id_fkey"
  FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "pending_medical_actions"
  ADD CONSTRAINT "pending_medical_actions_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "pending_medical_actions"
  ADD CONSTRAINT "pending_medical_actions_veterinarian_id_fkey"
  FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;


-- Foreign key: veterinarian_id → veterinarians(id)
ALTER TABLE "vet_permissions"
ADD CONSTRAINT "vet_permissions_veterinarian_id_fkey"
FOREIGN KEY ("veterinarian_id")
REFERENCES "public"."veterinarians"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- Foreign key: clinic_id → clinics(id)
ALTER TABLE "vet_permissions"
ADD CONSTRAINT "vet_permissions_clinic_id_fkey"
FOREIGN KEY ("clinic_id")
REFERENCES "public"."clinics"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;



-- Clinic reference
ALTER TABLE "clinic_staff" 
ADD CONSTRAINT "clinic_staff_clinic_id_clinics_id_fk"
FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- Veterinarian reference
ALTER TABLE "clinic_staff" 
ADD CONSTRAINT "clinic_staff_veterinarian_id_veterinarians_id_fk"
FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- User assigned reference
ALTER TABLE "clinic_staff" 
ADD CONSTRAINT "clinic_staff_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

-- Added_by reference
ALTER TABLE "clinic_staff" 
ADD CONSTRAINT "clinic_staff_added_by_users_id_fk"
FOREIGN KEY ("added_by") REFERENCES "public"."users"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;





ALTER TABLE "store_staff"
    ADD CONSTRAINT "store_staff_store_id_stores_id_fk"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "store_staff"
    ADD CONSTRAINT "store_staff_veterinarian_id_veterinarians_id_fk"
    FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "store_staff"
    ADD CONSTRAINT "store_staff_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "store_staff"
    ADD CONSTRAINT "store_staff_added_by_users_id_fk"
    FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "store_permissions"
    ADD CONSTRAINT "store_permissions_veterinarian_id_veterinarians_id_fk"
    FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "store_permissions"
    ADD CONSTRAINT "store_permissions_store_id_stores_id_fk"
    FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

