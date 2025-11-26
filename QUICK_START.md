# 🚀 Quick Start - Deploy to Vercel

## ✅ Your repo is now ready for Vercel deployment!

### What's been configured:
1. ✅ Backend configured as serverless functions
2. ✅ Frontend build setup
3. ✅ API routing configured
4. ✅ CORS updated to accept Vercel domains

---

## 🎯 Deploy Now (3 Simple Steps)

### Option 1: Via Vercel Dashboard (Easiest)

1. **Go to:** https://vercel.com/new
2. **Import your Git repository** (GitHub/GitLab/Bitbucket)
3. **Configure:**
   - **Root Directory:** `ExpertDashboard`
   - **Framework Preset:** Other
   - **Add Environment Variables** (see below)
4. **Click Deploy** 🚀

### Option 2: Via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to project
cd ExpertDashboard

# Login
vercel login

# Deploy
vercel --prod
```

---

## 🔐 Required Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```
NODE_ENV=production
PORT=3000
ZOHO_ACCESS_TOKEN=your_token
ZOHO_REFRESH_TOKEN=your_token
ZOHO_CLIENT_ID=your_id
ZOHO_CLIENT_SECRET=your_secret
ZOHO_API_DOMAIN=https://www.zohoapis.in
ZOHO_MODULE=Leads
```

---

## 🌐 After Deployment

Your app will be available at: `https://your-project.vercel.app`

- **Frontend:** `https://your-project.vercel.app/`
- **Backend API:** `https://your-project.vercel.app/api/*`

### Test Your Backend:
```bash
curl https://your-project.vercel.app/api/health
```

Should return:
```json
{
  "status": "OK",
  "timestamp": "...",
  "mongodb": "connected"
}
```

---

## ❓ Need Help?

Check `DEPLOYMENT_GUIDE.md` for detailed instructions and troubleshooting.

---

## ✨ Features

✅ **Auto-scaling** - Handles any traffic  
✅ **HTTPS** - Free SSL certificates  
✅ **Global CDN** - Fast worldwide  
✅ **Auto-deploy** - Push to deploy  
✅ **Preview URLs** - Every branch gets a URL  
✅ **Instant Rollbacks** - Undo any deployment  

---

**That's it! You're ready to deploy!** 🎉

