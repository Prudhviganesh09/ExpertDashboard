# 🎯 Vercel Deployment - Complete Guide

## 📌 Answer to Your Question

**"Can I see both frontend and backend after deploying on Vercel?"**

✅ **YES!** Both will be deployed and accessible:
- **Frontend:** Your React app at `https://your-project.vercel.app`
- **Backend:** Your Express API at `https://your-project.vercel.app/api/*`

---

## 🔄 What Changed in Your Repo

I've configured your monorepo for Vercel deployment. Here's what was updated:

### 1. **Configuration Files**
- ✅ `vercel.json` - Main Vercel configuration
- ✅ `Backend/vercel.json` - Backend serverless configuration
- ✅ `.vercelignore` - Ignores unnecessary files during deployment

### 2. **Backend Updates** (`Backend/index.js`)
- ✅ Exports Express app for serverless deployment
- ✅ Only starts local server in development mode
- ✅ Added CORS support for all `.vercel.app` domains
- ✅ Compatible with both local development and production

### 3. **Frontend Updates**
- ✅ API config updated to use relative paths (`/api`)
- ✅ Added `vercel-build` script to `package.json`
- ✅ Works seamlessly with backend in production

---

## 🏗️ How It Works

### Local Development (No Changes)
```bash
# Frontend: http://localhost:5173
npm run dev

# Backend: http://localhost:3000
npm run dev:backend
```

### Production on Vercel

When deployed, Vercel will:

1. **Build Frontend:**
   - Runs `npm run build` in `Frontend/` directory
   - Creates static files in `Frontend/dist/`
   - Serves them via global CDN

2. **Deploy Backend:**
   - Converts Express app to serverless functions
   - Each API request triggers a function
   - Auto-scales based on traffic

3. **Route Requests:**
   - Requests to `/api/*` → Backend serverless function
   - All other requests → Frontend static files

---

## 📁 Project Structure on Vercel

```
ExpertDashboard/
├── Frontend/              → Static site
│   ├── dist/              → Built files served to users
│   └── src/               → Source code
│
├── Backend/               → Serverless API
│   ├── index.js           → API endpoints (serverless)
│   └── package.json       → Dependencies
│
└── vercel.json            → Deployment config
```

---

## 🚀 Quick Deploy Guide

### Step 1: Push Your Code
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push origin main
```

### Step 2: Deploy on Vercel

#### Option A: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your repository
4. Configure:
   - **Root Directory:** `ExpertDashboard`
   - **Framework Preset:** Other
5. Add environment variables (see below)
6. Click "Deploy"

#### Option B: Via CLI
```bash
cd ExpertDashboard
npx vercel --prod
```

### Step 3: Add Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```env
NODE_ENV=production
PORT=3000

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# Zoho Integration
ZOHO_ACCESS_TOKEN=your_token
ZOHO_REFRESH_TOKEN=your_token
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_secret
ZOHO_API_DOMAIN=https://www.zohoapis.in
ZOHO_MODULE=Leads
```

---

## 🧪 Testing Your Deployment

### 1. Test Frontend
Visit: `https://your-project.vercel.app`

Should show your React app ✅

### 2. Test Backend Health
```bash
curl https://your-project.vercel.app/api/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-11T...",
  "mongodb": "connected"
}
```

### 3. Test Full Integration
1. Login to your app
2. Try fetching clients
3. Create a new requirement
4. Check if all features work

---

## 🌐 URL Structure

After deployment, your URLs will be:

| Service | URL |
|---------|-----|
| **Frontend** | `https://your-project.vercel.app` |
| **API Health** | `https://your-project.vercel.app/api/health` |
| **Login** | `https://your-project.vercel.app/api/auth/login` |
| **Clients** | `https://your-project.vercel.app/api/webhook-handler` |
| **Properties** | `https://your-project.vercel.app/api/properties-cache` |

---

## 🔧 Key Configuration Details

### CORS Configuration
Your backend now accepts:
- `localhost` (development)
- All `.vercel.app` domains (production)
- Specific domains in `allowedOrigins` array

### API Routing
The `vercel.json` routes:
- `/api/*` → Backend serverless function
- `/*` → Frontend static files

### Serverless Functions
- Each API endpoint becomes a serverless function
- Auto-scales: 0 to millions of requests
- Pay only for actual usage
- Cold start: ~100-500ms for first request

---

## 📊 Monitoring & Logs

### View Function Logs
1. Go to Vercel Dashboard
2. Select your project
3. Click "Functions" tab
4. See real-time logs for each API call

### View Analytics
- Dashboard → Analytics
- See traffic, performance, errors

### View Deployments
- Dashboard → Deployments
- History of all deployments
- Instant rollback to any version

---

## 🐛 Troubleshooting

### Issue: API calls return 404
**Solution:** 
- Check that all API calls use `/api` prefix
- Verify `vercel.json` routing configuration

### Issue: CORS errors
**Solution:**
- Your Vercel domain is auto-accepted (`.vercel.app`)
- Check browser console for specific origin
- Add to `allowedOrigins` if needed

### Issue: Environment variables not working
**Solution:**
- Go to Vercel Dashboard → Settings → Environment Variables
- Ensure all variables are set
- Redeploy after adding variables

### Issue: MongoDB connection fails
**Solution:**
- Check MongoDB connection string
- Ensure MongoDB Atlas allows connections from `0.0.0.0/0`
- Check function logs in Vercel

### Issue: Build fails
**Solution:**
- Check build logs in Vercel
- Ensure all dependencies are in `package.json`
- Test build locally: `cd Frontend && npm run build`

---

## 🎁 Bonus Features

### Auto-Deploy
- Every push to `main` branch → Auto-deploys
- Every PR → Gets preview URL
- No manual deployment needed

### Preview URLs
- Each branch gets its own URL
- Test changes before merging
- Share with team for review

### Instant Rollbacks
- One-click rollback to any previous deployment
- No downtime
- Safe to experiment

### Custom Domain
- Add your own domain in settings
- Free SSL certificates
- Automatic HTTPS

---

## 📝 Development Workflow

### Local Development
```bash
# Terminal 1: Run backend
cd ExpertDashboard/Backend
npm run dev

# Terminal 2: Run frontend
cd ExpertDashboard/Frontend
npm run dev
```

### Deploy to Production
```bash
git add .
git commit -m "Your changes"
git push origin main
# Auto-deploys to Vercel!
```

---

## 💡 Best Practices

1. **Environment Variables:** Never commit secrets to Git
2. **Testing:** Test locally before pushing
3. **Logs:** Check Vercel function logs regularly
4. **Monitoring:** Set up alerts for errors
5. **Rollbacks:** Keep previous versions available

---

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

## 🎉 You're All Set!

Your monorepo is now **fully configured** for Vercel deployment. 

Both your **frontend** and **backend** will be deployed and accessible at the same domain.

**Ready to deploy?** 

👉 Read `QUICK_START.md` for step-by-step instructions  
👉 Read `DEPLOYMENT_GUIDE.md` for detailed documentation

---

**Questions or Issues?** Check the Troubleshooting section above or Vercel's documentation.

Good luck with your deployment! 🚀

