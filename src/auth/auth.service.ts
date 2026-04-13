import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser({
      email: dto.email,
      fullName: dto.fullName,
      passwordHash,
      phone: dto.phone,
      role: dto.role,
    });

    this.auditLogService.log({
      userId: user.id,
      action: 'auth.register',
      entity: 'user',
      entityId: user.id,
      metadata: { role: user.role, email: user.email },
    });

    return this.issueToken(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      this.auditLogService.log({
        userId: null,
        action: 'auth.login.failed',
        entity: 'user',
        metadata: { email: dto.email, reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      this.auditLogService.log({
        userId: user.id,
        action: 'auth.login.failed',
        entity: 'user',
        entityId: user.id,
        metadata: { email: dto.email, reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    this.auditLogService.log({
      userId: user.id,
      action: 'auth.login.success',
      entity: 'user',
      entityId: user.id,
      metadata: { role: user.role, email: user.email },
    });

    return this.issueToken(user.id, user.email, user.role);
  }

  private issueToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1d');
    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: expiresIn as any,
      }),
      user: {
        id: userId,
        email,
        role,
      },
    };
  }
}
