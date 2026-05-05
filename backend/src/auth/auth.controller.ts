import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { RefreshDto } from './dto/refresh.dto'
import { Public } from './public.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'
import type { AuthUser } from './jwt.strategy'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto)
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: AuthUser }) {
    return this.auth.me(req.user.id, req.user.tenantId)
  }
}
