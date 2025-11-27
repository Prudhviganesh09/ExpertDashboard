require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const { addMinutes, parseISO, format, isAfter, isBefore } = require('date-fns');
const { sendAppointmentNotification, sendAppointmentReminder, sendCustomEmail } = require('./emailService');


const app = express();
const PORT = process.env.PORT || 3000;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
let supabaseAdmin = null;

// Use service key if anon key is not available
if (supabaseUrl && (supabaseServiceKey || supabaseAnonKey)) {
    const key = supabaseServiceKey || supabaseAnonKey;
    supabase = createClient(supabaseUrl, key);
    console.log('✅ Supabase client initialized');
    console.log('📊 Supabase URL:', supabaseUrl.replace(/https:\/\/([^.]+)\./, 'https://*****.'));
} else {
    console.warn('⚠️ Supabase credentials not found. Property matching will be unavailable.');
}

if (supabaseUrl && supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase Admin client initialized (for authentication)');
} else {
    console.warn('⚠️ Supabase Service Role key not found. User authentication from Supabase will be unavailable.');
}

// Fallback Pre-Sale users (used when database lookups fail)
const PRE_SALE_USERS = [
    {
        idx: 2,
        id: '887362ef-6ce8-4b4e-a609-8421af161ec8',
        username: 'sindhu',
        email: 'sindhua@relai.world',
        password: '$2b$12$3s6mvByhJhYPyHszAu6Yeuf3UrbvNyaK2ygVaDP57HWxieSW3GT8W',
        role: 'pre-sale',
        created_at: '2025-11-20T06:17:51.451Z'
    }
];

const PRE_SALE_USER_MAP = PRE_SALE_USERS.reduce((acc, user) => {
    if (user.email) {
        acc[user.email.toLowerCase()] = user;
    }
    return acc;
}, {});

const PRE_SALE_EMAILS = new Set([
    ...Object.keys(PRE_SALE_USER_MAP),
    'sindhu@relai.world'
]);

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://subscriptions:Subcribe%40Mongodb@cluster0.vynzql2.mongodb.net/Relai?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'Relai';
const COLLECTION_NAME = 'properties';
const USER_COLLECTION_NAME = 'UserData';
const CLIENT_AGENT_COLLECTION_NAME = 'ClientAgentAssignments';
const REQUIREMENTS_COLLECTION_NAME = 'Requirements';
const EXPERT_MEETINGS_COLLECTION_NAME = 'ExpertMeetings';

let mongoClient = null;

// In-memory storage for properties (cache)
let propertiesCache = [];
let lastCacheUpdate = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Complete list of all location areas (from LOCATION_AREA_MAPPING)
const ALL_LOCATION_AREAS = [
    "Kompally", "Bahadurpally", "Bolarum", "Dulapally", "Jeedimetla", "Quthbullapur",
    "Tellapur", "Gopanpally", "Nallagandla", "Osman Nagar",
    "Kokapet", "Nanakramguda", "Alkapur Main Road", "Financial District", "Gandipet", "Gundlapochampally", "Khajaguda", "Neopolis",
    "Patancheru", "Chitkul", "Isnapur", "Kistareddypet", "Krishna Reddy Pet", "Muthangi", "Ramachandrapuram",
    "Hitec City", "Gachibowli", "Guttala Begumpet", "Hafeezpet", "Kalyan Nagar", "Kondapur", "Kothaguda", "Madhapur",
    "Banjara Hills", "Jubilee Hills",
    "L.B Nagar", "Bandlaguda-Nagole", "Hastinapuram", "Karmanghat", "Kothapet", "Mansoorabad", "Meerpet", "Nagole", "Saidabad",
    "Ghatkesar", "Annojiguda", "Chengicherla", "Keesara", "Pocharam", "Rampally",
    "Shamshabad", "Tukkuguda", "Adibatla", "Budwel", "Kongara Kalan", "Laxmiguda", "Mamidpally", "Rajendra Nagar", "Raviryal", "Shadnagar",
    "Miyapur", "Chandanagar", "Lingampally", "Madeenaguda", "Madinaguda", "Nizampet", "Pragathi Nagar",
    "Abids", "Amberpet", "Ashok Nagar", "Domalaguda", "Himayat Nagar", "Kachiguda", "Kavadiguda", "Lakdikapul", "Nallakunta", "Padmarao Nagar",
    "Alwal", "Kapra", "Kowkur", "Old Bowenpally", "Secunderabad",
    "Appa Junction", "Bandlaguda Jagir", "Gandamguda", "Kismatpur", "Peeramcheru",
    "Attapur", "Mehdipatnam",
    "Ameenpur", "Beeramguda", "Serilingampally",
    "Uppal", "Boduppal", "Habsiguda", "Medipally", "Nacharam", "Narapally", "Peerzadiguda",
    "Hayathnagar", "Bacharam", "Injapur",
    "Ibrahimpatnam", "Mangalpalli", "Manneguda", "Nadergul",
    "Narsingi", "Manchirevula", "Manikonda", "NEKNAMPUR", "Neknampur", "Puppalguda",
    "Chevella", "Rudraram",
    "Shamirpet", "Hakimpet", "Podur",
    "Kukatpally", "Moosapet", "Moti Nagar", "Sanath Nagar",
    "Begumpet", "Punjagutta",
    "Bachupally", "Bollaram", "Bowrampet",
    "Shankarpally",
    "Gandi Maisamma", "Dundigal", "Gagillapur", "Gajularamaram",
    "Medchal", "Gowdavalli", "Kandlakoi", "Kandlakoya",
    "ECIL", "Dammaiguda", "Kamalanagar", "Malkajgiri", "Mallapur", "Moula Ali", "Nagaram", "Sainikpuri",
    "Kollur", "Mokila", "Pati Kollur", "Patighanpur",
    "Kandukur", "Chegur", "Gollur", "Maheshwaram", "Mansanpally"
];

// Initialize MongoDB connection (NON-BLOCKING)
async function connectToMongoDB() {
    try {
        console.log('🔄 Attempting to connect to MongoDB...');
        console.log('MongoDB URI:', MONGODB_URI);
        console.log('Database Name:', DB_NAME);
        console.log('Collection Name:', COLLECTION_NAME);

        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        console.log('✅ Connected to MongoDB successfully!');

        // Test the connection by trying to access the collection
        const db = mongoClient.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Get collection count to verify it exists
        const count = await collection.countDocuments();
        console.log('📊 Collection info:', {
            name: collection.collectionName,
            count: count
        });

        // Try to fetch a sample document
        const sampleDoc = await collection.findOne({});
        if (sampleDoc) {
            console.log('📄 Sample document structure:', Object.keys(sampleDoc));
        } else {
            console.log('⚠️ No documents found in collection');
        }

        return true; // Return success

    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            name: error.name
        });

        // Don't throw error - let the server continue running
        mongoClient = null;
        return false;
    }
}

