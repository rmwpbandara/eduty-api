# Railway Deployment Guide

## Common Issues and Solutions

### 502 Bad Gateway Error

This usually means the application is crashing on startup. Check the following:

#### 1. Environment Variables
Ensure these are set in Railway:
- `DATABASE_URL` - PostgreSQL connection string (Railway auto-provides this)
- `NODE_ENV=production` - Set to production
- `PORT` - Railway auto-provides this, don't override
- `FRONTEND_URL` - Your frontend URL for CORS

#### 2. Database Connection
- Verify `DATABASE_URL` is set correctly
- Check database is provisioned and running
- Ensure SSL is enabled for production connections

#### 3. Port Binding
The app now listens on `0.0.0.0` to accept connections from Railway's proxy.

#### 4. Check Logs
In Railway dashboard:
1. Go to your service
2. Click on "Deployments"
3. Click on the latest deployment
4. Check "Logs" tab for errors

### Common Errors

#### "DATABASE_URL environment variable is not set"
- Solution: Add PostgreSQL service in Railway and link it to your app
- Railway automatically provides `DATABASE_URL`

#### "Failed to connect to database"
- Solution: Check database service is running
- Verify SSL settings (should be enabled in production)

#### "Port already in use"
- Solution: Don't set PORT manually, Railway provides it
- The app uses `process.env.PORT || 3001`

#### "Cannot find module"
- Solution: Ensure `npm ci` runs in Dockerfile
- Check all dependencies are in package.json

### Health Check Endpoints

After deployment, test these:
- `https://your-app.railway.app/api/v1/health` - Full health check
- `https://your-app.railway.app/api/v1/health/liveness` - Liveness probe
- `https://your-app.railway.app/api/v1/health/readiness` - Readiness probe

### Root Path Issue

The root path `/` is now available at `/api/v1/` due to versioning.

If you need root access, the app controller handles `/api/v1/` which is the root of the API.

### Debugging Steps

1. **Check Railway Logs**
   ```bash
   # In Railway dashboard, view deployment logs
   ```

2. **Test Locally with Railway Variables**
   ```bash
   # Export Railway environment variables
   export DATABASE_URL="your-railway-db-url"
   export NODE_ENV="production"
   export PORT=3001
   
   # Run locally
   npm run start:prod
   ```

3. **Verify Database Connection**
   ```bash
   # Test database connection string
   psql $DATABASE_URL
   ```

4. **Check Application Startup**
   - Look for "Application is running" message in logs
   - Verify port is correct
   - Check for any error messages before startup

### Railway-Specific Configuration

The app is configured to:
- ✅ Use Railway's PORT environment variable
- ✅ Listen on 0.0.0.0 (all interfaces)
- ✅ Handle Railway's logging (console only, no file writes)
- ✅ Use Railway's DATABASE_URL
- ✅ Work with Railway's health checks

### Quick Fixes

If you're still getting 502:

1. **Redeploy** - Sometimes a fresh deploy fixes issues
2. **Check Environment Variables** - Verify all required vars are set
3. **View Logs** - Check Railway logs for specific errors
4. **Test Database** - Ensure database is accessible
5. **Verify Build** - Check Dockerfile build completes successfully

### Expected Logs on Startup

You should see:
```
🚀 Application is running on: http://0.0.0.0:PORT
📚 Swagger documentation: http://0.0.0.0:PORT/api/v1/docs
🏥 Health check: http://0.0.0.0:PORT/api/v1/health
🌍 Environment: production
🔌 Listening on: 0.0.0.0:PORT
```

If you don't see these, the app is crashing before startup completes.

