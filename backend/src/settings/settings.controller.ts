import { Controller, Get, Post, Delete, Body, Query, Req, UseGuards, HttpCode, HttpStatus, Param, ParseIntPipe } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('api')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('projects/discount')
  async getDiscount(@Query('project') project = 'Allmänt') {
    const val = await this.settingsService.getDiscount(project);
    return { project, discount_percent: val };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('projects/discount')
  @HttpCode(HttpStatus.OK)
  async setDiscount(@Body() body: { project?: string; discount_percent?: number }) {
    const project = body.project || 'Allmänt';
    const discount = parseFloat(body.discount_percent as any || 0.0);
    await this.settingsService.setDiscount(project, discount);
    return {
      success: true,
      message: `Applied ${discount}% discount to ${project} successfully!`,
      discount_percent: discount,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects/investment')
  async getInvestment(@Query('project') project = 'Allmänt') {
    const val = await this.settingsService.getInvestment(project);
    return { project, investment: val };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('projects/investment')
  @HttpCode(HttpStatus.OK)
  async setInvestment(@Body() body: { project?: string; investment?: number }) {
    const project = body.project || 'Allmänt';
    const investment = parseFloat(body.investment as any || 0.0);
    await this.settingsService.setInvestment(project, investment);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('settings/password')
  @HttpCode(HttpStatus.OK)
  async setPassword(@Body() body: { password?: string }) {
    const password = (body.password || '').trim();
    await this.settingsService.setPassword(password);
    return { success: true, message: 'Lösenordet har uppdaterats.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('projects')
  async getProjectsList() {
    return this.settingsService.getProjectsList();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('projects')
  @HttpCode(HttpStatus.OK)
  async createProject(@Body() body: { name?: string }) {
    const name = (body.name || '').trim();
    await this.settingsService.createProject(name);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('projects')
  @HttpCode(HttpStatus.OK)
  async deleteProject(@Body() body: { name?: string }) {
    const name = (body.name || '').trim();
    await this.settingsService.deleteProject(name);
    return { success: true, message: `Projektet '${name}' har raderats.` };
  }

  @Get('public/discount-codes/validate')
  async validateCode(
    @Query('code') code: string,
    @Query('category') category?: string,
  ) {
    if (!code) {
      return { valid: false, discountPercent: 0, project: '' };
    }
    return this.settingsService.validateDiscountCode(code, category);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('discount-codes')
  async getDiscountCodes() {
    return this.settingsService.getDiscountCodes();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('discount-codes')
  @HttpCode(HttpStatus.OK)
  async createDiscountCode(
    @Body() body: { code: string; project: string; discount_percent: number },
  ) {
    return this.settingsService.createDiscountCode({
      code: body.code,
      project: body.project,
      discountPercent: parseFloat(body.discount_percent as any || 0.0),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('discount-codes/:id')
  @HttpCode(HttpStatus.OK)
  async updateDiscountCode(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { code: string; project: string; discount_percent: number },
  ) {
    return this.settingsService.updateDiscountCode(id, {
      code: body.code,
      project: body.project,
      discountPercent: parseFloat(body.discount_percent as any || 0.0),
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('discount-codes/:id')
  @HttpCode(HttpStatus.OK)
  async deleteDiscountCode(@Param('id', ParseIntPipe) id: number) {
    await this.settingsService.deleteDiscountCode(id);
    return { success: true };
  }
}