// MongoDB connection with retry logic
async function connectWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        const success = await connectToMongoDB();
        if (success) {
            // Pre-cache properties after successful connection
            fetchAndCacheProperties();
            return true;
        }

        console.log(`🔄 Retrying MongoDB connection (${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }
    console.error('❌ Failed to connect to MongoDB after all retries');
    return false;
}

// Add process error handlers
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Error stack:', error.stack);

    // Handle path-to-regexp errors specifically
    if (error.message && error.message.includes('Missing parameter name')) {
        console.error('🔍 Path-to-regexp error detected. This indicates a malformed route parameter.');
        console.error('🔍 This usually happens when a request contains an invalid URL format.');
        console.error('🔍 Check the request logs above for the problematic URL.');

        // Additional debugging for path-to-regexp errors
        if (error.stack) {
            const stackLines = error.stack.split('\n');
            for (const line of stackLines) {
                if (line.includes('path-to-regexp') || line.includes('parse')) {
                    console.error('🔍 Path-to-regexp stack trace:', line.trim());
                }
            }
        }

        // Log additional context about the error
        console.error('🔍 Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack
        });
    }

    // Don't exit the process for path-to-regexp errors, let the server continue
    if (error.message && error.message.includes('Missing parameter name')) {
        console.log('🔄 Server will continue running despite path-to-regexp error');
        return;
    }

    // For other critical errors, exit the process
    console.error('💥 Critical error detected, exiting process...');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process, just log the error
});

// Function to fetch and cache all properties from MongoDB
async function fetchAndCacheProperties() {
    try {
        if (!mongoClient) {
            console.log('MongoDB client not available for caching properties');
            return;
        }

        const db = mongoClient.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        console.log('🔄 Fetching all properties from MongoDB for caching...');

        // First, let's see what's actually in the collection
        const totalCount = await collection.countDocuments();
        console.log(`📊 Total documents in collection: ${totalCount}`);

        // Get a sample document to understand the structure
        const sampleDoc = await collection.findOne({});
        if (sampleDoc) {
            // console.log('📄 Sample document structure:', Object.keys(sampleDoc));
            // console.log('📄 Sample document:', JSON.stringify(sampleDoc, null, 2));
        }

        // Fetch all properties with more fields to understand the structure
        const properties = await collection.find({}).toArray();
        console.log(`📋 Found ${properties.length} properties in database`);

        // Map properties with better field detection
        propertiesCache = properties.map(property => {
            // Clean ProjectName - remove trailing commas and extra spaces
            let projectName = property.ProjectName || property.projectName || property.PROJECTNAME || '';
            if (projectName) {
                projectName = projectName.replace(/,\s*$/, '').trim(); // Remove trailing comma and spaces
            }

            const mappedProperty = {
                _id: property._id.toString(),
                projectName: projectName,
                builderName: property.BuilderName || property.builderName || property.BUILDERNAME,
                reraNumber: property.RERA_Number || property.reraNumber || property.RERANUMBER,
                areaName: property.AreaName || property.areaName || property.AREANAME,
                priceSheet: property.PriceSheet || property.priceSheet || property.PRICESHEET,
                possessionDate: property.Possession_Date || property.possessionDate || property.POSSESSIONDATE,
                // Keep backward compatibility fields
                name: projectName,
                title: projectName,
                propertyName: projectName
            };

            // Log the first few properties for debugging
            if (properties.indexOf(property) < 3) {
                console.log(`📝 Mapped property ${properties.indexOf(property) + 1}:`, mappedProperty);
            }

            return mappedProperty;
        });

        lastCacheUpdate = Date.now();
        console.log(`✅ Cached ${propertiesCache.length} properties successfully!`);

        // Log some sample properties for debugging
        if (propertiesCache.length > 0) {
            console.log('🎯 Sample cached properties:');
            propertiesCache.slice(0, 3).forEach((prop, index) => {
                console.log(`  ${index + 1}. ID: ${prop._id}, Name: ${prop.name}, Title: ${prop.title}, ProjectName: ${prop.projectName}`);
            });
        }

    } catch (error) {
        console.error('❌ Error fetching properties for cache:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            name: error.name,
            stack: error.stack
        });
    }
}

// Function to get cached properties (with auto-refresh)
async function getCachedProperties() {
    const now = Date.now();

    // Refresh cache if it's expired or empty
    if (!lastCacheUpdate || (now - lastCacheUpdate) > CACHE_DURATION || propertiesCache.length === 0) {
        await fetchAndCacheProperties();
    }

    return propertiesCache;
}

// Enable CORS with specific configuration
const allowedOrigins = [
    'https://a94fe4db-9b5a-4ea7-a149-22b96a7e3357-00-21cu2qt43xjzy.sisko.replit.dev:5000',
    'https://expert-dashboard-connect153.replit.app',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'https://expert.relai.world',
    'https://expertise-dashboard-azure.vercel.app',
    'https://expert-dashboard-ten.vercel.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        console.log('CORS checking origin:', origin);
        console.log('Allowed origins:', allowedOrigins);
        // Allow requests with no origin (like Postman) or from any Replit domain or localhost
        if (!origin ||
            origin.includes('replit.dev') ||
            origin.includes('replit.app') ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1') ||
            allowedOrigins.indexOf(origin) !== -1) {
            console.log('✅ CORS allowing origin:', origin);
            callback(null, true);
        } else {
            console.log('❌ CORS blocked origin:', origin);
            console.log('Origin not found in allowed origins list');
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-Forwarded-For', 'X-Real-IP'],
    preflightContinue: false,
    optionsSuccessStatus: 200,
    exposedHeaders: ['Content-Type', 'Authorization', 'X-Total-Count'],
    maxAge: 86400 // Cache preflight response for 24 hours
};

app.use(cors(corsOptions));
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
    try {
        // Validate the request path to prevent path-to-regexp errors
        if (req.path && typeof req.path === 'string') {
            // Check for malformed URL patterns that could cause path-to-regexp issues
            if (req.path.includes('//') || req.path.includes('%00') || req.path.includes('\\')) {
                console.error('🚨 Malformed URL detected:', req.path);
                return res.status(400).json({
                    error: 'Invalid URL format',
                    message: 'The requested URL contains invalid characters'
                });
            }

            // Additional validation for route parameters
            if (req.path.includes(':')) {
                console.log('🔍 Route with parameter detected:', req.path);
            }
        }

        // Log additional request details for debugging
        console.log(`🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'No origin'} - URL: ${req.url} - Original URL: ${req.originalUrl}`);

        // Log headers that might be relevant
        if (req.headers['user-agent']) {
            console.log(`🔍 User-Agent: ${req.headers['user-agent']}`);
        }

        next();
    } catch (error) {
        console.error('🚨 Error in request logging middleware:', error);
        next(error);
    }
});

// Handle preflight requests for login routes
app.options('/api/user/login', cors(corsOptions));
app.options('/api/auth/login', cors(corsOptions));

// Handle preflight requests for all API routes
// Note: Wildcard routes can cause path-to-regexp issues
// Individual route preflight handlers are sufficient

// CORS error handler
app.use((err, req, res, next) => {
    if (err.message === 'Not allowed by CORS') {
        console.error('❌ CORS Error:', {
            origin: req.headers.origin,
            method: req.method,
            path: req.path,
            allowedOrigins: allowedOrigins
        });
        res.status(403).json({
            error: 'CORS policy violation',
            message: 'Origin not allowed',
            origin: req.headers.origin,
            allowedOrigins: allowedOrigins
        });
    } else {
        next(err);
    }
});

// Temporarily disabled custom middleware to debug path-to-regexp error

// Serve static files from the Frontend/dist directory (if it exists)
const frontendDistPath = path.join(__dirname, '../Frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    app.use(express.static(frontendDistPath));
    console.log('✅ Frontend static files served from:', frontendDistPath);
} else {
    console.log('⚠️ Frontend dist directory not found, static file serving disabled');
    console.log('📁 Expected path:', frontendDistPath);
}

// Temporarily disabled all custom middleware to debug path-to-regexp error

// Health check endpoint for deployment
app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Basic health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        mongodb: mongoClient ? 'connected' : 'disconnected'
    });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
    res.status(200).json({
        message: 'CORS is working!',
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
    });
});

// Authentication middleware removed - no JWT tokens needed

// ====== Config from .env =======
// Zoho integration configuration
let currentAccessToken = process.env.ZOHO_ACCESS_TOKEN;
const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
const clientId = process.env.ZOHO_CLIENT_ID;
const clientSecret = process.env.ZOHO_CLIENT_SECRET;
const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.in';
const ZOHO_MODULE = process.env.ZOHO_MODULE || 'Leads';
const ZOHO_BASE_URL = `${ZOHO_API_DOMAIN}/crm/v2/${ZOHO_MODULE}`;

// Track last token refresh to prevent rate limiting
let lastTokenRefreshTime = 0;
const TOKEN_REFRESH_COOLDOWN = 60000;

// ====== Helper: Token Refresh =======
async function refreshZohoToken() {
    try {
        const now = Date.now();
        const timeSinceLastRefresh = now - lastTokenRefreshTime;

        if (timeSinceLastRefresh < TOKEN_REFRESH_COOLDOWN) {
            const waitTime = Math.ceil((TOKEN_REFRESH_COOLDOWN - timeSinceLastRefresh) / 1000);
            console.log(`⏳ Token refresh cooldown active. Please wait ${waitTime} seconds before retrying.`);
            throw new Error(`Token refresh rate limited. Please wait ${waitTime} seconds and try again.`);
        }

        console.log('🔄 Attempting to refresh Zoho access token...');

        const params = new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token'
        });

        const response = await axios.post('https://accounts.zoho.in/oauth/v2/token', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        console.log('✅ Zoho Refresh Response received');
        currentAccessToken = response.data.access_token;
        lastTokenRefreshTime = now;
        console.log('🔄 Zoho access token refreshed successfully!');
        return currentAccessToken;
    } catch (error) {
        console.error('❌ Failed to refresh Zoho token:', error.response?.data || error.message);

        if (error.response?.data?.error === 'Access Denied') {
            throw new Error('Zoho API rate limit exceeded. Please wait a few minutes and try again.');
        }

        throw new Error('Failed to refresh Zoho access token.');
    }
}

// ====== Helper: Zoho API GET (with auto-refresh) =======
async function zohoApiGet(url, params = {}) {
    try {
        return await axios.get(url, {
            headers: { 'Authorization': `Zoho-oauthtoken ${currentAccessToken}` },
            params
        });
    } catch (err) {
        const isTokenError = err.response && (
            err.response.status === 401 ||
            err.response.data?.code === 'INVALID_TOKEN' ||
            err.response.data?.code === 'INVALID_OAUTHTOKEN'
        );

        if (isTokenError) {
            console.log('🔄 Token error detected, refreshing token...');
            await refreshZohoToken();
            // Retry once with new token
            return await axios.get(url, {
                headers: { 'Authorization': `Zoho-oauthtoken ${currentAccessToken}` },
                params
            });
        }
        throw err;
    }
}

// ====== Helper: Zoho API PUT (with auto-refresh) =======
async function zohoApiPut(url, data) {
    try {
        return await axios.put(url, data, {
            headers: {
                'Authorization': `Zoho-oauthtoken ${currentAccessToken}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (err) {
        const isTokenError = err.response && (
            err.response.status === 401 ||
            err.response.data?.code === 'INVALID_TOKEN' ||
            err.response.data?.code === 'INVALID_OAUTHTOKEN'
        );

        if (isTokenError) {
            console.log('🔄 Token error detected, refreshing token...');
            await refreshZohoToken();
            // Retry once with new token
            return await axios.put(url, data, {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${currentAccessToken}`,
                    'Content-Type': 'application/json'
                }
            });
        }
        throw err;
    }
}

// ====== Helper: Find Zoho Lead ID by Mobile Number =======
async function findZohoLeadIdByMobile(mobileNumber) {
    try {
        if (!mobileNumber || typeof mobileNumber !== 'string') {
            console.log(`⚠️ Invalid mobile number provided: ${mobileNumber}`);
            return null;
        }

        console.log(`🔍 Searching for Zoho lead with mobile: ${mobileNumber}`);

        if (!refreshToken && !currentAccessToken) {
            console.log('⚠️ Zoho credentials not configured, skipping lead search');
            return null;
        }

        // Ensure we have an access token (refresh if needed)
        if (!currentAccessToken && refreshToken) {
            console.log('🔄 No current access token, refreshing...');
            await refreshZohoToken();
        }

        // Sanitize mobile number - remove spaces, hyphens, and country code prefix if present
        const sanitizedMobile = mobileNumber.replace(/[\s\-+]/g, '');
        console.log(`📱 Sanitized mobile number: ${sanitizedMobile}`);

        const ZOHO_SEARCH_URL = `${ZOHO_API_DOMAIN}/crm/v2/Leads/search`;

        // Try exact match first
        let response = await zohoApiGet(ZOHO_SEARCH_URL, {
            criteria: `(Mobile:equals:${sanitizedMobile})`,
            per_page: 1
        });

        let leads = response.data.data || [];

        // If no exact match and mobile has country code, try without it
        if (leads.length === 0 && sanitizedMobile.startsWith('91') && sanitizedMobile.length > 10) {
            const mobileWithoutCountryCode = sanitizedMobile.substring(2);
            console.log(`🔍 Trying without country code: ${mobileWithoutCountryCode}`);

            response = await zohoApiGet(ZOHO_SEARCH_URL, {
                criteria: `(Mobile:equals:${mobileWithoutCountryCode})`,
                per_page: 1
            });

            leads = response.data.data || [];
        }

        if (leads.length > 0) {
            console.log(`✅ Found Zoho lead ID: ${leads[0].id} for mobile: ${sanitizedMobile}`);
            return leads[0].id;
        } else {
            console.log(`⚠️ No Zoho lead found for mobile: ${sanitizedMobile}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error searching for Zoho lead by mobile:`, error.response?.data || error.message);
        return null;
    }
}

// ====== Helper: Format Latest Requirement =======
function formatLatestRequirement(rawData) {
    const parts = [];

    // Helper to check if a value is meaningful (not a placeholder)
    const isMeaningful = (value) => {
        if (!value) return false;
        if (typeof value === 'string') {
            const normalized = value.toLowerCase().trim();
            return normalized !== 'not specified' &&
                normalized !== 'not decided yet' &&
                normalized !== '' &&
                normalized !== 'n/a';
        }
        return true;
    };

    // Always include property type if provided and meaningful
    if (isMeaningful(rawData.propertyType)) {
        parts.push(`Property Type: ${rawData.propertyType}`);
    }

    // Use configurations array (more reliable than formatted string)
    if (rawData.configurationsArray && rawData.configurationsArray.length > 0) {
        parts.push(`Configuration: ${rawData.configurationsArray.join(', ')}`);
    } else if (isMeaningful(rawData.configuration)) {
        parts.push(`Configuration: ${rawData.configuration}`);
    }

    // Use locations array (more reliable than formatted string)
    if (rawData.locationsArray && rawData.locationsArray.length > 0) {
        parts.push(`Location: ${rawData.locationsArray.join(', ')}`);
    } else if (isMeaningful(rawData.location)) {
        parts.push(`Location: ${rawData.location}`);
    }

    // Format budget from numeric values - validate they are actually numbers
    const budgetMinNum = Number(rawData.budgetMin);
    const budgetMaxNum = Number(rawData.budgetMax);

    if (!isNaN(budgetMinNum) && budgetMinNum > 0) {
        const budgetMax = !isNaN(budgetMaxNum) && budgetMaxNum > 0 ? budgetMaxNum : budgetMinNum;
        const minCr = (budgetMinNum / 10000000).toFixed(2);
        const maxCr = (budgetMax / 10000000).toFixed(2);
        if (minCr === maxCr) {
            parts.push(`Budget: ₹${minCr}Cr`);
        } else {
            parts.push(`Budget: ₹${minCr}Cr - ₹${maxCr}Cr`);
        }
    } else if (isMeaningful(rawData.budgetRange)) {
        parts.push(`Budget: ${rawData.budgetRange}`);
    }

    // Include possession if provided and meaningful
    if (isMeaningful(rawData.possession)) {
        parts.push(`Possession: ${rawData.possession}`);
    } else if (isMeaningful(rawData.possessionTimeline)) {
        parts.push(`Possession: ${rawData.possessionTimeline}`);
    }

    // Include property size if provided - validate they are numbers
    const sizeMinNum = Number(rawData.sizeMin);
    const sizeMaxNum = Number(rawData.sizeMax);

    if (!isNaN(sizeMinNum) && sizeMinNum > 0 && !isNaN(sizeMaxNum) && sizeMaxNum > 0) {
        parts.push(`Size: ${sizeMinNum}-${sizeMaxNum} SqFt`);
    } else if (isMeaningful(rawData.propertySize)) {
        parts.push(`Size: ${rawData.propertySize}`);
    }

    // Include financing option if provided and meaningful
    if (isMeaningful(rawData.financingOption)) {
        parts.push(`Financing: ${rawData.financingOption}`);
    }

    // Include GST & Registration preference
    if (rawData.includeGSTRegistration !== undefined && rawData.includeGSTRegistration !== null) {
        const gstValue = rawData.includeGSTRegistration === true || rawData.includeGSTRegistration === 'Yes' ? 'Yes' : 'No';
        parts.push(`GST & Registration: ${gstValue}`);
    }

    // Always include matched property count if available and is a valid number
    const matchedCount = Number(rawData.matchedPropertyCount);
    if (!isNaN(matchedCount) && matchedCount >= 0) {
        parts.push(`Matched Properties: ${matchedCount}`);
    }

    // If no parts were added, return a default message indicating requirement was created
    if (parts.length === 0) {
        return 'Requirement created (details not specified)';
    }

    return parts.join(', ');
}

// ====== Helper: Update Zoho Lead Preferences =======
async function updateZohoLeadPreferences(leadId, preferences, rawData = null) {
    try {
        console.log(`📝 Updating Zoho lead ${leadId} with preferences:`, preferences);

        if (!refreshToken && !currentAccessToken) {
            console.log('⚠️ Zoho credentials not configured, skipping preference update');
            return { success: false, message: 'Zoho not configured' };
        }

        // Ensure we have an access token (refresh if needed)
        if (!currentAccessToken && refreshToken) {
            console.log('🔄 No current access token, refreshing...');
            await refreshZohoToken();
        }

        // Use rawData if provided, otherwise fall back to preferences
        const dataForFormatting = rawData || preferences;
        const latestRequirement = formatLatestRequirement(dataForFormatting);

        console.log(`📋 Formatted Latest_Requirement: "${latestRequirement}"`);

        const updateData = {
            data: [{
                id: leadId,
                Budget: preferences.budget || '',
                Property_Type: preferences.propertyType || '',
                Possession_Dates: preferences.possessionTimeline || '',
                Location: preferences.location || '',
                Configuration: preferences.configuration || '',
                Property_Size: preferences.propertySize || '',
                MatchedPropertyCount: preferences.matchedPropertyCount ? String(preferences.matchedPropertyCount) : '',
                OTP_Loan: preferences.financingOption || '',
                including_GST_and_Registration: preferences.includeGSTRegistration || '',
                Lastest_Requirement: latestRequirement
            }]
        };

        console.log('📤 Zoho update payload:', JSON.stringify(updateData, null, 2));

        const ZOHO_UPDATE_URL = `${ZOHO_API_DOMAIN}/crm/v2/Leads`;
        const response = await zohoApiPut(ZOHO_UPDATE_URL, updateData);

        console.log('✅ Zoho lead preferences updated successfully');
        console.log(`✅ Lastest_Requirement saved to Zoho: "${latestRequirement}"`);
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Error updating Zoho lead preferences:', error.response?.data || error.message);
        console.error('❌ Failed to update Lastest_Requirement field in Zoho');
        return { success: false, error: error.message };
    }
}

// ====== Authentication Endpoints =======

// Login endpoint (original)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!mongoClient) {
            return res.status(503).json({ error: 'Database connection not available. Please try again later.' });
        }

        const db = mongoClient.db(DB_NAME);
        const userCollection = db.collection(USER_COLLECTION_NAME);

        // Find user by email
        const user = await userCollection.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare password with hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id.toString(),
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        if (!mongoClient) {
            return res.status(503).json({ error: 'Database connection not available. Please try again later.' });
        }

        const db = mongoClient.db(DB_NAME);
        const userCollection = db.collection(USER_COLLECTION_NAME);

        // Check if user already exists
        const existingUser = await userCollection.findOne({
            $or: [
                { email: email.toLowerCase() },
                { username: username.toLowerCase() }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                error: existingUser.email === email.toLowerCase() ?
                    'Email already exists' : 'Username already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = {
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            createdAt: new Date()
        };

        const result = await userCollection.insertOne(newUser);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: result.insertedId.toString(),
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint (alternative path) - ONLY SUPABASE UsersData
app.post('/api/user/login', async (req, res) => {
    try {
        console.log('🔐 Login attempt received:', {
            email: req.body.email,
            hasPassword: !!req.body.password,
            bodyKeys: Object.keys(req.body)
        });

        const { email, password } = req.body;

        if (!email || !password) {
            console.log('❌ Missing email or password');
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // ONLY USE SUPABASE UsersData table
        if (!supabaseAdmin) {
            console.log('❌ Supabase not configured');
            return res.status(503).json({ error: 'Authentication service unavailable' });
        }

        console.log('🔍 Searching for user in Supabase UsersData:', email.toLowerCase());
        const { data: user, error } = await supabaseAdmin
            .from('UsersData')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error || !user) {
            console.log('❌ User not found in Supabase:', email.toLowerCase());
            if (error && error.code !== 'PGRST116') {
                console.log('❌ Supabase query error:', error);
            }
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log('✅ User found in Supabase:', {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            hasPassword: !!user.password
        });

        // Compare password with hashed password
        console.log('🔐 Comparing passwords...');
        console.log('🔐 Input password length:', password.length);
        console.log('🔐 Input password (first 5 chars):', password.substring(0, 5));
        console.log('🔐 Stored hash (first 30 chars):', user.password.substring(0, 30));
        console.log('🔐 Stored hash length:', user.password.length);
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('🔐 Comparison result:', isPasswordValid);

        if (!isPasswordValid) {
            console.log('❌ Password comparison failed');
            console.log('❌ Please use password: Expert@123');
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        console.log('✅ Password valid, login successful!');
        console.log('✅ Login successful for user:', user.email, 'Role:', user.role);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user'
            }
        });

    } catch (error) {
        console.error('❌ Login error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            requestBody: req.body,
            headers: req.headers
        });
        res.status(500).json({
            error: 'Internal server error',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Verify token endpoint removed - no JWT tokens needed

// Debug endpoint to check users in database
app.get('/api/debug/users', async (req, res) => {
    try {
        if (!mongoClient) {
            return res.status(503).json({ error: 'Database connection not available. Please try again later.' });
        }

        const db = mongoClient.db(DB_NAME);
        const userCollection = db.collection(USER_COLLECTION_NAME);

        const userCount = await userCollection.countDocuments();
        const users = await userCollection.find({}, {
            projection: {
                email: 1,
                username: 1,
                createdAt: 1
            }
        }).toArray();

        res.status(200).json({
            success: true,
            userCount,
            users: users.map(user => ({
                id: user._id,
                email: user.email,
                username: user.username,
                createdAt: user.createdAt
            }))
        });

    } catch (error) {
        console.error('Error checking users:', error);
        res.status(500).json({ error: 'Failed to check users', details: error.message });
    }
});

// Create user endpoint
app.post('/api/user/create', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({ error: 'Email, password, and username are required' });
        }

        if (!mongoClient) {
            return res.status(503).json({ error: 'Database connection not available. Please try again later.' });
        }

        const db = mongoClient.db(DB_NAME);
        const userCollection = db.collection(USER_COLLECTION_NAME);

        // Check if user already exists
        const existingUser = await userCollection.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const result = await userCollection.insertOne({
            email: email.toLowerCase(),
            username,
            password: hashedPassword,
            createdAt: new Date()
        });

        console.log('✅ User created successfully:', email);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            userId: result.insertedId
        });

    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
});

// ====== Zoho CRM Endpoints =======

// Mapping from user emails to Zoho Lead Owner names
const EMAIL_TO_LEAD_OWNER_MAP = {
    'admin@relai.world': 'Relai Management',
    'admin@example.com': 'Relai Management',
    'vaishnavig@relai.world': 'Vaishnavi Gorantla',
    'harshithv@relai.world': 'Vaishnavi Gorantla',
    'angaleenaj@relai.world': 'Angaleena J',
    'subscriptions@relai.world': 'subscriptions subscriptions',
    'sindhua@relai.world': 'Sindhu A',
    'sindhu@relai.world': 'Sindhu A'
};

// Get leads by Lead Owner email
app.get('/api/zoho/leads', async (req, res) => {
    try {
        const { ownerEmail } = req.query;

        if (!ownerEmail) {
            return res.status(400).json({ error: 'Owner email is required' });
        }

        console.log('🔍 Fetching Zoho leads for owner email:', ownerEmail);

        // Expert dashboard users - filter by lead status instead of owner
        const EXPERT_USERS = ['vaishnavi@relai.world', 'harshith@relai.world', 'vaishnavig@relai.world', 'harshithv@relai.world'];
        const EXPERT_LEAD_STATUSES = [
            'Expert call scheduled successfully',
            'Expert call attended successfully',
            'Drop-off or Not lifting the call after Expert calls',
            'Properties successfully shortlisted from list of matched properties through Expert call',
            'Expert call is done but not shortlisted properties yet',
            'Customer did not attend expert call'
        ];

        const isExpertUser = EXPERT_USERS.includes(ownerEmail.toLowerCase());
        const ZOHO_SEARCH_URL = `${ZOHO_API_DOMAIN}/crm/v2/Leads/search`;

        // Declare shared variables
        let allLeads = [];
        let targetOwnerName = null;

        if (isExpertUser) {
            // Filter by lead status for expert users
            console.log('👤 Expert user detected - filtering by lead status');
            let page = 1;
            const perPage = 200;
            let hasMore = true;

            // Build criteria with OR conditions for each status - wrap in parentheses
            const statusCriteria = '(' + EXPERT_LEAD_STATUSES
                .map(status => `(Lead_Status:equals:${status})`)
                .join('or') + ')';

            console.log('🔍 Status criteria:', statusCriteria);

            while (hasMore) {
                console.log(`📄 Fetching page ${page} with criteria:`, statusCriteria);

                const response = await zohoApiGet(ZOHO_SEARCH_URL, {
                    criteria: statusCriteria,
                    page: page,
                    per_page: perPage
                });

                // Handle no results (Zoho returns 204 or empty data)
                if (!response.data || !response.data.data) {
                    console.log('📄 No more leads found');
                    break;
                }

                const leads = response.data.data || [];
                allLeads = allLeads.concat(leads);

                console.log(`📄 Retrieved ${leads.length} leads on page ${page} (Total so far: ${allLeads.length})`);

                // Check if there are more records
                const info = response.data.info;
                hasMore = info && info.more_records;
                page++;

                // Safety limit (Search API max 2000 records)
                if (allLeads.length >= 2000) {
                    console.log('⚠️ Reached search API limit (2000 leads max)');
                    break;
                }
            }

            console.log(`✅ Total leads fetched by status for expert user: ${allLeads.length}`);
        } else {
            // Original logic - filter by Lead Owner name for non-expert users
            targetOwnerName = EMAIL_TO_LEAD_OWNER_MAP[ownerEmail.toLowerCase()];

            if (!targetOwnerName) {
                console.log('⚠️ No Lead Owner mapping found for email:', ownerEmail);
                return res.status(200).json({
                    success: true,
                    count: 0,
                    leads: [],
                    message: 'No Lead Owner mapping configured for this email'
                });
            }

            console.log(`📋 Mapped to Lead Owner: ${targetOwnerName}`);

            // Use Search Records API to filter leads by Owner name
            console.log('🔍 Fetching leads using Search API by Owner name...');
            let page = 1;
            const perPage = 200;
            let hasMore = true;

            while (hasMore) {
                console.log(`📄 Fetching page ${page} with criteria: Owner.name:equals:${targetOwnerName}`);

                const response = await zohoApiGet(ZOHO_SEARCH_URL, {
                    criteria: `(Owner.name:equals:${targetOwnerName})`,
                    page: page,
                    per_page: perPage
                });

                // Handle no results
                if (!response.data || !response.data.data) {
                    console.log('📄 No more leads found');
                    break;
                }

                const leads = response.data.data || [];
                allLeads = allLeads.concat(leads);

                console.log(`📄 Retrieved ${leads.length} leads on page ${page} (Total so far: ${allLeads.length})`);

                // Check if there are more records
                const info = response.data.info;
                hasMore = info && info.more_records;
                page++;

                // Safety limit (Search API max 2000 records)
                if (allLeads.length >= 2000) {
                    console.log('⚠️ Reached search API limit (2000 leads max)');
                    break;
                }
            }

            console.log(`✅ Total leads fetched for Lead Owner "${targetOwnerName}": ${allLeads.length}`);
        }

        // Map to simplified format with preference fields
        const simplifiedLeads = allLeads.map(lead => {
            // Extract email with fallback logic
            const email = lead.Email ||
                lead.Secondary_Email ||
                lead.Email_ID ||
                lead.Primary_Email ||
                lead.Contact_Email ||
                lead.E_mail ||
                lead.Email_Address ||
                // Fallback: Find ANY field that looks like an email
                Object.values(lead).find(val => typeof val === 'string' && val.includes('@') && val.includes('.')) ||
                '';

            // Log first lead to debug fields
            if (allLeads.indexOf(lead) === 0) {
                console.log('📄 Sample Raw Zoho Lead:', JSON.stringify(lead, null, 2));
                console.log('📧 Email fields check:');
                console.log('  - lead.Email:', lead.Email);
                console.log('  - lead.Secondary_Email:', lead.Secondary_Email);
                console.log('  - Final email value:', email);
                console.log('  - All lead keys:', Object.keys(lead));
            }

            return {
                id: lead.id,
                leadName: lead.Full_Name || lead.Last_Name || 'N/A',
                mobile: lead.Mobile || lead.Phone || 'N/A',
                email: email,
                leadOwner: lead.Owner?.name || targetOwnerName || '',
                leadStatus: lead.Lead_Status || '',
                company: lead.Company || '',
                createdTime: lead.Created_Time || '',
                preSaleNotes: lead.Pre_Sale_Notes || '',
                // Include raw data for debugging
                raw: lead,
                // Include preference fields from Zoho
                preferences: {
                    budget: lead.Budget || '',
                    propertyType: lead.Property_Type || '',
                    possessionTimeline: lead.Possession_Dates || '',
                    location: lead.Location || '',
                    configuration: lead.Configuration || '',
                    propertySize: lead.Property_Size || '',
                    matchedPropertyCount: lead.MatchedPropertyCount || '',
                    financingOption: lead.OTP_Loan || '',
                    includeGSTRegistration: lead.including_GST_and_Registration === 'Yes'
                }
            };
        });

        // Log email statistics
        const leadsWithEmail = simplifiedLeads.filter(l => l.email && l.email.length > 0).length;
        const leadsWithoutEmail = simplifiedLeads.length - leadsWithEmail;
        console.log(`📧 Email Statistics: ${leadsWithEmail} leads with email, ${leadsWithoutEmail} leads without email`);
        console.log(`📧 Sample emails:`, simplifiedLeads.slice(0, 5).map(l => ({ name: l.leadName, email: l.email })));

        res.status(200).json({
            success: true,
            count: simplifiedLeads.length,
            leads: simplifiedLeads
        });

    } catch (error) {
        console.error('❌ Error fetching Zoho leads:', error.response?.data || error.message);
        console.error('❌ Full error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        res.status(500).json({
            error: 'Failed to fetch Zoho leads',
            details: error.message,
            zohoError: error.response?.data,
            statusCode: error.response?.status
        });
    }
});

// Update Zoho Lead with requirement preferences
app.put('/api/zoho/leads/:leadId/preferences', async (req, res) => {
    try {
        const { leadId } = req.params;
        const {
            budget,
            propertyType,
            possessionTimeline,
            location,
            configuration,
            propertySize,
            matchedPropertyCount,
            financingOption,
            includeGSTRegistration
        } = req.body;

        console.log('🔍 Updating Zoho lead preferences for lead ID:', leadId);
        console.log('📝 Preference data:', req.body);
        console.log('📊 matchedPropertyCount received:', matchedPropertyCount);

        if (!leadId) {
            return res.status(400).json({ error: 'Lead ID is required' });
        }

        // Ensure matchedPropertyCount is converted to string (Zoho expects text field)
        const matchedCount = matchedPropertyCount !== undefined && matchedPropertyCount !== null && matchedPropertyCount !== ''
            ? String(matchedPropertyCount)
            : '';

        console.log('📊 Final matchedPropertyCount to send (as text):', matchedCount);

        // Prepare the Zoho update payload
        // Map to Zoho CRM fields (check your Zoho CRM to verify the exact field names)
        const updateData = {
            data: [{
                id: leadId,
                Budget: budget || '',
                Property_Type: propertyType || '',
                Possession_Dates: possessionTimeline || '',
                Location: location || '',
                Configuration: configuration || '',
                Property_Size: propertySize || '',
                MatchedPropertyCount: matchedCount,
                OTP_Loan: financingOption || '',
                including_GST_and_Registration: includeGSTRegistration ? 'Yes' : 'No'
            }]
        };

        console.log('📤 Sending update to Zoho:', JSON.stringify(updateData, null, 2));

        // Update the lead in Zoho CRM
        const ZOHO_UPDATE_URL = `${ZOHO_API_DOMAIN}/crm/v2/Leads`;
        const response = await zohoApiPut(ZOHO_UPDATE_URL, updateData);

        console.log('✅ Zoho lead preferences updated successfully');
        console.log('📥 Zoho response:', response.data);

        res.status(200).json({
            success: true,
            message: 'Lead preferences updated successfully',
            data: response.data
        });

    } catch (error) {
        console.error('❌ Error updating Zoho lead preferences:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to update Zoho lead preferences',
            details: error.response?.data || error.message
        });
    }
});

// Update Zoho Lead Notes (Pre-Sale Notes field)
app.put('/api/zoho/leads/:leadId/notes', async (req, res) => {
    try {
        const { leadId } = req.params;
        const { notes } = req.body;

        console.log('📝 Updating notes for lead ID:', leadId);
        console.log('📋 Notes content:', notes);

        if (!leadId) {
            return res.status(400).json({ error: 'Lead ID is required' });
        }

        // Prepare the Zoho update payload for Pre-Sale Notes
        const updateData = {
            data: [{
                id: leadId,
                Pre_Sale_Notes: notes || ''
            }]
        };

        console.log('📤 Sending notes update to Zoho:', JSON.stringify(updateData, null, 2));

        // Update the lead in Zoho CRM
        const ZOHO_UPDATE_URL = `${ZOHO_API_DOMAIN}/crm/v2/Leads`;
        const response = await zohoApiPut(ZOHO_UPDATE_URL, updateData);

        console.log('✅ Zoho lead notes updated successfully');

        res.status(200).json({
            success: true,
            message: 'Notes updated successfully',
            data: response.data
        });

    } catch (error) {
        console.error('❌ Error updating Zoho lead notes:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to update Zoho lead notes',
            details: error.response?.data || error.message
        });
    }
});

// ====== Endpoint: MongoDB Status =======
app.get('/api/mongodb-status', async (req, res) => {
    try {
        if (!mongoClient) {
            return res.status(503).json({
                status: 'disconnected',
                error: 'MongoDB client not initialized - connection may be in progress'
            });
        }

        const db = mongoClient.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Test connection by getting collection count
        const count = await collection.countDocuments();
        const sampleDoc = await collection.findOne({});

        res.status(200).json({
            status: 'connected',
            database: DB_NAME,
            collection: COLLECTION_NAME,
            documentCount: count,
            sampleDocument: sampleDoc ? Object.keys(sampleDoc) : null,
            cacheStatus: {
                cachedProperties: propertiesCache.length,
                lastUpdate: lastCacheUpdate,
                cacheAge: lastCacheUpdate ? Date.now() - lastCacheUpdate : null
            }
        });
    } catch (error) {
        console.error('MongoDB status check failed:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            details: {
                message: error.message,
                code: error.code,
                name: error.name
            }
        });
    }
});

// ====== Utility Functions =======
// Function to find MongoDB property ID by name or RERA ID
async function findMongoDBPropertyId(propertyName, reraId) {
    try {
        if (!mongoClient) {
            console.log('MongoDB client not available for property lookup');
            return null;
        }

        const db = mongoClient.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        let query = {};

        // Try to find by RERA ID first (more specific)
        if (reraId && reraId.trim() !== '') {
            query = {
                $or: [
                    { RERA_Number: reraId },
                    { reraNumber: reraId },
                    { RERANUMBER: reraId }
                ]
            };
        } else if (propertyName && propertyName.trim() !== '') {
            // Fallback to property name search
            query = {
                $or: [
                    { ProjectName: { $regex: propertyName, $options: 'i' } },
                    { projectName: { $regex: propertyName, $options: 'i' } },
                    { PROJECTNAME: { $regex: propertyName, $options: 'i' } }
                ]
            };
        }

        if (Object.keys(query).length === 0) {
            return null;
        }

        const property = await collection.findOne(query);

        if (property && property._id) {
            console.log(`Found MongoDB property: ${property.ProjectName || property.projectName} with ID: ${property._id}`);
            return property._id.toString();
        }

        return null;
    } catch (error) {
        console.error('Error finding MongoDB property ID:', error);
        return null;
    }
}

function parseBotProperties(botData) {
    if (!botData || typeof botData !== 'string') {
        return [];
    }

    const properties = [];

    try {
        // Check for the specific format with "? *PROPERTY_NAME*"
        if (botData.includes("? *") && botData.includes("*")) {
            console.log("Parsing question mark format property format");
            console.log("Raw bot data:", botData.substring(0, 200) + "...");

            // Find all property names using regex
            const propertyNameMatches = botData.match(/\?\s*\*([^*]+)\*/g);
            console.log(`Found ${propertyNameMatches ? propertyNameMatches.length : 0} property names`);

            if (propertyNameMatches) {
                // Split the bot data into sections based on property markers
                const sections = [];
                let currentIndex = 0;

                for (let i = 0; i < propertyNameMatches.length; i++) {
                    const match = propertyNameMatches[i];
                    const startIndex = botData.indexOf(match, currentIndex);

                    if (startIndex !== -1) {
                        let endIndex = botData.length;

                        // If this is not the last property, look for the next property marker
                        if (i < propertyNameMatches.length - 1) {
                            const nextPropertyMatch = propertyNameMatches[i + 1];
                            const nextPropertyIndex = botData.indexOf(nextPropertyMatch, startIndex);
                            if (nextPropertyIndex !== -1) {
                                endIndex = nextPropertyIndex;
                            }
                        }

                        sections.push({
                            match: match,
                            startIndex: startIndex,
                            endIndex: endIndex,
                            sectionText: botData.substring(startIndex, endIndex)
                        });

                        currentIndex = startIndex + 1; // Move past this match to find next occurrence
                    }
                }

                // Process each section
                sections.forEach((section, index) => {
                    const propertyName = section.match.replace(/\?\s*\*|\*/g, '').trim();
                    console.log(`Processing property ${index + 1}: "${propertyName}"`);
                    console.log(`Section boundaries: ${section.startIndex} to ${section.endIndex}`);
                    console.log(`Section text for ${propertyName}:`, section.sectionText.substring(0, 150) + "...");

                    const currentProperty = {
                        id: `p${index + 1}`,
                        title: propertyName,
                        address: "",
                        price: "",
                        bedrooms: 4, // Default to 4BHK based on client preference
                        bathrooms: 4,
                        sqft: "",
                        status: "Active",
                        match: 95 - (index * 5),
                        image: "/api/placeholder/300/200",
                        reraId: null,
                        mongodbId: null,
                        developer: "",
                        possession: "",
                        configuration: ""
                    };

                    // Extract developer name
                    const developerMatch = section.sectionText.match(/Developer Name:\s*([^\n]+)/);
                    if (developerMatch) {
                        currentProperty.developer = developerMatch[1].trim();
                        console.log(`Found developer: ${currentProperty.developer}`);
                    }

                    // Extract location
                    const locationMatch = section.sectionText.match(/Location:\s*([^\n]+)/);
                    if (locationMatch) {
                        currentProperty.address = locationMatch[1].trim();
                        console.log(`Found location: ${currentProperty.address}`);
                    }

                    // Extract configuration
                    const configMatch = section.sectionText.match(/Configuration:\s*([^\n]+)/);
                    if (configMatch) {
                        currentProperty.configuration = configMatch[1].trim();
                        // Extract BHK from configuration
                        const bhkMatch = configMatch[1].match(/(\d+)BHK/);
                        if (bhkMatch) {
                            const bhk = parseInt(bhkMatch[1]);
                            currentProperty.bedrooms = bhk;
                            currentProperty.bathrooms = bhk;
                        }
                        console.log(`Found configuration: ${currentProperty.configuration}`);
                    }

                    // Extract size
                    const sizeMatch = section.sectionText.match(/Size:\s*([^\n]+)/);
                    if (sizeMatch) {
                        currentProperty.sqft = sizeMatch[1].trim();
                        console.log(`Found size: ${currentProperty.sqft}`);
                    }

                    // Extract possession
                    const possessionMatch = section.sectionText.match(/Possession:\s*([^\n]+)/);
                    if (possessionMatch) {
                        currentProperty.possession = possessionMatch[1].trim();
                        console.log(`Found possession: ${currentProperty.possession}`);
                    }

                    // Extract price
                    const priceMatch = section.sectionText.match(/Base Project Price:\s*([^\n]+)/);
                    if (priceMatch) {
                        currentProperty.price = priceMatch[1].trim();
                        console.log(`Found price: ${currentProperty.price}`);
                    }

                    // Extract RERA
                    const reraMatch = section.sectionText.match(/RERA:\s*([^\n]+)/);
                    if (reraMatch) {
                        currentProperty.reraId = reraMatch[1].trim();
                        console.log(`Found RERA: ${currentProperty.reraId}`);
                    }

                    // Only add properties that have meaningful data
                    if (currentProperty.title && (currentProperty.address || currentProperty.price || currentProperty.developer)) {
                        properties.push(currentProperty);
                        console.log(`✅ Added property: ${currentProperty.title} - Developer: ${currentProperty.developer} - Address: ${currentProperty.address} - Price: ${currentProperty.price}`);
                    } else {
                        console.log(`❌ Skipped property ${propertyName} - insufficient data`);
                    }
                });
            }
        }

        console.log(`Successfully parsed ${properties.length} properties`);
        console.log("Final properties array:", JSON.stringify(properties, null, 2));
        return properties;

    } catch (error) {
        console.error("Error parsing bot properties:", error);
        return [];
    }
}

// Enhanced function to parse bot properties and fetch MongoDB IDs
async function parseBotPropertiesWithMongoDBIds(botData) {
    try {
        // First parse the properties
        const properties = parseBotProperties(botData);

        // Then fetch MongoDB IDs for each property
        for (let i = 0; i < properties.length; i++) {
            const property = properties[i];
            console.log(`🔍 Looking up MongoDB ID for property: ${property.title}`);

            // Try to find MongoDB ID using RERA ID first, then property name
            const mongoId = await findMongoDBPropertyId(property.title, property.reraId);

            if (mongoId) {
                property.mongodbId = mongoId;
                console.log(`✅ Found MongoDB ID for ${property.title}: ${mongoId}`);
            } else {
                console.log(`❌ No MongoDB ID found for ${property.title}`);
            }
        }

        console.log(`Final properties with MongoDB IDs:`, JSON.stringify(properties, null, 2));
        return properties;

    } catch (error) {
        console.error("Error parsing bot properties with MongoDB IDs:", error);
        return [];
    }
}

// ====== Endpoint: Get Specific Client by ID =======
try {
    app.get('/api/clients/:id', async (req, res) => {
        try {
            const { id } = req.params;

            // Validate the id parameter
            if (!id || typeof id !== 'string' || id.trim() === '') {
                return res.status(400).json({ error: 'Invalid client ID parameter' });
            }

            // Check if Zoho credentials are configured
            if (!currentAccessToken || !refreshToken) {
                return res.status(401).json({ error: 'Zoho credentials not configured' });
            }

            // Fetch all leads from Zoho with pagination
            console.log(`🔍 Searching for client with ID: ${id}`);
            let allLeads = [];
            let page = 1;
            const perPage = 200;
            let hasMore = true;
            let clientFound = null;

            while (hasMore && !clientFound) {
                console.log(`📄 Fetching page ${page} of leads...`);

                const zohoRes = await zohoApiGet(ZOHO_BASE_URL, {
                    page: page,
                    per_page: perPage
                });

                const pageLeads = zohoRes.data.data || [];
                allLeads = allLeads.concat(pageLeads);

                // Check if client is in current page
                clientFound = pageLeads.find(lead => lead.Mobile === id || lead.id === id);

                if (clientFound) {
                    console.log(`✅ Found client on page ${page}`);
                    break;
                }

                console.log(`📄 Retrieved ${pageLeads.length} leads on page ${page} (Total so far: ${allLeads.length})`);

                const info = zohoRes.data.info;
                hasMore = info && info.more_records;
                page++;

                if (allLeads.length >= 10000) {
                    console.log('⚠️ Reached safety limit (10000 leads max)');
                    break;
                }
            }

            // If not found after pagination, search in all collected leads as fallback
            const client = clientFound || allLeads.find(lead => lead.Mobile === id || lead.id === id);

            if (!client) {
                console.log(`❌ Client not found with ID: ${id}`);
                return res.status(404).json({ error: 'Client not found' });
            }

            console.log(`✅ Found client: ${client.First_Name} ${client.Last_Name}`);
            console.log(`🔍 Client OTP_Loan field:`, client.OTP_Loan);
            console.log(`🔍 Client including_GST_and_Registration field:`, client.including_GST_and_Registration);

            // Fetch requirements from Supabase client_Requirements table
            let matchedPropertiesFromDB = [];
            if (supabase) {
                try {
                    const { data: requirements, error: reqError } = await supabase
                        .from('client_Requirements')
                        .select('*')
                        .eq('client_mobile', id)
                        .order('requirement_number', { ascending: false })
                        .limit(1);

                    if (reqError) {
                        console.error('⚠️ Error fetching requirements from Supabase:', reqError);
                    } else if (requirements && requirements.length > 0) {
                        const latestRequirement = requirements[0];
                        console.log(`✅ Found ${requirements.length} requirement(s) for client ${id}`);

                        if (latestRequirement.matched_properties && Array.isArray(latestRequirement.matched_properties)) {
                            matchedPropertiesFromDB = latestRequirement.matched_properties;
                            console.log(`✅ Loaded ${matchedPropertiesFromDB.length} matched properties from database`);
                            console.log('📋 Matched Properties Project Names:', matchedPropertiesFromDB.map(p => p.projectname || p.ProjectName || 'Unknown').join(', '));
                        }
                    }
                } catch (error) {
                    console.error('⚠️ Error querying client_Requirements:', error);
                }
            }

            // Format the client data
            const formattedClient = {
                id: client.Mobile || id,
                name: (client.First_Name || "") + (client.Last_Name ? " " + client.Last_Name : ""),
                email: client.Email || "",
                phone: client.Mobile || id,
                location: client.Location || "",
                status: "Active",
                priority: "High",
                createdTime: client.Created_Time || "",
                preferences: {
                    propertyType: client.Property_Type || "Not specified",
                    type: client.Property_Type || "Not specified",
                    budget: client.Budget || "Not specified",
                    location: client.Location || "Not specified",
                    timeline: client.Possession_Date || client.Possession_Dates || "Not specified",
                    possessionTimeline: client.Possession_Dates || client.Possession_Date || "Not specified",
                    configuration: client.Configuration || "Not specified",
                    propertySize: client.Property_Size || "Not specified",
                    financingOption: client.OTP_Loan || "",
                    includeGSTRegistration: client.including_GST_and_Registration === 'Yes',
                    matchedPropertyCount: client.MatchedPropertyCount ?? ""
                },
                budget: client.Budget || "Not specified",
                possession_date: client.Possession_Date || "Not specified",
                configuration: client.Configuration || "Not specified",
                property_type: client.Property_Type || "Not specified",
                conversations: [],
                "Bot Suggested Properties": client['Bot Suggested Properties'] || client.Bot_Suggested_Properties || "",
                matchedProperties: matchedPropertiesFromDB
            };

            // Always keep bot properties separate from database matched properties
            // This allows frontend to display them in separate requirements
            console.log(`📋 Bot Suggested Properties field content length: ${formattedClient["Bot Suggested Properties"]?.length || 0}`);

            res.status(200).json(formattedClient);
        } catch (error) {
            console.error("Error fetching client:", error.response?.data || error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
} catch (error) {
    console.error('🚨 Error registering /api/clients/:id route:', error);
}

// ====== Endpoint: All Leads (/api/webhook-handler) =======
app.get('/api/webhook-handler', async (req, res) => {
    try {
        // Check if Zoho credentials are configured
        if (!currentAccessToken || !refreshToken) {
            return res.status(503).json({
                error: 'Zoho API not configured',
                message: 'Please configure Zoho credentials to access client data'
            });
        }

        console.log('🔍 Fetching all Zoho leads with pagination...');
        let allLeads = [];
        let page = 1;
        const perPage = 200;
        let hasMore = true;

        while (hasMore) {
            console.log(`📄 Fetching page ${page} of leads...`);

            const zohoRes = await zohoApiGet(ZOHO_BASE_URL, {
                page: page,
                per_page: perPage
            });

            const pageLeads = zohoRes.data.data || [];
            allLeads = allLeads.concat(pageLeads);

            console.log(`📄 Retrieved ${pageLeads.length} leads on page ${page} (Total so far: ${allLeads.length})`);

            const info = zohoRes.data.info;
            hasMore = info && info.more_records;
            page++;

            if (allLeads.length >= 10000) {
                console.log('⚠️ Reached safety limit (10000 leads max)');
                break;
            }
        }

        console.log(`✅ Total leads fetched: ${allLeads.length}`);

        const leads = allLeads.map(lead => ({
            mobile: lead.Mobile || "",
            email: lead.Email || "",
            name: (lead.First_Name || "") + (lead.Last_Name ? " " + lead.Last_Name : ""),
            lastname: lead.Last_Name || "",
            leadname: lead.Lead_Name || "",
            modifiedTime: lead.Modified_Time || "",
            property_type: lead.Property_Type || "",
            budget: lead.Budget || "",
            location: lead.Location || "",
            possession_date: lead.Possession_Date || "",
            configuration: lead.Configuration || "",
            property_size: lead.Property_Size || "",
            "Bot Suggested Properties": lead['Bot Suggested Properties'] || lead.Bot_Suggested_Properties || ""
        }));
        res.status(200).json(leads);
    } catch (error) {
        console.error("Error fetching leads:", error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch leads from Zoho',
            message: error.response?.data?.message || error.message
        });
    }
});

// ====== Endpoint: Get Property by MongoDB ID =======
app.get('/api/property/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID parameter
        if (!id || typeof id !== 'string' || id.trim() === '') {
            return res.status(400).json({ error: 'Property ID is required' });
        }

        if (!mongoClient) {
            return res.status(503).json({ error: 'MongoDB connection not available' });
        }

        const db = mongoClient.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Convert string ID to MongoDB ObjectId
        const { ObjectId } = require('mongodb');
        const propertyId = new ObjectId(id);

        // Find property by _id
        const property = await collection.findOne({ _id: propertyId });

        if (!property) {
            return res.status(404).json({ error: 'Property not found', propertyId: id });
        }

        res.status(200).json({
            success: true,
            property: property
        });
    } catch (error) {
        console.error(`Error fetching property by ID:`, error);
        res.status(500).json({ error: 'Failed to fetch property', message: error.message });
    }
});

// ====== Endpoint: Get Property ID from MongoDB =======
try {
    app.get('/api/property-id/:propertyName', async (req, res) => {
        try {
            let { propertyName } = req.params;

            // Validate propertyName parameter
            if (!propertyName || typeof propertyName !== 'string' || propertyName.trim() === '') {
                return res.status(400).json({ error: 'Property name is required and must be a valid string' });
            }

            // Decode URL-encoded property name
            propertyName = decodeURIComponent(propertyName);

            if (!mongoClient) {
                return res.status(503).json({ error: 'MongoDB connection not available. Please try again later.' });
            }

            const db = mongoClient.db(DB_NAME);
            const collection = db.collection(COLLECTION_NAME);

            // Clean the search term - remove trailing commas and extra spaces
            let cleanPropertyName = propertyName.replace(/,\s*$/, '').trim();
            console.log(`Searching for property: "${cleanPropertyName}" (original: "${propertyName}")`);

            // Search for property by name (case-insensitive) with multiple field variations
            let property = await collection.findOne({
                $or: [
                    { ProjectName: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { projectName: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { PROJECTNAME: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { name: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { Name: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { NAME: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { title: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { Title: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { TITLE: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { propertyName: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { PropertyName: { $regex: new RegExp(cleanPropertyName, 'i') } },
                    { PROPERTYNAME: { $regex: new RegExp(cleanPropertyName, 'i') } }
                ]
            });

            // If not found by name, try searching by partial matches
            if (!property) {
                console.log(`Trying partial match for: "${cleanPropertyName}"`);
                const firstWord = cleanPropertyName.split(' ')[0];
                property = await collection.findOne({
                    $or: [
                        { ProjectName: { $regex: new RegExp(firstWord, 'i') } },
                        { projectName: { $regex: new RegExp(firstWord, 'i') } },
                        { PROJECTNAME: { $regex: new RegExp(firstWord, 'i') } },
                        { name: { $regex: new RegExp(firstWord, 'i') } },
                        { Name: { $regex: new RegExp(firstWord, 'i') } },
                        { NAME: { $regex: new RegExp(firstWord, 'i') } },
                        { title: { $regex: new RegExp(firstWord, 'i') } },
                        { Title: { $regex: new RegExp(firstWord, 'i') } },
                        { TITLE: { $regex: new RegExp(firstWord, 'i') } },
                        { propertyName: { $regex: new RegExp(firstWord, 'i') } },
                        { PropertyName: { $regex: new RegExp(firstWord, 'i') } },
                        { PROPERTYNAME: { $regex: new RegExp(firstWord, 'i') } }
                    ]
                });
            }

            if (property) {
                console.log(`Found property:`, {
                    _id: property._id,
                    name: property.name,
                    title: property.title,
                    propertyName: property.propertyName
                });
            } else {
                console.log(`No property found for: "${propertyName}"`);
            }

            if (property) {
                console.log(`Found property:`, {
                    _id: property._id,
                    name: property.name || property.Name || property.NAME,
                    title: property.title || property.Title || property.TITLE,
                    propertyName: property.propertyName || property.PropertyName || property.PROPERTYNAME,
                    projectName: property.ProjectName || property.projectName || property.PROJECTNAME
                });

                res.status(200).json({
                    propertyId: property._id.toString(),
                    propertyName: property.name || property.Name || property.NAME || property.title || property.Title || property.TITLE || property.propertyName || property.PropertyName || property.PROPERTYNAME,
                    projectName: property.ProjectName || property.projectName || property.PROJECTNAME || property.name || property.Name || property.NAME || property.title || property.Title || property.TITLE || property.propertyName || property.PropertyName || property.PROPERTYNAME,
                    found: true
                });
            } else {
                console.log(`No property found for: "${propertyName}"`);
                res.status(404).json({
                    propertyId: null,
                    propertyName: propertyName,
                    projectName: null,
                    found: false
                });
            }
        } catch (error) {
            console.error("Error fetching property ID:", error);
            res.status(500).json({
                error: 'Failed to fetch property ID',
                propertyName: req.params.propertyName,
                found: false
            });
        }
    });
} catch (error) {
    console.error('🚨 Error registering /api/property-id/:propertyName route:', error);
}

// ====== Endpoint: Get All Cached Properties =======
app.get('/api/properties-cache', async (req, res) => {
    try {
        const properties = await getCachedProperties();
        res.status(200).json({
            properties,
            totalCount: properties.length,
            lastUpdated: lastCacheUpdate,
            cacheAge: lastCacheUpdate ? Date.now() - lastCacheUpdate : null
        });
    } catch (error) {
        console.error("Error fetching cached properties:", error);
        res.status(500).json({ error: 'Failed to fetch cached properties' });
    }
});

// ====== Endpoint: Refresh Properties Cache =======
app.post('/api/properties-cache/refresh', async (req, res) => {
    try {
        await fetchAndCacheProperties();
        res.status(200).json({
            message: 'Properties cache refreshed successfully',
            totalCount: propertiesCache.length,
            lastUpdated: lastCacheUpdate
        });
    } catch (error) {
        console.error("Error refreshing properties cache:", error);
        res.status(500).json({ error: 'Failed to refresh properties cache' });
    }
});

// ====== Endpoint: Get Multiple Property IDs =======
app.post('/api/property-ids', async (req, res) => {
    try {
        const { propertyNames } = req.body;

        if (!Array.isArray(propertyNames)) {
            return res.status(400).json({ error: 'propertyNames must be an array' });
        }

        if (!mongoClient) {
            return res.status(503).json({ error: 'MongoDB connection not available. Please try again later.' });
        }

        const db = mongoClient.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        const results = [];

        // Get cached properties for faster lookup
        const cachedProperties = await getCachedProperties();

        for (const propertyName of propertyNames) {
            try {
                console.log(`Searching for property: "${propertyName}"`);

                // First try to find in cache
                let foundProperty = cachedProperties.find(prop =>
                    prop.projectName && prop.projectName.toLowerCase().includes(propertyName.toLowerCase()) ||
                    prop.name && prop.name.toLowerCase().includes(propertyName.toLowerCase()) ||
                    prop.title && prop.title.toLowerCase().includes(propertyName.toLowerCase()) ||
                    prop.propertyName && prop.propertyName.toLowerCase().includes(propertyName.toLowerCase())
                );

                if (!foundProperty) {
                    // If not found in cache, search in database
                    const property = await collection.findOne({
                        $or: [
                            { ProjectName: { $regex: new RegExp(propertyName, 'i') } },
                            { projectName: { $regex: new RegExp(propertyName, 'i') } },
                            { PROJECTNAME: { $regex: new RegExp(propertyName, 'i') } },
                            { name: { $regex: new RegExp(propertyName, 'i') } },
                            { title: { $regex: new RegExp(propertyName, 'i') } },
                            { propertyName: { $regex: new RegExp(propertyName, 'i') } }
                        ]
                    }, {
                        projection: { _id: 1, ProjectName: 1, BuilderName: 1, RERA_Number: 1, AreaName: 1, PriceSheet: 1, Possession_Date: 1 }
                    });

                    if (property) {
                        foundProperty = {
                            _id: property._id.toString(),
                            projectName: property.ProjectName || property.projectName || property.PROJECTNAME,
                            builderName: property.BuilderName || property.builderName || property.BUILDERNAME,
                            reraNumber: property.RERA_Number || property.reraNumber || property.RERANUMBER,
                            areaName: property.AreaName || property.areaName || property.AREANAME,
                            priceSheet: property.PriceSheet || property.priceSheet || property.PRICESHEET,
                            possessionDate: property.Possession_Date || property.possessionDate || property.POSSESSIONDATE,
                            // Keep backward compatibility fields
                            name: property.ProjectName || property.projectName || property.PROJECTNAME,
                            title: property.ProjectName || property.projectName || property.PROJECTNAME,
                            propertyName: property.ProjectName || property.projectName || property.PROJECTNAME
                        };
                    }
                }

                if (foundProperty) {
                    console.log(`Found property:`, {
                        _id: foundProperty._id,
                        projectName: foundProperty.projectName,
                        name: foundProperty.name,
                        title: foundProperty.title,
                        propertyName: foundProperty.propertyName
                    });

                    results.push({
                        propertyName: propertyName,
                        propertyId: foundProperty._id,
                        projectName: foundProperty.projectName,
                        found: true
                    });
                } else {
                    console.log(`No property found for: "${propertyName}"`);
                    results.push({
                        propertyName: propertyName,
                        propertyId: null,
                        projectName: null,
                        found: false
                    });
                }
            } catch (error) {
                console.error(`Error searching for property ${propertyName}:`, error);
                results.push({
                    propertyName: propertyName,
                    propertyId: null,
                    projectName: null,
                    found: false,
                    error: error.message
                });
            }
        }

        res.status(200).json({ results });
    } catch (error) {
        console.error("Error fetching property IDs:", error);
        res.status(500).json({ error: 'Failed to fetch property IDs' });
    }
});

// ====== Endpoint: Get All Properties (_id and ProjectName) =======
app.get('/api/all-properties', async (req, res) => {
    try {
        if (!mongoClient) {
            return res.status(503).json({ error: 'MongoDB connection not available. Please try again later.' });
        }

        const db = mongoClient.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        console.log('🔄 Fetching all properties (_id and ProjectName)...');

        // Get total count first
        const totalCount = await collection.countDocuments();
        console.log(`📊 Total documents in collection: ${totalCount}`);

        // Fetch all properties with only _id and ProjectName fields
        const properties = await collection.find({}, {
            projection: {
                _id: 1,
                ProjectName: 1
            }
        }).toArray();

        console.log(`📋 Found ${properties.length} properties`);

        // Clean and map the properties
        const cleanedProperties = properties.map(property => {
            let projectName = property.ProjectName || '';

            // Clean the ProjectName - remove trailing commas and extra spaces
            if (projectName) {
                projectName = projectName.replace(/,\s*$/, '').trim(); // Remove trailing comma and spaces
            }

            return {
                _id: property._id.toString(),
                projectName: projectName
            };
        });

        // Log first few properties for debugging
        console.log('🎯 First 5 properties:');
        cleanedProperties.slice(0, 5).forEach((prop, index) => {
            console.log(`  ${index + 1}. ID: ${prop._id}, ProjectName: "${prop.projectName}"`);
        });

        res.status(200).json({
            success: true,
            totalCount: cleanedProperties.length,
            properties: cleanedProperties
        });

    } catch (error) {
        console.error('❌ Error fetching all properties:', error);
        res.status(500).json({
            error: 'Failed to fetch properties',
            details: error.message
        });
    }
});

// ====== Endpoint: Get All Area Names =======
app.get('/api/area-names', async (req, res) => {
    try {
        if (!mongoClient) {
            return res.status(503).json({ error: 'MongoDB connection not available. Please try again later.' });
        }

        const db = mongoClient.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        console.log('🔄 Fetching all unique area names...');

        // Fetch all unique area names using a simpler approach
        const allProperties = await collection.find({}, {
            projection: {
                AreaName: 1,
                areaName: 1,
                AREANAME: 1
            }
        }).toArray();

        // Extract and combine all area names
        const allAreaNames = [];
        allProperties.forEach(property => {
            if (property.AreaName && property.AreaName.trim() !== '') {
                allAreaNames.push(property.AreaName.trim());
            }
            if (property.areaName && property.areaName.trim() !== '') {
                allAreaNames.push(property.areaName.trim());
            }
            if (property.AREANAME && property.AREANAME.trim() !== '') {
                allAreaNames.push(property.AREANAME.trim());
            }
        });

        // Extract and clean area names from database
        const cleanedAreaNames = allAreaNames
            .filter(areaName => areaName && areaName.trim() !== '')
            .map(areaName => areaName.replace(/,\s*$/, '').trim()) // Remove trailing commas and spaces
            .filter((areaName, index, self) => self.indexOf(areaName) === index); // Remove duplicates

        // Merge with ALL_LOCATION_AREAS to ensure all locations are available
        const mergedAreaNames = [...new Set([...ALL_LOCATION_AREAS, ...cleanedAreaNames])]
            .sort(); // Sort alphabetically

        console.log(`📋 Found ${cleanedAreaNames.length} unique area names from database`);
        console.log(`📋 Total area names (including predefined): ${mergedAreaNames.length}`);

        // Log first few area names for debugging
        console.log('🎯 First 10 area names:');
        mergedAreaNames.slice(0, 10).forEach((areaName, index) => {
            console.log(`  ${index + 1}. "${areaName}"`);
        });

        res.status(200).json({
            success: true,
            totalCount: mergedAreaNames.length,
            areaNames: mergedAreaNames
        });

    } catch (error) {
        console.error('❌ Error fetching area names:', error);
        res.status(500).json({
            error: 'Failed to fetch area names',
            details: error.message
        });
    }
});

// ====== NEW Endpoint: Get Matched Properties Count (Accurate) =======
app.post('/api/match-properties', async (req, res) => {
    try {
        const {
            propertyType,      // "Apartment" or "Villa"
            configurations,    // Array of strings like ["2 BHK", "3 BHK"]
            locations,         // Array of strings like ["Uppal", "Kokapet"]
            budgetMin,         // Number (in rupees)
            budgetMax,         // Number (in rupees)
            possession         // String like "Within 6 months", "6-12 months", etc.
        } = req.body;

        console.log('🔍 Matching properties with criteria:', {
            propertyType,
            configurations,
            locations,
            budgetMin,
            budgetMax,
            possession
        });

        if (!supabase) {
            return res.status(503).json({ error: 'Supabase connection not available' });
        }

        // Start building the query
        let query = supabase.from('unified_data').select('*', { count: 'exact' });

        // Filter by Property Type (project_type)
        if (propertyType && propertyType !== '') {
            query = query.ilike('project_type', `%${propertyType}%`);
            console.log(`📌 Filtering by project_type: ${propertyType}`);
        }

        // Filter by Configurations (bhk) - convert "2 BHK" to "2", "3 BHK" to "3", etc.
        if (configurations && configurations.length > 0) {
            const bhkFilters = configurations.map(config => {
                const match = config.match(/(\d+\.?\d*)/);
                const bhkNum = match ? match[1] : config;
                return `bhk.eq.${bhkNum}`;
            }).join(',');
            query = query.or(bhkFilters);
            console.log(`📌 Filtering by bhk:`, configurations);
        }

        // Filter by Locations (areaname)
        if (locations && locations.length > 0) {
            const locationFilters = locations.map(loc => `areaname.ilike.%${loc}%`).join(',');
            query = query.or(locationFilters);
            console.log(`📌 Filtering by areaname:`, locations);
        }

        // Fetch all matching properties for budget and possession filtering
        const { data: properties, error, count } = await query;

        if (error) {
            console.error('❌ Error fetching properties:', error);
            return res.status(500).json({
                error: 'Failed to fetch properties',
                details: error.message
            });
        }

        console.log(`✅ Found ${properties?.length || 0} properties before budget/possession filtering`);

        // Log sample properties for debugging
        if (properties && properties.length > 0) {
            console.log(`📋 Sample properties (first 3):`);
            properties.slice(0, 3).forEach((prop, idx) => {
                console.log(`  ${idx + 1}. Project: ${prop.projectname}, Area: ${prop.areaname}, BHK: ${prop.bhk}, Type: ${prop.project_type}, Price: ₹${(prop.baseprojectprice / 10000000).toFixed(2)}Cr, Possession: ${prop.possession_date}`);
            });
        }

        // Manual filtering for budget (baseprojectprice is bigint/numeric)
        // Apply ±30% range to the budget
        let filteredProperties = properties || [];

        if (budgetMin || budgetMax) {
            // Use budgetMin as the primary budget value, calculate ±30% range
            const baseBudget = budgetMin || budgetMax;
            const minBudgetRange = baseBudget * 0.7;  // -30%
            const maxBudgetRange = baseBudget * 1.3;  // +30%

            console.log(`💰 Budget range: ₹${(minBudgetRange / 10000000).toFixed(2)}Cr to ₹${(maxBudgetRange / 10000000).toFixed(2)}Cr (±30% of ₹${(baseBudget / 10000000).toFixed(2)}Cr)`);

            const beforeBudgetCount = filteredProperties.length;
            filteredProperties = filteredProperties.filter(prop => {
                const price = prop.baseprojectprice;
                if (price == null) {
                    console.log(`  ⚠️ Skipping ${prop.projectname} - no price`);
                    return false;
                }

                const inRange = price >= minBudgetRange && price <= maxBudgetRange;
                if (!inRange && beforeBudgetCount < 10) {
                    console.log(`  ❌ Filtered out: ${prop.projectname} - ₹${(price / 10000000).toFixed(2)}Cr (outside range)`);
                }
                return inRange;
            });
            console.log(`💰 After budget filtering: ${filteredProperties.length} properties (filtered ${beforeBudgetCount - filteredProperties.length})`);
        }

        // Manual filtering for possession date
        if (possession && possession !== '') {
            const today = new Date();
            const beforePossessionCount = filteredProperties.length;

            console.log(`📅 Filtering properties for possession timeline: "${possession}"`);
            console.log(`📅 Current date: ${today.toLocaleDateString()}`);

            filteredProperties = filteredProperties.filter(prop => {
                if (!prop.possession_date) {
                    console.log(`  ⚠️ Skipping ${prop.projectname} - no possession date`);
                    return false;
                }

                const possessionDate = prop.possession_date.toString().toUpperCase();
                let isRTM = possessionDate.includes('RTM') || possessionDate.includes('READY');

                // Parse possession date first
                let propDate;
                let isPastDate = false;
                try {
                    // Try different date formats
                    if (possessionDate.includes('/')) {
                        const parts = possessionDate.split('/');
                        if (parts.length === 3) {
                            // Assume DD/MM/YY or MM/DD/YY format
                            const day = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10);
                            const year = parts[2].length === 2 ? parseInt('20' + parts[2], 10) : parseInt(parts[2], 10);
                            propDate = new Date(year, month - 1, day);
                        }
                    } else {
                        propDate = new Date(possessionDate);
                    }

                    // Check if date is valid and if it's in the past
                    if (propDate && !isNaN(propDate.getTime())) {
                        isPastDate = propDate < today;
                        // Treat past dates as RTM
                        if (isPastDate) {
                            isRTM = true;
                        }
                    }
                } catch (e) {
                    // If parsing fails and it's not RTM, skip it
                    if (!isRTM) {
                        console.log(`  ⚠️ Skipping ${prop.projectname} - invalid date format: ${possessionDate}`);
                        return false;
                    }
                }

                // Handle "Ready to Move In" option - show RTM properties (including past dates)
                if (possession === 'Ready to Move In') {
                    return isRTM;
                }

                // For other options, RTM properties should be excluded
                if (isRTM) {
                    return false;
                }

                // For future timeline options, we need a valid future date
                if (!propDate || isNaN(propDate.getTime())) {
                    console.log(`  ⚠️ Skipping ${prop.projectname} - could not parse date: ${possessionDate}`);
                    return false;
                }

                // Calculate months difference from today
                const monthsDiff = (propDate.getFullYear() - today.getFullYear()) * 12 +
                    (propDate.getMonth() - today.getMonth());

                // Match possession timeline based on months from now
                let matches = false;
                switch (possession) {
                    case 'Within 6 months':
                        matches = monthsDiff >= 0 && monthsDiff <= 6;
                        break;
                    case '6 months to 1 year':
                    case '6-12 months':
                        matches = monthsDiff > 6 && monthsDiff <= 12;
                        break;
                    case '1 to 2 years':
                    case '1-2 years':
                        matches = monthsDiff > 12 && monthsDiff <= 24;
                        break;
                    case 'More than 2 years':
                    case '2+ years':
                        matches = monthsDiff > 24;
                        break;
                    default:
                        matches = true;
                }

                if (beforePossessionCount < 20) {
                    console.log(`  ${matches ? '✅' : '❌'} ${prop.projectname}: Possession ${possessionDate} (${propDate.toLocaleDateString()}) = ${monthsDiff} months from now${isPastDate ? ' (PAST DATE - treated as RTM)' : ''}`);
                }

                return matches;
            });
            console.log(`📅 After possession filtering: ${filteredProperties.length} properties (from ${beforePossessionCount})`);
        }

        console.log(`✅ Final matched properties count: ${filteredProperties.length}`);

        res.status(200).json({
            success: true,
            matchedCount: filteredProperties.length,
            properties: filteredProperties
        });

    } catch (error) {
        console.error('❌ Error matching properties:', error);
        res.status(500).json({
            error: 'Failed to match properties',
            details: error.message
        });
    }
});

// ====== Endpoint: Create Requirement and Get Matching Properties =======
app.post('/api/create-requirement', async (req, res) => {
    try {
        const {
            budgetMin,
            budgetMax,
            possession,
            configuration,
            locations,
            propertyType,
            communityType,
            facing,
            buildingType,
            floorMin,
            floorMax,
            sizeMin,
            sizeMax,
            clientId,
            financingOption,
            includeGSTRegistration,
            budgetRange,
            possessionTimeline
        } = req.body;

        console.log('🔄 Creating requirement with data:', req.body);

        if (!supabase) {
            return res.status(503).json({ error: 'Supabase connection not available' });
        }

        // Get the next requirement number for this client
        const { data: existingRequirements, error: countError } = await supabase
            .from('client_Requirements')
            .select('requirement_number')
            .eq('client_mobile', clientId)
            .order('requirement_number', { ascending: false })
            .limit(1);

        if (countError) {
            console.error('❌ Error checking existing requirements:', countError);
        }

        const nextRequirementNumber = existingRequirements && existingRequirements.length > 0
            ? existingRequirements[0].requirement_number + 1
            : 1;

        console.log(`📝 Creating requirement #${nextRequirementNumber} for client ${clientId}`);

        // Parse criteria for property matching
        const configurationsArray = configuration ? configuration.split(',').map(c => c.trim()).filter(c => c) : [];
        const locationsArray = locations ? locations.split(',').map(l => l.trim()).filter(l => l) : [];

        console.log('🔍 Match criteria:', {
            propertyType,
            configurations: configurationsArray,
            locations: locationsArray,
            budgetMin,
            budgetMax,
            possession
        });

        // First, check if unified_data table has any data
        const { data: tableCheck, count: totalCount, error: tableError } = await supabase
            .from('unified_data')
            .select('*', { count: 'exact', head: false })
            .limit(5);

        if (tableError) {
            console.error('❌ Error querying unified_data table:', tableError);
            console.error('Error details:', JSON.stringify(tableError, null, 2));
        }

        console.log(`📊 Total records in unified_data: ${totalCount}`);
        console.log(`📊 Records returned: ${tableCheck?.length || 0}`);

        if (tableCheck && tableCheck.length > 0) {
            console.log(`📋 Sample record from unified_data:`, {
                projectname: tableCheck[0].projectname,
                project_type: tableCheck[0].project_type,
                bhk: tableCheck[0].bhk,
                areaname: tableCheck[0].areaname,
                baseprojectprice: tableCheck[0].baseprojectprice
            });
        } else {
            console.log('⚠️ No sample records retrieved from unified_data');
        }

        // Use new accurate matching logic from unified_data table
        let query = supabase.from('unified_data').select('*');

        // Filter by Property Type (project_type)
        if (propertyType && propertyType !== '') {
            query = query.ilike('project_type', `%${propertyType}%`);
            console.log(`📌 Filtering by project_type: ${propertyType}`);
        }

        // Filter by Configurations (bhk) - convert "2 BHK" to "2", "3 BHK" to "3", etc.
        if (configurationsArray.length > 0) {
            // bhk is stored as text in format "2", "3", "4", etc.
            const bhkFilters = configurationsArray.map(config => {
                const match = config.match(/(\d+\.?\d*)/);
                const bhkNum = match ? match[1] : config;
                return `bhk.eq.${bhkNum}`;
            }).join(',');
            query = query.or(bhkFilters);
            console.log(`📌 Filtering by bhk:`, configurationsArray);
        }

        // Filter by Locations (areaname)
        if (locationsArray.length > 0) {
            const locationFilters = locationsArray.map(loc => `areaname.ilike.%${loc}%`).join(',');
            query = query.or(locationFilters);
            console.log(`📌 Filtering by areaname:`, locationsArray);
        }

        // Execute query
        const { data: rawData, error: queryError } = await query;

        if (queryError) {
            console.error('❌ Supabase query error:', queryError);
        }

        console.log(`✅ Found ${rawData?.length || 0} properties before budget/possession filtering`);

        // Manual filtering for budget (baseprojectprice is bigint/numeric)
        // Apply ±30% range to the budget
        let data = rawData || [];

        if (budgetMin || budgetMax) {
            // Use budgetMin as the primary budget value, calculate ±30% range
            const baseBudget = budgetMin || budgetMax;
            const minBudgetRange = baseBudget * 0.7;  // -30%
            const maxBudgetRange = baseBudget * 1.3;  // +30%

            console.log(`💰 Budget range: ₹${(minBudgetRange / 10000000).toFixed(2)}Cr to ₹${(maxBudgetRange / 10000000).toFixed(2)}Cr (±30% of ₹${(baseBudget / 10000000).toFixed(2)}Cr)`);

            data = data.filter(prop => {
                const price = prop.baseprojectprice;
                if (price == null) return false;

                return price >= minBudgetRange && price <= maxBudgetRange;
            });
            console.log(`💰 After budget filtering: ${data.length} properties`);
        }

        // Manual filtering for possession date
        if (possession && possession !== '') {
            const today = new Date();

            data = data.filter(prop => {
                if (!prop.possession_date) return false;

                const possessionDate = prop.possession_date.toString().toUpperCase();

                // Check for RTM (Ready to Move)
                if (possessionDate.includes('RTM') || possessionDate.includes('READY')) {
                    return true;
                }

                // Parse possession date
                let propDate;
                try {
                    if (possessionDate.includes('/')) {
                        const parts = possessionDate.split('/');
                        if (parts.length === 3) {
                            propDate = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`);
                        }
                    } else {
                        propDate = new Date(possessionDate);
                    }
                } catch (e) {
                    return false;
                }

                if (isNaN(propDate.getTime())) return false;

                const monthsDiff = (propDate.getFullYear() - today.getFullYear()) * 12 +
                    (propDate.getMonth() - today.getMonth());

                switch (possession) {
                    case 'Within 6 months':
                        return monthsDiff <= 6;
                    case '6-12 months':
                        return monthsDiff > 6 && monthsDiff <= 12;
                    case '1-2 years':
                        return monthsDiff > 12 && monthsDiff <= 24;
                    case '2+ years':
                        return monthsDiff > 24;
                    default:
                        return true;
                }
            });
            console.log(`📅 After possession filtering: ${data.length} properties`);
        }

        // Sort by price (baseprojectprice)
        data.sort((a, b) => {
            const priceA = a.baseprojectprice || 0;
            const priceB = b.baseprojectprice || 0;
            return priceA - priceB;
        });

        console.log(`✅ Final matched properties count: ${data.length}`);

        // Limit to 100 properties after all filtering
        data = data.slice(0, 100);

        if (!data || data.length === 0) {
            console.warn('⚠️ No properties found matching the criteria');
        }

        // Group properties by projectname to handle multiple configurations
        const propertiesGroupedByProject = new Map();
        (data || []).forEach(property => {
            const projectName = property.projectname;

            if (!propertiesGroupedByProject.has(projectName)) {
                propertiesGroupedByProject.set(projectName, []);
            }
            propertiesGroupedByProject.get(projectName).push(property);
        });

        // Create property objects with all configurations
        const uniqueProperties = Array.from(propertiesGroupedByProject.entries()).map(([projectName, configs]) => {
            // Sort configurations by price
            configs.sort((a, b) => (a.baseprojectprice || 0) - (b.baseprojectprice || 0));

            // Use the first config as the base (lowest price)
            const baseProperty = { ...configs[0] };

            // Add all configurations as a separate field
            baseProperty.configurations = configs.map(config => ({
                id: config.id,
                bhk: config.bhk,
                facing: config.facing,
                baseprojectprice: config.baseprojectprice,
                sqfeet: config.sqfeet,
                sqyard: config.sqyard,
                carpetarea: config.carpetarea,
                superbuiltuparea: config.superbuiltuparea
            }));

            console.log(`📦 Property "${projectName}": ${configs.length} configuration(s)`);

            return baseProperty;
        });

        console.log(`📊 After grouping: ${uniqueProperties.length} unique properties with multiple configurations`);

        // Store ALL fields from unified_data (113 fields) - no filtering
        const formattedProperties = uniqueProperties;
        console.log(`📋 Storing complete property data with ${uniqueProperties.length > 0 ? Object.keys(uniqueProperties[0]).length : 0} fields per property`);

        console.log('📋 Matched Properties Project Names:', formattedProperties.map(p => p.projectname).join(', '));

        // Prepare preferences object
        const preferencesData = {
            budget: budgetMin && budgetMax ? `₹${budgetMin} - ₹${budgetMax}` : 'Not specified',
            budgetMin: budgetMin || 'Not specified',
            budgetMax: budgetMax || 'Not specified',
            budgetRange: budgetRange || 'Not decided yet',
            location: locations || 'Not specified',
            locations: locationsArray,
            possession: possession || 'Not specified',
            possessions: possession ? [possession] : [],
            possessionTimeline: possessionTimeline || 'Not decided yet',
            configuration: configuration || 'Not specified',
            configurations: configurationsArray,
            propertyType: propertyType || 'Not specified',
            gatedType: communityType || 'Not specified',
            facing: facing || 'Not specified',
            buildingType: buildingType || 'Not specified',
            floorMin: floorMin || 'Not specified',
            floorMax: floorMax || 'Not specified',
            sizeMin: sizeMin || 'Not specified',
            sizeMax: sizeMax || 'Not specified',
            financingOption: financingOption || 'Loan option',
            includeGSTRegistration: includeGSTRegistration || false,
            matchedPropertyCount: String(formattedProperties.length)
        };

        // Save requirement to client_Requirements table with matched properties
        const requirementData = {
            client_mobile: clientId,
            requirement_number: nextRequirementNumber,
            requirement_name: `Requirement ${nextRequirementNumber}`,
            preferences: preferencesData,
            matched_properties: formattedProperties,
            shortlisted_properties: [],
            site_visits: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: insertedRequirement, error: insertError } = await supabase
            .from('client_Requirements')
            .insert([requirementData])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Error saving requirement to Supabase:', insertError);
            return res.status(500).json({
                error: 'Failed to save requirement',
                details: insertError.message
            });
        }

        console.log(`✅ Requirement saved to Supabase with ID: ${insertedRequirement.id}, Requirement #${nextRequirementNumber}`);

        // Update Zoho Lead with preferences (non-blocking)
        if (clientId) {
            console.log('🔄 Attempting to update Zoho lead preferences...');
            console.log(`📱 Client mobile number (clientId): ${clientId}`);

            // Find Zoho lead ID by mobile number
            const zohoLeadId = await findZohoLeadIdByMobile(clientId);

            if (zohoLeadId) {
                console.log(`✅ Found Zoho lead ID: ${zohoLeadId}, preparing preferences update...`);

                // Prepare Zoho preferences from requirement data
                const zohoPreferences = {
                    budget: preferencesData.budgetRange || `₹${budgetMin} - ₹${budgetMax}`,
                    propertyType: preferencesData.propertyType,
                    possessionTimeline: preferencesData.possessionTimeline,
                    location: locations || (preferencesData.locations && preferencesData.locations.length > 0 ? preferencesData.locations.join(', ') : ''),
                    configuration: configuration || (preferencesData.configurations && preferencesData.configurations.length > 0 ? preferencesData.configurations.join(', ') : ''),
                    propertySize: sizeMin && sizeMax ? `${sizeMin} - ${sizeMax} SqFt` : '',
                    matchedPropertyCount: formattedProperties.length,
                    financingOption: financingOption || 'Loan option',
                    includeGSTRegistration: includeGSTRegistration ? 'Yes' : 'No'
                };

                // Prepare raw data for Latest_Requirement formatting (uses arrays and numeric values)
                const rawDataForLatestRequirement = {
                    propertyType: propertyType,
                    configurationsArray: configurationsArray,
                    configuration: configuration,
                    locationsArray: locationsArray,
                    location: locations,
                    budgetMin: budgetMin,
                    budgetMax: budgetMax,
                    budgetRange: budgetRange,
                    possession: possession,
                    possessionTimeline: possessionTimeline,
                    sizeMin: sizeMin,
                    sizeMax: sizeMax,
                    propertySize: sizeMin && sizeMax ? `${sizeMin} - ${sizeMax} SqFt` : '',
                    financingOption: financingOption,
                    includeGSTRegistration: includeGSTRegistration,
                    matchedPropertyCount: formattedProperties.length
                };

                console.log('📋 Preferences to update in Zoho:', zohoPreferences);

                const zohoUpdateResult = await updateZohoLeadPreferences(zohoLeadId, zohoPreferences, rawDataForLatestRequirement);

                if (zohoUpdateResult.success) {
                    console.log('✅ Zoho lead preferences updated successfully');

                    // Return success with Zoho sync confirmation
                    return res.status(200).json({
                        success: true,
                        message: 'Requirement created successfully',
                        requirementId: insertedRequirement.id.toString(),
                        requirementNumber: nextRequirementNumber,
                        matchingProperties: formattedProperties,
                        totalMatches: formattedProperties.length,
                        zohoSynced: true
                    });
                } else {
                    console.error('❌ Failed to update Zoho lead preferences:', zohoUpdateResult.error || zohoUpdateResult.message);
                    console.error('⚠️ Requirement saved to Supabase but Zoho update failed - data may be out of sync');

                    // Return success but with warning about Zoho sync failure
                    return res.status(200).json({
                        success: true,
                        message: 'Requirement created successfully',
                        requirementId: insertedRequirement.id.toString(),
                        requirementNumber: nextRequirementNumber,
                        matchingProperties: formattedProperties,
                        totalMatches: formattedProperties.length,
                        zohoSynced: false,
                        warning: 'Requirement saved but Zoho CRM sync failed. Please manually update Zoho or contact support.'
                    });
                }
            } else {
                console.log(`⚠️ Could not find Zoho lead for mobile: ${clientId}`);
                console.log('💡 This could mean: 1) No lead exists with this mobile, 2) Mobile format mismatch, or 3) Zoho API error');

                // Return success but with warning about Zoho lead not found
                return res.status(200).json({
                    success: true,
                    message: 'Requirement created successfully',
                    requirementId: insertedRequirement.id.toString(),
                    requirementNumber: nextRequirementNumber,
                    matchingProperties: formattedProperties,
                    totalMatches: formattedProperties.length,
                    zohoSynced: false,
                    warning: 'Requirement saved but Zoho lead not found. Zoho CRM was not updated.'
                });
            }
        } else {
            console.log('⚠️ No clientId provided, skipping Zoho update');
        }

        // Default response if no Zoho update was attempted
        res.status(200).json({
            success: true,
            message: 'Requirement created successfully',
            requirementId: insertedRequirement.id.toString(),
            requirementNumber: nextRequirementNumber,
            matchingProperties: formattedProperties,
            totalMatches: formattedProperties.length,
            zohoSynced: false
        });

    } catch (error) {
        console.error('❌ Error creating requirement:', error);
        res.status(500).json({
            error: 'Failed to create requirement',
            details: error.message
        });
    }
});

// ====== Endpoint: Update Requirement =======
app.put('/api/update-requirement/:requirementId', async (req, res) => {
    try {
        // Convert requirementId from string to number
        const requirementId = parseInt(req.params.requirementId, 10);

        // Validate that it's a valid number
        if (isNaN(requirementId)) {
            return res.status(400).json({
                error: 'Invalid requirement ID',
                details: 'Requirement ID must be a number'
            });
        }

        const {
            budgetMin,
            budgetMax,
            possession,
            configuration,
            locations,
            propertyType,
            communityType,
            facing,
            buildingType,
            floorMin,
            floorMax,
            sizeMin,
            sizeMax,
            clientId,
            financingOption,
            includeGSTRegistration,
            budgetRange,
            possessionTimeline
        } = req.body;

        console.log(`🔄 Updating requirement ${requirementId} with data:`, req.body);

        if (!supabase) {
            return res.status(503).json({ error: 'Supabase connection not available' });
        }

        // Parse criteria for property matching
        const configurationsArray = configuration ? configuration.split(',').map(c => c.trim()).filter(c => c) : [];
        const locationsArray = locations ? locations.split(',').map(l => l.trim()).filter(l => l) : [];

        console.log('🔍 Match criteria:', {
            propertyType,
            configurations: configurationsArray,
            locations: locationsArray,
            budgetMin,
            budgetMax,
            possession
        });

        // Use new accurate matching logic from unified_data table
        let query = supabase.from('unified_data').select('*');

        // Filter by Property Type (project_type)
        if (propertyType && propertyType !== '') {
            query = query.ilike('project_type', `%${propertyType}%`);
            console.log(`📌 Filtering by project_type: ${propertyType}`);
        }

        // Filter by Configurations (bhk)
        if (configurationsArray.length > 0) {
            const bhkFilters = configurationsArray.map(config => {
                const match = config.match(/(\d+\.?\d*)/);
                const bhkNum = match ? match[1] : config;
                return `bhk.eq.${bhkNum}`;
            }).join(',');
            query = query.or(bhkFilters);
            console.log(`📌 Filtering by bhk:`, configurationsArray);
        }

        // Filter by Locations (areaname)
        if (locationsArray.length > 0) {
            const locationFilters = locationsArray.map(loc => `areaname.ilike.%${loc}%`).join(',');
            query = query.or(locationFilters);
            console.log(`📌 Filtering by areaname:`, locationsArray);
        }

        // Execute query
        const { data: rawData, error: queryError } = await query;

        if (queryError) {
            console.error('❌ Supabase query error:', queryError);
        }

        console.log(`✅ Found ${rawData?.length || 0} properties before budget/possession filtering`);

        // Manual filtering for budget
        let data = rawData || [];

        if (budgetMin || budgetMax) {
            const baseBudget = budgetMin || budgetMax;
            const minBudgetRange = baseBudget * 0.7;
            const maxBudgetRange = baseBudget * 1.3;

            console.log(`💰 Budget range: ₹${(minBudgetRange / 10000000).toFixed(2)}Cr to ₹${(maxBudgetRange / 10000000).toFixed(2)}Cr (±30% of ₹${(baseBudget / 10000000).toFixed(2)}Cr)`);

            data = data.filter(prop => {
                const price = prop.baseprojectprice;
                if (price == null) return false;
                return price >= minBudgetRange && price <= maxBudgetRange;
            });
            console.log(`💰 After budget filtering: ${data.length} properties`);
        }

        // Manual filtering for possession date
        if (possession && possession !== '') {
            const today = new Date();
            const beforePossessionCount = data.length;

            console.log(`📅 Filtering properties for possession timeline: "${possession}"`);
            console.log(`📅 Current date: ${today.toLocaleDateString()}`);

            data = data.filter(prop => {
                if (!prop.possession_date) {
                    console.log(`  ⚠️ Skipping ${prop.projectname} - no possession date`);
                    return false;
                }

                const possessionDate = prop.possession_date.toString().toUpperCase();
                let isRTM = possessionDate.includes('RTM') || possessionDate.includes('READY');

                // Parse possession date first
                let propDate;
                let isPastDate = false;
                try {
                    // Try different date formats
                    if (possessionDate.includes('/')) {
                        const parts = possessionDate.split('/');
                        if (parts.length === 3) {
                            // Assume DD/MM/YY or MM/DD/YY format
                            const day = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10);
                            const year = parts[2].length === 2 ? parseInt('20' + parts[2], 10) : parseInt(parts[2], 10);
                            propDate = new Date(year, month - 1, day);
                        }
                    } else {
                        propDate = new Date(possessionDate);
                    }

                    // Check if date is valid and if it's in the past
                    if (propDate && !isNaN(propDate.getTime())) {
                        isPastDate = propDate < today;
                        // Treat past dates as RTM
                        if (isPastDate) {
                            isRTM = true;
                        }
                    }
                } catch (e) {
                    // If parsing fails and it's not RTM, skip it
                    if (!isRTM) {
                        console.log(`  ⚠️ Skipping ${prop.projectname} - invalid date format: ${possessionDate}`);
                        return false;
                    }
                }

                // Handle "Ready to Move In" option - show RTM properties (including past dates)
                if (possession === 'Ready to Move In') {
                    return isRTM;
                }

                // For other options, RTM properties should be excluded
                if (isRTM) {
                    return false;
                }

                // For future timeline options, we need a valid future date
                if (!propDate || isNaN(propDate.getTime())) {
                    console.log(`  ⚠️ Skipping ${prop.projectname} - could not parse date: ${possessionDate}`);
                    return false;
                }

                // Calculate months difference from today
                const monthsDiff = (propDate.getFullYear() - today.getFullYear()) * 12 +
                    (propDate.getMonth() - today.getMonth());

                // Match possession timeline based on months from now
                let matches = false;
                switch (possession) {
                    case 'Within 6 months':
                        matches = monthsDiff >= 0 && monthsDiff <= 6;
                        break;
                    case '6 months to 1 year':
                    case '6-12 months':
                        matches = monthsDiff > 6 && monthsDiff <= 12;
                        break;
                    case '1 to 2 years':
                    case '1-2 years':
                        matches = monthsDiff > 12 && monthsDiff <= 24;
                        break;
                    case 'More than 2 years':
                    case '2+ years':
                        matches = monthsDiff > 24;
                        break;
                    default:
                        matches = true;
                }

                if (beforePossessionCount < 20) {
                    console.log(`  ${matches ? '✅' : '❌'} ${prop.projectname}: Possession ${possessionDate} (${propDate.toLocaleDateString()}) = ${monthsDiff} months from now${isPastDate ? ' (PAST DATE - treated as RTM)' : ''}`);
                }

                return matches;
            });
            console.log(`📅 After possession filtering: ${data.length} properties (from ${beforePossessionCount})`);
        }

        // Sort by price
        data.sort((a, b) => {
            const priceA = a.baseprojectprice || 0;
            const priceB = b.baseprojectprice || 0;
            return priceA - priceB;
        });

        console.log(`✅ Final matched properties count: ${data.length}`);

        // Limit to 100 properties
        data = data.slice(0, 100);

        // Group properties by projectname to handle multiple configurations
        const propertiesGroupedByProject = new Map();
        (data || []).forEach(property => {
            const projectName = property.projectname;

            if (!propertiesGroupedByProject.has(projectName)) {
                propertiesGroupedByProject.set(projectName, []);
            }
            propertiesGroupedByProject.get(projectName).push(property);
        });

        // Create property objects with all configurations
        const uniqueProperties = Array.from(propertiesGroupedByProject.entries()).map(([projectName, configs]) => {
            // Sort configurations by price
            configs.sort((a, b) => (a.baseprojectprice || 0) - (b.baseprojectprice || 0));

            // Use the first config as the base (lowest price)
            const baseProperty = { ...configs[0] };

            // Add all configurations as a separate field
            baseProperty.configurations = configs.map(config => ({
                id: config.id,
                bhk: config.bhk,
                facing: config.facing,
                baseprojectprice: config.baseprojectprice,
                sqfeet: config.sqfeet,
                sqyard: config.sqyard,
                carpetarea: config.carpetarea,
                superbuiltuparea: config.superbuiltuparea
            }));

            console.log(`📦 Property "${projectName}": ${configs.length} configuration(s)`);

            return baseProperty;
        });

        console.log(`📊 After grouping: ${uniqueProperties.length} unique properties with multiple configurations`);

        // Store ALL fields from unified_data (113 fields) - no filtering
        const formattedProperties = uniqueProperties;
        console.log(`📋 Storing complete property data with ${uniqueProperties.length > 0 ? Object.keys(uniqueProperties[0]).length : 0} fields per property`);

        console.log('📋 Matched Properties Project Names:', formattedProperties.map(p => p.projectname).join(', '));

        // Prepare preferences object
        const preferencesData = {
            budget: budgetMin && budgetMax ? `₹${budgetMin} - ₹${budgetMax}` : 'Not specified',
            budgetMin: budgetMin || 'Not specified',
            budgetMax: budgetMax || 'Not specified',
            budgetRange: budgetRange || 'Not decided yet',
            location: locations || 'Not specified',
            locations: locationsArray,
            possession: possession || 'Not specified',
            possessions: possession ? [possession] : [],
            possessionTimeline: possessionTimeline || 'Not decided yet',
            configuration: configuration || 'Not specified',
            configurations: configurationsArray,
            propertyType: propertyType || 'Not specified',
            gatedType: communityType || 'Not specified',
            facing: facing || 'Not specified',
            buildingType: buildingType || 'Not specified',
            floorMin: floorMin || 'Not specified',
            floorMax: floorMax || 'Not specified',
            sizeMin: sizeMin || 'Not specified',
            sizeMax: sizeMax || 'Not specified',
            financingOption: financingOption || 'Loan option',
            includeGSTRegistration: includeGSTRegistration || false,
            matchedPropertyCount: String(formattedProperties.length)
        };

        // Update requirement in database
        // Note: requirementId parameter is actually the requirement_number, not the database id
        const { data: updatedRequirement, error: updateError } = await supabase
            .from('client_Requirements')
            .update({
                preferences: preferencesData,
                matched_properties: formattedProperties,
                updated_at: new Date().toISOString()
            })
            .eq('client_mobile', clientId)
            .eq('requirement_number', requirementId)
            .select()
            .single();

        if (updateError) {
            console.error('❌ Error updating requirement in Supabase:', updateError);
            return res.status(500).json({
                error: 'Failed to update requirement',
                details: updateError.message
            });
        }

        console.log(`✅ Requirement ${requirementId} updated successfully`);

        // Update Zoho Lead with preferences (non-blocking)
        if (clientId) {
            const zohoLeadId = await findZohoLeadIdByMobile(clientId);

            if (zohoLeadId) {
                const zohoPreferences = {
                    budget: preferencesData.budgetRange || `₹${budgetMin} - ₹${budgetMax}`,
                    propertyType: preferencesData.propertyType,
                    possessionTimeline: preferencesData.possessionTimeline,
                    location: locations || (preferencesData.locations && preferencesData.locations.length > 0 ? preferencesData.locations.join(', ') : ''),
                    configuration: configuration || (preferencesData.configurations && preferencesData.configurations.length > 0 ? preferencesData.configurations.join(', ') : ''),
                    propertySize: sizeMin && sizeMax ? `${sizeMin} - ${sizeMax} SqFt` : '',
                    matchedPropertyCount: formattedProperties.length,
                    financingOption: financingOption || 'Loan option',
                    includeGSTRegistration: includeGSTRegistration ? 'Yes' : 'No'
                };

                await updateZohoLeadPreferences(zohoLeadId, zohoPreferences);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Requirement updated successfully',
            requirementId: updatedRequirement.id.toString(),
            matchingProperties: formattedProperties,
            totalMatches: formattedProperties.length
        });

    } catch (error) {
        console.error('❌ Error updating requirement:', error);
        res.status(500).json({
            error: 'Failed to update requirement',
            details: error.message
        });
    }
});

// ====== Endpoint: Get Requirements for a Client =======
app.get('/api/requirements/:clientId', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase connection not available' });
        }

        const { clientId } = req.params;
        console.log(`🔍 Fetching requirements for client: ${clientId}`);

        // Try different mobile number formats
        const mobileVariations = [
            clientId,                                    // Original (e.g., 917331111835 or +918811882289)
            clientId.replace(/^\+/, ''),                 // Remove leading + (e.g., 918811882289)
            clientId.replace(/^\+91/, ''),               // Remove +91 (e.g., 8811882289)
            clientId.replace(/^91/, ''),                 // Remove 91 (e.g., 7331111835)
            `+${clientId}`,                              // Add + prefix (e.g., +917331111835)
            `+91${clientId}`,                            // Add +91 prefix
            `91${clientId}`                              // Add 91 prefix
        ];

        console.log(`📱 Trying mobile variations:`, mobileVariations);

        // Try each variation until we find requirements
        let requirements = [];
        let foundWithMobile = null;

        for (const mobile of mobileVariations) {
            const { data, error } = await supabase
                .from('client_Requirements')
                .select('*')
                .eq('client_mobile', mobile)
                .order('requirement_number', { ascending: true });

            if (error) {
                console.error(`❌ Error querying with mobile ${mobile}:`, error);
                continue;
            }

            if (data && data.length > 0) {
                requirements = data;
                foundWithMobile = mobile;
                console.log(`✅ Found ${requirements.length} requirements with mobile: ${mobile}`);
                break;
            }
        }

        if (requirements.length === 0) {
            console.log(`⚠️ No requirements found for any mobile variation of: ${clientId}`);
        } else {
            requirements.forEach((req, index) => {
                if (req.matched_properties && req.matched_properties.length > 0) {
                    console.log(`📋 Requirement ${index + 1} Matched Properties Project Names:`, req.matched_properties.map(p => p.projectname || p.ProjectName || 'Unknown').join(', '));
                }
            });
        }

        // Enrich matched properties with full data from unified_data table
        const enrichedRequirements = await Promise.all(
            (requirements || []).map(async (req) => {
                let enrichedMatchedProperties = req.matched_properties || [];

                // If there are matched properties, fetch full details from unified_data
                if (enrichedMatchedProperties.length > 0) {
                    try {
                        console.log(`🔍 Requirement ${req.requirement_number}: Processing ${enrichedMatchedProperties.length} matched properties`);

                        // Extract property IDs from matched properties
                        const propertyIds = enrichedMatchedProperties
                            .map(p => p.id)
                            .filter(id => id != null && id !== '');

                        console.log(`📊 Found ${propertyIds.length} valid property IDs to enrich`);

                        if (propertyIds.length > 0) {
                            console.log(`🔍 Fetching ALL configurations from unified_data by projectname...`);

                            // STRATEGY: Query by projectname to get ALL configurations for each property
                            // This ensures we get all BHK/Facing/Price variations
                            const projectNames = [...new Set(enrichedMatchedProperties.map(p => p.projectname || p.ProjectName).filter(n => n))];
                            console.log(`🔍 Unique project names to query: ${projectNames.length}`);

                            let fullProperties = [];

                            // Query each project name to get all configurations
                            for (const projectName of projectNames) {
                                console.log(`🔍 Querying "${projectName}"...`);

                                // Try exact match first
                                let { data: exactMatch } = await supabase
                                    .from('unified_data')
                                    .select('*')
                                    .eq('projectname', projectName);

                                if (exactMatch && exactMatch.length > 0) {
                                    fullProperties.push(...exactMatch);
                                    console.log(`✅ Exact match for "${projectName}": ${exactMatch.length} configuration(s)`);
                                } else {
                                    // Try fuzzy match without apostrophes (e.g., "SILPA'S" -> "SILPA")
                                    const nameWithoutApostrophe = projectName.replace(/'/g, '');
                                    let { data: fuzzyMatch } = await supabase
                                        .from('unified_data')
                                        .select('*')
                                        .ilike('projectname', `%${nameWithoutApostrophe}%`);

                                    if (fuzzyMatch && fuzzyMatch.length > 0) {
                                        // Filter to get close matches
                                        const closeMatches = fuzzyMatch.filter(p =>
                                            p.projectname.replace(/'/g, '').toLowerCase().includes(nameWithoutApostrophe.toLowerCase())
                                        );
                                        if (closeMatches.length > 0) {
                                            fullProperties.push(...closeMatches);
                                            console.log(`✅ Fuzzy match for "${projectName}" found "${closeMatches[0].projectname}": ${closeMatches.length} configuration(s)`);
                                        } else {
                                            console.log(`⚠️ No match found for "${projectName}"`);
                                        }
                                    } else {
                                        console.log(`⚠️ No match found for "${projectName}"`);
                                    }
                                }
                            }

                            if (fullProperties && fullProperties.length > 0) {
                                console.log(`✅ Total retrieved: ${fullProperties.length} configuration records with all ${Object.keys(fullProperties[0] || {}).length} fields`);

                                // Group properties by projectname to create multi-configuration structure
                                const propertiesGroupedByProject = new Map();
                                fullProperties.forEach(property => {
                                    const projectName = property.projectname;

                                    if (!propertiesGroupedByProject.has(projectName)) {
                                        propertiesGroupedByProject.set(projectName, []);
                                    }
                                    propertiesGroupedByProject.get(projectName).push(property);
                                });

                                // Parse BHK preferences from requirement
                                const bhkPreferences = [];

                                // Configuration is inside preferences object
                                let configField = '';
                                if (req.preferences) {
                                    configField = req.preferences.configuration || req.preferences.config || '';
                                }

                                if (configField) {
                                    // Extract BHK values from strings like "3 BHK", "3.5 BHK", "2.5 BHK"
                                    const bhkMatches = configField.match(/(\d+\.?\d*)\s*BHK/gi);
                                    if (bhkMatches) {
                                        bhkPreferences.push(...bhkMatches.map(m => m.replace(/\s*BHK/i, '').trim()));
                                    }
                                }
                                console.log(`🔍 Requirement ${req.requirement_number} BHK preferences from "${configField}":`, bhkPreferences.length > 0 ? bhkPreferences : 'None (showing all)');

                                // Get budget preferences for ±30% filtering
                                const budgetMin = req.preferences?.budgetMin || 0;
                                const budgetMax = req.preferences?.budgetMax || 0;

                                // Create property objects with filtered configurations
                                enrichedMatchedProperties = Array.from(propertiesGroupedByProject.entries()).map(([projectName, configs]) => {
                                    // Filter configurations by BHK preference (if specified)
                                    let filteredConfigs = configs;
                                    if (bhkPreferences.length > 0) {
                                        filteredConfigs = configs.filter(config => {
                                            const configBhk = String(config.bhk || '').trim();
                                            return bhkPreferences.some(prefBhk => configBhk === prefBhk);
                                        });

                                        // If no configs match, keep all (don't exclude property entirely)
                                        if (filteredConfigs.length === 0) {
                                            console.log(`⚠️ No configs matched BHK filter for "${projectName}", keeping all ${configs.length} configs`);
                                            filteredConfigs = configs;
                                        }
                                    }

                                    // Apply ±30% budget filtering (if budget is specified)
                                    if (budgetMin || budgetMax) {
                                        const baseBudget = budgetMin || budgetMax;
                                        const minBudgetRange = baseBudget * 0.7;
                                        const maxBudgetRange = baseBudget * 1.3;

                                        const beforeBudgetFilter = filteredConfigs.length;
                                        filteredConfigs = filteredConfigs.filter(config => {
                                            const price = config.baseprojectprice;
                                            if (price == null) return false;
                                            return price >= minBudgetRange && price <= maxBudgetRange;
                                        });

                                        if (beforeBudgetFilter > 0 && filteredConfigs.length !== beforeBudgetFilter) {
                                            console.log(`💰 "${projectName}": ${filteredConfigs.length} configs after budget filter (from ${beforeBudgetFilter})`);
                                        }
                                    }

                                    // Sort configurations by price
                                    filteredConfigs.sort((a, b) => (a.baseprojectprice || 0) - (b.baseprojectprice || 0));

                                    // Use the first config as the base (lowest price)
                                    const baseProperty = { ...filteredConfigs[0] };

                                    // Add filtered configurations as a separate field
                                    baseProperty.configurations = filteredConfigs.map(config => ({
                                        id: config.id,
                                        bhk: config.bhk,
                                        facing: config.facing,
                                        baseprojectprice: config.baseprojectprice,
                                        sqfeet: config.sqfeet,
                                        sqyard: config.sqyard,
                                        carpetarea: config.carpetarea,
                                        superbuiltuparea: config.superbuiltuparea
                                    }));

                                    console.log(`📦 Enriched "${projectName}": ${filteredConfigs.length} configuration(s) (filtered from ${configs.length} total)`);

                                    return baseProperty;
                                });

                                console.log(`✅ Successfully enriched ${enrichedMatchedProperties.length} unique properties with configurations`);
                            } else {
                                console.log(`⚠️ No properties found in unified_data for the given IDs or project names`);
                            }
                        } else {
                            console.log(`⚠️ No valid property IDs found in matched_properties`);
                        }
                    } catch (error) {
                        console.error('❌ Error enriching properties:', error);
                        // Fall back to original matched_properties if enrichment fails
                    }
                }

                return {
                    id: req.requirement_number,
                    name: req.requirement_name || `Requirement ${req.requirement_number}`,
                    preferences: req.preferences || {},
                    matchedProperties: enrichedMatchedProperties,
                    shortlistedProperties: req.shortlisted_properties || [],
                    siteVisits: req.site_visits || [],
                    createdAt: req.created_at,
                    updatedAt: req.updated_at
                };
            })
        );

        res.status(200).json({
            success: true,
            requirements: enrichedRequirements
        });

    } catch (error) {
        console.error('❌ Error fetching requirements:', error);
        res.status(500).json({
            error: 'Failed to fetch requirements',
            details: error.message
        });
    }
});

// ====== Endpoint: Refresh Matched Properties for a Requirement =======
app.post('/api/refresh-requirement-matches/:requirementNumber', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase connection not available' });
        }

        const { requirementNumber } = req.params;
        const { clientId } = req.body;

        console.log(`🔄 Refreshing matches for requirement #${requirementNumber}, client: ${clientId}`);

        // Fetch the existing requirement
        const { data: existingReq, error: fetchError } = await supabase
            .from('client_Requirements')
            .select('*')
            .eq('client_mobile', clientId)
            .eq('requirement_number', parseInt(requirementNumber))
            .single();

        if (fetchError || !existingReq) {
            console.error('❌ Requirement not found:', fetchError);
            return res.status(404).json({
                error: 'Requirement not found',
                details: fetchError?.message
            });
        }

        // Extract preferences
        const preferences = existingReq.preferences || {};
        const budgetMin = preferences.budgetMin || 0;
        const budgetMax = preferences.budgetMax || 0;
        const configuration = preferences.configuration || '';
        const locations = preferences.location || '';
        const propertyType = preferences.propertyType || '';
        const possession = preferences.possession || '';

        console.log('🔍 Refreshing with criteria:', {
            budgetMin,
            budgetMax,
            configuration,
            locations,
            propertyType,
            possession
        });

        // Parse criteria
        const configurationsArray = configuration ? configuration.split(',').map(c => c.trim()).filter(c => c) : [];
        const locationsArray = locations ? locations.split(',').map(l => l.trim()).filter(l => l) : [];

        // Query unified_data table
        let query = supabase.from('unified_data').select('*');

        if (propertyType && propertyType !== '') {
            query = query.ilike('project_type', `%${propertyType}%`);
        }

        if (configurationsArray.length > 0) {
            const bhkFilters = configurationsArray.map(config => {
                const match = config.match(/(\d+\.?\d*)/);
                const bhkNum = match ? match[1] : config;
                return `bhk.eq.${bhkNum}`;
            }).join(',');
            query = query.or(bhkFilters);
        }

        if (locationsArray.length > 0) {
            const locationFilters = locationsArray.map(loc => `areaname.ilike.%${loc}%`).join(',');
            query = query.or(locationFilters);
        }

        const { data: rawData, error: queryError } = await query;

        if (queryError) {
            console.error('❌ Query error:', queryError);
        }

        console.log(`✅ Found ${rawData?.length || 0} properties before budget/possession filtering`);

        let data = rawData || [];

        // Apply ±30% budget filtering
        if (budgetMin || budgetMax) {
            const baseBudget = budgetMin || budgetMax;
            const minBudgetRange = baseBudget * 0.7;
            const maxBudgetRange = baseBudget * 1.3;

            console.log(`💰 Budget range: ₹${(minBudgetRange / 10000000).toFixed(2)}Cr to ₹${(maxBudgetRange / 10000000).toFixed(2)}Cr (±30% of ₹${(baseBudget / 10000000).toFixed(2)}Cr)`);

            data = data.filter(prop => {
                const price = prop.baseprojectprice;
                if (price == null) return false;
                return price >= minBudgetRange && price <= maxBudgetRange;
            });
            console.log(`💰 After budget filtering: ${data.length} properties`);
        }

        // Filter by possession
        if (possession && possession !== '') {
            const today = new Date();
            const beforePossessionCount = data.length;

            data = data.filter(prop => {
                if (!prop.possession_date) return false;
                const possessionDate = prop.possession_date.toString().toUpperCase();
                let isRTM = possessionDate.includes('RTM') || possessionDate.includes('READY');
                let propDate;
                let isPastDate = false;

                try {
                    if (possessionDate.includes('/')) {
                        const parts = possessionDate.split('/');
                        if (parts.length === 3) {
                            propDate = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`);
                        }
                    } else if (!isRTM) {
                        propDate = new Date(possessionDate);
                    }

                    if (propDate && !isNaN(propDate.getTime())) {
                        isPastDate = propDate < today;
                        if (isPastDate) {
                            isRTM = true;
                        }
                    }
                } catch (e) {
                    if (!isRTM) {
                        return false;
                    }
                }

                if (possession === 'Ready to Move In') {
                    return isRTM;
                }

                if (isRTM) {
                    return false;
                }

                if (!propDate || isNaN(propDate.getTime())) {
                    return false;
                }

                const monthsDiff = (propDate.getFullYear() - today.getFullYear()) * 12 +
                    (propDate.getMonth() - today.getMonth());

                switch (possession) {
                    case 'Within 6 months':
                        return monthsDiff >= 0 && monthsDiff <= 6;
                    case '6 months to 1 year':
                    case '6-12 months':
                        return monthsDiff > 6 && monthsDiff <= 12;
                    case '1 to 2 years':
                    case '1-2 years':
                        return monthsDiff > 12 && monthsDiff <= 24;
                    case 'More than 2 years':
                    case '2+ years':
                        return monthsDiff > 24;
                    default:
                        return true;
                }
            });
            console.log(`📅 After possession filtering: ${data.length} properties (from ${beforePossessionCount})`);
        }

        // Sort and limit
        data.sort((a, b) => (a.baseprojectprice || 0) - (b.baseprojectprice || 0));
        data = data.slice(0, 100);

        // Group by project
        const propertiesGroupedByProject = new Map();
        data.forEach(property => {
            const projectName = property.projectname;
            if (!propertiesGroupedByProject.has(projectName)) {
                propertiesGroupedByProject.set(projectName, []);
            }
            propertiesGroupedByProject.get(projectName).push(property);
        });

        const uniqueProperties = Array.from(propertiesGroupedByProject.entries()).map(([projectName, configs]) => {
            configs.sort((a, b) => (a.baseprojectprice || 0) - (b.baseprojectprice || 0));
            const baseProperty = { ...configs[0] };
            baseProperty.configurations = configs.map(config => ({
                id: config.id,
                bhk: config.bhk,
                facing: config.facing,
                baseprojectprice: config.baseprojectprice,
                sqfeet: config.sqfeet,
                sqyard: config.sqyard,
                carpetarea: config.carpetarea,
                superbuiltuparea: config.superbuiltuparea
            }));
            return baseProperty;
        });

        console.log(`✅ Refreshed: ${uniqueProperties.length} properties with ${data.length} total configurations`);

        // Update the requirement
        const { data: updatedReq, error: updateError } = await supabase
            .from('client_Requirements')
            .update({
                matched_properties: uniqueProperties,
                preferences: {
                    ...preferences,
                    matchedPropertyCount: String(uniqueProperties.length)
                },
                updated_at: new Date().toISOString()
            })
            .eq('client_mobile', clientId)
            .eq('requirement_number', parseInt(requirementNumber))
            .select()
            .single();

        if (updateError) {
            console.error('❌ Error updating requirement:', updateError);
            return res.status(500).json({
                error: 'Failed to update requirement',
                details: updateError.message
            });
        }

        res.status(200).json({
            success: true,
            message: 'Matched properties refreshed successfully',
            totalMatches: uniqueProperties.length,
            matchingProperties: uniqueProperties
        });

    } catch (error) {
        console.error('❌ Error refreshing requirement matches:', error);
        res.status(500).json({
            error: 'Failed to refresh matches',
            details: error.message
        });
    }
});

// ====== Endpoint: Refresh Single Property Configurations =======
app.post('/api/refresh-property-configs/:requirementNumber', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase connection not available' });
        }

        const { requirementNumber } = req.params;
        const { clientId, projectName } = req.body;

        console.log(`🔄 Refreshing configurations for project: ${projectName} in requirement #${requirementNumber}`);

        // Fetch the existing requirement
        const { data: existingReq, error: fetchError } = await supabase
            .from('client_Requirements')
            .select('*')
            .eq('client_mobile', clientId)
            .eq('requirement_number', parseInt(requirementNumber))
            .single();

        if (fetchError || !existingReq) {
            console.error('❌ Requirement not found:', fetchError);
            return res.status(404).json({
                error: 'Requirement not found',
                details: fetchError?.message
            });
        }

        // Extract preferences
        const preferences = existingReq.preferences || {};
        const budgetMin = preferences.budgetMin || 0;
        const budgetMax = preferences.budgetMax || 0;
        const configuration = preferences.configuration || '';

        const configurationsArray = configuration ? configuration.split(',').map(c => c.trim()).filter(c => c) : [];

        console.log('🔍 Filtering for project:', projectName, 'with BHK preferences:', configurationsArray);

        // Query unified_data table for this specific project
        let query = supabase
            .from('unified_data')
            .select('*')
            .eq('projectname', projectName);

        // Apply BHK filtering if preferences exist
        if (configurationsArray.length > 0) {
            const bhkFilters = configurationsArray.map(config => {
                const match = config.match(/(\d+\.?\d*)/);
                const bhkNum = match ? match[1] : config;
                return `bhk.eq.${bhkNum}`;
            }).join(',');
            query = query.or(bhkFilters);
        }

        const { data: rawData, error: queryError } = await query;

        if (queryError) {
            console.error('❌ Query error:', queryError);
            return res.status(500).json({ error: 'Query failed', details: queryError.message });
        }

        console.log(`✅ Found ${rawData?.length || 0} configurations for ${projectName} before budget filtering`);

        let data = rawData || [];

        // Apply ±30% budget filtering
        if (budgetMin || budgetMax) {
            const baseBudget = budgetMin || budgetMax;
            const minBudgetRange = baseBudget * 0.7;
            const maxBudgetRange = baseBudget * 1.3;

            console.log(`💰 Budget range: ₹${(minBudgetRange / 10000000).toFixed(2)}Cr to ₹${(maxBudgetRange / 10000000).toFixed(2)}Cr`);

            data = data.filter(prop => {
                const price = prop.baseprojectprice;
                if (price == null) return false;
                return price >= minBudgetRange && price <= maxBudgetRange;
            });
            console.log(`💰 After budget filtering: ${data.length} configurations`);
        }

        if (data.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No configurations match the criteria',
                configurations: [],
                totalConfigs: 0
            });
        }

        // Sort by price
        data.sort((a, b) => (a.baseprojectprice || 0) - (b.baseprojectprice || 0));

        // Format configurations
        const configurations = data.map(config => ({
            id: config.id,
            bhk: config.bhk,
            facing: config.facing,
            baseprojectprice: config.baseprojectprice,
            sqfeet: config.sqfeet,
            sqyard: config.sqyard,
            carpetarea: config.carpetarea,
            superbuiltuparea: config.superbuiltuparea
        }));

        // Get base property info from first config
        const baseProperty = { ...data[0] };
        baseProperty.configurations = configurations;

        // Update matched_properties array for this requirement
        const matchedProperties = existingReq.matched_properties || [];
        const propertyIndex = matchedProperties.findIndex(p =>
            (p.projectname || p.ProjectName || p.PROJECTNAME) === projectName
        );

        if (propertyIndex !== -1) {
            // Update existing property
            matchedProperties[propertyIndex] = baseProperty;
        } else {
            // Add new property
            matchedProperties.push(baseProperty);
        }

        // Update the requirement
        const { data: updatedReq, error: updateError } = await supabase
            .from('client_Requirements')
            .update({
                matched_properties: matchedProperties,
                updated_at: new Date().toISOString()
            })
            .eq('client_mobile', clientId)
            .eq('requirement_number', parseInt(requirementNumber))
            .select()
            .single();

        if (updateError) {
            console.error('❌ Error updating requirement:', updateError);
            return res.status(500).json({
                error: 'Failed to update requirement',
                details: updateError.message
            });
        }

        console.log(`✅ Refreshed ${projectName}: ${configurations.length} configurations`);

        res.status(200).json({
            success: true,
            message: `Refreshed ${projectName} successfully`,
            configurations: configurations,
            totalConfigs: configurations.length,
            property: baseProperty
        });

    } catch (error) {
        console.error('❌ Error refreshing property configurations:', error);
        res.status(500).json({
            error: 'Failed to refresh property configurations',
            details: error.message
        });
    }
});

// ====== Endpoint: Delete a Requirement =======
app.delete('/api/requirements/:clientId/:requirementNumber', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase connection not available' });
        }

        const { clientId, requirementNumber } = req.params;
        console.log(`🗑️ Deleting requirement #${requirementNumber} for client ${clientId}`);

        // Delete requirement from client_Requirements table
        const { data, error } = await supabase
            .from('client_Requirements')
            .delete()
            .eq('client_mobile', clientId)
            .eq('requirement_number', parseInt(requirementNumber))
            .select();

        if (error) {
            console.error('❌ Error deleting requirement from Supabase:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete requirement',
                details: error.message
            });
        }

        if (!data || data.length === 0) {
            console.log(`❌ Requirement not found: ${clientId}/${requirementNumber}`);
            return res.status(404).json({
                success: false,
                error: 'Requirement not found'
            });
        }

        console.log(`✅ Requirement deleted successfully: ${clientId}/${requirementNumber}`);

        res.status(200).json({
            success: true,
            message: 'Requirement deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting requirement:', error);
        res.status(500).json({
            error: 'Failed to delete requirement',
            details: error.message
        });
    }
});

// ====== Endpoint: Match Properties from Supabase =======
app.post('/api/match-properties', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({
                error: 'Supabase connection not available',
                matchedCount: 0
            });
        }

        const {
            budgetMin,
            budgetMax,
            locations,
            configurations,
            possessions,
            propertyType,
            sizeMin,
            sizeMax
        } = req.body;

        console.log('🔍 Matching properties with criteria:', req.body);

        // Declare maxDate at function scope so it's accessible throughout
        let maxDate = null;

        // Start building the query
        let query = supabase.from('verified_properties').select('*', { count: 'exact', head: true });

        // Budget filter - Note: Base Project Price is STRING, so we'll filter manually later
        // Column name: "Base Project Price"
        if (budgetMin != null && budgetMax != null) {
            const minBudget = parseFloat(budgetMin);
            const maxBudget = parseFloat(budgetMax);

            if (!isNaN(minBudget) && !isNaN(maxBudget)) {
                // Budget filter will be applied after fetching data (see client-side filtering below)
                console.log(`💰 Budget filter (will apply manually): ${minBudget} - ${maxBudget} (₹${(minBudget / 10000000).toFixed(2)}Cr - ₹${(maxBudget / 10000000).toFixed(2)}Cr)`);
            }
        }

        // Location filter (multiple locations)
        // Column name: "AreaName"
        if (locations && Array.isArray(locations) && locations.length > 0) {
            // Supabase doesn't have a direct 'in' for text fields with case-insensitive search
            // We'll use 'or' with 'ilike' for each location
            const locationFilters = locations.map(loc => `AreaName.ilike.%${loc}%`).join(',');
            query = query.or(locationFilters);
            console.log(`📍 Location filter: ${locations.join(', ')}`);
        }

        // Configuration filter (multiple configurations like "2 BHK", "3 BHK")
        // Column name: "BHK" - stored as just numbers like "3", not "3 BHK"
        if (configurations && Array.isArray(configurations) && configurations.length > 0) {
            // Extract numbers from configurations (e.g., "3 BHK" → "3")
            const bhkNumbers = configurations.map(config => {
                const match = config.match(/(\d+\.?\d*)/);
                return match ? match[1] : config;
            });
            // Use .in() for exact matching
            query = query.in('BHK', bhkNumbers);
            console.log(`🏠 Configuration filter: ${bhkNumbers.join(', ')} (from ${configurations.join(', ')})`);
        }

        // Property Type filter
        // Column name: "property_type"
        if (propertyType && propertyType !== '') {
            query = query.ilike('property_type', `%${propertyType}%`);
            console.log(`🏛️ Property type filter: ${propertyType}`);
        }

        // Size filter (min and max in SqFt)
        // Column name: "SQ FEET"
        if (sizeMin || sizeMax) {
            if (sizeMin) {
                const min = parseFloat(sizeMin);
                if (!isNaN(min)) {
                    query = query.gte('SQ FEET', min);
                    console.log(`📦 Size min: ${min} sqft`);
                }
            }
            if (sizeMax) {
                const max = parseFloat(sizeMax);
                if (!isNaN(max)) {
                    query = query.lte('SQ FEET', max);
                    console.log(`📦 Size max: ${max} sqft`);
                }
            }
        }

        // Possession filter - Possession_Date column
        // Column name: "Possession_Date" - stored as dates like "01-12-2025"
        if (possessions && Array.isArray(possessions) && possessions.length > 0) {
            const today = new Date();

            // Find the maximum date range from all possessions
            possessions.forEach(poss => {
                const possLower = poss.toLowerCase();
                let months = 0;

                if (possLower.includes('ready to move') || possLower.includes('rtm')) {
                    months = 0; // Already ready
                } else if (possLower.includes('under 6 months') || possLower.includes('6 months')) {
                    months = 6;
                } else if (possLower.includes('under 1 year') || possLower.includes('1 year')) {
                    months = 12;
                } else if (possLower.includes('under 2 years') || possLower.includes('2 years')) {
                    months = 24;
                } else if (possLower.includes('more than 2 years')) {
                    months = 999; // No upper limit
                }

                if (months > 0 && months < 999) {
                    const targetDate = new Date(today);
                    targetDate.setMonth(today.getMonth() + months);

                    if (!maxDate || targetDate > maxDate) {
                        maxDate = targetDate;
                    }
                }
            });

            // Apply date filter if we have a max date
            if (maxDate) {
                // Format as DD-MM-YYYY to match Supabase format
                const day = String(maxDate.getDate()).padStart(2, '0');
                const month = String(maxDate.getMonth() + 1).padStart(2, '0');
                const year = maxDate.getFullYear();
                const formattedDate = `${day}-${month}-${year}`;

                // For now, don't apply date filter since Supabase stores dates as text
                // Instead, fetch all and we'll filter later if needed
                console.log(`📅 Possession filter: Looking for dates before ${formattedDate} (from ${possessions.join(', ')})`);
            } else {
                console.log(`📅 Possession filter: ${possessions.join(', ')} (no date filter applied)`);
            }
        }

        // Check if client wants full property data or just count
        const includeProperties = req.body.includeProperties || false;
        const returnAll = req.body.returnAll || false; // New parameter to get all properties

        // Execute the query
        if (includeProperties) {
            // Build a new query for fetching actual data
            let dataQuery = supabase
                .from('verified_properties')
                .select('ProjectName, AreaName, BHK, "Base Project Price", property_type, Possession_Date, "SQ FEET"', { count: 'exact' });

            // Note: Budget filter NOT applied in query (Base Project Price is STRING)
            // Budget filtering will be done client-side below
            if (budgetMin != null && budgetMax != null) {
                const minBudget = parseFloat(budgetMin);
                const maxBudget = parseFloat(budgetMax);
                if (!isNaN(minBudget) && !isNaN(maxBudget)) {
                    console.log(`💰 Budget filter (will apply client-side): ${minBudget} to ${maxBudget}`);
                }
            }

            if (locations && Array.isArray(locations) && locations.length > 0) {
                const locationFilters = locations.map(loc => `AreaName.ilike.%${loc}%`).join(',');
                dataQuery = dataQuery.or(locationFilters);
            }

            if (configurations && Array.isArray(configurations) && configurations.length > 0) {
                const bhkNumbers = configurations.map(config => {
                    const match = config.match(/(\d+\.?\d*)/);
                    return match ? match[1] : config;
                });
                dataQuery = dataQuery.in('BHK', bhkNumbers);
            }

            if (propertyType && propertyType !== '') {
                dataQuery = dataQuery.ilike('property_type', `%${propertyType}%`);
            }

            if (sizeMin) {
                const min = parseFloat(sizeMin);
                if (!isNaN(min)) dataQuery = dataQuery.gte('SQ FEET', min);
            }
            if (sizeMax) {
                const max = parseFloat(sizeMax);
                if (!isNaN(max)) dataQuery = dataQuery.lte('SQ FEET', max);
            }

            // Sort by price ascending to show properties within budget (cheapest first)
            dataQuery = dataQuery.order('Base Project Price', { ascending: true });

            // Limit results only for display (not for counting)
            // Increased limit to 2000 since budget filtering is done client-side
            if (!returnAll) {
                console.log(`📋 Limiting results to top 2000 properties for client-side filtering (returnAll: false)`);
                dataQuery = dataQuery.limit(2000);
            } else {
                console.log(`📋 Fetching ALL properties (returnAll: true)`);
            }

            const { data, error, count } = await dataQuery;
            console.log(`📊 Database query returned ${data?.length || 0} properties, total count: ${count}`);

            if (error) {
                console.error('❌ Supabase query error:', error);
                return res.status(500).json({
                    error: 'Failed to query properties',
                    details: error.message,
                    matchedCount: 0,
                    properties: []
                });
            }

            // Additional client-side budget filtering to ensure correctness
            let filteredData = data || [];
            console.log(`💰 Budget range for filtering: ₹${(parseFloat(budgetMin) / 10000000).toFixed(2)}Cr - ₹${(parseFloat(budgetMax) / 10000000).toFixed(2)}Cr`);

            if (budgetMin != null && budgetMax != null) {
                const minBudget = parseFloat(budgetMin);
                const maxBudget = parseFloat(budgetMax);
                if (!isNaN(minBudget) && !isNaN(maxBudget)) {
                    const beforeFilterCount = filteredData.length;
                    filteredData = filteredData.filter(property => {
                        const price = parseFloat(property['Base Project Price']);
                        const withinBudget = !isNaN(price) && price >= minBudget && price <= maxBudget;
                        if (!withinBudget && filteredData.length < 25) {
                            console.log(`🚫 Filtered out: ${property.ProjectName} - ₹${(price / 10000000).toFixed(2)}Cr (outside budget ₹${(minBudget / 10000000).toFixed(2)}Cr - ₹${(maxBudget / 10000000).toFixed(2)}Cr)`);
                        }
                        return withinBudget;
                    });
                    console.log(`🔍 After client-side budget filtering: ${filteredData.length} properties (from ${beforeFilterCount})`);
                    console.log(`🔍 First 3 properties after filtering: ${filteredData.slice(0, 3).map(p => `${p.ProjectName} - ₹${(parseFloat(p['Base Project Price']) / 10000000).toFixed(2)}Cr`).join(', ')}`);
                }
            }

            // Client-side possession date filtering
            if (maxDate) {
                const beforePossessionCount = filteredData.length;
                console.log(`📅 Applying possession date filter: properties must have possession before ${maxDate.toLocaleDateString()}`);

                filteredData = filteredData.filter(property => {
                    const possessionDate = property.Possession_Date;

                    // Handle null or empty dates
                    if (!possessionDate || possessionDate.trim() === '') {
                        console.log(`⚠️ Property ${property.ProjectName} has no possession date - excluding`);
                        return false;
                    }

                    const possLower = possessionDate.toLowerCase().trim();

                    // "Ready to Move" always passes
                    if (possLower.includes('ready to move') || possLower === 'rtm') {
                        return true;
                    }

                    // Parse DD-MM-YYYY format
                    const parts = possessionDate.split('-');
                    if (parts.length === 3) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
                        const year = parseInt(parts[2], 10);

                        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                            const propertyDate = new Date(year, month, day);

                            if (propertyDate <= maxDate) {
                                return true;
                            } else {
                                console.log(`🚫 Filtered out: ${property.ProjectName} - possession ${possessionDate} is after ${maxDate.toLocaleDateString()}`);
                                return false;
                            }
                        }
                    }

                    // Invalid date format - exclude
                    console.log(`⚠️ Property ${property.ProjectName} has invalid possession date format: ${possessionDate} - excluding`);
                    return false;
                });

                console.log(`🔍 After possession date filtering: ${filteredData.length} properties (from ${beforePossessionCount})`);
            }

            // Deduplicate properties by ProjectName - keep the one with lowest price
            const uniquePropertiesMap = new Map();
            filteredData.forEach(property => {
                const projectName = property.ProjectName;
                const existingProperty = uniquePropertiesMap.get(projectName);

                if (!existingProperty) {
                    // First occurrence of this project
                    uniquePropertiesMap.set(projectName, property);
                } else {
                    // Compare prices and keep the cheaper one
                    const existingPrice = parseFloat(existingProperty['Base Project Price']);
                    const currentPrice = parseFloat(property['Base Project Price']);

                    if (!isNaN(currentPrice) && (isNaN(existingPrice) || currentPrice < existingPrice)) {
                        uniquePropertiesMap.set(projectName, property);
                    }
                }
            });

            const uniqueProperties = Array.from(uniquePropertiesMap.values());

            console.log(`✅ Found ${count} total matching properties from database`);
            console.log(`📊 After client-side filtering: ${filteredData.length} properties (out of ${count} total)`);
            console.log(`📊 After deduplication: ${uniqueProperties.length} unique properties`);
            console.log(`🔍 Properties: ${uniqueProperties.slice(0, 3).map(p => `${p.ProjectName} - ₹${(p['Base Project Price'] / 10000000).toFixed(2)}Cr`).join(', ')}${uniqueProperties.length > 3 ? '...' : ''}`);

            res.status(200).json({
                success: true,
                matchedCount: uniqueProperties.length, // Return count of unique deduplicated properties shown
                totalMatches: count || 0, // Return the actual database count (all properties matching criteria)
                properties: uniqueProperties
            });
        } else {
            // Just count (existing behavior)
            const { count, error } = await query;

            if (error) {
                console.error('❌ Supabase query error:', error);
                return res.status(500).json({
                    error: 'Failed to query properties',
                    details: error.message,
                    matchedCount: 0
                });
            }

            console.log(`✅ Found ${count} matching properties`);

            res.status(200).json({
                success: true,
                matchedCount: count || 0
            });
        }

    } catch (error) {
        console.error('❌ Error matching properties:', error);
        res.status(500).json({
            error: 'Failed to match properties',
            details: error.message,
            matchedCount: 0
        });
    }
});

