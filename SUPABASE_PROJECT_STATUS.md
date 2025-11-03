# How to Check if Your Supabase Project is Active

## Quick Steps

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in with your account

2. **Check Project Status**
   - Look at your project list
   - An **active project** will show:
     - ✅ Green status indicator
     - Project name is clickable
     - Shows "Active" or "Running" status
   
3. **Signs of Inactive/Paused Project**
   - ⚠️ Yellow or red status indicator
   - "Paused" or "Inactive" label
   - Message saying "Project paused" or "Project inactive"
   - Cannot click into project details

## Detailed Checks

### From Project Dashboard

Once inside your project:

1. **Settings → General**
   - Check "Project Status"
   - Should say "Active" or "Running"

2. **Database Tab**
   - Click "Database" in left sidebar
   - Should show connection details
   - If paused, you'll see "Project is paused" message

3. **Connection Settings**
   - Go to: **Settings** → **Database**
   - Scroll to "Connection string"
   - Should be able to see/copy connection strings
   - If paused, this section may be disabled

## Common Issues

### Project Paused (Free Tier)
- Free tier projects can pause after 7 days of inactivity
- **Solution**: Click "Restore" or "Resume" button in project dashboard

### Project Deleted
- If project was deleted, it won't appear in dashboard
- **Solution**: Create a new project and update `DATABASE_URL` in Render

### Billing Issues
- Projects can pause if payment method fails
- **Solution**: Check billing settings and update payment method

## How to Resume a Paused Project

1. Go to Supabase Dashboard
2. Find your paused project
3. Click on the project
4. Click "Restore" or "Resume" button
5. Wait 1-2 minutes for project to become active
6. Verify connection string still works

## Verify Connection

After confirming project is active:

1. Go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **Transaction Pooler** method (port 6543)
4. Copy the connection string
5. Verify it matches your `DATABASE_URL` in Render:
   - Format: `postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:6543/postgres`
   - Port should be **6543** (Transaction Pooler)
   - NOT **5432** (Direct connection)

## Need Help?

If your project shows as active but you still can't connect:

1. **Test Connection String**
   - Try copying a fresh connection string from Supabase
   - Make sure you're using Transaction Pooler (port 6543)

2. **Check Render Environment Variables**
   - Go to Render dashboard → Your service → Environment
   - Verify `DATABASE_URL` is set correctly
   - Remove any extra quotes or spaces

3. **Check Logs**
   - Look at Render logs for specific error messages
   - Common errors:
     - `ENOTFOUND`: DNS resolution issue
     - `ETIMEDOUT`: Connection timeout
     - `ECONNREFUSED`: Port/firewall issue

