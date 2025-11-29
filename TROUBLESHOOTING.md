# Railway 502 Bad Gateway - Troubleshooting Guide

## Issue: 502 Bad Gateway on `/api`

### Root Cause
The application uses API versioning with global prefix `api/v1`, so all routes are under `/api/v1/`. Accessing `/api` directly returns 502 because there's no route handler.

### Solutions Applied

1. **Added Redirect Middleware**
   - `/api` → redirects to `/api/v1/`
   - Placed before global prefix to catch requests

2. **Enhanced Error Logging**
   - Console logs for Railway debugging
   - Startup messages to verify app initialization
   - Database connection logging

3. **Better Error Handling**
   - Try-catch in bootstrap
   - Process error handlers
   - Graceful failure messages

### Correct URLs to Use

✅ **Working URLs:**
- `https://eduty-api-staging.up.railway.app/api/v1/` - Root API
- `https://eduty-api-staging.up.railway.app/api/v1/health` - Health check
- `https://eduty-api-staging.up.railway.app/api/v1/health/liveness` - Liveness
- `https://eduty-api-staging.up.railway.app/api/v1/health/readiness` - Readiness

❌ **Won't Work:**
- `https://eduty-api-staging.up.railway.app/api` - Will redirect to `/api/v1/`
- `https://eduty-api-staging.up.railway.app/` - No handler

### Debugging Steps

1. **Check Railway Logs**
   ```
   Railway Dashboard → Your Service → Deployments → Latest → Logs
   ```

2. **Look for These Messages:**
   ```
   Starting EDuty API...
   Environment: production
   Port: [PORT_NUMBER]
   Database URL: Set
   ✅ Application started successfully
   ✅ Health check available at: /api/v1/health
   ```

3. **If App Crashes, Check For:**
   - `DATABASE_URL environment variable is not set`
   - `Failed to parse DATABASE_URL`
   - `Failed to connect to database`
   - Any other error messages

### Common Issues

#### Issue 1: Database Connection Failed
**Symptoms:** App crashes on startup
**Solution:**
- Verify PostgreSQL service is provisioned
- Check `DATABASE_URL` is set in Railway
- Ensure database service is linked to app

#### Issue 2: Port Binding Error
**Symptoms:** "Port already in use" or connection refused
**Solution:**
- ✅ Fixed: App now listens on `0.0.0.0`
- Don't manually set PORT variable

#### Issue 3: Missing Environment Variables
**Symptoms:** App crashes with "environment variable is not set"
**Solution:**
- Set `NODE_ENV=production` in Railway
- Verify `DATABASE_URL` is auto-provided
- Set `FRONTEND_URL` for CORS

#### Issue 4: Route Not Found (502)
**Symptoms:** 502 when accessing `/api`
**Solution:**
- ✅ Fixed: Redirect added from `/api` to `/api/v1/`
- Use `/api/v1/` for all API calls

### Testing After Deployment

1. **Test Health Endpoint:**
   ```bash
   curl https://eduty-api-staging.up.railway.app/api/v1/health
   ```
   Should return: `{"status":"ok","info":{"database":{"status":"up"}},...}`

2. **Test Root API:**
   ```bash
   curl https://eduty-api-staging.up.railway.app/api/v1/
   ```
   Should return API information

3. **Test Redirect:**
   ```bash
   curl -I https://eduty-api-staging.up.railway.app/api
   ```
   Should return: `301 Moved Permanently` → `/api/v1/`

### Railway Environment Variables Checklist

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (auto-provided by Railway PostgreSQL)
- [ ] `PORT` (auto-provided by Railway, don't set manually)
- [ ] `FRONTEND_URL` (your frontend domain for CORS)

### Next Steps

1. **Redeploy** with these fixes
2. **Check Logs** in Railway dashboard
3. **Test Health Endpoint** at `/api/v1/health`
4. **Verify Database** connection in logs
5. **Test API** at `/api/v1/`

### Still Getting 502?

1. Check Railway logs for specific error
2. Verify database is running and connected
3. Ensure all environment variables are set
4. Check if app is actually starting (look for startup messages)
5. Verify port is correct (Railway provides this)

### Expected Startup Logs

You should see in Railway logs:
```
Starting EDuty API...
Environment: production
Port: [some port number]
Database URL: Set
Database configured for: [host]:[port]/[database]
Winston logger initialized
🚀 Application is running on: http://0.0.0.0:[port]
✅ Application started successfully
✅ Health check available at: /api/v1/health
```

If you don't see "Application started successfully", the app is crashing before completion.

