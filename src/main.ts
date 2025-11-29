import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  // Log startup attempt
  console.log('Starting EDuty API...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Port:', process.env.PORT || 3001);
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');

  try {
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
      logger: ['error', 'warn', 'log', 'debug'], // Fallback logger
    });

    // Use Winston logger
    try {
      app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
      console.log('Winston logger initialized');
    } catch (error) {
      console.warn(
        'Winston logger initialization failed, using default logger:',
        error,
      );
    }

    // Security Headers
    app.use(
      helmet({
        contentSecurityPolicy: process.env.NODE_ENV === 'production',
        crossOriginEmbedderPolicy: false,
      }),
    );

    // Compression
    app.use(compression());

    // Add redirect from /api to /api/v1 for Railway compatibility (before global prefix)
    app.use('/api', (req, res, next) => {
      if (req.path === '' || req.path === '/') {
        return res.redirect(301, '/api/v1/');
      }
      next();
    });

    // API Versioning
    app.setGlobalPrefix('api/v1');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    // Enable CORS for frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const allowedOrigins = frontendUrl.split(',').map((url) => url.trim());

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          callback(null, true);
          return;
        }

        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
          callback(null, true);
          return;
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    });

    // Global validation pipe with enhanced options
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        disableErrorMessages: process.env.NODE_ENV === 'production',
        validationError: {
          target: false,
          value: false,
        },
      }),
    );

    // Swagger configuration (only in non-production)
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('EDuty API')
        .setDescription('EDuty Backend API Documentation - Production Ready')
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .addServer('http://localhost:3001', 'Development')
        .addServer('https://api.eduty.com', 'Production')
        .addTag('General', 'General endpoints')
        .addTag('Authentication', 'Authentication endpoints')
        .addTag('Workspaces', 'Workspace management endpoints')
        .addTag('Health', 'Health check endpoints')
        .build();

      const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey: string, methodKey: string) =>
          methodKey,
      });

      SwaggerModule.setup('docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
        customSiteTitle: 'EDuty API Documentation',
      });
    }

    const port = process.env.PORT || 3001;
    let logger;
    try {
      logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
    } catch (error) {
      logger = console;
      console.warn('Using console logger as fallback');
    }

    await app.listen(port, '0.0.0.0'); // Listen on all interfaces for Railway

    const startupMessage = `🚀 Application is running on: http://0.0.0.0:${port}`;
    logger.log(startupMessage);
    console.log(startupMessage); // Always log to console for Railway

    logger.log(`📚 Swagger documentation: http://0.0.0.0:${port}/api/v1/docs`);
    logger.log(`🏥 Health check: http://0.0.0.0:${port}/api/v1/health`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🔌 Listening on: 0.0.0.0:${port}`);

    console.log('✅ Application started successfully');
    console.log(`✅ Health check available at: /api/v1/health`);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap().catch((error) => {
  console.error('❌ Bootstrap failed:', error);
  console.error('Error details:', error.message);
  if (error.stack) {
    console.error('Stack trace:', error.stack);
  }
  process.exit(1);
});
