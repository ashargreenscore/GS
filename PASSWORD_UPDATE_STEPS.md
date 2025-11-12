# Password Update Steps

You've updated the password to `Ashargreenscore` in Render. Now you need to update it in Supabase too.

## Step 1: Update Password in Supabase

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Database password** section
5. Click **Reset database password** or **Change password**
6. Enter new password: `Ashargreenscore`
7. Confirm the password
8. Click **Update** or **Reset**

⚠️ **Important**: The password in Supabase MUST match the password in your Render `DATABASE_URL`

## Step 2: Verify Render Environment Variable

In Render, make sure `DATABASE_URL` is:
```
postgresql://postgres.ojfelhpyavvmynezowsy:Ashargreenscore@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

(No special characters, so no encoding needed!)

## Step 3: Wait for Deployment

- Render will automatically redeploy after you save environment variables
- Wait 2-3 minutes for deployment to complete

## Step 4: Check Logs

After deployment, check Render logs. You should see:
- `✅ Resolved ... to IPv4: [address]`
- `✅ Connected to PostgreSQL database successfully`
- `✅ PostgreSQL database tables initialized successfully`

## If Still Not Working

If you still see connection errors:
1. **Double-check** password in Supabase matches Render exactly
2. **Verify** Supabase project is Active (not Paused)
3. **Check** connection string format in Render (no extra quotes/spaces)
4. Share the error logs from Render

## Common Issues

- ❌ **Password mismatch**: Supabase password ≠ Render DATABASE_URL password
- ❌ **Project paused**: Supabase project needs to be Active
- ❌ **Wrong connection string**: Make sure it's Transaction Pooler (port 6543)

