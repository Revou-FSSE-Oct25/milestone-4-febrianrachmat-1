/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('user not found');

    const data: { name?: string; password?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prismaService.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}
