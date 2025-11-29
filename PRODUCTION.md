# Production Deployment Guide

This document outlines the steps and best practices for deploying EDuty API to production.

## Pre-Deployment Checklist

### 1. Environment Configuration

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database URL
- [ ] Set secure JWT secret
- [ ] Configure CORS origins for production domain
- [ ] Set up SSL/TLS certificates
- [ ] Configure logging levels

### 2. Security

- [ ] Review and update CORS settings
- [ ] Enable rate limiting (already configured: 100 req/min)
- [ ] Verify security headers (Helmet.js)
- [ ] Review API authentication
- [ ] Set up firewall rules
- [ ] Enable HTTPS only

### 3. Database

- [ ] Run database migrations
- [ ] Set up database backups
- [ ] Configure connection pooling
- [ ] Set up database monitoring
- [ ] Disable `synchronize` in production (already disabled)

### 4. Monitoring & Logging

- [ ] Set up application monitoring (e.g., New Relic, Datadog)
- [ ] Configure log aggregation
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure alerting
- [ ] Set up health check monitoring

### 5. Performance

- [ ] Enable compression (already enabled)
- [ ] Configure caching if needed
- [ ] Set up CDN for static assets
- [ ] Review database query performance
- [ ] Set up load balancing if needed

## Deployment Steps

### Using Docker

1. Build the Docker image:
```bash
docker build -t eduty-api:latest .
```

2. Run the container:
```bash
docker run -d \
  --name eduty-api \
  -p 3001:3001 \
  --env-file .env.production \
  --restart unless-stopped \
  eduty-api:latest
```

### Using PM2

1. Install PM2:
```bash
npm install -g pm2
```

2. Build the application:
```bash
npm run build
```

3. Start with PM2:
```bash
pm2 start dist/main.js --name eduty-api
```

4. Save PM2 configuration:
```bash
pm2 save
pm2 startup
```

### Environment Variables for Production

Create a `.env.production` file:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/eduty
FRONTEND_URL=https://your-frontend-domain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
JWT_SECRET=your-very-secure-secret-key-min-32-chars
```

## Health Checks

The application provides several health check endpoints:

- `GET /api/v1/health` - Full health check with database
- `GET /api/v1/health/liveness` - Liveness probe (Kubernetes)
- `GET /api/v1/health/readiness` - Readiness probe (Kubernetes)

Configure your load balancer or orchestration platform to use these endpoints.

## Monitoring

### Application Logs

Logs are written to:
- Console (stdout/stderr)
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Key Metrics to Monitor

- Request rate and latency
- Error rate (4xx, 5xx)
- Database connection pool usage
- Memory usage
- CPU usage
- Response times

## Scaling

### Horizontal Scaling

1. Use a load balancer (e.g., Nginx, AWS ALB)
2. Deploy multiple instances
3. Use sticky sessions if needed (not required for stateless API)
4. Configure health checks on load balancer

### Vertical Scaling

- Increase Node.js memory limit if needed:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run start:prod
```

## Backup Strategy

### Database Backups

Set up automated database backups:
- Daily full backups
- Hourly incremental backups
- Test restore procedures regularly

### Application Backups

- Version control (Git)
- Docker image registry
- Environment configuration (secure storage)

## Rollback Procedure

1. Identify the previous working version
2. Stop current deployment
3. Deploy previous version
4. Verify health checks
5. Monitor for issues

## Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Use HTTPS** - Always in production
3. **Regular updates** - Keep dependencies updated
4. **Rate limiting** - Already configured
5. **Input validation** - Already implemented
6. **Error handling** - Don't expose internal errors
7. **Logging** - Don't log sensitive data

## Troubleshooting

### Application won't start

1. Check environment variables
2. Verify database connectivity
3. Check logs: `logs/error.log`
4. Verify port availability

### High error rate

1. Check application logs
2. Review database performance
3. Check rate limiting
4. Review recent deployments

### Performance issues

1. Check database query performance
2. Review application logs for slow requests
3. Monitor resource usage
4. Review rate limiting settings

## Support

For issues or questions:
1. Check application logs
2. Review this documentation
3. Check Swagger documentation at `/api/docs`
4. Contact the development team

