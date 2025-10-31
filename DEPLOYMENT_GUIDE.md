# GreenScore Marketplace - Railway Deployment Guide

## 🚀 Quick Deployment Steps

### Step 1: Push to GitHub

Run these commands in your terminal (in the project folder):

```bash
# Navigate to project folder (if not already there)
cd C:\Users\bhavya\Downloads\greenscore-marketplace

# Remove old remote if exists
git remote remove origin

# Add your new GitHub repository
git remote add origin https://github.com/ashargreenscore/GS.git

# Stage all files
git add .

# Create commit
git commit -m "Initial commit - GreenScore Marketplace for greenscore.world"

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main
```

**Note**: When asked for password, use your GitHub Personal Access Token (not your GitHub password).

---

### Step 2: Create GitHub Personal Access Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: `GreenScore Railway Deployment`
4. Select expiration (30/90 days or No expiration)
5. Check **`repo`** checkbox (selects all repo permissions)
6. Click "Generate token"
7. **COPY THE TOKEN IMMEDIATELY** - you won't see it again!

---

### Step 3: Deploy on Railway

1. Go to: https://railway.app
2. Login with GitHub (use your **new GitHub account**: ashargreenscore)
3. Click "New Project"
4. Click "Deploy from GitHub repo"
5. Select: `ashargreenscore/GS`
6. Railway will start deploying automatically

---

### Step 4: Configure Environment Variables

In Railway dashboard → Your service → "Variables" tab:

Add these variables one by one:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `APP_URL` | `https://greenscore.world` |
| `DATABASE_PATH` | `./greenscore.db` |
| `SESSION_SECRET` | `[Generated below - copy from DEPLOYMENT_SECRET.txt]` |
| `MAX_FILE_SIZE` | `50mb` |
| `UPLOAD_PATH` | `./uploads` |

**Optional (if using SendGrid):**
| Key | Value |
|-----|-------|
| `SENDGRID_API_KEY` | `your_sendgrid_api_key_here` |
| `EMAIL_FROM` | `GreenScore Marketplace <marketplace@greenscore.world>` |

---

### Step 5: Add Custom Domain

1. Railway dashboard → Settings → "Domains"
2. Click "Custom Domain"
3. Enter: `greenscore.world`
4. Click "Add Domain"
5. **Copy the DNS instructions Railway shows you**

---

### Step 6: Configure GoDaddy DNS

1. Login to: https://www.godaddy.com
2. Go to "My Products" → Find "greenscore.world" → Click "DNS"
3. Delete any existing A or CNAME records for root domain (`@`)
4. Add the DNS records exactly as Railway instructs:
   - Usually a **CNAME** record pointing to Railway's domain
   - Or **A records** with Railway's IP addresses
5. Save changes
6. Wait 10-60 minutes for DNS propagation

---

### Step 7: Verify Deployment

After DNS propagates (check in Railway → Settings → Domains):
- Visit: https://greenscore.world
- Test all pages:
  - Homepage: https://greenscore.world
  - Seller: https://greenscore.world/seller
  - Buyer: https://greenscore.world/buyer
  - Admin: https://greenscore.world/admin

---

## 🔑 Generated Session Secret

Your session secret has been generated and saved. Use it for the `SESSION_SECRET` environment variable in Railway.

---

## 📝 Notes

- Railway automatically sets the `PORT` variable - don't add it manually
- Railway automatically provisions SSL certificates for your custom domain
- Database (greenscore.db) will be created automatically on first run
- File uploads will work, but consider Railway volumes for persistent storage

---

## 🆘 Troubleshooting

**Git push fails?**
- Make sure you're using the Personal Access Token (not password)
- Verify you're using the correct GitHub username: `ashargreenscore`

**Railway deployment fails?**
- Check the "Deployments" tab → View logs
- Verify all environment variables are set correctly

**Domain not working?**
- Wait 30-60 minutes for DNS propagation
- Verify DNS records in GoDaddy match Railway's instructions exactly
- Check Railway → Settings → Domains for status

---

## ✅ Checklist

- [ ] Code pushed to GitHub (ashargreenscore/GS)
- [ ] Railway account created with new GitHub account
- [ ] Project deployed on Railway
- [ ] All environment variables added
- [ ] Custom domain added in Railway
- [ ] DNS configured in GoDaddy
- [ ] Website accessible at greenscore.world