// ====== Endpoint: Get Matched Property Count from unified_properties =======
app.post('/api/match-count', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({
                error: 'Supabase connection not available',
                matchedCount: 0
            });
        }

        const {
            budgetMin,
            budgetMax,
            locations,
            configurations,
            propertyType
        } = req.body;

        console.log('🔍 Counting matched properties from unified_properties:', req.body);

        // Start building the query
        let query = supabase.from('unified_properties').select('*', { count: 'exact', head: false });

        // Location filter (multiple locations)
        if (locations && Array.isArray(locations) && locations.length > 0) {
            const locationFilters = locations.map(loc => `AreaName.ilike.%${loc}%`).join(',');
            query = query.or(locationFilters);
            console.log(`📍 Location filter: ${locations.join(', ')}`);
        }

        // Configuration filter
        if (configurations && Array.isArray(configurations) && configurations.length > 0) {
            const bhkNumbers = configurations.map(config => {
                const match = config.match(/(\d+\.?\d*)/);
                return match ? match[1] : config;
            });
            query = query.in('BHK', bhkNumbers);
            console.log(`🏠 Configuration filter: ${bhkNumbers.join(', ')}`);
        }

        // Property Type filter
        if (propertyType && propertyType !== '') {
            query = query.ilike('property_type', `%${propertyType}%`);
            console.log(`🏛️ Property type filter: ${propertyType}`);
        }

        // Execute query to get data
        const { data, error } = await query;

        if (error) {
            console.error('❌ Supabase query error:', error);
            return res.status(500).json({
                error: 'Failed to query properties',
                details: error.message,
                matchedCount: 0
            });
        }

        // Filter by budget manually (since Base Project Price might be string)
        let filteredData = data || [];
        if (budgetMin != null && budgetMax != null) {
            const minBudget = parseFloat(budgetMin);
            const maxBudget = parseFloat(budgetMax);

            if (!isNaN(minBudget) && !isNaN(maxBudget)) {
                filteredData = filteredData.filter(property => {
                    const price = parseFloat(property['Base Project Price']);
                    return !isNaN(price) && price >= minBudget && price <= maxBudget;
                });
                console.log(`💰 Budget filter applied: ₹${(minBudget / 10000000).toFixed(2)}Cr - ₹${(maxBudget / 10000000).toFixed(2)}Cr`);
            }
        }

        // Deduplicate by ProjectName
        const uniqueProperties = [];
        const seenNames = new Set();

        for (const property of filteredData) {
            const projectName = property.ProjectName || property.projectName || '';
            if (projectName && !seenNames.has(projectName)) {
                seenNames.add(projectName);
                uniqueProperties.push(property);
            }
        }

        const matchedCount = uniqueProperties.length;
        console.log(`✅ Found ${matchedCount} unique matched properties from unified_properties`);

        res.status(200).json({
            success: true,
            matchedCount: matchedCount
        });

    } catch (error) {
        console.error('❌ Error counting matched properties:', error);
        res.status(500).json({
            error: 'Failed to count matched properties',
            details: error.message,
            matchedCount: 0
        });
    }
});

