import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a user account and returns JWT access token.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({ description: 'Registration succeeded and token issued.' })
  @ApiConflictResponse({ description: 'Email already exists.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login with email and password',
    description: 'Authenticates user and returns JWT access token.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'Login succeeded and token issued.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
