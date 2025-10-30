# 🔐 Google OAuth Setup Guide for GreenScore

## Overview
GreenScore now supports professional-grade authentication with:
- ✅ **Google OAuth 2.0** - Sign in with Google
- ✅ **Enhanced Password Security** - bcrypt hashing with salt rounds
- ✅ **Enterprise Security** - Rate limiting, session management, audit logging
- ✅ **Flexible Authentication** - Users can use both Google and local accounts

## 🚀 Quick Setup

### Step 1: Get Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "New Project"
   - Name: "GreenScore Marketplace"
   - Click "Create"

3. **Enable Google+ API**
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "GreenScore Auth"
   
5. **Configure Authorized URLs**
   ```
   Authorized JavaScript origins:
   http://localhost:3000
   https://your-domain.com (for production)
   
   Authorized redirect URIs:
   http://localhost:3000/auth/google/callback
   https://your-domain.com/auth/google/callback (for production)
   ```

6. **Copy Your Credentials**
   - Copy the Client ID and Client Secret

### Step 2: Configure Environment Variables

1. **Edit your `.env` file:**
   ```bash
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
   
   # Session Security
   SESSION_SECRET=your_super_secret_session_key_change_in_production
   
   # Encryption Key (32+ characters)
   ENCRYPTION_KEY=your_encryption_key_for_sensitive_data_32_chars_minimum
   ```

2. **Generate Secure Keys:**
   ```bash
   # Generate session secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate encryption key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### Step 3: Start the Enhanced Server

```bash
# Stop old server
pkill -f "node server"

# Start OAuth-enabled server
node server-oauth.js
```

## 🎯 Features Implemented

### Authentication Options
1. **Google OAuth** - One-click sign-in with Google
2. **Local Authentication** - Email/password with enhanced security
3. **Dual Mode Support** - Users can switch between seller/buyer modes

### Security Features
- ✅ **Password Hashing** - bcrypt with 12 salt rounds
- ✅ **Rate Limiting** - Prevents brute force attacks
- ✅ **Session Management** - Secure session handling
- ✅ **Data Encryption** - Sensitive data encrypted at rest
- ✅ **Security Audit Logs** - All auth events logged
- ✅ **Account Lockout** - Automatic lockout after failed attempts

### User Experience
- ✅ **Password Strength Indicator** - Real-time feedback
- ✅ **Show/Hide Password** - Toggle password visibility
- ✅ **Form Validation** - Real-time validation
- ✅ **OAuth Error Handling** - Graceful error recovery
- ✅ **Profile Completion** - Onboarding for OAuth users

## 🔧 Database Schema Updates

The database now includes:

```sql
-- Enhanced users table with OAuth support
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN profile_picture TEXT;
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local';
ALTER TABLE users ADD COLUMN encrypted_data TEXT;
ALTER TABLE users ADD COLUMN last_login DATETIME;
ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;

-- Security audit table
CREATE TABLE security_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    event_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🌐 API Endpoints Added

### Authentication
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - OAuth callback
- `POST /api/auth/login` - Enhanced local login
- `POST /api/auth/register` - Enhanced registration
- `POST /api/auth/logout` - Secure logout
- `POST /api/auth/complete-profile` - Complete OAuth profile

### Security
- Rate limiting on login attempts
- Security event logging
- Session management

## 🎨 UI Enhancements

### New Auth Interface
- **Google Sign-In Button** - Branded OAuth button
- **Password Strength Meter** - Real-time strength feedback
- **Enhanced Validation** - Better form validation
- **Security Information** - Trust indicators
- **Responsive Design** - Mobile-optimized

### Files Added/Updated
- `public/auth-enhanced.html` - New auth interface
- `public/auth-enhanced.js` - Enhanced auth logic
- `oauth-styles.css` - OAuth-specific styles
- `server-oauth.js` - OAuth-enabled server
- `auth.js` - Professional auth service
- `database-enhanced.js` - Enhanced database with OAuth

## 🚀 Testing the Implementation

### 1. Test Local Authentication
```bash
# Start server
node server-oauth.js

# Visit: http://localhost:3000/auth-enhanced.html
# Try creating account with email/password
```

### 2. Test Google OAuth (after setup)
```bash
# Click "Continue with Google" button
# Should redirect to Google sign-in
# After approval, redirects back to app
```

### 3. Test Security Features
```bash
# Try multiple failed login attempts
# Should see rate limiting in action
# Check security logs in database
```

## 🔒 Security Best Practices Implemented

1. **Password Security**
   - bcrypt with 12 salt rounds
   - Password strength requirements
   - Secure password reset (ready for implementation)

2. **Session Security**
   - Secure session cookies
   - HttpOnly flags
   - Session expiration

3. **Rate Limiting**
   - Login attempt limiting
   - IP-based rate limiting
   - Account lockout mechanism

4. **Data Protection**
   - Sensitive data encryption
   - SQL injection prevention
   - Input validation and sanitization

5. **Audit Logging**
   - All authentication events logged
   - IP address and user agent tracking
   - Security event monitoring

## 🚀 Production Deployment Notes

### Environment Variables for Production
```bash
NODE_ENV=production
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
SESSION_SECRET=your_production_session_secret
ENCRYPTION_KEY=your_production_encryption_key
```

### Security Headers (add to production)
```javascript
app.use(helmet()); // Add helmet for security headers
app.use(cors({
  origin: ['https://your-domain.com'],
  credentials: true
}));
```

### SSL/HTTPS Required
- Google OAuth requires HTTPS in production
- Use Let's Encrypt or similar for SSL certificates

## 🎯 Next Steps

1. **Set up Google OAuth credentials**
2. **Configure environment variables**
3. **Test both authentication methods**
4. **Deploy with HTTPS for production**

Your GreenScore marketplace now has **enterprise-grade authentication** with Google OAuth integration! 🎉
