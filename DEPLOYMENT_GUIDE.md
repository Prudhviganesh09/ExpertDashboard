# Vercel Deployment Guide

## Overview
This guide will help you deploy both your **Frontend (React/Vite)** and **Backend (Express API)** to Vercel.

## ✅ What's Been Configured

1. **vercel.json** - Main configuration file that tells Vercel how to build and deploy both frontend and backend
2. **Backend/vercel.json** - Backend-specific configuration for serverless functions
3. **Backend/index.js** - Modified to export the Express app for Vercel serverless environment
4. **Frontend API config** - Updated to use relative paths (`/api`) that work in both development and production

## 📋 Deployment Steps

### 1. Install Vercel CLI (Optional, but recommended for testing)
```bash
npm install -g vercel
```

### 2. Deploy via Vercel Dashboard (Recommended)

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Click "Add New Project"**
3. **Import your Git repository** (GitHub, GitLab, or Bitbucket)
4. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `ExpertDashboard` (important!)
   - **Build Command:** Leave default (Vercel will use the config from vercel.json)
   - **Output Directory:** Leave default

5. **Add Environment Variables** (Critical!):
   ```
   NODE_ENV=production
   PORT=3000
   ZOHO_ACCESS_TOKEN=your_token_here
   ZOHO_REFRESH_TOKEN=your_token_here
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_secret_here
   ZOHO_API_DOMAIN=https://www.zohoapis.in
   ZOHO_MODULE=Leads
   ```

6. **Click "Deploy"**

### 3. Deploy via Vercel CLI (Alternative)

```bash
# Navigate to the ExpertDashboard directory
cd ExpertDashboard

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

## 🌐 How It Works

### URL Structure After Deployment

Your app will be deployed to: `https://your-project-name.vercel.app`

- **Frontend:** `https://your-project-name.vercel.app/`
- **Backend API:** `https://your-project-name.vercel.app/api/*`

### Example API Endpoints
- `https://your-project-name.vercel.app/api/health`
- `https://your-project-name.vercel.app/api/webhook-handler`
- `https://your-project-name.vercel.app/api/clients/:id`

## ⚙️ Configuration Details

### Frontend Build
- **Framework:** Vite + React + TypeScript
- **Output Directory:** `Frontend/dist`
- **Build Command:** `npm run build` (runs in Frontend directory)

### Backend Deployment
- **Type:** Serverless Functions
- **Entry Point:** `Backend/index.js`
- **Runtime:** Node.js

The backend Express app is converted to a serverless function that runs on-demand. Vercel automatically handles:
- Auto-scaling
- Cold starts
- Request routing
- HTTPS certificates

## 🔧 Important Configuration Changes Made

1. **Backend/index.js:**
   - Exports the Express app as `module.exports = app`
   - Only starts the local server in development mode
   - Compatible with Vercel's serverless environment

2. **Frontend API Config:**
   - Uses relative paths (`/api`) for all API calls
   - Works in both development (via Vite proxy) and production (via Vercel routing)

3. **CORS Configuration:**
   - Your backend already has CORS configured
   - Add your Vercel domain to the `allowedOrigins` array in `Backend/index.js`:
     ```javascript
     const allowedOrigins = [
         // ... existing origins
         'https://your-project-name.vercel.app'
     ];
     ```

## 🔐 Environment Variables

Make sure to add all required environment variables in Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all the variables from your `.env` file

## 🧪 Testing Your Deployment

1. **Check Frontend:**
   - Visit: `https://your-project-name.vercel.app`
   - Should load your React app

2. **Check Backend:**
   - Visit: `https://your-project-name.vercel.app/api/health`
   - Should return: `{"status":"OK","timestamp":"...","mongodb":"connected"}`

3. **Check API Integration:**
   - Login to your app
   - Try fetching clients
   - All API calls should work seamlessly

## 🐛 Troubleshooting

### Backend API not working
- Check environment variables are set correctly
- Check Vercel function logs in the dashboard
- Ensure MongoDB connection string is correct

### Frontend loads but API calls fail
- Check browser console for CORS errors
- Verify the API endpoints are using `/api` prefix
- Check that your Vercel domain is in the CORS `allowedOrigins`

### Build Failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility

## 📊 Monitoring

- **View Logs:** Vercel Dashboard → Your Project → Functions
- **View Analytics:** Vercel Dashboard → Your Project → Analytics
- **View Deployments:** Vercel Dashboard → Your Project → Deployments

## 🚀 Redeployment

Vercel automatically redeploys when you:
- Push to your main/master branch (if connected via Git)
- Run `vercel --prod` from CLI

## 💡 Tips

1. **Custom Domain:** You can add a custom domain in Vercel project settings
2. **Preview Deployments:** Every branch gets its own preview URL
3. **Rollbacks:** You can instantly rollback to any previous deployment
4. **Logs:** Check function logs for debugging API issues
5. **Cold Starts:** First request to API might be slow (serverless cold start)

## 📝 Next Steps

After deployment:
1. Test all functionality thoroughly
2. Add your Vercel URL to any external services (Zoho webhooks, etc.)
3. Update any hardcoded URLs to use environment variables
4. Set up monitoring and alerts

## ❓ Questions?

If you encounter issues:
1. Check Vercel function logs
2. Check browser console for frontend errors
3. Verify all environment variables are set
4. Test API endpoints directly using Postman/curl

Happy deploying! 🎉

