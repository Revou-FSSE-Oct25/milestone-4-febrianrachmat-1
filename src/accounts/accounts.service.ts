import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload';

@Injectable()
export class AccountsService {
  constructor(private readonly prismaService: PrismaService) {}

  private isAdmin(user: JwtPayload) {
    return user.role === UserRole.ADMIN;
  }

  private generateAccountNumber() {
    const part1 = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0');
    const part2 = Date.now().toString().slice(-6);
    return `${part1}${part2}`;
  }

  async create(currentUser: JwtPayload, dto: CreateAccountDto) {
    const targetUserId = this.isAdmin(currentUser)
      ? (dto.userId ?? currentUser.sub)
      : currentUser.sub;

    const owner = await this.prismaService.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException('user not found');

    const accountNumber = dto.accountNumber ?? this.generateAccountNumber();

    try {
      return await this.prismaService.account.create({
        data: {
          accountNumber,
          type: dto.type,
          balance: 0,
          userId: targetUserId,
        },
      });
    } catch {
      throw new BadRequestException('failed to create account');
    }
  }

  async findAll(currentUser: JwtPayload) {
    return await this.prismaService.account.findMany({
      where: this.isAdmin(currentUser) ? {} : { userId: currentUser.sub },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(currentUser: JwtPayload, id: string) {
    const account = await this.prismaService.account.findUnique({
      where: { id },
    });
    if (!account) throw new NotFoundException('account not found');
    if (!this.isAdmin(currentUser) && account.userId !== currentUser.sub) {
      throw new ForbiddenException('access denied');
    }
    return account;
  }

  async update(currentUser: JwtPayload, id: string, dto: UpdateAccountDto) {
    await this.findOne(currentUser, id);
    return await this.prismaService.account.update({
      where: { id },
      data: { type: dto.type },
    });
  }

  async remove(currentUser: JwtPayload, id: string) {
    const account = await this.findOne(currentUser, id);
    if (Number(account.balance) !== 0) {
      throw new BadRequestException(
        'account balance must be zero before delete',
      );
    }

    await this.prismaService.account.delete({ where: { id } });
    return { message: 'account deleted' };
  }
}
