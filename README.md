# EDuty API

A production-ready NestJS backend API for managing duty rosters, workspaces, and leave requests.

## 🚀 Features

- **RESTful API** with comprehensive Swagger documentation
- **Authentication & Authorization** using JWT tokens
- **Workspace Management** - Create, manage, and organize workspaces
- **Roster Management** - Schedule and manage duty rosters
- **Leave Request System** - Handle employee leave requests
- **User Invitations** - Invite users to workspaces
- **Production Ready** - Error handling, logging, rate limiting, security headers

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🛠️ Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/eduty
FRONTEND_URL=http://localhost:3000
```

5. Run database migrations (if applicable):
```bash
npm run migration:run
```

6. Start the development server:
```bash
npm run start:dev
```

## 📚 API Documentation

Once the server is running, access the Swagger documentation at:
- **Swagger UI**: http://localhost:3001/api/docs
- **Swagger JSON**: http://localhost:3001/api/docs-json

## 🏗️ Project Structure

```
src/
├── auth/                 # Authentication module
├── workspaces/           # Workspaces module
│   ├── dto/             # Data Transfer Objects
│   └── *.entity.ts      # TypeORM entities
├── health/               # Health check endpoints
├── common/               # Shared utilities
│   ├── filters/         # Exception filters
│   └── interceptors/     # Request/Response interceptors
├── config/              # Configuration files
└── main.ts              # Application entry point
```

## 🔧 Available Scripts

- `npm run build` - Build the application
- `npm run start` - Start the production server
- `npm run start:dev` - Start development server with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage

## 🌍 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | No | `development` |
| `PORT` | Server port | No | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `FRONTEND_URL` | Frontend URL for CORS | No | `http://localhost:3000` |
| `SUPABASE_URL` | Supabase project URL | No | - |
| `SUPABASE_KEY` | Supabase anon key | No | - |
| `JWT_SECRET` | JWT secret key | No | - |

## 🔒 Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - 100 requests/minute (production)
- **CORS** - Configurable origin whitelist
- **Input Validation** - Class-validator with DTOs
- **Error Handling** - Global exception filter
- **Logging** - Winston logger with file rotation

## 📊 Health Checks

- **Basic Health**: `GET /api/v1/health`
- **Liveness Probe**: `GET /api/v1/health/liveness`
- **Readiness Probe**: `GET /api/v1/health/readiness`

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 API Versioning

The API uses URI versioning. All endpoints are prefixed with `/api/v1`.

Example:
- `GET /api/v1/workspaces`
- `POST /api/v1/workspaces`

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Set up database migrations
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Configure SSL/TLS
- [ ] Set up rate limiting
- [ ] Review security headers

### Docker Deployment

```bash
docker build -t eduty-api .
docker run -p 3001:3001 --env-file .env eduty-api
```

## 📖 API Endpoints

### Authentication
- `GET /api/v1/auth/me` - Get current user profile

### Workspaces
- `GET /api/v1/workspaces` - List workspaces
- `POST /api/v1/workspaces` - Create workspace
- `GET /api/v1/workspaces/:id` - Get workspace details
- `PATCH /api/v1/workspaces/:id` - Update workspace
- `DELETE /api/v1/workspaces/:id` - Delete workspace

See full API documentation at `/api/docs` when server is running.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- NestJS team for the amazing framework
- All contributors

