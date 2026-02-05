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
	"click_action" text DEFAULT 'none',
	"impression_count" integer DEFAULT 0,
	"budget" real,
	"cost_per_click" real,
	"target_audience" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TYPE ai_setting_type AS ENUM (
  'consultations',
  'inquiries'
);
--> statement-breakpoint
CREATE TYPE "store_type" AS ENUM ('veterinarian', 'pet_owner');

-- AI settings table
CREATE TABLE ai_settings (
  id serial PRIMARY KEY,
  type ai_setting_type NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  system_prompt text NOT NULL,
  response_delay integer DEFAULT 15,
  max_response_length integer DEFAULT 1500,
  updated_by integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

--> statement-breakpoint
CREATE TABLE "app_sections" (
	  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "description" text,
  "icon" text NOT NULL,
  "color" text NOT NULL,
  "route" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "user_type" text DEFAULT 'all' NOT NULL,
  "required_role" text,
  "is_system" boolean DEFAULT false NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"is_from_admin" boolean DEFAULT false NOT NULL,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"pet_id" integer,
	"moderator_id" integer,
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
	"moderator_id" integer,
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
	"is_ai_generated" boolean DEFAULT false NOT NULL,
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

	"is_closed_by_owner" BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Adoption specific fields
  "description" text,
  "images" jsonb,
  "contact_info" jsonb,
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

	"is_closed_by_owner" BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Breeding specific fields
  "description" text,
  "images" jsonb,
  "contact_info" jsonb,
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
  "contact_info" jsonb,
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

CREATE TABLE pet_sighting_reports (
	id SERIAL PRIMARY KEY,

	lost_pet_id INTEGER NOT NULL,
	reporter_id INTEGER NOT NULL,

	sighting_date TIMESTAMPTZ NOT NULL DEFAULT now(),
	sighting_location TEXT NOT NULL,
	description TEXT,

	contact_info JSONB,
	images JSONB,

	is_dismissed BOOLEAN NOT NULL DEFAULT false,
	dismissed_at TIMESTAMPTZ,

	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
CREATE TABLE "marketplace_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_type" "store_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" real NOT NULL,
	"image" text,
	"category" text NOT NULL,
	"subcategory" text,
	"in_stock" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"store_product_id" integer,
	"marketplace_product_id" integer,
	"quantity" integer NOT NULL,
	"unit_price" real NOT NULL,
	"total_price" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"store_type" "store_type" DEFAULT 'pet_owner' NOT NULL,
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
	"facebook" text,
	"instagram" text,
	"whatsapp" text,
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

-- Hospital Followers table
CREATE TABLE "store_followers" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"sender_id" integer,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" text DEFAULT 'info' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sent_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"target_audience" text DEFAULT 'all' NOT NULL,
	"target_user_ids" jsonb,
	"target_categories" jsonb,
	"image_url" text,
	"link_url" text,
	"status" text NOT NULL DEFAULT 'sent', -- 'sent', 'replied'
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "system_message_replies" (
  "id" serial PRIMARY KEY,
  "message_id" integer NOT NULL,
  "user_id" integer NOT NULL,
  "content" text NOT NULL,
  "is_from_admin" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);


--> statement-breakpoint
CREATE TABLE "tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_id" integer,
	"title" text NOT NULL,
	"content" text,
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
	"watch_count" integer DEFAULT 0,
	"published_year" integer,
	"tags" text,
	"is_published" boolean DEFAULT true NOT NULL,
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
	"author" text,
	"author_title" text,
	"language" text DEFAULT 'ar',
	"page_count" integer,
	"watch_count" integer DEFAULT 0,
	"tags" text,
	"is_published" boolean DEFAULT true NOT NULL,
	"download_count" integer DEFAULT 0,
	"rating" real DEFAULT 0,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "comments" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "article_id" integer NOT NULL,
    "content" text NOT NULL,
    "parent_id" integer,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE "likes" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "article_id" integer NOT NULL,
    "type" text DEFAULT 'like' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE IF NOT EXISTS "union_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"union_name" varchar(256),
	"union_description" text,
	"contact_email" varchar(256),
	"contact_phone" varchar(256),
	"is_maintenance_mode" boolean DEFAULT false,
	"allow_registration" boolean DEFAULT true,
	"require_approval" boolean DEFAULT true,
	"email_notifications" boolean DEFAULT true,
	"push_notifications" boolean DEFAULT true,
	"sms_notifications" boolean DEFAULT false,
	"new_member_notifications" boolean DEFAULT true,
	"event_notifications" boolean DEFAULT true,
	"emergency_notifications" boolean DEFAULT true,
	"weekly_reports" boolean DEFAULT true,
	"monthly_reports" boolean DEFAULT true,
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
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL
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





-- Job vacancies table
CREATE TABLE "job_vacancies" (
    "id" serial PRIMARY KEY NOT NULL,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "location" text NOT NULL,
    "job_type" text NOT NULL, -- 'full-time', 'part-time', 'contract', 'internship'
    "salary" text,
    "requirements" text NOT NULL,
    "contact_info" text NOT NULL,
    "posted_by" text NOT NULL,
    "status" text DEFAULT 'pending' NOT NULL, -- ''pending', 'approved', 'rejected'
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Job applications table
CREATE TABLE "job_applications" (
    "id" serial PRIMARY KEY NOT NULL,
    "job_id" integer NOT NULL,
    "applicant_name" text NOT NULL,
    "applicant_email" text NOT NULL,
    "applicant_phone" text NOT NULL,
    "cover_letter" text NOT NULL,
    "experience" text NOT NULL,
    "education" text NOT NULL,
    "cv" text, -- URL to CV file
    "status" text DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    "reviewed_by" integer,
    "reviewed_at" timestamp with time zone,
    "notes" text,
    "applied_at" timestamp with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Field supervision requests table
CREATE TABLE "field_supervision_requests" (
    "id" serial PRIMARY KEY NOT NULL,
    "farm_name" text DEFAULT '',
    "farm_location" text DEFAULT '',
    "owner_name" text NOT NULL,
    "owner_phone" text NOT NULL,
		"owner_email" text NOT NULL,
    "request_type" text NOT NULL, -- 'routine_inspection', 'emergency', 'consultation'
    "description" text NOT NULL,
    "preferred_date" text NOT NULL,
		"animal_count" INTEGER NOT NULL DEFAULT 0,
    "status" text DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected', 'completed'
    "assigned_vet" text,
    "assigned_vet_id" integer,
    "reviewed_by" integer,
    "reviewed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


-- Field supervision requests table
CREATE TABLE "union_branch_supervisors" (
  "id" serial PRIMARY KEY NOT NULL,
  "branch_id" integer not null,
  "user_id" integer not null
);


--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"clinic_id" integer,
	"store_id" integer,
	"rating" real NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);


-- Drop existing foreign key constraints
ALTER TABLE "admin_activity_logs" DROP CONSTRAINT IF EXISTS "admin_activity_logs_admin_id_users_id_fk";
ALTER TABLE "admin_content" DROP CONSTRAINT IF EXISTS "admin_content_created_by_users_id_fk";
ALTER TABLE "admin_content" DROP CONSTRAINT IF EXISTS "admin_content_updated_by_users_id_fk";
ALTER TABLE "admin_notifications" DROP CONSTRAINT IF EXISTS "admin_notifications_recipient_id_users_id_fk";
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_user_id_users_id_fk";
ALTER TABLE "approval_requests" DROP CONSTRAINT IF EXISTS "approval_requests_requester_id_users_id_fk";
ALTER TABLE "approval_requests" DROP CONSTRAINT IF EXISTS "approval_requests_reviewed_by_users_id_fk";
ALTER TABLE "consultation_replies" DROP CONSTRAINT IF EXISTS "consultation_replies_user_id_users_id_fk";
ALTER TABLE "consultations" DROP CONSTRAINT IF EXISTS "consultations_user_id_users_id_fk";
ALTER TABLE "course_registrations" DROP CONSTRAINT IF EXISTS "course_registrations_user_id_users_id_fk";
ALTER TABLE "course_registrations" DROP CONSTRAINT IF EXISTS "course_registrations_reviewed_by_users_id_fk";
ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "courses_instructor_id_users_id_fk";
ALTER TABLE "field_assignments" DROP CONSTRAINT IF EXISTS "field_assignments_supervisor_id_users_id_fk";
ALTER TABLE "inquiries" DROP CONSTRAINT IF EXISTS "inquiries_user_id_users_id_fk";
ALTER TABLE "inquiry_replies" DROP CONSTRAINT IF EXISTS "inquiry_replies_user_id_users_id_fk";
ALTER TABLE "adoption_pets" DROP CONSTRAINT IF EXISTS "adoption_pets_owner_id_fkey";
ALTER TABLE "adoption_pets" DROP CONSTRAINT IF EXISTS "adoption_pets_adopted_by_fkey";
ALTER TABLE "breeding_pets" DROP CONSTRAINT IF EXISTS "breeding_pets_owner_id_fkey";
ALTER TABLE "lost_pets" DROP CONSTRAINT IF EXISTS "lost_pets_owner_id_fkey";
ALTER TABLE "lost_pets" DROP CONSTRAINT IF EXISTS "lost_pets_found_by_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_users_id_fk";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_user_id_users_id_fk";
ALTER TABLE "pet_approval_requests" DROP CONSTRAINT IF EXISTS "pet_approval_requests_owner_id_users_id_fk";
ALTER TABLE "pet_approval_requests" DROP CONSTRAINT IF EXISTS "pet_approval_requests_reviewed_by_users_id_fk";
ALTER TABLE "pet_approvals" DROP CONSTRAINT IF EXISTS "pet_approvals_user_id_users_id_fk";
ALTER TABLE "pet_approvals" DROP CONSTRAINT IF EXISTS "pet_approvals_reviewed_by_users_id_fk";
ALTER TABLE "pets" DROP CONSTRAINT IF EXISTS "pets_owner_id_users_id_fk";
ALTER TABLE "poultry_farms" DROP CONSTRAINT IF EXISTS "poultry_farms_assigned_supervisor_id_fkey";
ALTER TABLE "poultry_farms" DROP CONSTRAINT IF EXISTS "poultry_farms_owner_id_users_id_fk";
ALTER TABLE "assignment_requests" DROP CONSTRAINT IF EXISTS "assignment_requests_requested_by_fkey";
ALTER TABLE "assignment_requests" DROP CONSTRAINT IF EXISTS "assignment_requests_target_user_id_fkey";
ALTER TABLE "assignment_requests" DROP CONSTRAINT IF EXISTS "assignment_requests_reviewed_by_fkey";
ALTER TABLE "stores" DROP CONSTRAINT IF EXISTS "stores_owner_id_users_id_fk";
ALTER TABLE "vet_stores" DROP CONSTRAINT IF EXISTS "vet_stores_owner_id_users_id_fk";
ALTER TABLE "system_message_recipients" DROP CONSTRAINT IF EXISTS "system_message_recipients_user_id_users_id_fk";
-- ALTER TABLE "system_messages" DROP CONSTRAINT IF EXISTS "system_messages_recipient_id_users_id_fk";
ALTER TABLE "system_messages" DROP CONSTRAINT IF EXISTS "system_messages_sender_id_users_id_fk";
ALTER TABLE "tips" DROP CONSTRAINT IF EXISTS "tips_author_id_users_id_fk";
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_user_id_users_id_fk";
ALTER TABLE "user_roles" DROP CONSTRAINT IF EXISTS "user_roles_assigned_by_users_id_fk";
ALTER TABLE "vet_books" DROP CONSTRAINT IF EXISTS "vet_books_uploaded_by_users_id_fk";
ALTER TABLE "vet_magazines" DROP CONSTRAINT IF EXISTS "vet_magazines_uploaded_by_users_id_fk";
ALTER TABLE "veterinarians" DROP CONSTRAINT IF EXISTS "veterinarians_user_id_users_id_fk";
ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "warehouses_owner_id_users_id_fk";
ALTER TABLE "hospital_followers" DROP CONSTRAINT IF EXISTS "hospital_followers_user_id_fkey";
ALTER TABLE "union_followers" DROP CONSTRAINT IF EXISTS "union_followers_user_id_fkey";
ALTER TABLE "union_users" DROP CONSTRAINT IF EXISTS "union_users_user_id_fkey";
ALTER TABLE "approved_clinic_access" DROP CONSTRAINT IF EXISTS "approved_clinic_access_granted_by_users_id_fk";
ALTER TABLE "clinic_staff" DROP CONSTRAINT IF EXISTS "clinic_staff_user_id_users_id_fk";
ALTER TABLE "clinic_staff" DROP CONSTRAINT IF EXISTS "clinic_staff_added_by_users_id_fk";
ALTER TABLE "store_staff" DROP CONSTRAINT IF EXISTS "store_staff_user_id_users_id_fk";
ALTER TABLE "store_staff" DROP CONSTRAINT IF EXISTS "store_staff_added_by_users_id_fk";
ALTER TABLE "veterinarian_approvals" DROP CONSTRAINT IF EXISTS "veterinarian_approvals_user_id_fkey";
ALTER TABLE "veterinarian_approvals" DROP CONSTRAINT IF EXISTS "veterinarian_approvals_reviewed_by_fkey";
ALTER TABLE "reminders" DROP CONSTRAINT IF EXISTS "reminders_user_id_fkey";

-- Recreate foreign key constraints with ON DELETE CASCADE
ALTER TABLE "admin_activity_logs" ADD CONSTRAINT "admin_activity_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_content" ADD CONSTRAINT "admin_content_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_content" ADD CONSTRAINT "admin_content_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consultation_replies" ADD CONSTRAINT "consultation_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_registrations" ADD CONSTRAINT "course_registrations_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_assignments" ADD CONSTRAINT "field_assignments_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inquiry_replies" ADD CONSTRAINT "inquiry_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adoption_pets" ADD CONSTRAINT "adoption_pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adoption_pets" ADD CONSTRAINT "adoption_pets_adopted_by_fkey" FOREIGN KEY ("adopted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "breeding_pets" ADD CONSTRAINT "breeding_pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lost_pets" ADD CONSTRAINT "lost_pets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lost_pets" ADD CONSTRAINT "lost_pets_found_by_fkey" FOREIGN KEY ("found_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pet_approval_requests" ADD CONSTRAINT "pet_approval_requests_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pet_approval_requests" ADD CONSTRAINT "pet_approval_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pet_approvals" ADD CONSTRAINT "pet_approvals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pet_approvals" ADD CONSTRAINT "pet_approvals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poultry_farms" ADD CONSTRAINT "poultry_farms_assigned_supervisor_id_fkey" FOREIGN KEY ("assigned_supervisor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "poultry_farms" ADD CONSTRAINT "poultry_farms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_requests" ADD CONSTRAINT "assignment_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_requests" ADD CONSTRAINT "assignment_requests_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_requests" ADD CONSTRAINT "assignment_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stores" ADD CONSTRAINT "stores_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vet_stores" ADD CONSTRAINT "vet_stores_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "system_message_recipients" ADD CONSTRAINT "system_message_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "system_messages" ADD CONSTRAINT "system_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tips" ADD CONSTRAINT "tips_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vet_books" ADD CONSTRAINT "vet_books_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vet_magazines" ADD CONSTRAINT "vet_magazines_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "veterinarians" ADD CONSTRAINT "veterinarians_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "hospital_followers" ADD CONSTRAINT "hospital_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "union_followers" ADD CONSTRAINT "union_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "union_users" ADD CONSTRAINT "union_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approved_clinic_access" ADD CONSTRAINT "approved_clinic_access_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_staff" ADD CONSTRAINT "store_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_staff" ADD CONSTRAINT "store_staff_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "veterinarian_approvals" ADD CONSTRAINT "veterinarian_approvals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "veterinarian_approvals" ADD CONSTRAINT "veterinarian_approvals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Also add CASCADE to other important relationships for data integrity
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vaccinations" ADD CONSTRAINT "vaccinations_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pet_reminders" ADD CONSTRAINT "pet_reminders_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "treatment_cards" ADD CONSTRAINT "treatment_cards_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follow_up_requests" ADD CONSTRAINT "follow_up_requests_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinic_access_requests" ADD CONSTRAINT "clinic_access_requests_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approved_clinic_access" ADD CONSTRAINT "approved_clinic_access_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pending_medical_actions" ADD CONSTRAINT "pending_medical_actions_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add CASCADE to veterinarian-related constraints
ALTER TABLE "vet_permissions" ADD CONSTRAINT "vet_permissions_veterinarian_id_fkey" FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_permissions" ADD CONSTRAINT "store_permissions_veterinarian_id_veterinarians_id_fk" FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_veterinarian_id_veterinarians_id_fk" FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_staff" ADD CONSTRAINT "store_staff_veterinarian_id_veterinarians_id_fk" FOREIGN KEY ("veterinarian_id") REFERENCES "public"."veterinarians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add CASCADE to clinic/store-related constraints
ALTER TABLE "vet_permissions" ADD CONSTRAINT "vet_permissions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_permissions" ADD CONSTRAINT "store_permissions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_staff" ADD CONSTRAINT "store_staff_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;





-- Foreign key constraints for jobs vacacies.
ALTER TABLE "job_applications" 
    ADD CONSTRAINT "job_applications_job_id_job_vacancies_id_fk" 
    FOREIGN KEY ("job_id") REFERENCES "public"."job_vacancies"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "job_applications" 
    ADD CONSTRAINT "job_applications_reviewed_by_users_id_fk" 
    FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "field_supervision_requests" 
    ADD CONSTRAINT "field_supervision_requests_assigned_vet_id_veterinarians_id_fk" 
    FOREIGN KEY ("assigned_vet_id") REFERENCES "public"."veterinarians"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "field_supervision_requests" 
    ADD CONSTRAINT "field_supervision_requests_reviewed_by_users_id_fk"
    FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE "appointments" ADD CONSTRAINT "appointments_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- ALTER TABLE "store_products" ADD CONSTRAINT "store_products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -- Vet Store Updates
-- ALTER TABLE "products" ADD COLUMN "vet_store_id" integer;
-- ALTER TABLE "products" ALTER COLUMN "store_id" DROP NOT NULL;
-- ALTER TABLE "products" ADD CONSTRAINT "products_vet_store_id_vet_stores_id_fk" FOREIGN KEY ("vet_store_id") REFERENCES "public"."vet_stores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ALTER TABLE "vet_stores" ADD COLUMN "working_hours" jsonb;
-- ALTER TABLE "vet_stores" ADD COLUMN "images" jsonb;
-- ALTER TABLE "vet_stores" ADD COLUMN "services" jsonb;

ALTER TABLE "store_followers" ADD CONSTRAINT "store_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_followers" ADD CONSTRAINT "store_followers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FK → users
ALTER TABLE "comments" 
ADD CONSTRAINT "comments_user_id_users_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- FK → vet_magazines
ALTER TABLE "comments" 
ADD CONSTRAINT "comments_article_id_vet_magazines_id_fk"
FOREIGN KEY ("article_id")
REFERENCES "public"."vet_magazines"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Self-reference for threaded replies
ALTER TABLE "comments"
ADD CONSTRAINT "comments_parent_id_comments_id_fk"
FOREIGN KEY ("parent_id")
REFERENCES "public"."comments"("id")
ON DELETE CASCADE ON UPDATE CASCADE;



-- FK → users
ALTER TABLE "likes"
ADD CONSTRAINT "likes_user_id_users_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "public"."users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- FK → vet_magazines
ALTER TABLE "likes"
ADD CONSTRAINT "likes_article_id_vet_magazines_id_fk"
FOREIGN KEY ("article_id")
REFERENCES "public"."vet_magazines"("id")
ON DELETE CASCADE ON UPDATE CASCADE;



ALTER TABLE "system_message_replies"
ADD CONSTRAINT "system_message_replies_message_id_fk"
FOREIGN KEY ("message_id")
REFERENCES "system_messages" ("id")
ON DELETE CASCADE;



ALTER TABLE "system_message_replies"
ADD CONSTRAINT "system_message_replies_user_id_fk"
FOREIGN KEY ("user_id")
REFERENCES "users" ("id")
ON DELETE CASCADE;




ALTER TABLE pet_sighting_reports
ADD CONSTRAINT pet_sighting_reports_lost_pet_id_lost_pets_id_fk
FOREIGN KEY (lost_pet_id)
REFERENCES lost_pets(id)
ON DELETE CASCADE
ON UPDATE CASCADE;




ALTER TABLE pet_sighting_reports
ADD CONSTRAINT pet_sighting_reports_reporter_id_users_id_fk
FOREIGN KEY (reporter_id)
REFERENCES users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;



ALTER TABLE ai_settings
ADD CONSTRAINT ai_settings_updated_by_fkey
FOREIGN KEY (updated_by) REFERENCES users(id);

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_store_product_id_store_products_id_fk" FOREIGN KEY ("store_product_id") REFERENCES "public"."store_products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;



ALTER TABLE "union_branch_supervisors" ADD CONSTRAINT "union_branch_supervisors_branch_id_union_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."union_branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "union_branch_supervisors" ADD CONSTRAINT "union_branch_supervisors_user_id_union_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "consultations" ADD CONSTRAINT "consultations_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"latitude" real,
	"longitude" real,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

--> statement-breakpoint
CREATE TABLE "user_cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"marketplace_product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_cart_items" ADD CONSTRAINT "user_cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--> statement-breakpoint
ALTER TABLE "user_cart_items" ADD CONSTRAINT "user_cart_items_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