// ====== Endpoint: Get Meetings Based on Clients =======
app.get('/api/meetings', async (req, res) => {
    try {
        // Get clients from the webhook handler
        let clients = [];

        // Check if Zoho credentials are configured
        if (!currentAccessToken || !refreshToken) {
            // Return sample data if Zoho is not configured
            clients = [
                {
                    "mobile": "919966222173",
                    "email": "",
                    "name": "",
                    "lastname": "Rishi Kiran Reddy",
                    "leadname": "",
                    "modifiedTime": "2025-07-28T15:25:27+05:30",
                    "property_type": "Apartment",
                    "budget": "₹1.5 - 2.5 crores",
                    "location": "Kondapur, Gachibowli",
                    "possession_date": "2025-2026",
                    "configuration": "3BHK",
                    "property_size": "1500-2000 sqft",
                    "Bot Suggested Properties": ""
                }
            ];
        } else {
            try {
                const zohoRes = await zohoApiGet(ZOHO_BASE_URL);
                clients = (zohoRes.data.data || []).map(lead => ({
                    mobile: lead.Mobile || "",
                    email: lead.Email || "",
                    name: lead.First_Name || "",
                    lastname: lead.Last_Name || "",
                    leadname: lead.Lead_Name || "",
                    modifiedTime: lead.Modified_Time || "",
                    property_type: lead.Property_Type || "",
                    budget: lead.Budget || "",
                    location: lead.Location || "",
                    possession_date: lead.Possession_Date || "",
                    configuration: lead.Configuration || "",
                    property_size: lead.Property_Size || "",
                    "Bot Suggested Properties": lead['Bot Suggested Properties'] || lead.Bot_Suggested_Properties || ""
                }));
            } catch (error) {
                console.error("Error fetching clients for meetings:", error);
                // Return sample data as fallback
                clients = [
                    {
                        "mobile": "919966222173",
                        "email": "",
                        "name": "",
                        "lastname": "Rishi Kiran Reddy",
                        "leadname": "",
                        "modifiedTime": "2025-07-28T15:25:27+05:30",
                        "property_type": "Apartment",
                        "budget": "₹1.5 - 2.5 crores",
                        "location": "Kondapur, Gachibowli",
                        "possession_date": "2025-2026",
                        "configuration": "3BHK",
                        "property_size": "1500-2000 sqft",
                        "Bot Suggested Properties": ""
                    }
                ];
            }
        }

        // Generate meetings based on client data
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const thisWeekDate = new Date(today);
        thisWeekDate.setDate(today.getDate() + 3);
        const thisMonthDate = new Date(today);
        thisMonthDate.setDate(today.getDate() + 10);

        const meetingTypes = [
            "Site Visit",
            "Virtual Consultation",
            "Contract Review",
            "Phone Follow-up",
            "Inspection",
            "Virtual Tour",
            "Property Discussion",
            "Budget Planning",
            "Location Tour",
            "Document Review"
        ];

        const meetingLocations = [
            "Office",
            "Zoom",
            "Google Meet",
            "Phone Call",
            "Site Location",
            "Client's Home",
            "Coffee Shop",
            "Property Site"
        ];

        const meetingStatuses = ["confirmed", "pending", "cancelled"];
        const meetingTypes_virtual = ["virtual", "in-person", "phone"];

        const meetings = [];

        // Generate meetings for each client
        clients.forEach((client, index) => {
            const clientName = client.lastname || client.leadname || client.name || `Client ${index + 1}`;
            const clientId = client.mobile || `client_${index + 1}`;

            // Generate 1-3 meetings per client
            const numMeetings = Math.floor(Math.random() * 3) + 1;

            for (let i = 0; i < numMeetings; i++) {
                const meetingDate = new Date();
                meetingDate.setDate(today.getDate() + Math.floor(Math.random() * 30)); // Random date within 30 days

                const meetingType = meetingTypes[Math.floor(Math.random() * meetingTypes.length)];
                const meetingType_virtual = meetingTypes_virtual[Math.floor(Math.random() * meetingTypes_virtual.length)];
                const status = meetingStatuses[Math.floor(Math.random() * meetingStatuses.length)];

                let location = meetingLocations[Math.floor(Math.random() * meetingLocations.length)];
                if (meetingType_virtual === "virtual") {
                    location = ["Zoom", "Google Meet"][Math.floor(Math.random() * 2)];
                } else if (meetingType_virtual === "phone") {
                    location = "Phone Call";
                } else if (meetingType === "Site Visit" || meetingType === "Inspection") {
                    location = client.location || "Property Site";
                }

                const hours = Math.floor(Math.random() * 12) + 8; // 8 AM to 8 PM
                const minutes = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
                const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;

                const durations = ["30 minutes", "45 minutes", "1 hour", "1.5 hours", "2 hours"];
                const duration = durations[Math.floor(Math.random() * durations.length)];

                meetings.push({
                    id: `m${index}_${i}`,
                    clientId: clientId,
                    clientName: clientName,
                    date: meetingDate.toISOString().split('T')[0],
                    time: time,
                    type: meetingType,
                    location: location,
                    status: status,
                    description: `${meetingType} for ${clientName} - ${client.property_type || 'property'} in ${client.location || 'preferred location'}`,
                    duration: duration,
                    meetingType: meetingType_virtual,
                    clientEmail: client.email,
                    clientPhone: client.mobile,
                    clientPreferences: {
                        property_type: client.property_type,
                        budget: client.budget,
                        location: client.location,
                        configuration: client.configuration
                    }
                });
            }
        });

        // Sort meetings by date and time
        meetings.sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.time}`);
            const dateB = new Date(`${b.date} ${b.time}`);
            return dateA - dateB;
        });

        res.status(200).json({
            success: true,
            meetings: meetings,
            totalMeetings: meetings.length,
            totalClients: clients.length
        });

    } catch (error) {
        console.error("Error fetching meetings:", error);
        res.status(500).json({
            error: 'Failed to fetch meetings',
            details: error.message
        });
    }
});

// ====== Endpoint: Get Agents =======
app.get('/api/agents', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (!mongoClient) {
            return res.status(500).json({
                error: 'Database not connected',
                details: 'MongoDB connection is not available'
            });
        }

        const db = mongoClient.db(DB_NAME);
        const userCollection = db.collection(USER_COLLECTION_NAME);

        // Fetch all users from UserData collection, excluding admin
        const users = await userCollection.find({
            email: { $ne: 'admin@example.com' } // Exclude admin user
        }).toArray();

        // Transform users to agent format
        const agents = users.map(user => ({
            id: user._id.toString(), // Convert ObjectId to string
            name: user.username, // Use username as display name
            email: user.email,
            phone: 'Not specified', // Phone not available in current user data
            status: 'active',
            createdAt: user.createdAt
        }));

        console.log(`✅ Fetched ${agents.length} agents from UserData collection`);

        res.status(200).json({
            success: true,
            agents: agents
        });
    } catch (error) {
        console.error('Error fetching agents from UserData collection:', error);
        res.status(500).json({
            error: 'Failed to fetch agents',
            details: error.message
        });
    }
});

// ====== Endpoint: Assign Client to Agent =======
app.post('/api/clients/:clientId/assign-agent', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { agentId } = req.body;

        if (!agentId) {
            return res.status(400).json({ error: 'Agent ID is required' });
        }

        // Check if MongoDB is connected
        if (!mongoClient) {
            return res.status(500).json({
                error: 'Database not connected',
                details: 'MongoDB connection is not available'
            });
        }

        const db = mongoClient.db(DB_NAME);

        // Validate that the agent is not admin
        const userCollection = db.collection(USER_COLLECTION_NAME);

        const agentUser = await userCollection.findOne({ _id: new ObjectId(agentId) });
        if (!agentUser) {
            return res.status(400).json({ error: 'Invalid agent ID' });
        }

        if (agentUser.email === 'admin@example.com') {
            return res.status(400).json({ error: 'Cannot assign clients to admin users' });
        }

        const assignmentCollection = db.collection(CLIENT_AGENT_COLLECTION_NAME);

        // Check if assignment already exists
        const existingAssignment = await assignmentCollection.findOne({ clientId: clientId });

        if (existingAssignment) {
            // Update existing assignment
            await assignmentCollection.updateOne(
                { clientId: clientId },
                {
                    $set: {
                        agentId: agentId,
                        updatedAt: new Date()
                    }
                }
            );
            console.log(`✅ Updated client ${clientId} assignment to agent ${agentId}`);
        } else {
            // Create new assignment
            await assignmentCollection.insertOne({
                clientId: clientId,
                agentId: agentId,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log(`✅ Created new assignment: client ${clientId} to agent ${agentId}`);
        }

        res.status(200).json({
            success: true,
            message: 'Client assigned to agent successfully',
            clientId: clientId,
            agentId: agentId
        });
    } catch (error) {
        console.error('Error assigning client to agent:', error);
        res.status(500).json({
            error: 'Failed to assign client to agent',
            details: error.message
        });
    }
});

// ====== Endpoint: Get Client-Agent Assignments =======
app.get('/api/client-agent-assignments', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (!mongoClient) {
            return res.status(500).json({
                error: 'Database not connected',
                details: 'MongoDB connection is not available'
            });
        }

        const db = mongoClient.db(DB_NAME);
        const assignmentCollection = db.collection(CLIENT_AGENT_COLLECTION_NAME);

        // Fetch all assignments
        const assignments = await assignmentCollection.find({}).toArray();

        // Filter out assignments to admin users and transform to a simple clientId -> agentId mapping
        const assignmentMap = {};
        const userCollection = db.collection(USER_COLLECTION_NAME);

        for (const assignment of assignments) {
            // Check if the agent is not admin
            const agentUser = await userCollection.findOne({ _id: new ObjectId(assignment.agentId) });
            if (agentUser && agentUser.email !== 'admin@example.com') {
                assignmentMap[assignment.clientId] = assignment.agentId;
            }
        }

        console.log(`✅ Fetched ${assignments.length} client-agent assignments`);

        res.status(200).json({
            success: true,
            assignments: assignmentMap
        });
    } catch (error) {
        console.error('Error fetching client-agent assignments:', error);
        res.status(500).json({
            error: 'Failed to fetch client-agent assignments',
            details: error.message
        });
    }
});

// ====== Endpoint: Get All Agents Statistics =======
app.get('/api/agents/stats', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (!mongoClient) {
            return res.status(500).json({
                error: 'Database not connected',
                details: 'MongoDB connection is not available'
            });
        }

        const db = mongoClient.db(DB_NAME);
        const userCollection = db.collection(USER_COLLECTION_NAME);
        const assignmentCollection = db.collection(CLIENT_AGENT_COLLECTION_NAME);

        // Fetch all agents (excluding admin)
        const agents = await userCollection.find({
            email: { $ne: 'admin@example.com' }
        }).toArray();

        // Get assignment counts for each agent
        const agentStats = [];

        for (const agent of agents) {
            const agentId = agent._id.toString();
            const assignments = await assignmentCollection.find({ agentId: agentId }).toArray();
            const clientCount = assignments.length;

            agentStats.push({
                id: agentId,
                name: agent.username,
                email: agent.email,
                clientCount: clientCount,
                createdAt: agent.createdAt
            });
        }

        // Sort by client count descending
        agentStats.sort((a, b) => b.clientCount - a.clientCount);

        console.log(`✅ Fetched statistics for ${agentStats.length} agents`);

        res.status(200).json({
            success: true,
            agents: agentStats,
            totalAgents: agentStats.length,
            totalAssignments: agentStats.reduce((sum, agent) => sum + agent.clientCount, 0)
        });

    } catch (error) {
        console.error('Error fetching all agents statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch agents statistics',
            details: error.message
        });
    }
});

// ====== Endpoint: Get Agent Statistics =======
app.get('/api/agent/:agentId/stats', async (req, res) => {
    try {
        const { agentId } = req.params;

        if (!agentId) {
            return res.status(400).json({ error: 'Agent ID is required' });
        }

        // Check if MongoDB is connected
        if (!mongoClient) {
            return res.status(500).json({
                error: 'Database not connected',
                details: 'MongoDB connection is not available'
            });
        }

        const db = mongoClient.db(DB_NAME);
        const assignmentCollection = db.collection(CLIENT_AGENT_COLLECTION_NAME);

        // Get all client IDs assigned to this agent
        const assignments = await assignmentCollection.find({ agentId: agentId }).toArray();
        const assignedClientCount = assignments.length;

        console.log(`✅ Agent ${agentId} has ${assignedClientCount} clients assigned`);

        res.status(200).json({
            success: true,
            agentId: agentId,
            clientCount: assignedClientCount,
            message: `Agent has ${assignedClientCount} clients assigned`
        });

    } catch (error) {
        console.error('Error fetching agent statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch agent statistics',
            details: error.message
        });
    }
});

// ====== Endpoint: Get Clients for Specific Agent =======
app.get('/api/agent/:agentId/clients', async (req, res) => {
    try {
        const { agentId } = req.params;

        if (!agentId) {
            return res.status(400).json({ error: 'Agent ID is required' });
        }

        // Check if MongoDB is connected
        if (!mongoClient) {
            return res.status(500).json({
                error: 'Database not connected',
                details: 'MongoDB connection is not available'
            });
        }

        const db = mongoClient.db(DB_NAME);

        // SPECIAL CASE: Check if this agent is Vaishnavi - fetch from Zoho instead
        const userCollection = db.collection(USER_COLLECTION_NAME);
        const agent = await userCollection.findOne({ _id: agentId });

        if (agent && agent.email && agent.email.toLowerCase() === 'vaishnavig@relai.world') {
            console.log('🔍 Agent is Vaishnavi - fetching leads from Zoho instead of assigned clients');

            // Fetch leads from Zoho
            const targetOwnerName = EMAIL_TO_LEAD_OWNER_MAP[agent.email.toLowerCase()];

            if (!targetOwnerName) {
                console.log('⚠️ No Lead Owner mapping found for Vaishnavi');
                return res.status(200).json({
                    success: true,
                    clients: [],
                    message: 'No Lead Owner mapping configured'
                });
            }

            // Fetch all leads from Zoho with pagination
            let allLeads = [];
            let page = 1;
            let hasMore = true;

            while (hasMore) {
                try {
                    const response = await zohoApiGet(ZOHO_BASE_URL, {
                        page,
                        per_page: 200
                    });

                    const leads = response.data.data || [];
                    allLeads = allLeads.concat(leads);

                    console.log(`📄 Page ${page}: Retrieved ${leads.length} leads (Total so far: ${allLeads.length})`);

                    const info = response.data.info;
                    hasMore = info && info.more_records;
                    page++;

                    if (page > 20) {
                        console.log('⚠️ Reached page limit (20 pages = 4000 leads max)');
                        break;
                    }
                } catch (error) {
                    console.error('Error fetching page:', page, error.message);
                    hasMore = false;
                }
            }

            // Filter leads by Lead Owner name
            const filteredLeads = allLeads.filter(lead => {
                const ownerName = lead.Lead_Owner?.name || lead.Owner?.name || '';
                const matches = ownerName === targetOwnerName ||
                    ownerName.toLowerCase().includes(targetOwnerName.toLowerCase());
                return matches;
            });

            console.log(`✅ Filtered to ${filteredLeads.length} leads for Vaishnavi Gorantla`);

            // Map to client format expected by frontend
            const clients = filteredLeads.map(lead => ({
                id: lead.id,
                mobile: lead.Mobile || lead.Phone || 'N/A',
                leadname: lead.Full_Name || lead.Lead_Name || lead.Last_Name || 'N/A',
                lastname: lead.Last_Name || 'N/A',
                email: lead.Email || '',
                modifiedTime: lead.Created_Time || '',
                property_type: "Not specified",
                budget: "Not specified",
                location: "Not specified",
                possession_date: "Not specified",
                configuration: "Not specified",
                property_size: "Not specified",
            }));

            return res.status(200).json({
                success: true,
                clients: clients,
                assignedCount: clients.length,
                source: 'zoho',
                message: `Fetched ${clients.length} leads from Zoho for Vaishnavi Gorantla`
            });
        }

        // REGULAR CASE: Fetch assigned clients for other agents
        const assignmentCollection = db.collection(CLIENT_AGENT_COLLECTION_NAME);

        // Get all client IDs assigned to this agent
        const assignments = await assignmentCollection.find({ agentId: agentId }).toArray();
        const assignedClientIds = assignments.map(assignment => assignment.clientId);

        console.log(`✅ Found ${assignedClientIds.length} clients assigned to agent ${agentId}`);

        // If no clients assigned, return empty array
        if (assignedClientIds.length === 0) {
            return res.status(200).json({
                success: true,
                clients: [],
                message: 'No clients assigned to this agent'
            });
        }

        // Get the webhook handler data (all clients)
        const webhookResponse = await fetch(`${req.protocol}://${req.get('host')}/api/webhook-handler`);
        if (!webhookResponse.ok) {
            throw new Error('Failed to fetch client data from webhook handler');
        }

        const allClients = await webhookResponse.json();

        // Filter clients to only include those assigned to this agent
        const assignedClients = allClients.filter(client =>
            assignedClientIds.includes(client.mobile)
        );

        console.log(`✅ Returning ${assignedClients.length} clients for agent ${agentId}`);

        res.status(200).json({
            success: true,
            clients: assignedClients,
            assignedCount: assignedClients.length,
            totalCount: allClients.length
        });

    } catch (error) {
        console.error('Error fetching clients for agent:', error);
        res.status(500).json({
            error: 'Failed to fetch clients for agent',
            details: error.message
        });
    }
});

