# 🏗️ Deployment Architecture

## 📐 Vercel Deployment Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR VERCEL PROJECT                       │
│              https://your-project.vercel.app                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Vercel Edge Network   │
              │    (Global CDN/Router)  │
              └─────────────────────────┘
                     │              │
        ┌────────────┘              └────────────┐
        │                                        │
        ▼                                        ▼
┌──────────────────┐                  ┌──────────────────┐
│  FRONTEND ROUTES │                  │  BACKEND ROUTES  │
│    Route: /*     │                  │   Route: /api/*  │
└──────────────────┘                  └──────────────────┘
        │                                        │
        ▼                                        ▼
┌──────────────────┐                  ┌──────────────────┐
│  Static Files    │                  │ Serverless API   │
│  (Frontend/dist) │                  │ (Backend/index.js)│
│                  │                  │                  │
│  • index.html    │                  │  • Express App   │
│  • main.js       │                  │  • MongoDB       │
│  • styles.css    │                  │  • Zoho API      │
│  • assets/       │                  │  • All Endpoints │
└──────────────────┘                  └──────────────────┘
        │                                        │
        │                                        │
        ▼                                        ▼
┌──────────────────┐                  ┌──────────────────┐
│  User's Browser  │◄────API Calls────┤  MongoDB Atlas   │
│  (React App)     │                  │  (Database)      │
└──────────────────┘                  └──────────────────┘
```

---

## 🔄 Request Flow

### Frontend Request (e.g., `/` or `/clients`)

```
User Browser
    │
    ├─► Request: https://your-project.vercel.app/
    │
    ▼
Vercel Edge Network (CDN)
    │
    ├─► Match Route: /*
    │
    ▼
Serve Static File: Frontend/dist/index.html
    │
    ▼
React App Loads in Browser
```

### API Request (e.g., `/api/webhook-handler`)

```
React App (Frontend)
    │
    ├─► API Call: fetch('/api/webhook-handler')
    │
    ▼
Vercel Edge Network
    │
    ├─► Match Route: /api/*
    │
    ▼
Serverless Function (Backend/index.js)
    │
    ├─► Execute Express Route Handler
    │   │
    │   ├─► Connect to MongoDB
    │   ├─► Fetch/Process Data
    │   ├─► Call Zoho API (if needed)
    │   │
    │   ▼
    │   Return JSON Response
    │
    ▼
Response to React App
    │
    ▼
Update UI
```

---

## 📦 Build Process

### What Happens When You Deploy

```
1. Push Code to Git
   │
   ▼
2. Vercel Detects Push
   │
   ▼
3. Start Build Process
   │
   ├─► Install Dependencies
   │   ├─► Backend: npm install
   │   └─► Frontend: npm install
   │
   ├─► Build Frontend
   │   ├─► Run: npm run build
   │   ├─► Output: Frontend/dist/
   │   └─► Files: HTML, JS, CSS, Assets
   │
   ├─► Prepare Backend
   │   ├─► Wrap Express app
   │   ├─► Create serverless function
   │   └─► Bundle dependencies
   │
   ▼
4. Deploy to Global Network
   │
   ├─► Frontend → CDN Edge Nodes (Worldwide)
   └─► Backend → Serverless Regions (Worldwide)
   │
   ▼
5. Live at: https://your-project.vercel.app
```

---

## 🌍 Global Distribution

### Edge Network Locations

Your app is deployed to multiple regions worldwide:

```
              🌐 Global Coverage

    North America        Europe          Asia Pacific
    ──────────────      ────────        ──────────────
    • USA (East)        • Frankfurt     • Tokyo
    • USA (West)        • London        • Singapore
    • Canada            • Paris         • Sydney
                        • Amsterdam     • Mumbai
```

**Benefits:**
- ⚡ Fast load times globally
- 🔄 Auto-scaling based on traffic
- 🛡️ Built-in DDoS protection
- 🔒 Free SSL/HTTPS

---

## 💾 Data Flow

### Database Connection

```
Serverless Function (Your Backend)
    │
    ├─► Connection Pool
    │   │
    │   ├─► Reuse existing connections
    │   ├─► Create new if needed
    │   └─► Close after timeout
    │
    ▼
MongoDB Atlas (Cloud Database)
    │
    ├─► Collections:
    │   ├─► properties
    │   ├─► UserData
    │   └─► ClientAgentAssignments
    │
    ▼
Return Data to Function
    │
    ▼
Function Returns JSON to Frontend
```

---

## 🔐 Environment Variables

### How They're Managed

```
Vercel Dashboard
    │
    ├─► Environment Variables Panel
    │   │
    │   ├─► Production Variables
    │   ├─► Preview Variables
    │   └─► Development Variables
    │
    ▼
Injected at Runtime
    │
    ├─► Available as: process.env.VARIABLE_NAME
    │
    ▼
Used in Backend Code
    │
    ├─► MongoDB Connection
    ├─► Zoho API Credentials
    └─► Other Secrets
```

**Security:**
- ✅ Never in source code
- ✅ Encrypted at rest
- ✅ Only accessible by your functions
- ✅ Different per environment

---

## 🚀 Scaling Behavior

### How Your App Scales

```
Low Traffic (0-10 req/s)
┌─────────────────┐
│  1-2 Functions  │ → Minimal cost
└─────────────────┘

Medium Traffic (10-100 req/s)
┌─────────────────┐
│  10-20 Functions│ → Auto-scale
└─────────────────┘

High Traffic (100+ req/s)
┌──────────────────────┐
│  100+ Functions      │ → Keep scaling
└──────────────────────┘
```

**Key Points:**
- 🔄 Automatic scaling
- 💰 Pay per request
- ⚡ No server management
- 🎯 Always available

---

## 🔗 Frontend ↔ Backend Communication

### Development (Local)

```
Frontend (localhost:5173)
    │
    ├─► Vite Dev Server Proxy
    │   │
    │   ├─► /api/* → http://localhost:3000/api/*
    │
    ▼
Backend (localhost:3000)
    │
    └─► Express Server
```

### Production (Vercel)

```
Frontend (your-project.vercel.app)
    │
    ├─► Same Domain Request
    │   │
    │   ├─► /api/* → Routed by Vercel
    │
    ▼
Backend (serverless function)
    │
    └─► Same domain, no CORS issues
```

**Benefits:**
- ✅ Same origin (no CORS issues)
- ✅ Shared cookies/sessions
- ✅ Simple configuration
- ✅ Better security

---

## 📊 Performance Characteristics

### Frontend (Static Files)

```
Initial Load: ~500ms - 2s
├─► HTML: <100ms (Cached)
├─► JS: 200-500ms (Cached)
├─► CSS: <100ms (Cached)
└─► Assets: Variable (Cached)

Subsequent Loads: <100ms (Cached)
```

### Backend (Serverless Functions)

```
Cold Start: 100-500ms
├─► Initialize Node.js
├─► Load Dependencies
├─► Connect to MongoDB
└─► Execute Handler

Warm Start: 10-50ms
├─► Function already initialized
├─► Connection pooling
└─► Fast execution
```

**Optimization Tips:**
- Keep dependencies minimal
- Use connection pooling
- Cache MongoDB connections
- Optimize cold starts

---

## 🔄 Deployment Lifecycle

### Continuous Deployment

```
1. Code Change
   │
   ├─► Developer pushes to Git
   │
   ▼
2. Trigger Build
   │
   ├─► Vercel webhook detects push
   │
   ▼
3. Build & Test
   │
   ├─► Install dependencies
   ├─► Build frontend
   ├─► Run tests (if configured)
   │
   ▼
4. Deploy
   │
   ├─► Upload to CDN
   ├─► Deploy functions
   │
   ▼
5. Live
   │
   ├─► Zero downtime
   ├─► Atomic deployment
   │
   ▼
6. Health Checks
   │
   └─► Verify deployment
```

**Features:**
- ⚡ Automated
- 🔄 Zero downtime
- 🎯 Instant rollback
- 📊 Deployment logs

---

## 📈 Monitoring & Logs

### What You Can Monitor

```
Vercel Dashboard
    │
    ├─► Real-time Logs
    │   ├─► Function execution logs
    │   ├─► Error logs
    │   └─► Request logs
    │
    ├─► Analytics
    │   ├─► Request count
    │   ├─► Response times
    │   └─► Error rates
    │
    └─► Performance
        ├─► Cold start times
        ├─► Function duration
        └─► Bandwidth usage
```

---

## 🎯 Summary

### Key Takeaways

1. **Frontend + Backend** = Same Domain ✅
2. **Auto-scaling** = Handle any traffic ✅
3. **Global CDN** = Fast worldwide ✅
4. **Zero Config** = Just deploy ✅
5. **Pay per Use** = Cost effective ✅

### Your App Structure

```
https://your-project.vercel.app/
├── /                  → React App (Frontend)
├── /clients           → React App (Frontend)
├── /signin            → React App (Frontend)
│
├── /api/health        → Express API (Backend)
├── /api/clients       → Express API (Backend)
├── /api/properties    → Express API (Backend)
└── /api/*             → All API routes (Backend)
```

---

**Ready to deploy?** 🚀

Check out `QUICK_START.md` for deployment instructions!

