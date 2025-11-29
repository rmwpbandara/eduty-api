import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        this.logger.warn('No authorization header provided');
        throw new UnauthorizedException('No authorization header provided');
      }

      if (!authHeader.startsWith('Bearer ')) {
        this.logger.warn('Invalid authorization header format');
        throw new UnauthorizedException(
          'Invalid authorization header format. Expected: Bearer <token>',
        );
      }

      const token = authHeader.replace('Bearer ', '').trim();

      if (!token || token.length < 10) {
        this.logger.warn('Invalid token format');
        throw new UnauthorizedException('Invalid token format');
      }

      const user = await this.authService.verifyToken(token);

      if (!user) {
        this.logger.warn('Token verification failed');
        throw new UnauthorizedException('Invalid or expired token');
      }

      // Verify user has required fields
      if (!user.id || !user.email) {
        this.logger.error('Invalid user data from token', { userId: user.id });
        throw new UnauthorizedException('Invalid user data');
      }

      // Attach user to request object
      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Error in AuthGuard', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
