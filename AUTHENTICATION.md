# Authentication System Documentation

## ✅ JWT Authentication Implementation Complete

Your backend now has a **production-ready JWT authentication system** with the following features:

### 🔐 Authentication Features

1. **User Registration** with password validation
2. **User Login** with email/password
3. **JWT Token Management** (access & refresh tokens)
4. **Password Security** (bcrypt hashing with 12 salt rounds)
5. **Role-Based Access Control** (user, vet, admin)
6. **Token Refresh** mechanism
7. **Profile Management** (view, update)
8. **Password Change** functionality

### 🎯 API Endpoints

#### Public Endpoints (No Authentication Required)
```typescript
// User Registration
POST /trpc/auth.register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "phone": "+1234567890", // optional
  "userType": "user" // or "vet", defaults to "user"
}

// User Login
POST /trpc/auth.login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

// Refresh Access Token
POST /trpc/auth.refreshToken
{
  "refreshToken": "your-refresh-token"
}
```

#### Protected Endpoints (Require Authentication)
```typescript
// Get User Profile
GET /trpc/auth.getProfile
Headers: { "Authorization": "Bearer your-jwt-token" }

// Update Profile
POST /trpc/auth.updateProfile
Headers: { "Authorization": "Bearer your-jwt-token" }
{
  "name": "Updated Name", // optional
  "phone": "+9876543210" // optional
}

// Change Password
POST /trpc/auth.changePassword
Headers: { "Authorization": "Bearer your-jwt-token" }
{
  "currentPassword": "oldPassword",
  "newPassword": "NewSecurePass123"
}

// Logout
POST /trpc/auth.logout
Headers: { "Authorization": "Bearer your-jwt-token" }

// Validate Token
GET /trpc/auth.validateToken
Headers: { "Authorization": "Bearer your-jwt-token" }
```

### 🛡️ Security Features

#### Password Requirements
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter  
- At least one number

#### JWT Security
- Tokens signed with secure secret (configure JWT_SECRET in .env)
- Access tokens expire in 7 days (configurable)
- Refresh tokens expire in 30 days (configurable)
- Tokens include issuer/audience validation

#### Database Security
- Passwords hashed with bcrypt (12 salt rounds)
- Password reset tokens for future implementation
- Email verification fields ready
- User activation status tracking

### 🔧 Authentication Middleware

The system provides three middleware types:

```typescript
import { protectedProcedure, adminProcedure, vetProcedure } from './create-context';

// For any authenticated user
export const someProtectedRoute = protectedProcedure
  .query(async ({ ctx }) => {
    // ctx.user contains authenticated user data
    const userId = ctx.user.id;
    const userType = ctx.user.userType;
    // ...
  });

// For admin users only  
export const adminOnlyRoute = adminProcedure
  .query(async ({ ctx }) => {
    // User is guaranteed to be admin
    // ...
  });

// For veterinarians and admins
export const vetRoute = vetProcedure
  .query(async ({ ctx }) => {
    // User is vet or admin
    // ...
  });
```

### 📝 Usage Examples

#### Frontend Login Flow
```typescript
// 1. Login
const loginResponse = await trpc.auth.login.mutate({
  email: "user@example.com",
  password: "password123"
});

// 2. Store tokens
localStorage.setItem('accessToken', loginResponse.tokens.accessToken);
localStorage.setItem('refreshToken', loginResponse.tokens.refreshToken);

// 3. Use token for protected requests
const userProfile = await trpc.auth.getProfile.query();
```

#### Token Refresh Flow
```typescript
// When access token expires, refresh it
try {
  const response = await trpc.auth.refreshToken.mutate({
    refreshToken: localStorage.getItem('refreshToken')
  });
  
  localStorage.setItem('accessToken', response.accessToken);
} catch (error) {
  // Refresh token expired, redirect to login
  window.location.href = '/login';
}
```

### 🗄️ Database Schema Updates

The users table now includes:
```sql
-- New authentication fields added:
password TEXT NOT NULL,              -- Hashed password
email_verified BOOLEAN DEFAULT FALSE,
email_verification_token TEXT,
password_reset_token TEXT,
password_reset_expires TIMESTAMP,
last_login_at TIMESTAMP
```

### ⚙️ Environment Configuration

Update your `.env` file:
```env
# CRITICAL: Change this in production (32+ characters)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-make-it-at-least-32-characters-long

# Token expiration (optional, defaults shown)
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
```

### 🚀 Migration Instructions

1. **Run new migrations:**
   ```bash
   bun run db:migrate
   ```

2. **Update existing users (if any):**
   ```sql
   -- You'll need to manually set passwords for existing users
   -- Or run a script to generate temporary passwords
   ```

3. **Test authentication:**
   ```bash
   # Register a new user
   curl -X POST http://localhost:3001/trpc/auth.register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"SecurePass123","name":"Test User"}'
   ```

### 🔒 Security Best Practices Implemented

✅ **Secure password hashing** (bcrypt with 12 rounds)  
✅ **JWT token validation** with issuer/audience  
✅ **Role-based access control**  
✅ **Database user validation** on each request  
✅ **Account activation status** checking  
✅ **Comprehensive error handling**  
✅ **Input validation** with Zod schemas  

### 📊 What's Ready for Production

Your authentication system is now **production-ready** with:
- ✅ Secure password storage and validation
- ✅ JWT token management with refresh capability  
- ✅ Role-based access control
- ✅ Comprehensive error handling
- ✅ Input validation and sanitization
- ✅ Database integration with proper relations

### 🎯 Next Steps (Optional Enhancements)

For even more advanced authentication, consider:
- Email verification system
- Password reset via email
- Two-factor authentication (2FA)
- Session management and token blacklisting
- OAuth integration (Google, Facebook)
- Account lockout after failed attempts

**Your backend is now production-ready for authentication! 🚀**
