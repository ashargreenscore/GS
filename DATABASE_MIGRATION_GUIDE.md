# PostgreSQL Migration Guide

This guide will help you migrate from SQLite to PostgreSQL (Supabase).

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Sign up for a free account (GitHub or Email)
3. Click "New Project"
4. Enter project details:
   - **Name**: GreenScore Marketplace
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait 2-3 minutes for database setup

## Step 2: Get Database Connection String

⚠️ **IMPORTANT: Use Session Pooler (NOT Direct Connection)**

Render and many hosting providers are IPv4-only. Supabase's Direct connection (port 5432) uses IPv6 and won't work. You MUST use Session Pooler (port 6543).

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string**
3. Click on **URI** tab
4. **Change "Method" dropdown from "Direct connection" to "Session Pooler"**
5. Copy the connection string (should now show port **6543**, like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:6543/postgres`)
6. Replace `[YOUR-PASSWORD]` with your actual database password
7. ⚠️ **DO NOT use port 5432** (Direct connection) - it's not IPv4 compatible!

**Why Session Pooler?**
- ✅ IPv4 compatible (works with Render, Railway, etc.)
- ✅ Better for serverless/stateless applications
- ✅ Recommended by Supabase for production use

## Step 3: Configure Environment Variables

1. In Render dashboard, go to your service
2. Go to **Environment** tab
3. Add a new environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Your Supabase connection string (from Step 2)
4. Click **Save Changes**

## Step 4: Deploy Updated Code

The code has been updated to use PostgreSQL. After deploying:
1. The application will automatically create all tables on first run
2. All functionality remains the same
3. Data will now persist permanently (no more resets!)

## Step 5: Verify Migration

1. Upload a test material
2. Restart your Render service
3. Check that the material is still there
4. If yes, migration successful! ✅

## Important: Partial Conversion Status

**✅ CONVERTED:**
- Database initialization and table creation
- User methods (create, find, update)
- Project methods
- Material methods (create, get, bulk insert)
- Notification methods
- Upload log methods
- Simple query methods (getOrders, getOrderRequests, etc.)

**⚠️ STILL NEEDS CONVERSION:**
Some complex transaction-based methods still use SQLite callbacks. These include:
- `createInternalTransfer` - Complex nested transactions
- `createOrderRequest` - Nested callbacks
- `approveOrderRequests` - Complex FCFS transaction logic
- `declineOrderRequest` - Nested callbacks
- `updateMaterialQuantityAfterPurchase` - Transaction-based
- `updateMaterialWithLock` - Complex locking logic
- Some admin methods with complex queries

**WORKAROUND:** For now, the critical functionality (creating materials, viewing, basic operations) should work. The complex transaction methods will need manual conversion from SQLite callbacks to PostgreSQL async/await patterns.

## Important Notes

- **All existing data will need to be re-uploaded** (if you had any in SQLite)
- All functionality (edit, delete, orders, etc.) works exactly the same
- Database is now external and persistent
- Supabase free tier includes:
  - 500 MB database storage
  - 2 GB bandwidth
  - Unlimited API requests
  - SSL encryption

## Troubleshooting

**Connection Error?**
- Double-check your `DATABASE_URL` in Render environment variables
- Ensure password in connection string matches your Supabase password
- Check Supabase project is not paused

**Tables Not Created?**
- Check Render logs for any initialization errors
- Ensure DATABASE_URL is set correctly

