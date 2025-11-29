import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private supabase: SupabaseClient | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        'Supabase configuration is missing. Auth features will be disabled. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.',
      );
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('Supabase client initialized successfully');
  }

  async verifyToken(token: string): Promise<any> {
    if (!this.supabase) {
      this.logger.warn('Supabase client not initialized. Cannot verify token.');
      return null;
    }

    if (!token || typeof token !== 'string' || token.length < 10) {
      this.logger.warn('Invalid token format provided');
      return null;
    }

    try {
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Token verification timeout')), 10000)
      );

      const getUserPromise = this.supabase.auth.getUser(token);
      const { data, error } = await Promise.race([getUserPromise, timeoutPromise]) as any;

      if (error) {
        this.logger.warn('Token verification failed', { error: error.message });
        return null;
      }

      if (!data || !data.user) {
        this.logger.warn('No user data returned from token verification');
        return null;
      }

      // Validate user data
      if (!data.user.id || !data.user.email) {
        this.logger.warn('Invalid user data returned', { userId: data.user.id });
        return null;
      }

      return data.user;
    } catch (error: any) {
      if (error?.message?.includes('timeout')) {
        this.logger.error('Token verification timed out');
      } else {
        this.logger.error('Error verifying token', error);
      }
      return null;
    }
  }

  async getUserById(userId: string): Promise<any> {
    if (!this.supabase) {
      this.logger.warn('Supabase client not initialized. Cannot get user.');
      return null;
    }

    if (!userId || typeof userId !== 'string' || userId.length < 1) {
      this.logger.warn('Invalid user ID provided');
      return null;
    }

    try {
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Get user timeout')), 10000)
      );

      const getUserPromise = this.supabase.auth.admin.getUserById(userId);
      const { data, error } = await Promise.race([getUserPromise, timeoutPromise]) as any;

      if (error) {
        this.logger.warn('Failed to get user by ID', { userId, error: error.message });
        return null;
      }

      if (!data || !data.user) {
        this.logger.warn('No user data returned', { userId });
        return null;
      }

      // Validate user data
      if (!data.user.id || !data.user.email) {
        this.logger.warn('Invalid user data returned', { userId: data.user.id });
        return null;
      }

      return data.user;
    } catch (error: any) {
      if (error?.message?.includes('timeout')) {
        this.logger.error('Get user by ID timed out', { userId });
      } else {
        this.logger.error('Error getting user by ID', { userId, error });
      }
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<any> {
    if (!this.supabase) {
      this.logger.warn('Supabase client not initialized. Cannot get user.');
      return null;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      this.logger.warn('Invalid email provided');
      return null;
    }

    try {
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Get user timeout')), 10000)
      );

      const listUsersPromise = this.supabase.auth.admin.listUsers();
      const { data, error } = await Promise.race([listUsersPromise, timeoutPromise]) as any;

      if (error) {
        this.logger.warn('Failed to list users', { error: error.message });
        return null;
      }

      if (!data || !data.users) {
        this.logger.warn('No user data returned');
        return null;
      }

      // Find user by email
      const normalizedEmail = email.toLowerCase().trim();
      const user = data.users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

      if (!user) {
        this.logger.debug('User not found by email', { email: normalizedEmail });
        return null;
      }

      return user;
    } catch (error: any) {
      if (error?.message?.includes('timeout')) {
        this.logger.error('Get user by email timed out', { email });
      } else {
        this.logger.error('Error getting user by email', { email, error });
      }
      return null;
    }
  }

  async getUserPhoneNumber(userId: string): Promise<string | null> {
    if (!this.supabase) {
      this.logger.warn('Supabase client not initialized. Cannot get phone number.');
      return null;
    }

    try {
      const user = await this.getUserById(userId);
      if (!user) {
        return null;
      }

      // Check all possible phone number fields
      const phoneNumber = 
        user.user_metadata?.phone ||
        user.user_metadata?.phone_number ||
        user.user_metadata?.phoneNumber ||
        user.phone ||
        null;

      return phoneNumber;
    } catch (error) {
      this.logger.error('Error getting user phone number', { userId, error });
      return null;
    }
  }
}

