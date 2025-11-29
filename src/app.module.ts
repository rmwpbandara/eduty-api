import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { HealthModule } from './health/health.module';
import { validate } from './config/env.validation';
import { loggerConfig } from './config/logger.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    // Configuration Module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate,
      cache: true,
    }),
    // Winston Logger
    WinstonModule.forRoot(loggerConfig),
    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 requests per minute in production
      },
    ]),
    // Database
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          console.error('DATABASE_URL environment variable is not set');
          throw new Error('DATABASE_URL environment variable is not set');
        }

        try {
          // Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
          // Handle both postgresql:// and postgres:// protocols
          const urlString = databaseUrl.replace(/^postgresql:/, 'postgres:');
          const url = new URL(urlString);

          const config = {
            type: 'postgres' as const,
            host: url.hostname,
            port: parseInt(url.port) || 5432,
            username: url.username,
            password: url.password,
            database: url.pathname.slice(1), // Remove leading '/'
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: process.env.NODE_ENV !== 'production', // Auto-sync in dev only
            ssl:
              process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
            logging: process.env.NODE_ENV === 'development',
            maxQueryExecutionTime: 1000, // Log slow queries
            migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
            migrationsRun: false,
            migrationsTableName: 'migrations',
            retryAttempts: 3,
            retryDelay: 3000,
            autoLoadEntities: true,
          };

          console.log(
            `Database configured for: ${url.hostname}:${config.port}/${config.database}`,
          );
          return config;
        } catch (error) {
          console.error('Failed to parse DATABASE_URL:', error);
          throw new Error(`Invalid DATABASE_URL format: ${error.message}`);
        }
      },
    }),
    // Feature Modules
    AuthModule,
    WorkspacesModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global Response Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global Logging Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
