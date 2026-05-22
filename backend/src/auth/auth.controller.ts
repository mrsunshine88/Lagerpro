import { Controller, Post, Get, Put, Delete, Body, Req, UseGuards, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './roles.decorator.js';

@Controller('api')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email || '', body.password || '');
    if (!user) {
      return { success: false, error: 'Felaktig e-postadress eller lösenord' };
    }
    const tokenInfo = await this.authService.login(user);
    return { success: true, access_token: tokenInfo.access_token };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('session-info')
  async getSessionInfo(@Req() req: any) {
    return {
      authenticated: true,
      email: req.user.email,
      role: req.user.role,
      allowed_projects: req.user.allowedProjects,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('settings/profile')
  async updateProfile(@Req() req: any, @Body() body: any) {
    const updated = await this.authService.updateProfile(
      req.user.id,
      body.email || '',
      body.password,
    );
    return { success: true, message: 'Dina profilinställningar har sparats!', email: updated.email };
  }

  // --- ADMIN USER MANAGEMENT ENDPOINTS ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('users')
  async getUsers() {
    const users = await this.authService.findAllUsers();
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      allowed_projects: u.allowedProjects,
    }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('users')
  async createUser(@Body() body: any) {
    await this.authService.createUser({
      email: body.email || '',
      password: body.password,
      role: body.role || 'user',
      allowedProjects: body.allowed_projects || 'all',
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('users/:id')
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    await this.authService.updateUser(id, {
      password: body.password,
      role: body.role || 'user',
      allowedProjects: body.allowed_projects || 'all',
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.authService.deleteUser(id, req.user.id);
    return { success: true };
  }
}
