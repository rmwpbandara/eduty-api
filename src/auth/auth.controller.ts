import { Controller, Get, Request, UseGuards, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('me')
  async getProfile(@Request() req) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        throw new HttpException(
          { error: 'No authorization header provided' },
          HttpStatus.UNAUTHORIZED
        );
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new HttpException(
          { error: 'Invalid authorization header format. Expected: Bearer <token>' },
          HttpStatus.UNAUTHORIZED
        );
      }

      const token = authHeader.replace('Bearer ', '').trim();
      
      if (!token || token.length < 10) {
        throw new HttpException(
          { error: 'Invalid token format' },
          HttpStatus.UNAUTHORIZED
        );
      }

      const user = await this.authService.verifyToken(token);
      
      if (!user) {
        throw new HttpException(
          { error: 'Invalid or expired token' },
          HttpStatus.UNAUTHORIZED
        );
      }

      // Verify user has required fields
      if (!user.id || !user.email) {
        this.logger.warn('User data missing required fields', { userId: user.id });
        throw new HttpException(
          { error: 'Invalid user data' },
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      // Return only safe user data (exclude sensitive information)
      return {
        user: {
          id: user.id,
          email: user.email,
          email_confirmed_at: user.email_confirmed_at,
          created_at: user.created_at,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Error in getProfile', error);
      throw new HttpException(
        { error: 'Internal server error' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}

