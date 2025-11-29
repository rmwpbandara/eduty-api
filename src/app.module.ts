import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is not set');
        }

        // Parse DATABASE_URL (format: postgresql://user:password@host:port/database)
        // Handle both postgresql:// and postgres:// protocols
        const urlString = databaseUrl.replace(/^postgresql:/, 'postgres:');
        const url = new URL(urlString);
        return {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port) || 5432,
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1), // Remove leading '/'
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV !== 'production', // Auto-sync in dev only
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    AuthModule,
    WorkspacesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

