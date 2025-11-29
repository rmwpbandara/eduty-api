# EDuty API - Architecture Documentation

## Overview

EDuty API is built using NestJS, following enterprise-grade architecture patterns and best practices for production-ready applications.

## Architecture Principles

1. **Modular Design** - Feature-based modules for maintainability
2. **Separation of Concerns** - Clear boundaries between layers
3. **Dependency Injection** - Loose coupling and testability
4. **Type Safety** - TypeScript throughout
5. **Security First** - Multiple layers of security
6. **Observability** - Comprehensive logging and monitoring

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Applications                   │
│              (Web, Mobile, Third-party APIs)             │
└────────────────────┬──────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
│              (Nginx, AWS ALB, etc.)                     │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              NestJS Application Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Auth       │  │ Workspaces   │  │   Health     │ │
│  │   Module     │  │   Module     │  │   Module     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Global Interceptors & Filters            │   │
│  │  - Transform Interceptor                         │   │
│  │  - Logging Interceptor                           │   │
│  │  - Exception Filter                              │   │
│  │  - Rate Limiting                                 │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Data Access Layer (TypeORM)                 │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                    │
└─────────────────────────────────────────────────────────┘
```

## Layer Architecture

### 1. Presentation Layer (Controllers)

**Responsibility**: Handle HTTP requests and responses

- **Location**: `src/*/controllers/`
- **Responsibilities**:
  - Request validation
  - Response formatting
  - HTTP status codes
  - Swagger documentation

**Example**:
```typescript
@Controller('workspaces')
@ApiTags('Workspaces')
export class WorkspacesController {
  @Get()
  @ApiOperation({ summary: 'Get all workspaces' })
  findAll() { ... }
}
```

### 2. Business Logic Layer (Services)

**Responsibility**: Implement business rules and orchestration

- **Location**: `src/*/services/`
- **Responsibilities**:
  - Business logic
  - Data transformation
  - Service orchestration
  - Transaction management

### 3. Data Access Layer (Repositories/Entities)

**Responsibility**: Database operations

- **Location**: `src/*/entities/`
- **Responsibilities**:
  - Data persistence
  - Query optimization
  - Relationships
  - Migrations

### 4. Cross-Cutting Concerns

#### Exception Handling
- **Location**: `src/common/filters/http-exception.filter.ts`
- **Purpose**: Global error handling and formatting

#### Response Transformation
- **Location**: `src/common/interceptors/transform.interceptor.ts`
- **Purpose**: Standardize API responses

#### Logging
- **Location**: `src/common/interceptors/logging.interceptor.ts`
- **Purpose**: Request/response logging

#### Security
- **Helmet**: Security headers
- **Rate Limiting**: Throttler module
- **CORS**: Configurable origin whitelist
- **Validation**: Class-validator

## Module Structure

### Auth Module
- Authentication and authorization
- JWT token verification
- User profile management

### Workspaces Module
- Workspace CRUD operations
- User enrollment
- Invitations
- Rosters
- Leave requests

### Health Module
- Health check endpoints
- Liveness/readiness probes
- Database connectivity checks

## Data Flow

1. **Request** → Controller receives HTTP request
2. **Validation** → DTO validation via class-validator
3. **Authentication** → Auth guard verifies JWT token
4. **Authorization** → Service checks permissions
5. **Business Logic** → Service executes business rules
6. **Data Access** → TypeORM queries database
7. **Response** → Transform interceptor formats response
8. **Logging** → Logging interceptor logs request/response

## Security Architecture

### Authentication Flow
```
Client → JWT Token → Auth Guard → Auth Service → Supabase
```

### Authorization
- Role-based access control (RBAC) ready
- Workspace-level permissions
- Resource ownership validation

### Security Layers
1. **Network**: HTTPS/TLS
2. **Application**: Helmet.js headers
3. **Rate Limiting**: Throttler (100 req/min)
4. **Input Validation**: DTOs with class-validator
5. **Error Handling**: No sensitive data exposure

## Database Design

### Entity Relationships
- Workspace → Users (Many-to-Many via Enrollment)
- Workspace → Rosters (One-to-Many)
- Workspace → Leave Requests (One-to-Many)
- User → Invitations (One-to-Many)

### Migration Strategy
- TypeORM migrations
- Version-controlled schema changes
- Rollback support

## Logging Strategy

### Log Levels
- **Error**: Application errors
- **Warn**: Warning conditions
- **Info**: General information
- **Debug**: Detailed debugging (development only)

### Log Destinations
- Console (stdout)
- File: `logs/combined.log`
- File: `logs/error.log`

## Performance Optimizations

1. **Compression**: Gzip compression enabled
2. **Connection Pooling**: TypeORM connection pool
3. **Query Optimization**: Indexed queries
4. **Caching**: Ready for Redis integration
5. **Rate Limiting**: Prevents abuse

## Scalability

### Horizontal Scaling
- Stateless API design
- Database connection pooling
- Load balancer ready

### Vertical Scaling
- Configurable memory limits
- Efficient resource usage

## Testing Strategy

### Unit Tests
- Service layer testing
- Mock dependencies
- Test business logic

### Integration Tests
- API endpoint testing
- Database integration
- E2E scenarios

### Test Coverage
- Target: 80%+ coverage
- Critical paths: 100% coverage

## Deployment Architecture

### Containerization
- Docker support
- Multi-stage builds
- Optimized image size

### Orchestration Ready
- Kubernetes compatible
- Health check endpoints
- Graceful shutdown

## Monitoring & Observability

### Health Checks
- `/api/v1/health` - Full health check
- `/api/v1/health/liveness` - Liveness probe
- `/api/v1/health/readiness` - Readiness probe

### Metrics (Ready for Integration)
- Request rate
- Error rate
- Response times
- Database performance

## Future Enhancements

1. **Caching Layer**: Redis integration
2. **Message Queue**: RabbitMQ/Kafka for async tasks
3. **Search**: Elasticsearch integration
4. **File Storage**: S3 integration
5. **Real-time**: WebSocket support
6. **GraphQL**: GraphQL API option

## Best Practices Implemented

✅ SOLID principles
✅ DRY (Don't Repeat Yourself)
✅ KISS (Keep It Simple, Stupid)
✅ Separation of Concerns
✅ Dependency Injection
✅ Error Handling
✅ Logging
✅ Security
✅ Documentation
✅ Testing Ready

