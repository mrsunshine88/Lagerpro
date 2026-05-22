import { Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    let lookupEmail = email.trim().toLowerCase();
    // Support typo in lookup as seen in python code
    if (lookupEmail === 'apersson508@gmai..com') {
      lookupEmail = 'apersson508@gmail.com';
    }

    const user = await this.userRepository.findOne({ email: lookupEmail });
    if (user) {
      const isMatch = await bcrypt.compare(pass, user.password);
      if (isMatch) {
        // Return without password
        const { password, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      allowedProjects: user.allowedProjects,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async findUserById(id: number): Promise<User | null> {
    return this.userRepository.findOne(id);
  }

  async updateProfile(userId: number, email: string, newPassword?: string): Promise<User> {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({ email: cleanEmail, id: { $ne: userId } });
    if (existing) {
      throw new BadRequestException('E-postadressen används redan av en annan användare.');
    }

    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('Användaren hittades inte.');
    }

    user.email = cleanEmail;
    if (newPassword && newPassword.trim().length >= 4) {
      user.password = await bcrypt.hash(newPassword.trim(), 10);
    } else if (newPassword) {
      throw new BadRequestException('Lösenordet måste vara minst 4 tecken långt.');
    }

    await this.userRepository.getEntityManager().flush();
    return user;
  }

  // --- ADMIN USER CRUD ---
  async findAllUsers(): Promise<User[]> {
    return this.userRepository.find({}, { orderBy: { id: 'ASC' } });
  }

  async createUser(data: { email: string; password?: string; role: string; allowedProjects: string }): Promise<User> {
    const cleanEmail = data.email.trim().toLowerCase();
    const existing = await this.userRepository.findOne({ email: cleanEmail });
    if (existing) {
      throw new ConflictException('E-postadressen är redan registrerad.');
    }

    const user = new User();
    user.email = cleanEmail;
    
    const plainPass = data.password?.trim() || 'lager';
    if (plainPass.length < 4) {
      throw new BadRequestException('Lösenordet måste vara minst 4 tecken långt.');
    }
    user.password = await bcrypt.hash(plainPass, 10);
    user.role = data.role || 'user';
    user.allowedProjects = data.allowedProjects || 'all';

    this.userRepository.getEntityManager().persist(user);
    await this.userRepository.getEntityManager().flush();
    return user;
  }

  async updateUser(
    userId: number,
    data: { password?: string; role: string; allowedProjects: string },
  ): Promise<User> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('Användaren hittades inte.');
    }

    // Prevent editing the master account apersson508@gmail.com
    if (userId === 1 || user.email === 'apersson508@gmail.com') {
      throw new BadRequestException(
        'Detta huvudkonto (apersson508@gmail.com) kan inte redigeras från användarhanteringen.',
      );
    }

    if (data.password && data.password.trim().length >= 4) {
      user.password = await bcrypt.hash(data.password.trim(), 10);
    } else if (data.password) {
      throw new BadRequestException('Lösenordet måste vara minst 4 tecken långt.');
    }

    user.role = data.role;
    user.allowedProjects = data.allowedProjects;

    await this.userRepository.getEntityManager().flush();
    return user;
  }

  async deleteUser(userId: number, currentUserId: number): Promise<void> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new NotFoundException('Användaren hittades inte.');
    }

    // Prevent deleting master account
    if (userId === 1 || user.email === 'apersson508@gmail.com') {
      throw new BadRequestException('Detta huvudkonto (apersson508@gmail.com) kan inte raderas.');
    }

    // Prevent self-deletion
    if (userId === currentUserId) {
      throw new BadRequestException('Du kan inte radera ditt eget inloggade konto.');
    }

    this.userRepository.getEntityManager().remove(user);
    await this.userRepository.getEntityManager().flush();
  }

  async removeAllowedProjectFromAll(projectName: string): Promise<void> {
    const users = await this.userRepository.find({ allowedProjects: { $ne: 'all' } });
    for (const user of users) {
      const projects = user.allowedProjects
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p && p !== projectName);
      user.allowedProjects = projects.join(',');
    }
    await this.userRepository.getEntityManager().flush();
  }
}
