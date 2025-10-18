# 🐾 Veterinary Backend API

**Language**: [English](#english) | [العربية](README.ar.md)

---

## 📋 Project Description

This is the backend API server for the **Veterinary Application (بيطري)**. It provides a complete REST API built with modern technologies to manage veterinary services, pet records, appointments, consultations, and e-commerce functionality.

## 🛠️ Technology Stack

- **Runtime**: Bun (High-performance JavaScript runtime)
- **Framework**: Hono + tRPC (Type-safe APIs)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based authentication
- **Validation**: Zod schemas for type-safe validation

## 📊 Features

- **🏥 Clinic Management** - Registration, profiles, services
- **👨‍⚕️ Veterinarian Services** - Professional profiles, specializations
- **🐕 Pet Records** - Complete medical history, vaccinations
- **📅 Appointments** - Booking and scheduling system
- **💬 Consultations** - Real-time veterinary consultations
- **🛒 E-commerce** - Pet supplies and medication sales
- **🏪 Multi-vendor Stores** - Marketplace for pet products
- **📦 Warehouse Management** - Inventory tracking
- **🤖 AI Integration** - Automated consultation responses
- **👑 Admin Dashboard** - Complete system management
- **📱 Real-time Notifications** - Push notifications and messaging

## 🚀 Quick Start

### Prerequisites
```bash
# Required software
- Bun or Node.js 18+
- PostgreSQL 14+
- Git
```

### Installation
```bash
# 1. Clone the repository
git clone <your-backend-repo-url>
cd backend

# 2. Install dependencies
bun install
# or: npm install

# 3. Set up environment variables
cp env.example .env
# Edit .env with your database credentials

# 4. Set up database
bun run db:generate
bun run db:migrate

# 5. Seed database (optional)
bun run db:seed

# 6. Start development server
bun run dev
```

### Environment Variables
```bash
# Required
DATABASE_URL=postgresql://username:password@localhost:5432/veterinary_app
PORT=3001
NODE_ENV=development

# Optional
JWT_SECRET=your-super-secret-key
OPENAI_API_KEY=your-openai-api-key
```

## 🔄 Available Scripts

```bash
bun run dev          # Start development server with hot reload
bun run start        # Start production server
bun run build        # Build for production
bun run db:generate  # Generate database migrations
bun run db:migrate   # Run database migrations
bun run db:studio    # Open Drizzle Studio (database GUI)
bun run db:seed      # Seed database with initial data
```

## 🌐 API Endpoints

- **Health Check**: `GET /health`
- **tRPC API**: All endpoints available at `/trpc/*`
- **Documentation**: Available when server is running

### Main API Routes:
- **Users & Authentication** - User management, login, roles
- **Pets** - Pet registration, medical records, approvals
- **Clinics** - Clinic management, services, schedules
- **Appointments** - Booking, scheduling, management
- **Consultations** - Real-time vet consultations
- **E-commerce** - Products, orders, inventory
- **Admin** - System management, analytics, approvals

## 🚀 Production Deployment

### Using Railway (Recommended)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Using Render
1. Connect repository to Render
2. Set environment variables
3. Choose PostgreSQL addon
4. Deploy

### Manual Deployment
```bash
# Set production environment variables
export DATABASE_URL="postgresql://..."
export NODE_ENV=production
export PORT=3001

# Build and start
bun run build
bun run start
```

## 🗄️ Database Schema

The database includes 30+ tables:
- Users, Pets, Veterinarians, Clinics
- Appointments, Consultations, Inquiries  
- Products, Orders, Stores, Warehouses
- Notifications, Messages, Approvals
- AI Settings, Field Assignments

## 🔧 Development

```bash
# Run in development mode
bun run dev

# Database operations
bun run db:studio    # Visual database editor
bun run db:generate  # Create new migration
bun run db:migrate   # Apply migrations

# API will be available at:
# http://localhost:3001
```

## 🛡️ Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Input validation with Zod schemas
- CORS configuration
- Rate limiting ready
- Environment-based configuration

## 📞 Support

For technical support, please contact the development team.

---

**🚀 Backend Server Ready for Production!**