import { Controller, Get, Request, UseGuards, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get current user profile', 
    description: 'Returns the profile information of the authenticated user. Requires a valid JWT token in the Authorization header.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns current user information',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            email: { type: 'string', example: 'user@example.com' },
            email_confirmed_at: { type: 'string', nullable: true, example: '2024-01-01T00:00:00Z' },
            created_at: { type: 'string', example: '2024-01-01T00:00:00Z' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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

