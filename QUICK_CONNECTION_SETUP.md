# Quick Connection String Setup for Render

## Your Supabase Connection String

Based on your Supabase dashboard, use this format:

```
postgresql://postgres.ojfelhpyavvmynezowsy:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

## Steps to Configure in Render

1. **Get Your Password**
   - This is the password you set when creating the Supabase project
   - If you forgot it, go to Supabase → Settings → Database → Database password → Reset

2. **Replace `[YOUR-PASSWORD]`**
   - Replace `[YOUR-PASSWORD]` with your actual password
   - Example: If password is `MySecure123!`, the string becomes:
     ```
     postgresql://postgres.ojfelhpyavvmynezowsy:MySecure123!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```

3. **Add to Render Environment Variables**
   - Go to Render Dashboard → Your Service → Environment
   - Find or create `DATABASE_URL`
   - Paste the complete connection string (with your password)
   - Click "Save Changes"

4. **Redeploy**
   - Render will automatically redeploy
   - Wait 2-3 minutes for deployment
   - Check logs to verify connection

## Important Notes

✅ **Port 6543** is correct (Transaction Pooler - IPv4 compatible)
✅ **pooler.supabase.com** hostname is correct for Transaction Pooler
✅ Username format `postgres.xxx` is correct (includes project ID)

⚠️ **Make sure:**
- Password is correct (copy-paste carefully)
- No extra spaces or quotes around the connection string
- Replace `[YOUR-PASSWORD]` with actual password

## Testing Connection

After deploying, check Render logs. You should see:
- `✅ Resolved ... to IPv4: [address]` or
- `✅ Connected to PostgreSQL database`

If you see errors, double-check:
1. Password is correct
2. Connection string has no extra quotes
3. Supabase project is active (not paused)