// ====== Endpoint: Webhook Proxy for Chatbot =======
app.get('/api/webhook-proxy', async (req, res) => {
    try {
        console.log('🔄 Webhook proxy request received:', req.query);

        // Extract parameters from query string
        const { message, clientId, sessionId, timestamp } = req.query;

        // Create the request body from query parameters
        const requestBody = {
            message: message || 'Test message',
            clientId: clientId || 'test-client',
            sessionId: sessionId || Date.now().toString(),
            timestamp: timestamp || Date.now()
        };

        // Forward the request to the n8n webhook
        const queryString = new URLSearchParams(requestBody).toString();
        const response = await fetch(`https://navaneeth03.app.n8n.cloud/webhook/my-webhook?${queryString}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });

        const responseData = await response.json();
        console.log('✅ Webhook proxy response:', responseData);

        // Return the response from n8n
        res.status(200).json(responseData);

    } catch (error) {
        console.error('❌ Webhook proxy error:', error.message);

        // Return a friendly error response
        res.status(500).json({
            error: 'Failed to process webhook request',
            message: 'The chatbot service is temporarily unavailable. Please try again later.',
            details: error.message
        });
    }
});

// ====== Endpoint: Create New Property =======
app.post('/api/properties', async (req, res) => {
    try {
        if (!mongoClient) {
            return res.status(503).json({ error: 'MongoDB connection not available. Please try again later.' });
        }

        const propertyData = req.body;
        console.log('🔄 Creating new property:', propertyData);

        const db = mongoClient.db(DB_NAME);
        const collection = db.collection('properties'); // Use the properties collection

        // Validate required fields
        if (!propertyData.ProjectName || !propertyData.RERA_Number) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['ProjectName', 'RERA_Number']
            });
        }

        // Check if property already exists with same RERA number
        const existingProperty = await collection.findOne({
            RERA_Number: propertyData.RERA_Number
        });

        if (existingProperty) {
            return res.status(409).json({
                error: 'Property with this RERA number already exists',
                reraNumber: propertyData.RERA_Number
            });
        }

        // Add timestamp and default values
        const newProperty = {
            ...propertyData,
            createdAt: new Date(),
            updatedAt: new Date(),
            // Ensure all required fields have default values
            S: { No: 1 }, // Default serial number
            google_place_id: propertyData.google_place_id || "",
            google_place_name: propertyData.google_place_name || propertyData.ProjectName,
            google_place_address: propertyData.google_place_address || "Unknown",
            google_place_location: propertyData.google_place_location || { lat: 0, lng: 0 },
            google_place_rating: propertyData.google_place_rating || 0,
            google_place_user_ratings_total: propertyData.google_place_user_ratings_total || 0,
            google_maps_url: propertyData.google_maps_url || "",
            google_place_raw_data: propertyData.google_place_raw_data || {},
            hospitals_count: propertyData.hospitals_count || 0,
            shopping_malls_count: propertyData.shopping_malls_count || 0,
            schools_count: propertyData.schools_count || 0,
            restaurants_count: propertyData.restaurants_count || 0,
            restaurants_above_4_stars_count: propertyData.restaurants_above_4_stars_count || 0,
            supermarkets_count: propertyData.supermarkets_count || 0,
            it_offices_count: propertyData.it_offices_count || 0,
            metro_stations_count: propertyData.metro_stations_count || 0,
            railway_stations_count: propertyData.railway_stations_count || 0,
            nearest_hospitals: propertyData.nearest_hospitals || [],
            nearest_shopping_malls: propertyData.nearest_shopping_malls || [],
            nearest_schools: propertyData.nearest_schools || [],
            nearest_restaurants: propertyData.nearest_restaurants || [],
            high_rated_restaurants: propertyData.high_rated_restaurants || [],
            nearest_supermarkets: propertyData.nearest_supermarkets || [],
            nearest_it_offices: propertyData.nearest_it_offices || [],
            nearest_metro_station: propertyData.nearest_metro_station || [],
            nearest_railway_station: propertyData.nearest_railway_station || [],
            nearest_orr_access: propertyData.nearest_orr_access || [],
            connectivity_score: propertyData.connectivity_score || 0,
            amenities_score: propertyData.amenities_score || 0,
            amenities_raw_data: propertyData.amenities_raw_data || 0,
            amenities_updated_at: propertyData.amenities_updated_at || new Date().toISOString(),
            mobile_google_map_url: propertyData.mobile_google_map_url || "",
            GRID_Score: propertyData.GRID_Score || 0
        };

        // Insert the new property
        const result = await collection.insertOne(newProperty);

        console.log('✅ Property created successfully:', result.insertedId);

        // Return the created property with its ID
        res.status(201).json({
            success: true,
            message: 'Property created successfully',
            property: {
                _id: result.insertedId,
                ...newProperty
            }
        });

    } catch (error) {
        console.error('❌ Error creating property:', error);
        res.status(500).json({
            error: 'Failed to create property',
            details: error.message
        });
    }
});

// ====== Google Calendar Configuration =======
// NOTE: Avoid hard-coding real email addresses in source. Use short IDs
// for experts and resolve their real emails via environment variables if needed.
const EXPERTS = {
    // keys are internal identifiers (do NOT include raw email strings here)
    'harshithv': {
        id: 'harshithv',
        // load sensitive emails / calendar ids from environment vars if available
        email: process.env.EXPERT_HARSHITHV_EMAIL || 'expert1@relai.com',
        name: 'Expert 1',
        calendarId: process.env.EXPERT_HARSHITHV_CALENDAR_ID || null,
    },
    'vaishnavig': {
        id: 'vaishnavig',
        email: process.env.EXPERT_VAISHNAVI_EMAIL || 'expert2@relai.com',
        name: 'Expert 2',
        calendarId: process.env.EXPERT_VAISHNAVI_CALENDAR_ID || null,
    }
};

console.log('🔧 Configured Experts:', JSON.stringify(Object.values(EXPERTS).map(e => ({ name: e.name, email: e.email })), null, 2));

// Helper: resolve a given identifier (could be an internal id or an email string)
function resolveExpertIdentifier(identifier) {
    if (!identifier) return null;

    // if identifier matches an internal ID, return it
    if (EXPERTS[identifier]) {
        return { key: identifier, expert: EXPERTS[identifier] };
    }

    // fallback: search by email match (case-insensitive) among configured experts
    const asLower = String(identifier).toLowerCase();
    const foundKey = Object.keys(EXPERTS).find(k => EXPERTS[k].email && EXPERTS[k].email.toLowerCase() === asLower);
    if (foundKey) return { key: foundKey, expert: EXPERTS[foundKey] };

    // not found
    return null;
}

const MEETING_DURATION = 45;
const MEETING_GAP = 15;

let googleCalendarAuth = null;

function initializeGoogleCalendar() {
    try {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
            console.warn('⚠️ Google Calendar credentials not configured. Calendar integration disabled.');
            console.warn('Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
            return null;
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'https://developers.google.com/oauthplayground'
        );

        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });

        googleCalendarAuth = oauth2Client;
        console.log('✅ Google Calendar authentication initialized');
        return oauth2Client;
    } catch (error) {
        console.error('❌ Failed to initialize Google Calendar:', error.message);
        return null;
    }
}

initializeGoogleCalendar();

async function createGoogleCalendarEvent(expertKeyOrEmail, eventDetails) {
    if (!googleCalendarAuth) {
        console.warn('⚠️ Google Calendar not initialized, skipping event creation');
        return null;
    }

    try {
        const calendar = google.calendar({ version: 'v3', auth: googleCalendarAuth });

        // resolve expert by id or email (if configured)
        const resolved = resolveExpertIdentifier(expertKeyOrEmail);
        const expertName = resolved?.expert?.name || expertKeyOrEmail;
        // prefer resolved email for attendees when available
        const expertEmailForAttendee = resolved?.expert?.email || (String(expertKeyOrEmail).includes('@') ? expertKeyOrEmail : null);

        const event = {
            summary: `Expert Call with ${expertName} - ${eventDetails.clientName}`,
            description: `Expert consultation call scheduled with ${eventDetails.clientName}\nExpert: ${expertName}`,
            start: {
                dateTime: eventDetails.startTime,
                timeZone: 'Asia/Kolkata',
            },
            end: {
                dateTime: eventDetails.endTime,
                timeZone: 'Asia/Kolkata',
            },
            attendees: [
                // include expert attendee only when actual email is known
                ...(expertEmailForAttendee ? [{ email: expertEmailForAttendee }] : []),
                { email: process.env.GOOGLE_CLIENT_EMAIL || 'Connect@relai.world' }
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 60 },
                    { method: 'popup', minutes: 15 },
                ],
            },
        };

        // Use 'primary' calendar (the calendar of the authenticated user)
        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            sendUpdates: 'all',
        });

        console.log('✅ Google Calendar event created:', response.data.id);
        return response.data;
    } catch (error) {
        console.error('❌ Failed to create Google Calendar event:', error.message);
        console.error('Error details:', error.response?.data || error);
        return null;
    }
}

function checkAvailability(existingMeetings, requestedStart, requestedEnd) {
    const requestedStartTime = new Date(requestedStart);
    const requestedEndTime = new Date(requestedEnd);

    for (const meeting of existingMeetings) {
        const meetingStart = new Date(meeting.startTime);
        const meetingEndWithGap = addMinutes(new Date(meeting.endTime), MEETING_GAP);

        const hasConflict = (
            (requestedStartTime >= meetingStart && requestedStartTime < meetingEndWithGap) ||
            (requestedEndTime > meetingStart && requestedEndTime <= meetingEndWithGap) ||
            (requestedStartTime <= meetingStart && requestedEndTime >= meetingEndWithGap)
        );

        if (hasConflict) {
            return false;
        }
    }
    return true;
}

// ====== Expert Meetings API Endpoints =======

// Get all meetings for a client
app.get('/api/expert-meetings/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { data: meetings, error } = await supabaseAdmin
            .from('expert_meetings')
            .select('*')
            .eq('client_id', clientId)
            .order('start_time', { ascending: true });

        if (error) {
            throw error;
        }

        // Convert snake_case to camelCase for frontend compatibility
        const formattedMeetings = meetings.map(meeting => ({
            _id: meeting.id,
            clientId: meeting.client_id,
            clientName: meeting.client_name,
            expertEmail: meeting.expert_email,
            expertName: meeting.expert_name,
            startTime: meeting.start_time,
            endTime: meeting.end_time,
            duration: meeting.duration,
            status: meeting.status,
            googleCalendarEventId: meeting.google_calendar_event_id,
            createdAt: meeting.created_at
        }));

        res.status(200).json({
            success: true,
            meetings: formattedMeetings
        });
    } catch (error) {
        console.error('❌ Error fetching expert meetings:', error);
        res.status(500).json({ error: 'Failed to fetch meetings', details: error.message });
    }
});

// Get all meetings for an expert on a specific date
app.get('/api/expert-meetings', async (req, res) => {
    try {
        const { expertEmail, date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        // allow either an internal expert id or an email string
        // resolve to a known expert when possible
        let emailQueryValue = null;
        if (expertEmail) {
            const resolved = resolveExpertIdentifier(expertEmail);
            emailQueryValue = resolved ? (resolved.expert.email || resolved.key) : expertEmail;
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const startOfDay = new Date(`${date}T00:00:00`);
        const endOfDay = new Date(`${date}T23:59:59`);

        // Build query - if expertEmail is provided, filter by it; otherwise get all experts
        let query = supabaseAdmin
            .from('expert_meetings')
            .select('*')
            .gte('start_time', startOfDay.toISOString())
            .lte('start_time', endOfDay.toISOString())
            .neq('status', 'cancelled')
            .order('start_time', { ascending: true });

        // Only filter by expert email / id if provided
        if (emailQueryValue) {
            query = query.eq('expert_email', emailQueryValue);
        }

        const { data: meetings, error } = await query;

        if (error) {
            throw error;
        }

        // Convert snake_case to camelCase for frontend compatibility
        const formattedMeetings = meetings.map(meeting => ({
            _id: meeting.id,
            clientId: meeting.client_id,
            clientName: meeting.client_name,
            expertEmail: meeting.expert_email,
            expertName: meeting.expert_name,
            startTime: meeting.start_time,
            endTime: meeting.end_time,
            duration: meeting.duration,
            status: meeting.status,
            googleCalendarEventId: meeting.google_calendar_event_id,
            createdAt: meeting.created_at
        }));

        res.status(200).json({
            success: true,
            meetings: formattedMeetings
        });
    } catch (error) {
        console.error('❌ Error fetching expert meetings:', error);
        res.status(500).json({ error: 'Failed to fetch meetings', details: error.message });
    }
});

// Check availability for an expert
app.get('/api/expert-meetings/availability/:expertEmail', async (req, res) => {
    try {
        const { expertEmail } = req.params;
        const { startTime, endTime } = req.query;

        // Resolve expert id or email - we accept either an internal id or an email string
        const resolvedExpert = resolveExpertIdentifier(expertEmail);
        if (!resolvedExpert && !String(expertEmail).includes('@')) {
            // if it's not an email and we can't resolve to a known expert id, it's invalid
            return res.status(400).json({ error: 'Invalid expert identifier' });
        }

        if (!startTime || !endTime) {
            return res.status(400).json({ error: 'Start time and end time are required' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const { data: meetings, error } = await supabaseAdmin
            .from('expert_meetings')
            .select('*')
            .eq('expert_email', resolvedExpert ? (resolvedExpert.expert.email || resolvedExpert.key) : expertEmail)
            .neq('status', 'cancelled');

        if (error) {
            throw error;
        }

        // Convert to camelCase for checkAvailability function
        const existingMeetings = meetings.map(meeting => ({
            startTime: meeting.start_time,
            endTime: meeting.end_time,
            status: meeting.status
        }));

        const isAvailable = checkAvailability(existingMeetings, startTime, endTime);

        res.status(200).json({
            success: true,
            available: isAvailable
        });
    } catch (error) {
        console.error('❌ Error checking availability:', error);
        res.status(500).json({ error: 'Failed to check availability', details: error.message });
    }
});

// Create a new expert meeting
app.post('/api/expert-meetings', async (req, res) => {
    try {
        console.log('🎯 POST /api/expert-meetings called');
        console.log('📥 Request body:', JSON.stringify(req.body, null, 2));

        // Allow frontend to optionally provide a userId (some flows use clientId as the user id)
        // Fall back to clientId when userId is not explicitly provided to avoid ReferenceError
        let { clientId, clientName, expertEmail, startTime, clientEmail: providedClientEmail, userId: bodyUserId } = req.body;
        let userId = bodyUserId || clientId;

        if (!clientId || !clientName || !startTime) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['clientId', 'clientName', 'startTime']
            });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: 'Database not connected' });
        }

        const startDateTime = new Date(startTime);
        const endDateTime = addMinutes(startDateTime, MEETING_DURATION);


        // If expertEmail is not provided or not available, find an available expert
        // We'll resolve identifiers (can be internal expert id or an email string)
        let assignedExpertKey = null; // internal key in EXPERTS, if available
        let assignedExpertStoredValue = null; // value to store in DB (email if known, otherwise the key or raw identifier)

        if (expertEmail) {
            const resolved = resolveExpertIdentifier(expertEmail);
            const queryValue = resolved ? (resolved.expert.email || resolved.key) : expertEmail;
            // Check if the specified expert is available
            const { data: existingMeetings, error: fetchError } = await supabaseAdmin
                .from('expert_meetings')
                .select('*')
                .eq('expert_email', queryValue)
                .neq('status', 'cancelled');

            if (fetchError) {
                throw fetchError;
            }

            const existingMeetingsFormatted = existingMeetings.map(meeting => ({
                startTime: meeting.start_time,
                endTime: meeting.end_time,
                status: meeting.status
            }));

            const isAvailable = checkAvailability(existingMeetingsFormatted, startDateTime, endDateTime);

            if (isAvailable) {
                assignedExpertKey = resolved ? resolved.key : null;
                assignedExpertStoredValue = queryValue;
                console.log(`✅ Requested expert ${queryValue} is available`);
            } else {
                console.log(`⚠️ Requested expert ${queryValue} is NOT available, will search for another expert`);
            }
        }

        // If no expert assigned yet, find any available expert
        if (!assignedExpertKey && !assignedExpertStoredValue) {
            console.log('🔍 Searching for any available expert...');
            for (const expertKey of Object.keys(EXPERTS)) {
                const emailOrKey = EXPERTS[expertKey].email || expertKey;
                console.log(`   Checking availability for ${EXPERTS[expertKey].name} (${emailOrKey})`);
                const { data: existingMeetings, error: fetchError } = await supabaseAdmin
                    .from('expert_meetings')
                    .select('*')
                    .eq('expert_email', emailOrKey)
                    .neq('status', 'cancelled');

                if (fetchError) {
                    throw fetchError;
                }

                const existingMeetingsFormatted = existingMeetings.map(meeting => ({
                    startTime: meeting.start_time,
                    endTime: meeting.end_time,
                    status: meeting.status
                }));

                const isAvailable = checkAvailability(existingMeetingsFormatted, startDateTime, endDateTime);

                if (isAvailable) {
                    assignedExpertKey = expertKey;
                    assignedExpertStoredValue = emailOrKey;
                    console.log(`   ✅ ${EXPERTS[expertKey].name} is available - assigning meeting`);
                    break;
                } else {
                    console.log(`   ❌ ${EXPERTS[expertKey].name} is busy`);
                }
            }
        }

        // If no expert is available
        if (!assignedExpertKey && !assignedExpertStoredValue) {
            return res.status(409).json({
                error: 'No experts available',
                message: 'All experts are busy at the selected time. Please choose another time slot.'
            });
        }

        // Resolve client email before creating the meeting
        let clientEmail = providedClientEmail || null;

        // Try Supabase Admin users table if email not provided
        if (!clientEmail && supabaseAdmin && userId) {
            try {
                const { data: userData, error: userErr } = await supabaseAdmin
                    .from('users')
                    .select('email')
                    .eq('id', userId)
                    .single();

                if (!userErr && userData && userData.email) {
                    clientEmail = userData.email;
                    console.log('✅ Found client email in Supabase users table:', clientEmail);
                } else {
                    // also attempt finding by email string if userId was actually an email
                    if (!userErr) console.log('⚠️ Supabase users lookup returned no email for id:', userId);
                    const { data: byEmail, error: byEmailErr } = await supabaseAdmin
                        .from('users')
                        .select('email')
                        .eq('email', userId)
                        .limit(1)
                        .single();

                    if (!byEmailErr && byEmail && byEmail.email) {
                        clientEmail = byEmail.email;
                        console.log('✅ Found client email via Supabase email lookup:', clientEmail);
                    }
                }
            } catch (err) {
                console.warn('⚠️ Supabase user lookup failed during meeting creation:', err.message || err);
            }
        }

        // Try Zoho CRM if email still not found
        if (!clientEmail && clientId && (currentAccessToken || refreshToken)) {
            try {
                console.log('🔍 Attempting to fetch client email from Zoho CRM for clientId:', clientId);

                let zohoLeadId = null;

                // Check if clientId is already a Zoho Lead ID (format: 961380000003568049)
                // Zoho Lead IDs are typically 15-18 digit numbers starting with 96138
                if (/^96138\d{10,13}$/.test(clientId)) {
                    console.log('✅ clientId appears to be a Zoho Lead ID, fetching directly');
                    zohoLeadId = clientId;
                } else {
                    console.log('📱 clientId appears to be a mobile number, searching for lead');
                    // Find Zoho lead by mobile number
                    zohoLeadId = await findZohoLeadIdByMobile(clientId);
                }

                if (zohoLeadId) {
                    console.log('✅ Using Zoho lead ID:', zohoLeadId);

                    // Fetch full lead details
                    const ZOHO_LEAD_URL = `${ZOHO_API_DOMAIN}/crm/v2/Leads/${zohoLeadId}`;
                    const leadResponse = await zohoApiGet(ZOHO_LEAD_URL);

                    if (leadResponse.data && leadResponse.data.data && leadResponse.data.data.length > 0) {
                        const lead = leadResponse.data.data[0];

                        console.log('📋 Checking Zoho email fields...');

                        // Log all potential email fields for debugging
                        const emailFields = {
                            'Email': lead.Email,
                            'Secondary_Email': lead.Secondary_Email,
                            'Email_ID': lead.Email_ID,
                            'Primary_Email': lead.Primary_Email,
                            'Contact_Email': lead.Contact_Email,
                            'E_mail': lead.E_mail,
                            'Email_Address': lead.Email_Address
                        };

                        console.log('📧 Available email fields in Zoho:', JSON.stringify(emailFields, null, 2));

                        // Extract email with fallback logic (same as /api/zoho/leads endpoint)
                        clientEmail = lead.Email ||
                            lead.Secondary_Email ||
                            lead.Email_ID ||
                            lead.Primary_Email ||
                            lead.Contact_Email ||
                            lead.E_mail ||
                            lead.Email_Address ||
                            // Fallback: Find ANY field that looks like an email
                            Object.values(lead).find(val => typeof val === 'string' && val.includes('@') && val.includes('.')) ||
                            null;

                        if (clientEmail) {
                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                            console.log('✅ SUCCESS: Found client email in Zoho CRM');
                            console.log('   Client ID:', clientId);
                            console.log('   Zoho Lead ID:', zohoLeadId);
                            console.log('   Email Address:', clientEmail);
                            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        } else {
                            console.log('⚠️ Zoho lead found but no email field available');
                            console.log('   Lead data keys:', Object.keys(lead).join(', '));
                        }
                    }
                } else {
                    console.log('⚠️ No Zoho lead found for clientId:', clientId);
                }
            } catch (zohoError) {
                console.warn('⚠️ Error fetching email from Zoho CRM:', zohoError.message);
                // Continue with other fallback methods
            }
        }

        // Try MongoDB UserData collection
        if (!clientEmail && mongoClient) {
            try {
                const db = mongoClient.db(DB_NAME);
                const col = db.collection(USER_COLLECTION_NAME);

                let query = {};
                try {
                    if (ObjectId.isValid(userId)) query = { _id: new ObjectId(userId) };
                } catch (e) {
                    // ignore
                }

                if (Object.keys(query).length === 0) {
                    query = { $or: [{ id: userId }, { userId: userId }, { email: userId }, { Email: userId }] };
                }

                const userDoc = await col.findOne(query);
                if (userDoc) {
                    clientEmail = userDoc.email || userDoc.Email || clientEmail;
                    if (clientEmail) console.log('✅ Found client email in MongoDB UserData:', clientEmail);
                }
            } catch (e) {
                console.warn('⚠️ Error looking up user in MongoDB:', e.message || e);
            }
        }

        // Fallback: PRE_SALE_USER_MAP contains some known test users keyed by email
        if (!clientEmail && userId && PRE_SALE_USER_MAP[userId.toLowerCase()]) {
            clientEmail = PRE_SALE_USER_MAP[userId.toLowerCase()].email;
            console.log('✅ Found client email in PRE_SALE_USER_MAP:', clientEmail);
        }

        // Create the meeting in Supabase using the assigned expert
        const newMeeting = {
            client_id: clientId,
            client_name: clientName,
            // store resolved value (email when available, otherwise internal id or provided identifier)
            expert_email: assignedExpertStoredValue,
            expert_name: EXPERTS[assignedExpertKey]?.name || (resolveExpertIdentifier(assignedExpertStoredValue)?.expert?.name) || assignedExpertStoredValue || 'Expert',
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            duration: MEETING_DURATION,
            status: 'scheduled'
        };

        console.log(`✅ Assigning meeting to expert: ${newMeeting.expert_name} (id=${assignedExpertKey || 'unknown'})`);

        const { data: insertedMeeting, error: insertError } = await supabaseAdmin
            .from('expert_meetings')
            .insert([newMeeting])
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        // Create Google Calendar event for the assigned expert
        const calendarEvent = await createGoogleCalendarEvent(assignedExpertKey || assignedExpertStoredValue, {
            clientName,
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString()
        });

        // Update with calendar event ID if successful
        if (calendarEvent) {
            await supabaseAdmin
                .from('expert_meetings')
                .update({ google_calendar_event_id: calendarEvent.id })
                .eq('id', insertedMeeting.id);
        }

        // Send email notification to client using the resolved email
        let emailSent = false;
        const emailToSend = clientEmail;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 EMAIL RESOLUTION SUMMARY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('   Client ID (Mobile):', clientId);
        console.log('   Client Name:', clientName);
        console.log('   Email Found:', emailToSend || 'NO EMAIL FOUND');

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = emailToSend && emailRegex.test(emailToSend);
        console.log('   Email Valid:', isValidEmail ? '✅ YES' : '❌ NO');
        console.log('   Will Send Email:', isValidEmail ? '✅ YES' : '❌ NO');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        if (emailToSend && isValidEmail) {
            console.log('📤 Attempting to send appointment notification email...');
            console.log('   From:', process.env.EMAIL_FROM || process.env.EMAIL_USER);
            console.log('   To:', emailToSend);
            console.log('   Subject: Your Expert Consultation Appointment is Confirmed');

            try {
                const emailResult = await sendAppointmentNotification(emailToSend, {
                    clientName: insertedMeeting.client_name,
                    expertName: insertedMeeting.expert_name,
                    expertEmail: insertedMeeting.expert_email,
                    startTime: insertedMeeting.start_time,
                    endTime: insertedMeeting.end_time,
                    duration: insertedMeeting.duration
                });

                if (emailResult.success) {
                    console.log('');
                    console.log('╔════════════════════════════════════════════════════════════════╗');
                    console.log('║                                                                ║');
                    console.log('║              ✅ EMAIL SENT SUCCESSFULLY! ✅                     ║');
                    console.log('║                                                                ║');
                    console.log('╚════════════════════════════════════════════════════════════════╝');
                    console.log('');
                    console.log('📧 Email Details:');
                    console.log('   ✉️  Recipient:', emailToSend);
                    console.log('   👤 Client:', insertedMeeting.client_name);
                    console.log('   👨‍💼 Expert:', insertedMeeting.expert_name);
                    console.log('   📅 Meeting Time:', new Date(insertedMeeting.start_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
                    console.log('   🆔 Message ID:', emailResult.messageId);
                    console.log('');
                    console.log('💡 TIP: Ask the user to check their inbox (and spam folder) for the confirmation email.');
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    emailSent = true;
                } else {
                    console.log('');
                    console.log('⚠️ ═══════════════════════════════════════════════════════════');
                    console.log('⚠️  EMAIL NOTIFICATION FAILED');
                    console.log('⚠️ ═══════════════════════════════════════════════════════════');
                    console.log('   Error:', emailResult.message || emailResult.error);
                    console.log('   Recipient:', emailToSend);
                    console.log('⚠️ ═══════════════════════════════════════════════════════════');
                }
            } catch (emailError) {
                console.log('');
                console.log('❌ ═══════════════════════════════════════════════════════════');
                console.log('❌  ERROR SENDING EMAIL NOTIFICATION');
                console.log('❌ ═══════════════════════════════════════════════════════════');
                console.error('   Error:', emailError.message);
                console.error('   Stack:', emailError.stack);
                console.log('❌ ═══════════════════════════════════════════════════════════');
            }
        } else {
            console.log('');
            console.log('⚠️ ═══════════════════════════════════════════════════════════');
            console.log('⚠️  SKIPPING EMAIL NOTIFICATION');
            console.log('⚠️ ═══════════════════════════════════════════════════════════');
            if (!emailToSend) {
                console.log('   Reason: No email address found');
                console.log('   💡 Check if mobile number exists in Zoho CRM with an email');
            } else {
                console.log('   Reason: Invalid email format');
                console.log('   Email:', emailToSend);
            }
            console.log('⚠️ ═══════════════════════════════════════════════════════════');
        }

        const responseData = {
            success: true,
            message: 'Meeting scheduled successfully',
            meeting: {
                _id: insertedMeeting.id,
                clientId: insertedMeeting.client_id,
                clientName: insertedMeeting.client_name,
                expertEmail: insertedMeeting.expert_email,
                expertName: insertedMeeting.expert_name,
                startTime: insertedMeeting.start_time,
                endTime: insertedMeeting.end_time,
                duration: insertedMeeting.duration,
                status: insertedMeeting.status,
                googleCalendarEventId: calendarEvent?.id,
                createdAt: insertedMeeting.created_at
            },
            emailSent: emailSent,
            clientEmail: clientEmail
        };

        if (!googleCalendarAuth || !calendarEvent) {
            responseData.warning = 'Meeting saved but Google Calendar integration is not configured. The meeting will not appear in the expert\'s calendar.';
            responseData.calendarSynced = false;
        } else {
            responseData.calendarSynced = true;
        }

        res.status(201).json(responseData);
    } catch (error) {
        console.error('❌ Error creating expert meeting:', error);
        res.status(500).json({ error: 'Failed to create meeting', details: error.message });
    }
});

// Get all experts
app.get('/api/experts', (req, res) => {
    res.status(200).json({
        success: true,
        experts: Object.values(EXPERTS)
    });
});

/**
 * POST /api/user/send-email
 * Body: { userId?, email?, subject?, text?, html? }
 * - Attempts to resolve a user's email given userId (Supabase -> MongoDB -> pre-sale fallback)
 * - If email is provided directly, uses that
 * - Sends an email via sendCustomEmail
 */
app.post('/api/user/send-email', async (req, res) => {
    try {
        const { userId, email, subject, text, html } = req.body || {};

        if (!userId && !email) {
            return res.status(400).json({ success: false, error: 'userId or email is required' });
        }

        // If explicit email provided, use it directly
        if (email) {
            const result = await sendCustomEmail(email, { subject, text, html });
            return res.status(result.success ? 200 : 500).json({ success: result.success, detail: result });
        }

        // Resolve user email via Supabase only
        if (!userId) {
            return res.status(400).json({ success: false, error: 'userId is required when email not provided' });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ success: false, error: 'Supabase admin client not configured' });
        }

        try {
            // Try lookup by id first
            let { data: userData, error: userErr } = await supabaseAdmin
                .from('users')
                .select('email')
                .eq('id', userId)
                .single();

            // If not found by id, try lookup by email (in case an email string was passed as userId)
            if (userErr || !userData) {
                const { data: byEmail, error: byEmailErr } = await supabaseAdmin
                    .from('users')
                    .select('email')
                    .eq('email', userId)
                    .limit(1)
                    .single();
                if (!byEmailErr && byEmail) userData = byEmail;
            }

            if (!userData || !userData.email) {
                return res.status(404).json({ success: false, error: 'User email not found in Supabase users table' });
            }

            const resolvedEmail = userData.email;
            const result = await sendCustomEmail(resolvedEmail, { subject, text, html });
            if (result.success) {
                return res.status(200).json({ success: true, messageId: result.messageId, email: resolvedEmail });
            }

            return res.status(500).json({ success: false, error: result.error || 'Failed to send email' });

        } catch (err) {
            console.error('⚠️ Supabase lookup/send failed:', err.message || err);
            return res.status(500).json({ success: false, error: err.message });
        }

        if (result.success) {
            return res.status(200).json({ success: true, messageId: result.messageId, email: resolvedEmail });
        }

        return res.status(500).json({ success: false, error: result.error || 'Failed to send email' });

    } catch (err) {
        console.error('❌ Error in /api/user/send-email:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// DEBUG: Check properties with multiple configurations
app.get('/api/debug/multi-config-properties', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Supabase connection not available' });
        }

        console.log('🔍 Finding properties with multiple configurations...');

        // Get all properties
        const { data: allProperties, error } = await supabase
            .from('unified_data')
            .select('id, projectname, bhk, facing, baseprojectprice, sqfeet')
            .limit(2000);

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Group by projectname and count
        const projectGroups = {};
        allProperties.forEach(prop => {
            const name = prop.projectname;
            if (!projectGroups[name]) {
                projectGroups[name] = [];
            }
            projectGroups[name].push(prop);
        });

        // Find properties with 2+ configurations
        const multiConfigProperties = Object.entries(projectGroups)
            .filter(([_, configs]) => configs.length > 1)
            .map(([name, configs]) => ({
                projectName: name,
                configCount: configs.length,
                configurations: configs.map(c => ({
                    id: c.id,
                    bhk: c.bhk,
                    facing: c.facing,
                    price: c.baseprojectprice,
                    sqfeet: c.sqfeet
                }))
            }))
            .sort((a, b) => b.configCount - a.configCount)
            .slice(0, 20);

        console.log(`✅ Found ${multiConfigProperties.length} properties with multiple configurations`);

        // Check SILPA'S RV VIBHUMAN specifically
        const silpaConfigs = projectGroups["SILPA'S RV VIBHUMAN"] || [];
        console.log(`🔍 SILPA'S RV VIBHUMAN has ${silpaConfigs.length} configuration(s)`);

        res.status(200).json({
            success: true,
            totalProperties: Object.keys(projectGroups).length,
            multiConfigCount: multiConfigProperties.length,
            properties: multiConfigProperties,
            silpaVibhuman: {
                configCount: silpaConfigs.length,
                configurations: silpaConfigs
            }
        });

    } catch (error) {
        console.error('❌ Error checking multi-config properties:', error);
        res.status(500).json({
            error: 'Failed to check properties',
            details: error.message
        });
    }
});

// Global error handler for any unhandled errors
app.use((err, req, res, next) => {
    console.error('🚨 Global error handler caught:', err);

    // Handle path-to-regexp errors specifically
    if (err.message && err.message.includes('Missing parameter name')) {
        console.error('🔍 Path-to-regexp error in global handler');
        return res.status(400).json({
            error: 'Invalid URL format',
            message: 'The requested URL contains invalid route parameters'
        });
    }

    // Handle other errors
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});

// 404 handler - serve index.html for non-API routes (SPA), JSON error for API routes
app.use((req, res) => {
    // Check if this is an API route
    if (req.originalUrl.startsWith('/api/')) {
        console.log(`🚫 404 - API route not found: ${req.method} ${req.originalUrl}`);
        return res.status(404).json({
            error: 'Route not found',
            message: `The requested route ${req.method} ${req.originalUrl} does not exist`
        });
    }

    // For non-API routes, serve index.html to support React Router
    const frontendDistPath = path.join(__dirname, '../Frontend/dist');
    const indexPath = path.join(frontendDistPath, 'index.html');

    if (fs.existsSync(indexPath)) {
        console.log(`📄 Serving index.html for: ${req.originalUrl}`);
        res.sendFile(indexPath);
    } else {
        console.log(`🚫 404 - Frontend not built: ${req.method} ${req.originalUrl}`);
        res.status(404).json({
            error: 'Route not found',
            message: 'Frontend application not found. Please build the frontend first.'
        });
    }
});

// START SERVER FIRST, THEN CONNECT TO MONGODB
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
    console.log(`🔑 Zoho Auth: Disabled (no JWT tokens needed)`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Frontend can access backend at: /api/*`);
    console.log(`🌐 Full server URL: https://${process.env.REPL_SLUG || 'localhost'}.${process.env.REPL_OWNER || 'replit'}.repl.co:${PORT}`);
    if (process.env.REPLIT_DEV_DOMAIN) {
        console.log(`🌐 Deployed URL: https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    console.log(`🌐 External port configured: Port 3000 -> External port 80`);
    console.log(`🌐 CORS allowed origins:`, allowedOrigins);
    console.log(`🌐 CORS configuration:`, {
        credentials: corsOptions.credentials,
        methods: corsOptions.methods,
        allowedHeaders: corsOptions.allowedHeaders,
        maxAge: corsOptions.maxAge
    });

    // Connect to MongoDB AFTER server starts (NON-BLOCKING)
    console.log('🔄 Starting MongoDB connection...');
    connectWithRetry()
        .then((success) => {
            if (success) {
                console.log('✅ MongoDB connection established successfully');
            } else {
                console.log('⚠️ MongoDB connection failed, but server continues running');
            }
        })
        .catch((error) => {
            console.error('❌ MongoDB connection failed, but server continues running:', error);
        });

}).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Try a different port.`);
    }
    process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully`);

    const timeout = setTimeout(() => {
        console.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 5000);

    server.close(async () => {
        console.log('HTTP server closed');

        try {
            if (mongoClient) {
                await mongoClient.close();
                console.log('MongoDB connection closed');
            }
        } catch (err) {
            console.error('Error closing MongoDB:', err);
        }

        clearTimeout(timeout);
        console.log('Process terminated gracefully');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));